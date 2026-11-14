/**
 * Enrichissement optionnel par un LLM (local ou distant) quand le joueur est en ligne.
 *
 * Contrat : le texte du gabarit est TOUJOURS disponible immédiatement. L'enrichissement ne fait que proposer
 * une réécriture de chaque bloc ; elle n'est retenue que si elle passe le même validateur que les gabarits
 * (mêmes faits, mêmes noms autorisés). Délai dépassé, erreur réseau ou texte rejeté : on garde le gabarit.
 *
 * Sécurité : aucune clé d'API ne doit être embarquée dans l'application ; un enrichisseur distant passe par
 * un serveur relais qui détient la clé. mobile-core ne fait lui-même aucun appel réseau.
 */
import { NEUTRES } from "./templates";
import type { NarrationTour } from "./types";
import { indexer, motsCapitalises, valider } from "./validator";
import { chainesGabarits } from "./templates";

export type TypeBloc = "titre" | "briefing" | "note_bercy" | "note_social" | "une_titre" | "une_chapeau";

export interface RequeteEnrichissement {
  bloc: TypeBloc;
  consignes: string;
  faits: Record<string, string>;
  brouillon: string;
  maxCaracteres: number;
}

export interface Enrichisseur {
  readonly nom: string;
  enrichir(req: RequeteEnrichissement, signal: AbortSignal): Promise<string>;
}

export interface OptionsEnrichissement {
  enLigne: boolean;
  delaiMs?: number;
  blocs?: TypeBloc[];
}

const MAX: Record<TypeBloc, number> = { titre: 140, briefing: 1100, note_bercy: 900, note_social: 900, une_titre: 140, une_chapeau: 360 };

export function consignes(bloc: TypeBloc): string {
  const role = bloc === "note_bercy" ? "le conseiller budgétaire de Bercy, attentif aux coûts, au déficit et à la crédibilité financière"
    : bloc === "note_social" ? "la conseillère du Cabinet social, attentive aux ménages, à l'emploi et aux services publics"
    : bloc.startsWith("une") ? "un rédacteur de journal télévisé du soir, sobre et factuel"
    : "un rédacteur de notes pour la présidence de la République";
  return [
    `Tu réécris un texte de jeu de simulation politique en tant que ${role}.`,
    "Règles absolues :",
    "- recopie à l'identique chaque nombre et chaque date du brouillon ou de FAITS ; n'en calcule, n'en arrondis et n'en ajoute aucun ;",
    "- n'écris aucun nombre en toutes lettres ;",
    "- ne cite aucune personne réelle, aucun parti, aucun groupe parlementaire, aucun élu, aucun média ;",
    "- garde les noms de ministres du brouillon tels quels (ce sont des personnages fictifs) ;",
    `- français, ton institutionnel, au plus ${MAX[bloc]} caractères ;`,
    "- réponds uniquement par le texte réécrit, sans guillemets ni commentaire.",
  ].join("\n");
}

const LEXIQUE = [...new Set(chainesGabarits().map((x) => x.replace(/\{\w+\}/g, " ")).flatMap(motsCapitalises))];

async function avecDelai<T>(f: (s: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const ctl = new AbortController();
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  const delai = new Promise<never>((_, rej) => { minuteur = setTimeout(() => { ctl.abort(); rej(new Error(`délai de ${ms} ms dépassé`)); }, ms); });
  try {
    return await Promise.race([f(ctl.signal), delai]);
  } finally {
    if (minuteur) clearTimeout(minuteur);
  }
}

/**
 * Renvoie une copie de la narration dont les blocs ont été réécrits quand c'est possible.
 * Hors ligne, ou sans enrichisseur, la narration d'origine est renvoyée immédiatement.
 */
export async function enrichirNarration(n: NarrationTour, e: Enrichisseur | null, o: OptionsEnrichissement): Promise<NarrationTour> {
  if (!e || !o.enLigne) return n;
  const idx = indexer([n.faits, n.sources], { noms: n.noms, lexique: LEXIQUE });
  const blocs = new Set<TypeBloc>(o.blocs ?? ["briefing", "note_bercy", "note_social", "une_chapeau"]);
  const delai = o.delaiMs ?? 2500;
  const copie: NarrationTour = JSON.parse(JSON.stringify(n)) as NarrationTour; // structuredClone absent de certains moteurs mobiles
  const rejets = [...copie.rejets];
  let enrichi = false;

  const tenter = async (bloc: TypeBloc, brouillon: string, appliquer: (t: string) => void, cle: string) => {
    if (!blocs.has(bloc) || !brouillon || Object.values(NEUTRES).includes(brouillon)) return;
    try {
      const t = (await avecDelai((s) => e.enrichir({ bloc, consignes: consignes(bloc), faits: n.faits, brouillon, maxCaracteres: MAX[bloc] }, s), delai)).trim();
      const motifs = valider(t, idx, MAX[bloc]);
      if (motifs.length) { rejets.push({ bloc: `llm:${cle}`, motifs }); return; }
      appliquer(t);
      enrichi = true;
    } catch (err) {
      rejets.push({ bloc: `llm:${cle}`, motifs: [(err as Error).message] });
    }
  };

  const taches: Promise<void>[] = [];
  for (const d of copie.dossiers) {
    taches.push(tenter("titre", d.titre, (t) => { d.titre = t; }, `${d.id}.titre`));
    taches.push(tenter("briefing", d.briefing, (t) => { d.briefing = t; }, `${d.id}.briefing`));
    taches.push(tenter("note_bercy", d.notes.bercy.texte, (t) => { d.notes.bercy.texte = t; }, `${d.id}.bercy`));
    taches.push(tenter("note_social", d.notes.social.texte, (t) => { d.notes.social.texte = t; }, `${d.id}.social`));
  }
  for (const l of copie.une.titres) {
    taches.push(tenter("une_titre", l.titre, (t) => { l.titre = t; }, `une.${l.ligne}.titre`));
    taches.push(tenter("une_chapeau", l.chapeau, (t) => { l.chapeau = t; }, `une.${l.ligne}.chapeau`));
  }
  await Promise.all(taches);
  return { ...copie, rejets, mode: enrichi ? "enrichi" : "gabarit" };
}
