/**
 * Règles d'interface pures (testées sans React Native) : horloge de la journée, tampons disponibles,
 * Situations Émergentes, badges de source, jalons du calendrier de trésorerie.
 */
import type { Dossier, Instrument } from "../../../engine/src/index";
import type { Graine } from "../../../shared/schema";
import { GABARITS } from "../../../engine/src/index";
import type { NarrationTour } from "../../../mobile-core/src/narrative/types";
import { FAMILLES } from "../../../mobile-core/src/narrative/templates";

// ------------------------------------------------------------------ horloge
export type Phase = "matin" | "conseil" | "parlement" | "soir";
export const HEURES: Record<Phase, string> = { matin: "08h30", conseil: "10h00", parlement: "16h00", soir: "20h00" };
export const ORDRE_PHASES: Phase[] = ["matin", "conseil", "parlement", "soir"];

/** La journée avance au rythme des actions ; elle ne recule jamais avant la semaine suivante. */
export function phaseSuivante(actuelle: Phase, evenement: "arbitrage" | "hemicycle" | "une" | "semaine"): Phase {
  if (evenement === "semaine") return "matin";
  const cible: Phase = evenement === "arbitrage" ? "conseil" : evenement === "hemicycle" ? "parlement" : "soir";
  return ORDRE_PHASES.indexOf(cible) > ORDRE_PHASES.indexOf(actuelle) ? cible : actuelle;
}

export type Eclairage = "matin" | "apres-midi" | "nuit";
export const eclairage = (p: Phase): Eclairage => (p === "matin" || p === "conseil" ? "matin" : p === "parlement" ? "apres-midi" : "nuit");

// ------------------------------------------------------------------ tampons
export type TypeTampon = "decret" | "loi" | "493" | "ajourner";
export const LIBELLES_TAMPONS: Record<TypeTampon, string> = { decret: "Décret", loi: "Projet de loi", "493": "49.3", ajourner: "Ajourner" };

export interface Tampon {
  type: TypeTampon;
  actif: boolean;
  raison?: string;
}

export function instrumentVersTampon(i: Instrument): TypeTampon {
  return i === "decret" || i === "executif" ? "decret" : "loi";
}

/**
 * Tampons proposés pour un dossier et l'option sélectionnée :
 * - Décret : mesures réglementaires ou exécutives (effet immédiat) ;
 * - Projet de loi : lois, PLFR, PLFSSR (navette parlementaire) ;
 * - 49.3 : seulement pour un dossier « parlement » dont le texte peut l'être (règle du moteur) ;
 * - Ajourner : toujours (le dossier reste ouvert et s'aggrave de 15 % par jour).
 */
export function tamponsDisponibles(d: Pick<Dossier, "famille" | "reference">, optionId: string | null,
  peut493: (texteId: string) => { ok: boolean; raison: string }, capital: number, coutOption: (id: string) => number): Tampon[] {
  const out: Tampon[] = [];
  const g = optionId ? GABARITS.find((x) => x.id === optionId) : undefined;
  if (g) {
    const t = instrumentVersTampon(g.instrument);
    const cout = coutOption(g.id);
    out.push({ type: t, actif: cout <= capital, ...(cout > capital ? { raison: `capital politique insuffisant (${Math.round(capital)} pour ${Math.round(cout)})` } : {}) });
  }
  if (d.famille === "parlement" && d.reference) {
    const p = peut493(d.reference);
    out.push({ type: "493", actif: p.ok, ...(p.ok ? {} : { raison: p.raison }) });
  }
  out.push({ type: "ajourner", actif: true });
  return out;
}

// ------------------------------------------------------------------ Situations Émergentes
export interface Emergente {
  cle: string;
  libelle: string;
  niveau: 1 | 2 | 3;
}

export function situationsEmergentes(n: NarrationTour, corps: { libelle: string; bloque: boolean; blocage: string }[],
  murs: { date: string; libelle: string; critique: boolean }[]): Emergente[] {
  const out: Emergente[] = [];
  for (const d of n.dossiers) if (FAMILLES[d.famille]?.emergente) out.push({ cle: d.id, libelle: d.titre, niveau: d.niveau });
  for (const c of corps) if (c.bloque) out.push({ cle: `blocage:${c.libelle}`, libelle: `${c.libelle} : ${c.blocage.charAt(0).toLowerCase()}${c.blocage.slice(1)}`, niveau: 3 });
  const mur = murs.find((m) => m.critique);
  if (mur) out.push({ cle: `mur:${mur.date}`, libelle: `Mur de trésorerie critique : ${mur.libelle}`, niveau: 3 });
  return out.sort((a, b) => b.niveau - a.niveau);
}

// ------------------------------------------------------------------ badges de source
export interface Badge {
  libelle: string;
  certifie: boolean;
}

/** Producteur réel de la donnée (graine du relais) ; « Modèle » pour les indicateurs simulés. */
export function badgeSource(d: Pick<Dossier, "famille" | "indicateurs">, graine: Graine): Badge {
  const id = d.indicateurs[0];
  if (id) {
    const p = graine.pilotage.find((x) => x.id === id) ?? graine.bilan.find((x) => x.id === id);
    if (p) return { libelle: p.source.producteur, certifie: p.source.officiel };
    if (id.includes("_M")) return { libelle: "Modèle de simulation", certifie: false };
  }
  if (d.famille === "parlement" || d.famille === "institutions") return { libelle: "Assemblée nationale (données ouvertes)", certifie: true };
  if (d.famille === "budget") return { libelle: "Acoss, plafond fixé par la LFSS", certifie: false };
  return { libelle: "Simulation", certifie: false };
}

// ------------------------------------------------------------------ calendrier de trésorerie
export type Jalon = "caf" | "pensions" | "prelevements" | "paie";
export const JALONS: Record<Jalon, { flux: string[]; jour: number; libelle: string }> = {
  caf: { flux: ["caf"], jour: 5, libelle: "CAF" },
  pensions: { flux: ["pensions"], jour: 9, libelle: "Retraites" },
  prelevements: { flux: ["impot_revenu", "urssaf"], jour: 15, libelle: "Prélèvement à la source et Urssaf" },
  paie: { flux: ["personnel"], jour: 28, libelle: "Paie de la fonction publique d'État" },
};

export function jalonDuJour(mouvements: { id: string }[]): Jalon[] {
  return (Object.keys(JALONS) as Jalon[]).filter((j) => mouvements.some((m) => JALONS[j].flux.includes(m.id)));
}

// ------------------------------------------------------------------ panoramas de crise
export type ThemeCrise = "carburant" | "reseau" | "urgences" | "nappes" | "blocage" | "marches" | "universite" | "prison";

const THEME_FAMILLE: Record<string, ThemeCrise> = {
  eau: "nappes", sante: "urgences", mobilite: "blocage", ordre_public: "blocage", dialogue: "blocage",
  taux: "marches", dette: "marches", budget: "marches", education: "universite", prisons: "prison",
};

/** Panorama illustrant un dossier (gravité ≥ 2) ; l'énergie distingue les carburants (ENE4) du système électrique. */
export function themePourDossier(famille: string, indicateurs: readonly string[]): ThemeCrise | null {
  if (famille === "energie") return indicateurs.includes("ENE4") ? "carburant" : "reseau";
  return THEME_FAMILLE[famille] ?? null;
}

/** Libellés de blocage des corps (constantes du moteur, jamais du texte libre) → panorama de l'arrêt de semaine. */
const THEME_BLOCAGE: [RegExp, ThemeCrise][] = [
  [/raffineries/i, "carburant"], [/barrages|ronds-points|grève interprofessionnelle|journées de grève/i, "blocage"],
  [/investissement/i, "marches"], [/occupations/i, "universite"],
];

export function themePourInterruption(i: { type: string; detail: string }): ThemeCrise | null {
  if (i.type === "mur_tresorerie") return "marches";
  if (i.type !== "crise_corps") return null;
  return THEME_BLOCAGE.find(([re]) => re.test(i.detail))?.[1] ?? null;
}
