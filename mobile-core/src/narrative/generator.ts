/**
 * Moteur d'assemblage procédural, déterministe et hors ligne.
 *
 * `buildTurnNarrative(state, dossiers, lastDecision)` :
 *  1. construit les faits formatés (seule source des nombres et dates) à partir de l'état du moteur ;
 *  2. choisit une variante de gabarit par bloc (graine + jour + dossier, en évitant les variantes récentes) ;
 *  3. valide chaque bloc (validator.ts) et le remplace par sa version neutre s'il échoue.
 * Même entrée (état, dossiers, décision, mémoire) ⇒ même sortie.
 */
import { AGGRAVATION, DEFINITIONS_FLUX, GABARITS, type Dossier, type Gabarit } from "../../../engine/src/index";
import type { DerniereDecision, EtatNarratif, IndicateurNarratif } from "./etat";
import { capitale, date as fdate, decimalesAuto, euros, nombre, pourcent, valeur as fvaleur } from "./format";
import {
  BREVES, CHAPEAUX, CORPS_ARTICLES, DIVERGENCE, EDITIONS, FAMILLES, GENRES, INACTION, LIBELLES_JALONS, MINISTERES_DE, MINISTRES, NEUTRES,
  RECO_BERCY, RECO_SOCIAL, REGISTRES_BERCY, REGISTRES_SOCIAL, THEMES, TITRES_NOTES, UNE_ECONOMIQUE, UNE_GENERALISTE, UNE_POPULAIRE,
  chainesGabarits, type Archetype,
} from "./templates";
import {
  MEMOIRE_VIDE, type Auteur, type DossierNarre, type LigneEditoriale, type MemoireNarrative, type NarrationTour, type Niveau, type Note,
  type OptionNarree, type Rejet, type TitreUne,
} from "./types";
import { etendreIndex, indexer, motsCapitalises, valider, type IndexPayload } from "./validator";

export interface OptionsNarration {
  memoire?: MemoireNarrative;
  /** Nombre de variantes récentes évitées par bloc (anti-répétition). */
  fenetreAntiRepetition?: number;
}

type Ctx = Record<string, string>;

const LIMITES = { titre: 140, briefing: 1100, note: 900, une: 140, chapeau: 360, breve: 220 } as const;
const GABARITS_PAR_ID = new Map(GABARITS.map((g) => [g.id, g]));
const ECO = ["MAC1", "MAC2", "MAC3", "MAC5", "FIN1", "FIN2", "BUD1"];
const POPULAIRE = ["ENE4", "MAC1", "MET1", "MOB1", "SAN1", "LOG_M3", "MAC2"];
const LEXIQUE = [...new Set(chainesGabarits().map((x) => x.replace(/\{\w+\}/g, " ")).flatMap(motsCapitalises))];

export function niveau(gravite: number): Niveau {
  return gravite < 2 ? 1 : gravite < 3 ? 2 : 3;
}

/** Gravité initiale d'un dossier, avant l'aggravation quotidienne due à l'inaction. */
export function intensite(d: Pick<Dossier, "gravite" | "joursInaction">): Niveau {
  return niveau(d.gravite / Math.pow(AGGRAVATION, Math.max(0, d.joursInaction)));
}

function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

export function rendre(tpl: string, ctx: Ctx): string | null {
  let manque = false;
  const out = tpl.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = ctx[k];
    if (v === undefined) { manque = true; return ""; }
    return v;
  });
  return manque ? null : out;
}

const minuscule = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/** Formes articulées d'un libellé d'indicateur : « l'indice… », « du taux… », « des trains… ». */
export function articles(libelle: string): { le: string; de: string } {
  const premier = libelle.split(/[\s'’(]/)[0] ?? "";
  const g = GENRES[premier] ?? "m";
  const bas = minuscule(libelle);
  if (g === "p") return { le: `les ${bas}`, de: `des ${bas}` };
  if (/^[aeiouyhéèêàâîôû]/i.test(premier)) return { le: `l'${bas}`, de: `de l'${bas}` };
  return g === "f" ? { le: `la ${bas}`, de: `de la ${bas}` } : { le: `le ${bas}`, de: `du ${bas}` };
}

function ecartTexte(d: number, unite: string): string {
  if (unite === "%" || unite === "% du PIB") return `${nombre(d, 1, true)} pt`;
  if (unite === "€") return euros(d, true);
  if (unite === "indice" || unite === "points") return nombre(d, decimalesAuto(d), true);
  return `${nombre(d, decimalesAuto(d), true)} ${unite}`;
}

function archetype(m: { competence: number; loyaute: number; popularite: number; tension: number }): Archetype {
  if (m.tension >= 60) return "fragilise";
  if (m.loyaute < 45) return "frondeur";
  if (m.competence >= 70) return "technicien";
  if (m.popularite >= 60) return "populaire";
  if (m.loyaute >= 75) return "fidele";
  return "discret";
}

/** Effet budgétaire annualisé d'un gabarit (€, positif = amélioration du solde), à partir des flux calibrés du moteur. */
export function impactBudgetaire(g: Gabarit): { montant: number; temporaire: boolean } | null {
  if (!g.flux?.length) return null;
  let montant = 0, temporaire = false;
  for (const f of g.flux) {
    const def = DEFINITIONS_FLUX.find((d) => d.id === f.flux);
    if (!def) continue;
    const annuel = def.sens * def.annuel * (f.facteur - 1);
    if (f.dureeJours && f.dureeJours < 365) { montant += (annuel * f.dureeJours) / 365; temporaire = true; } else montant += annuel;
  }
  return Math.abs(montant) < 1e6 ? null : { montant, temporaire };
}

class Atelier {
  readonly faits: Record<string, string> = {};
  readonly sources = new Set<string>();
  readonly noms = new Set<string>();
  readonly rejets: Rejet[] = [];
  readonly memoire: MemoireNarrative;
  idx: IndexPayload | null = null;

  constructor(readonly etat: EtatNarratif, memoire: MemoireNarrative, readonly fenetre: number) {
    this.memoire = { v: 1, recents: Object.fromEntries(Object.entries(memoire.recents).map(([k, v]) => [k, [...v]])) };
  }

  /** Enregistre un fait formaté (il devient une valeur autorisée pour le validateur). */
  fait(cle: string, v: string): string {
    this.faits[cle] = v;
    if (this.idx) etendreIndex(this.idx, [v]);
    return v;
  }

  source(...s: string[]): void {
    for (const x of s) if (x) { this.sources.add(x); if (this.idx) etendreIndex(this.idx, [x]); }
  }

  nom(n: string): void {
    this.noms.add(n);
    if (this.idx) etendreIndex(this.idx, [], [n]);
  }

  get index(): IndexPayload {
    if (!this.idx) this.idx = indexer([this.faits, [...this.sources]], { noms: this.noms, lexique: LEXIQUE });
    return this.idx;
  }

  /** Choisit la première variante rendable, valide et non récente ; repli neutre sinon. */
  produire(cle: string, sel: string, variantes: readonly string[], ctx: Ctx, max: number, neutre: string): string {
    const ordre = variantes
      .map((t, i) => ({ i, txt: rendre(t, ctx), h: fnv(`${this.etat.seed}|${this.etat.jour}|${sel}|${cle}|${i}`) }))
      .filter((x): x is { i: number; txt: string; h: number } => x.txt !== null)
      .sort((a, b) => a.h - b.h);
    const recents = this.memoire.recents[cle] ?? [];
    ordre.sort((a, b) => Number(recents.includes(a.i)) - Number(recents.includes(b.i)));
    let premiersMotifs: string[] = ordre.length ? [] : ["aucune variante applicable aux faits disponibles"];
    for (const c of ordre) {
      const motifs = valider(c.txt, this.index, max);
      if (!motifs.length) {
        this.memoire.recents[cle] = [c.i, ...recents.filter((x) => x !== c.i)].slice(0, this.fenetre);
        return c.txt;
      }
      if (!premiersMotifs.length) premiersMotifs = motifs;
    }
    this.rejets.push({ bloc: `${sel}:${cle}`, motifs: premiersMotifs });
    return neutre;
  }
}

// ------------------------------------------------------------------ contextes
function ctxIndicateur(a: Atelier, p: string, ind: IndicateurNarratif): Ctx {
  const art = articles(ind.libelle);
  a.source(ind.libelle);
  const pub = ind.publiee;
  const c: Ctx = {
    Indicateur: ind.libelle, indicateurTitre: ind.libelle, leIndicateur: art.le, LeIndicateur: capitale(art.le), deIndicateur: art.de,
    valeur: a.fait(`${p}.valeur`, fvaleur(ind.jeu, ind.unite)),
    reference: a.fait(`${p}.reference`, fvaleur(ind.reference, ind.unite)),
    ecart: a.fait(`${p}.ecart`, ecartTexte(ind.jeu - ind.reference, ind.unite)),
    sens: ind.jeu >= ind.reference ? "hausse" : "baisse",
  };
  if (pub) {
    c.valeurPubliee = a.fait(`${p}.publiee`, fvaleur(pub.valeur, ind.unite));
    if (pub.precedente !== null) c.precedente = a.fait(`${p}.precedente`, fvaleur(pub.precedente, ind.unite));
  }
  return c;
}

function ctxGlobal(a: Atelier): Ctx {
  const e = a.etat, t = e.tresorerie;
  const usage = t.acoss < 0 && t.plafondAcoss > 0 ? (100 * -t.acoss) / t.plafondAcoss : 0;
  const rad = [...e.corps].sort((x, y) => y.radicalisation - x.radicalisation)[0];
  const c: Ctx = {
    date: a.fait("date", fdate(e.date)),
    solde: a.fait("solde", euros(t.soldeEtat)),
    soldeRef: a.fait("soldeRef", euros(t.soldeEtatRef)),
    taux: a.fait("taux", pourcent(t.tauxLong, 2)),
    acoss: a.fait("acoss", euros(Math.abs(t.acoss))),
    plafond: a.fait("plafond", euros(t.plafondAcoss)),
    usage: a.fait("usage", pourcent(usage, 0)),
    credibilite: a.fait("credibilite", nombre(e.credibilite, 0)),
    capital: a.fait("capital", nombre(e.capitalPolitique, 0)),
    plafondCP: a.fait("plafondCP", nombre(e.plafondCP, 0)),
    opinionMoy: a.fait("opinionMoy", nombre(e.opinion90, 1)),
    seuil: a.fait("seuil", String(e.parlement.seuilCensure)),
    siegesTotal: a.fait("siegesTotal", String(e.parlement.siegesTotal)),
    ...(e.parlement.soutien > 0 ? { soutien: a.fait("soutien", String(Math.round(e.parlement.soutien))) } : {}),
    seuilBlocage: a.fait("seuilBlocage", String(e.seuilBlocage)),
  };
  if (rad) Object.assign(c, ctxCorps(a, "corpsMax", rad.id));
  return c;
}

function ctxCorps(a: Atelier, p: string, id: string): Ctx {
  const k = a.etat.corps.find((x) => x.id === id);
  if (!k) return {};
  const art = CORPS_ARTICLES[k.id] ?? { le: minuscule(k.libelle), de: `de ${minuscule(k.libelle)}` };
  a.source(k.libelle, k.blocage);
  const c: Ctx = { Corps: k.libelle, corpsTitre: k.libelle, corpsLe: art.le, corpsDe: art.de, radicalisation: a.fait(`${p}.radicalisation`, nombre(k.radicalisation, 0)) };
  if (k.bloque) { c.blocage = k.blocage; c.blocageMin = minuscule(k.blocage); }
  return c;
}

function ctxMinistre(a: Atelier, ministere: string): Ctx {
  const m = a.etat.ministres.find((x) => x.ministere === ministere);
  const de = MINISTERES_DE[ministere];
  if (!m || !de) return {};
  a.nom(m.nom);
  return { Ministre: m.nom, ministre: m.nom, ministereDe: de, tension: a.fait(`ministre.${ministere}.tension`, nombre(m.tension, 0)) };
}

function ctxDossier(a: Atelier, d: Dossier, base: Ctx): { ctx: Ctx; ind: IndicateurNarratif | null } {
  const e = a.etat, p = d.id;
  const theme = THEMES[d.famille] ?? THEMES.publication!;
  let ctx: Ctx = { ...base, theme: theme.theme, objet: theme.objet, Objet: capitale(theme.objet), menages: theme.menages };
  let ind: IndicateurNarratif | null = null;
  for (const id of d.indicateurs) { ind = e.indicateurs.find((x) => x.id === id) ?? null; if (ind) break; }
  if (ind) {
    ctx = { ...ctx, ...ctxIndicateur(a, p, ind) };
    if (d.source === "donnees") {
      Object.assign(ctx, { repere: a.fait(`${p}.normale`, fvaleur(ind.normale, ind.unite)), repereLe: "la normale récente", repereA: "à la normale récente",
        repereDe: "de la normale récente", sens: ind.jeu >= ind.normale ? "hausse" : "baisse" });
    } else if (d.source === "graine" && ind.anomalieGraine) {
      const an = ind.anomalieGraine;
      if (an.methode === "seuil_direct") {
        Object.assign(ctx, { repere: a.fait(`${p}.seuil`, fvaleur(an.seuil, ind.unite)), repereLe: "le seuil d'alerte", repereA: "au seuil d'alerte",
          repereDe: "du seuil d'alerte", sens: ind.jeu >= an.seuil ? "hausse" : "baisse" });
      } else if (an.methode === "mad_robuste" && an.score !== null) {
        ctx.scoreAnomalie = a.fait(`${p}.score`, nombre(Math.abs(an.score), 1));
        ctx.sens = an.score >= 0 ? "hausse" : "baisse";
      }
    }
    if (d.famille === "publication") {
      const t = THEMES[ind.famille];
      if (t) ctx = { ...ctx, theme: t.theme };
    }
    const parts = e.attribution[ind.id] ?? [];
    const dec = parts.filter((x) => x.origine === "decision");
    const evt = parts.filter((x) => x.origine === "evenement").sort((x, y) => Math.abs(y.contribution) - Math.abs(x.contribution))[0];
    const somme = dec.reduce((s, x) => s + x.contribution, 0);
    if (dec.length) {
      ctx.partDecision = a.fait(`${p}.partDecision`, ecartTexte(somme, ind.unite));
      const top = [...dec].sort((x, y) => Math.abs(y.contribution) - Math.abs(x.contribution))[0]!;
      ctx.decision = top.libelle;
      a.source(top.libelle);
    }
    if (evt && Math.abs(evt.contribution) > 0) { ctx.evenement = evt.libelle; a.source(evt.libelle); }
  }
  if (d.famille === "parlement" && d.reference) {
    const t = e.parlement.textes.find((x) => x.id === d.reference);
    if (t) {
      a.source(t.titre);
      ctx.texte = t.titre;
      if (t.prochaine) {
        ctx.etape = LIBELLES_JALONS[t.prochaine.nom] ?? "prochaine étape";
        ctx.echeance = a.fait(`${p}.echeance`, fdate(t.prochaine.date));
      }
    }
  }
  if (d.famille === "dialogue") {
    const id = d.reference ?? [...e.corps].sort((x, y) => y.radicalisation - x.radicalisation)[0]?.id;
    if (id) ctx = { ...ctx, ...ctxCorps(a, `${p}.corps`, id) };
  }
  if (d.ministere !== "transversal") ctx = { ...ctx, ...ctxMinistre(a, d.reference && d.famille === "ministre" ? d.reference : d.ministere) };
  return { ctx, ind };
}

// ------------------------------------------------------------------ options et notes
function options(a: Atelier, d: Dossier): { liste: OptionNarree[]; bercy: string | null; social: string | null; ctxOpt: Record<string, Ctx> } {
  const segPoids = new Map(a.etat.segments.map((s) => [s.id, s.poids]));
  const scores = d.options.map((id) => {
    const g = GABARITS_PAR_ID.get(id);
    if (!g) return null;
    a.source(g.libelle);
    const imp = impactBudgetaire(g);
    const bercy = (imp?.montant ?? 0) / 1e9 + 2 * (g.credibilite ?? 0) - 0.05 * g.coutCP;
    const social = Object.entries(g.segments ?? {}).reduce((s, [k, v]) => s + (segPoids.get(k) ?? 0.1) * (v ?? 0), 0)
      + 0.3 * Object.values(g.corps ?? {}).reduce((s: number, v) => s + (v ?? 0), 0) - 0.5 * (g.radicalisationCorps ?? 0);
    const impactTxt = imp ? a.fait(`${d.id}.${id}.impact`, euros(imp.montant, true)) : null;
    const impact = imp ? ` (effet estimé sur les comptes publics : ${impactTxt}${imp.temporaire ? " sur la durée de la mesure" : " par an"})` : "";
    return { g, bercy, social, impactTxt, impact, cout: a.fait(`${d.id}.${id}.cout`, nombre(g.coutCP, 0)) };
  }).filter((x): x is NonNullable<typeof x> => x !== null);
  // Les conseillers ne recommandent que des mesures pertinentes : même famille que le dossier, sinon même ministère.
  const pertinentes = scores.filter((x) => x.g.famille === d.famille).length ? scores.filter((x) => x.g.famille === d.famille)
    : scores.filter((x) => x.g.ministere === d.ministere || x.g.famille === "dialogue");
  const meilleur = (k: "bercy" | "social") => (pertinentes.length ? [...pertinentes].sort((x, y) => y[k] - x[k] || x.g.id.localeCompare(y.g.id))[0]!.g.id : null);
  const bercy = meilleur("bercy"), social = meilleur("social");
  const ctxOpt: Record<string, Ctx> = {};
  for (const s of scores) ctxOpt[s.g.id] = { option: s.g.libelle, impact: s.impact };
  return {
    liste: scores.map((s) => ({
      gabaritId: s.g.id, libelle: s.g.libelle, instrument: s.g.instrument, coutCP: s.cout, impactBudget: s.impactTxt,
      recommandePar: [...(bercy === s.g.id ? ["bercy" as const] : []), ...(social === s.g.id ? ["social" as const] : [])],
    })),
    bercy, social, ctxOpt,
  };
}

function registreBercy(e: EtatNarratif): "marge" | "vigilance" | "alerte" {
  const t = e.tresorerie;
  const usage = t.acoss < 0 && t.plafondAcoss > 0 ? -t.acoss / t.plafondAcoss : 0;
  const bud = e.indicateurs.find((x) => x.id === "BUD1")?.ecartUnites ?? 0;
  if (usage >= 0.95 || e.credibilite < 30 || bud <= -2) return "alerte";
  if (usage >= 0.85 || e.credibilite < 45 || bud <= -0.5) return "vigilance";
  return "marge";
}

function registreSocial(e: EtatNarratif): "apaise" | "tendu" | "rupture" {
  const max = Math.max(0, ...e.corps.map((c) => c.radicalisation));
  if (e.corps.some((c) => c.bloque) || max >= e.seuilBlocage) return "rupture";
  return max >= 55 ? "tendu" : "apaise";
}

function note(a: Atelier, auteur: Auteur, d: Dossier, ctx: Ctx, reco: string | null, ctxOpt: Record<string, Ctx>): Note {
  const fam = FAMILLES[d.famille];
  const registre = auteur === "bercy" ? registreBercy(a.etat) : registreSocial(a.etat);
  const titre = a.produire(`note.${auteur}.titre`, d.id, TITRES_NOTES[auteur], ctx, LIMITES.titre, auteur === "bercy" ? "Note de Bercy" : "Note du Cabinet social");
  const banque = auteur === "bercy" ? REGISTRES_BERCY : REGISTRES_SOCIAL;
  const phrases = [
    a.produire(`note.${auteur}.${registre}`, d.id, (banque as Record<string, readonly string[]>)[registre]!, ctx, LIMITES.note, ""),
    fam ? a.produire(`${d.famille}.${auteur}`, d.id, fam[auteur], ctx, LIMITES.note, "") : "",
    reco && ctxOpt[reco]
      ? a.produire(`note.${auteur}.reco`, d.id, (auteur === "bercy" ? RECO_BERCY : RECO_SOCIAL).option, { ...ctx, ...ctxOpt[reco]! }, LIMITES.note, "")
      : a.produire(`note.${auteur}.aucune`, d.id, (auteur === "bercy" ? RECO_BERCY : RECO_SOCIAL).aucune, ctx, LIMITES.note, ""),
    a.produire(`note.${auteur}.concession`, d.id, (auteur === "bercy" ? RECO_BERCY : RECO_SOCIAL).concession, ctx, LIMITES.note, ""),
  ].filter(Boolean);
  const texte = phrases.join(" ");
  const ok = texte !== "" && valider(texte, a.index, LIMITES.note).length === 0;
  return { auteur, titre, texte: ok ? texte : NEUTRES.note, registre, recommandation: reco };
}

// ------------------------------------------------------------------ assemblage
function narrerDossier(a: Atelier, d: Dossier, ctxBase: { ctx: Ctx; ind: IndicateurNarratif | null }, opts: ReturnType<typeof options>): DossierNarre {
  const n = intensite(d);
  const fam = FAMILLES[d.famille];
  const ctx: Ctx = { ...ctxBase.ctx, ...(d.joursInaction >= 3 ? { attente: a.fait(`${d.id}.attente`, String(d.joursInaction)) } : {}) };
  const divergence = d.source === "divergence" && ctx.partDecision !== undefined;
  const titre = divergence
    ? a.produire(`divergence.titre.${n}`, d.id, DIVERGENCE.titres[n], ctx, LIMITES.titre, NEUTRES.titre)
    : fam ? a.produire(`${d.famille}.titre.${n}`, d.id, fam.titres[n], ctx, LIMITES.titre, NEUTRES.titre) : NEUTRES.titre;
  const phrases: string[] = [];
  if (divergence) {
    phrases.push(a.produire(`divergence.constat.${n}`, d.id, DIVERGENCE.constats[n], ctx, LIMITES.briefing, ""));
    if (ctx.decision) phrases.push(a.produire("divergence.cause", d.id, DIVERGENCE.cause, ctx, LIMITES.briefing, ""));
  } else if (fam) phrases.push(a.produire(`${d.famille}.constat.${n}`, d.id, fam.constats[n], ctx, LIMITES.briefing, ""));
  // pour un dossier de corps, l'événement est le blocage lui-même : déjà dit par le constat
  if (ctx.evenement && d.famille !== "dialogue") phrases.push(a.produire("divergence.evenement", d.id, DIVERGENCE.evenement, ctx, LIMITES.briefing, ""));
  if (fam) phrases.push(a.produire(`${d.famille}.enjeu`, d.id, fam.enjeux, ctx, LIMITES.briefing, ""));
  if (ctx.ministre && d.famille !== "ministre") {
    const m = a.etat.ministres.find((x) => x.nom === ctx.ministre);
    if (m) phrases.push(a.produire(`ministre.${archetype(m)}`, d.id, MINISTRES[archetype(m)], ctx, LIMITES.briefing, ""));
  }
  if (ctx.attente) phrases.push(a.produire("inaction", d.id, INACTION, ctx, LIMITES.briefing, ""));
  let briefing = phrases.filter(Boolean).join(" ");
  if (!briefing || valider(briefing, a.index, LIMITES.briefing).length) {
    if (briefing) a.rejets.push({ bloc: `${d.id}:briefing`, motifs: valider(briefing, a.index, LIMITES.briefing) });
    briefing = NEUTRES.briefing;
  }
  return {
    id: d.id, famille: d.famille, source: d.source, niveau: niveau(d.gravite), intensite: n, joursInaction: d.joursInaction, titre, briefing,
    // Le Cabinet social parle du corps le plus radicalisé (contexte global), sauf pour un dossier « dialogue » qui vise son propre corps.
    notes: { bercy: note(a, "bercy", d, ctx, opts.bercy, opts.ctxOpt), social: note(a, "social", d, ctx, opts.social, opts.ctxOpt) },
    options: opts.liste,
  };
}

function une(a: Atelier, narres: DossierNarre[], dossiers: readonly Dossier[], ctxs: Map<string, Ctx>, base: Ctx): TitreUne[] {
  const e = a.etat;
  const principal = [...dossiers].sort((x, y) => y.gravite - x.gravite || x.id.localeCompare(y.id))[0];
  const titres: TitreUne[] = [];
  const ligne = (l: LigneEditoriale, titre: string, chapeau: string) => titres.push({ ligne: l, edition: EDITIONS[l], titre, chapeau });

  // économique
  const eco = e.indicateurs.filter((x) => ECO.includes(x.id) && x.sens !== 0).sort((x, y) => Math.abs(y.ecartUnites) - Math.abs(x.ecartUnites))[0];
  if (eco && Math.abs(eco.ecartUnites) >= 0.3) {
    const c = { ...base, ...ctxIndicateur(a, `une.${eco.id}`, eco) };
    const sens = eco.sens * eco.ecartUnites > 0 ? "ameliore" : "degrade";
    ligne("economique", a.produire(`une.eco.${sens}`, "une", UNE_ECONOMIQUE[sens], c, LIMITES.une, NEUTRES.une),
      a.produire("une.eco.chapeau", "une", UNE_ECONOMIQUE.chapeau, c, LIMITES.chapeau, NEUTRES.chapeau));
  } else if (principal && niveau(principal.gravite) === 3 && FAMILLES[principal.famille]) {
    const c = ctxs.get(principal.id) ?? base;
    ligne("economique", a.produire(`${principal.famille}.une.economique`, "une", FAMILLES[principal.famille]!.une.economique, c, LIMITES.une, NEUTRES.une),
      a.produire("une.eco.chapeauCalme", "une", UNE_ECONOMIQUE.chapeauCalme, base, LIMITES.chapeau, NEUTRES.chapeau));
  } else {
    ligne("economique", a.produire("une.eco.calme", "une", UNE_ECONOMIQUE.calme, base, LIMITES.une, NEUTRES.une),
      a.produire("une.eco.chapeauCalme", "une", UNE_ECONOMIQUE.chapeauCalme, base, LIMITES.chapeau, NEUTRES.chapeau));
  }

  // généraliste
  if (principal && FAMILLES[principal.famille]) {
    const c = ctxs.get(principal.id) ?? base;
    const n = niveau(principal.gravite);
    const narre = narres.find((x) => x.id === principal.id);
    const cc = { ...c, ResumeCourt: narre?.titre ?? NEUTRES.titre };
    ligne("generaliste", a.produire(`${principal.famille}.une.generaliste`, "une", FAMILLES[principal.famille]!.une.generaliste, c, LIMITES.une, NEUTRES.une),
      a.produire(`une.chapeau.${n}`, "une", CHAPEAUX[n], cc, LIMITES.chapeau, NEUTRES.chapeau));
  } else {
    ligne("generaliste", a.produire("une.gen.calme", "une", UNE_GENERALISTE.calme, base, LIMITES.une, NEUTRES.une),
      a.produire("une.gen.chapeauCalme", "une", UNE_GENERALISTE.chapeauCalme, base, LIMITES.chapeau, NEUTRES.chapeau));
  }

  // populaire
  const pops = e.indicateurs.filter((x) => POPULAIRE.includes(x.id) && x.sens !== 0);
  const pire = [...pops].filter((x) => x.sens * x.ecartUnites < 0).sort((x, y) => Math.abs(y.ecartUnites) - Math.abs(x.ecartUnites))[0];
  const mieux = [...pops].filter((x) => x.sens * x.ecartUnites > 0).sort((x, y) => Math.abs(y.ecartUnites) - Math.abs(x.ecartUnites))[0];
  const cible = pire && Math.abs(pire.ecartUnites) >= 0.3 ? { ind: pire, sens: "degrade" as const } : null;
  if (cible) {
    const c = { ...base, ...ctxIndicateur(a, `une.${cible.ind.id}`, cible.ind) };
    ligne("populaire", a.produire("une.pop.degrade", "une", UNE_POPULAIRE.degrade, c, LIMITES.une, NEUTRES.une),
      a.produire("une.pop.chapeau", "une", UNE_POPULAIRE.chapeau, c, LIMITES.chapeau, NEUTRES.chapeau));
  } else if (principal && FAMILLES[principal.famille]) {
    const c = ctxs.get(principal.id) ?? base;
    const narre = narres.find((x) => x.id === principal.id);
    ligne("populaire", a.produire(`${principal.famille}.une.populaire`, "une", FAMILLES[principal.famille]!.une.populaire, c, LIMITES.une, NEUTRES.une),
      narre?.briefing && narre.briefing !== NEUTRES.briefing ? narre.briefing.split(/(?<=\.)\s/)[0]! : NEUTRES.chapeau);
  } else if (mieux) {
    const c = { ...base, ...ctxIndicateur(a, `une.${mieux.id}`, mieux) };
    ligne("populaire", a.produire("une.pop.ameliore", "une", UNE_POPULAIRE.ameliore, c, LIMITES.une, NEUTRES.une),
      a.produire("une.pop.chapeau", "une", UNE_POPULAIRE.chapeau, c, LIMITES.chapeau, NEUTRES.chapeau));
  } else {
    ligne("populaire", a.produire("une.gen.calme.pop", "une", UNE_GENERALISTE.calme, base, LIMITES.une, NEUTRES.une),
      a.produire("une.gen.chapeauCalme.pop", "une", UNE_GENERALISTE.chapeauCalme, base, LIMITES.chapeau, NEUTRES.chapeau));
  }
  return titres;
}

function breves(a: Atelier, last: DerniereDecision | null, base: Ctx): string[] {
  const e = a.etat, out: string[] = [];
  const ajouter = (cle: string, v: readonly string[], c: Ctx) => {
    const t = a.produire(`breve.${cle}`, `breve${out.length}`, v, c, LIMITES.breve, "");
    if (t) out.push(t);
  };
  if (last && last.jour >= e.jour - 7) {
    a.source(last.libelle);
    ajouter(last.ok ? "decision" : "decisionRefusee", last.ok ? BREVES.decision : BREVES.decisionRefusee, { ...base, libelle: last.libelle });
  }
  for (const t of e.parlement.textes.filter((x) => x.prochaine).sort((x, y) => x.prochaine!.date.localeCompare(y.prochaine!.date)).slice(0, 2)) {
    a.source(t.titre);
    ajouter("texte", BREVES.texte, { ...base, texte: t.titre, Texte: t.titre, etape: LIBELLES_JALONS[t.prochaine!.nom] ?? "prochaine étape",
      echeance: a.fait(`breve.${t.id}.echeance`, fdate(t.prochaine!.date)) });
  }
  for (const k of e.corps.filter((x) => x.bloque).slice(0, 2)) ajouter("blocage", BREVES.blocage, { ...base, ...ctxCorps(a, `breve.${k.id}`, k.id) });
  // un mur de trésorerie est une sortie massive (pensions, paie, prestations), pas un encaissement
  const mur = e.murs.filter((x) => x.montant < 0).sort((x, y) => x.montant - y.montant)[0];
  if (mur && -mur.montant >= 5e9) {
    a.source(mur.libelle);
    ajouter("mur", BREVES.mur, { ...base, libelle: mur.libelle, echeance: a.fait("breve.mur.date", fdate(mur.date)), montant: a.fait("breve.mur.montant", euros(mur.montant, true)) });
  }
  for (const ind of e.indicateurs.filter((x) => x.publiee && x.publiee.jour > 0 && x.publiee.jour >= e.jour - 7).slice(0, 2)) {
    const c = { ...base, ...ctxIndicateur(a, `breve.${ind.id}`, ind) };
    ajouter("publication", BREVES.publication, { ...c, valeur: c.valeurPubliee ?? c.valeur! });
  }
  ajouter("opinion", BREVES.opinion, base);
  ajouter("capital", BREVES.capital, base);
  return out.slice(0, 8);
}

/**
 * Narration complète d'un tour (Parapheur, notes des conseillers, Une du soir, bandeau d'info).
 * @param state       instantané narratif (session/snapshot.ts)
 * @param dossiers    dossiers du Parapheur, tels que produits par engine/src/dossiers.ts
 * @param lastDecision dernier arbitrage du joueur, pour les brèves
 */
export function buildTurnNarrative(state: EtatNarratif, dossiers: readonly Dossier[], lastDecision: DerniereDecision | null,
  opts: OptionsNarration = {}): NarrationTour {
  const a = new Atelier(state, opts.memoire ?? MEMOIRE_VIDE, opts.fenetreAntiRepetition ?? 3);
  const base = ctxGlobal(a);
  const contextes = new Map<string, { ctx: Ctx; ind: IndicateurNarratif | null }>();
  const opt = new Map<string, ReturnType<typeof options>>();
  for (const d of dossiers) {
    const c = ctxDossier(a, d, base);
    contextes.set(d.id, c);
    opt.set(d.id, options(a, d));
  }
  if (state.scenario) a.source(state.scenario.titre, state.scenario.evenement);
  void a.index;
  const narres = dossiers.map((d) => narrerDossier(a, d, contextes.get(d.id)!, opt.get(d.id)!));
  const titresUne = une(a, narres, dossiers, new Map([...contextes].map(([k, v]) => [k, v.ctx])), base);
  const flash = breves(a, lastDecision, base);
  return {
    jour: state.jour, date: state.date, mode: "gabarit", dossiers: narres,
    une: { jour: state.jour, date: state.date, titres: titresUne }, breves: flash, rejets: a.rejets,
    faits: a.faits, sources: [...a.sources], noms: [...a.noms], memoire: a.memoire,
  };
}
