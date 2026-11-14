/**
 * Simulation d'un mandat : 1 tick = 1 journée, 1 825 jours. Aucune entrée-sortie : l'application fournit
 * la graine validée (parseGraine) et persiste `serialiser()` dans SQLite.
 *
 * Ordre d'un jour : calendrier institutionnel → macro (forme fermée) → flux (jeu et référence) → indicateurs
 * comptables → acteurs → Parlement → dossiers → révélations → interruptions.
 */
import type { Graine } from "../../shared/schema";
import { Acteurs, type CorpsId, type SegmentId } from "./acteurs";
import { HORIZON, references, trajectoires, type Reference } from "./baseline";
import * as cal from "./calendrier";
import { ETAT, PHYSIQUE, SOCIAL } from "./calibration";
import { gabarit, GABARITS, type Gabarit } from "./decisions";
import { FileDossiers, type Dossier } from "./dossiers";
import { GrandLivre, REGLES_DEFAUT, type ContexteFlux, type FluxId, type ReglesFlux } from "./flux";
import { CATALOGUE, idx, N_INDICATEURS } from "./indicateurs";
import { calibrer, Macro, sigma, type Calibration, type Impulsion } from "./macro";
import { CONFIG_PARLEMENT_DEFAUT, estBudgetaire, Parlement, type ConfigParlement, type Texte } from "./parlement";
import { hashSeed, Rng } from "./rng";
import { BOUSSOLE_NEUTRE, MINISTERES, type Boussole, type Interruption, type Journal, type Ministere } from "./types";

export const DUREE_MANDAT = 1825;
const SEUIL_DIVERGENCE = 1.5;
const SEUIL_ANOMALIE = 2.5;

export interface ConfigSimulation {
  seed?: number;
  parlement?: Partial<ConfigParlement>;
  flux?: Partial<ReglesFlux>;
  approbationInitiale?: number;
  dureeMandat?: number;
}

export interface ResultatDecision {
  ok: boolean;
  message: string;
  coutCP: number;
  texte?: Texte;
}

export interface ResultatAvance {
  jours: number;
  interruptions: Interruption[];
  parapheur: Dossier[];
  fin: boolean;
}

interface Applique { gabarit: string; jour: number; date: string; impulsion: string }
interface Engagement { indicateur: string; cible: number; sens: "au_moins" | "au_plus"; annonceLe: number }

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

function median(xs: ArrayLike<number>, n: number): number {
  const s = Array.from({ length: n }, (_, k) => xs[k] as number).sort((a, b) => a - b);
  return n % 2 ? (s[(n - 1) / 2] as number) : ((s[n / 2 - 1] as number) + (s[n / 2] as number)) / 2;
}

export class Simulation {
  readonly debut: string;
  readonly seed: number;
  readonly duree: number;
  readonly calibration: Calibration;
  readonly refs: Reference[];
  private readonly base: Float64Array[];
  jour = 0;
  macro: Macro;
  livre: GrandLivre;
  livreRef: GrandLivre;
  parlement: Parlement;
  acteurs: Acteurs;
  dossiers = new FileDossiers();
  rng: Rng;
  credibilite = 50;
  capitalPolitique = 60;
  opinionHist: number[] = [];
  journal: Journal[] = [];
  appliques: Applique[] = [];
  engagements: Engagement[] = [];
  boussoleJoueur: Boussole = { ...BOUSSOLE_NEUTRE };
  parapheurCourant: Dossier[] = [];
  fin = false;
  plafondAcossBonus = 0;
  plafondsAcoss: Record<number, number> = {};      // plafond d'emprunt fixé par chaque LFSS (jeu)
  plafondsAcossRef: Record<number, number> = {};   // idem, trajectoire de référence
  dernierArret: Record<string, number> = {};       // anti-répétition des murs de trésorerie
  capaciteHebergementMult = 1;
  aieEnAttente = 0;
  annulations: { jour: number; impulsion: string; modifs: string[] }[] = [];
  mesuresBudgetEnAttente: string[] = [];
  revelations: { indicateur: string; jour: number }[] = [];
  /** Dernière valeur publiée de chaque indicateur de bilan et la valeur publiée précédente (narration). */
  publiees: Record<string, { valeur: number; jour: number; precedente: number | null }> = {};
  private historique: Float64Array;             // [indicateur x 30] valeurs du jeu, tampon circulaire
  private valeurs = new Float64Array(N_INDICATEURS);
  private valeursRef = new Float64Array(N_INDICATEURS);
  private ecartsComplets = new Float64Array(N_INDICATEURS);
  private zeros = new Float64Array(N_INDICATEURS);
  private ytd0: number;
  private fin2_0: number;
  private seq = 0;

  constructor(readonly graine: Graine, cfg: ConfigSimulation = {}) {
    this.debut = graine.meta.date_jeu;
    this.seed = cfg.seed ?? hashSeed(`${graine.meta.date_jeu}#${graine.meta.revision}`);
    this.duree = Math.min(cfg.dureeMandat ?? DUREE_MANDAT, HORIZON - 1);
    this.rng = new Rng(this.seed);
    this.calibration = calibrer();
    this.macro = new Macro(this.calibration);
    this.refs = references(graine);
    this.base = trajectoires(this.refs, this.seed);
    this.historique = new Float64Array(N_INDICATEURS * 30);

    this.ytd0 = this.amorcerSolde();
    this.fin2_0 = graine.bilan.find((b) => b.id === "FIN2")?.derniere?.valeur ?? 115;

    const regles = { ...REGLES_DEFAUT, ...cfg.flux };
    this.livre = new GrandLivre(this.debut, this.ytd0, regles);
    this.livreRef = new GrandLivre(this.debut, this.ytd0, regles);
    this.amorcerAcoss();
    const cfgParl = { ...CONFIG_PARLEMENT_DEFAUT, ...cfg.parlement };
    this.parlement = new Parlement(graine.parlement.an, graine.parlement.senat, cfgParl, this.rng);
    this.acteurs = new Acteurs(this.rng, this.groupes(), cfg.approbationInitiale ?? -10);

    for (let i = 0; i < N_INDICATEURS; i++) {
      const v = this.base[i]![0] as number;
      this.valeurs[i] = v;
      this.valeursRef[i] = v;
      for (let k = 0; k < 30; k++) this.historique[i * 30 + k] = v;
    }
    this.initialiserBudgetEnCours();
    this.initialiserRevelations();
    this.importerTour1();
    this.parapheurCourant = this.dossiers.parapheur(0);
  }

  get date(): string {
    return cal.addDays(this.debut, this.jour);
  }

  private groupes(): string[] {
    return this.parlement.an.groupes.map((g) => g.code);
  }

  private log(type: string, message: string): void {
    this.journal.push({ jour: this.jour, date: this.date, type, message });
    if (this.journal.length > 500) this.journal.splice(0, this.journal.length - 500);
  }

  // ------------------------------------------------------------------ initialisation
  private ctxNeutre(): ContexteFlux {
    return {
      multMacro: {}, tauxLongPct: this.base[idx("FIN1")]![0] as number, spreadPct: 0, credibilite: 50,
      plafondAcoss: Number.POSITIVE_INFINITY, vigilance: 0, apportsPetrole: 1, liberationAieMt: 0, capaciteHebergementMult: 1,
    };
  }

  /** Solde budgétaire cumulé au jour 0 = dernière situation mensuelle publiée + flux modélisés jusqu'au jour 0 inclus (inféré). */
  private amorcerSolde(): number {
    const bud = this.graine.bilan.find((b) => b.id === "BUD1")?.derniere;
    if (!bud) return 0;
    const { y, m } = cal.ymd(bud.d);
    const depart = cal.addDays(cal.dernierJourMois(y, m), 1);
    if (depart > this.debut) return bud.valeur;
    const tmp = new GrandLivre(depart, cal.ymd(depart).y === y ? bud.valeur : 0);
    for (let d = depart; d <= this.debut; d = cal.addDays(d, 1)) tmp.step(d, this.ctxNeutre());
    return tmp.soldeEtatAnnee;
  }

  /**
   * Encours Acoss 2026 publié (82,3 Md€) pour un plafond de 83 Md€ : lu comme le point haut d'emprunt de l'année (inféré),
   * sinon le profil infra-mensuel du calendrier (pensions le 9, Urssaf le 15) violerait le plafond légal dès le jour 0.
   * Le jour 0 est recalé pour que le point bas de trésorerie d'ici au 31/12/2026 vaille exactement -82,3 Md€.
   */
  private amorcerAcoss(): void {
    if (cal.ymd(this.debut).y !== 2026) return;
    const tmp = this.livreRef.clone(), a0 = tmp.stocks.tresorerieAcoss;
    let deltaMin = 0;
    for (let d = cal.addDays(this.debut, 1); d <= "2026-12-31"; d = cal.addDays(d, 1)) {
      tmp.step(d, this.ctxNeutre());
      deltaMin = Math.min(deltaMin, tmp.stocks.tresorerieAcoss - a0);
    }
    const initial = -SOCIAL.detteAcossFin2026.valeur - deltaMin;
    this.livre.stocks.tresorerieAcoss = initial;
    this.livreRef.stocks.tresorerieAcoss = initial;
  }

  /** Plafond d'emprunt Acoss de l'année : fixé par la LFSS ; à défaut, valeur publiée (2026, 2027) puis reconduction. */
  plafondAcoss(annee: number, ref = false): number {
    const fixe = (ref ? this.plafondsAcossRef : this.plafondsAcoss)[annee];
    if (fixe !== undefined) return fixe;
    if (annee <= 2026) return SOCIAL.plafondAcoss2026.valeur;
    if (annee === 2027) return SOCIAL.plafondAcoss2027.valeur;
    return this.plafondAcoss(annee - 1, ref);
  }

  /** Besoin de financement de l'Acoss sur l'année suivante : point bas projeté à politique inchangée, majoré de 3 %. */
  private besoinAcoss(livre: GrandLivre, ctx: ContexteFlux): number {
    const tmp = livre.clone(), cible = cal.ymd(this.date).y + 1;
    let min = 0;
    for (let d = cal.addDays(this.date, 1); cal.ymd(d).y <= cible; d = cal.addDays(d, 1)) {
      tmp.step(d, { ...ctx, plafondAcoss: Number.POSITIVE_INFINITY, liberationAieMt: 0 });
      if (cal.ymd(d).y === cible) min = Math.min(min, tmp.stocks.tresorerieAcoss);
    }
    return Math.ceil((-min * 1.03) / 1e9) * 1e9;
  }

  private fixerPlafondAcoss(ref: boolean, mode: "lfss" | "reconduction"): void {
    const annee = cal.ymd(this.date).y + 1;
    const defaut = this.plafondAcoss(annee, ref);
    const v = mode === "reconduction" ? Math.max(defaut, this.plafondAcoss(annee - 1, ref))
      : Math.max(defaut, this.besoinAcoss(ref ? this.livreRef : this.livre, this.contexteFlux(ref ? null : this.macro.ecarts(this.jour))));
    (ref ? this.plafondsAcossRef : this.plafondsAcoss)[annee] = v;
    if (!ref) this.log("tresorerie", `Plafond d'emprunt de l'Acoss pour ${annee} : ${(v / 1e9).toFixed(0)} Md€ (${mode === "lfss" ? "fixé par la LFSS" : "reconduit par la loi spéciale"})`);
  }

  /** Si la partie démarre pendant l'examen du budget, PLF et PLFSS de l'année sont déjà déposés. */
  private initialiserBudgetEnCours(): void {
    const { y } = cal.ymd(this.debut);
    const plf = cal.premierMardiOctobre(y), plfss = cal.depotPlfss(y);
    if (this.debut >= plf && cal.diffDays(plf, this.debut) < 70) this.parlement.deposer(`Projet de loi de finances pour ${y + 1}`, "plf", [], BOUSSOLE_NEUTRE, plf);
    if (this.debut >= plfss && cal.diffDays(plfss, this.debut) < 50) this.parlement.deposer(`Projet de loi de financement de la sécurité sociale pour ${y + 1}`, "plfss", [], BOUSSOLE_NEUTRE, plfss);
  }

  private initialiserRevelations(): void {
    for (const b of this.graine.bilan) {
      if (!b.prochaine.date || !CATALOGUE.some((s) => s.id === b.id)) continue;
      const mois = b.cadence === "mensuelle" ? 1 : b.cadence === "trimestrielle" ? 3 : 12;
      let d = b.prochaine.date;
      while (cal.diffDays(this.debut, d) <= this.duree) {
        const j = cal.diffDays(this.debut, d);
        if (j > 0) this.revelations.push({ indicateur: b.id, jour: j });
        const { y, m } = cal.ymd(d);
        const mm = m + mois;
        d = cal.isoOf(y + Math.floor((mm - 1) / 12), ((mm - 1) % 12) + 1, Math.min(cal.ymd(d).d, 28));
      }
      if (b.derniere) this.publiees[b.id] = { valeur: b.derniere.valeur, jour: 0, precedente: b.precedente?.valeur ?? null };
    }
    this.revelations.sort((a, b) => a.jour - b.jour);
  }

  private importerTour1(): void {
    for (const d of this.graine.tour1.dossiers) {
      const ministere = d.ministere as Ministere | "transversal";
      this.dossiers.ajouter({
        slot: d.slot, source: "graine", famille: d.famille_anomalie, ministere, titre: d.titre, resume: d.resume,
        gravite: d.gravite, creeLe: 0, indicateurs: d.indicateurs, options: this.optionsPour(ministere, d.famille_anomalie),
      });
    }
  }

  optionsPour(ministere: Ministere | "transversal", famille: string): string[] {
    // d'abord les mesures de la même famille, puis celles du ministère concerné
    // le dossier « institutions » de la graine (application des lois, calendrier) relève des mesures de la famille « normes »
    const fam = famille === "institutions" ? "normes" : famille;
    const par = [...GABARITS.filter((g) => g.famille === fam), ...GABARITS.filter((g) => g.ministere === ministere)].map((g) => g.id);
    const out = [...new Set(par)].slice(0, 3);
    return out.length ? out : ["dialogue_social"];
  }

  // ------------------------------------------------------------------ valeurs
  echelle(i: number): number {
    return this.refs[i]!.echelle;
  }

  valeur(id: string): number {
    return this.valeurs[idx(id)] as number;
  }

  valeurReference(id: string): number {
    return this.valeursRef[idx(id)] as number;
  }

  /**
   * Projection des trésoreries sur `jours` jours à politique inchangée (copie du grand livre, état intact) :
   * sert au calendrier des murs de l'interface. Trésorerie de l'État avant refinancement BTF du lundi.
   */
  projectionTresorerie(jours = 30): {
    date: string; etat: number; acoss: number; unedic: number; plafondAcoss: number;
    mouvements: { id: FluxId; montant: number }[]; murs: { libelle: string; montant: number; critique: boolean; compte: string }[];
  }[] {
    const tmp = this.livre.clone();
    const ctx = { ...this.contexteFlux(this.macro.ecarts(this.jour)), liberationAieMt: 0 };
    const out = [];
    for (let k = 1; k <= jours; k++) {
      const d = cal.addDays(this.date, k);
      const r = tmp.step(d, { ...ctx, plafondAcoss: this.plafondAcoss(cal.ymd(d).y) + this.plafondAcossBonus });
      out.push({
        date: d, etat: tmp.stocks.tresorerieEtat, acoss: tmp.stocks.tresorerieAcoss, unedic: tmp.stocks.tresorerieUnedic,
        plafondAcoss: this.plafondAcoss(cal.ymd(d).y) + this.plafondAcossBonus,
        mouvements: r.mouvements.filter((m) => Math.abs(m.montant) >= 1e9).map((m) => ({ id: m.id, montant: m.montant })),
        murs: r.murs.map((m) => ({ libelle: m.libelle, montant: m.montant, critique: m.critique, compte: m.compte })),
      });
    }
    return out;
  }

  /** Normale récente : médiane des 30 derniers jours (base de la détection d'anomalies). */
  normaleRecente(id: string): number {
    const i = idx(id);
    return median(this.historique.subarray(i * 30, i * 30 + 30), 30);
  }

  /** Écart Jeu − Référence en unités d'écart (celui qu'utilisent le score et les dossiers). */
  ecartUnites(id: string): number {
    return this.ecartsComplets[idx(id)] as number;
  }

  private bornes(i: number, v: number): number {
    const s = CATALOGUE[i]!;
    if (s.min !== undefined) v = Math.max(s.min, v);
    if (s.max !== undefined) v = Math.min(s.max, v);
    return v;
  }

  /** Prime de risque (points de %) : crédibilité et dérive de la dette du grand livre concerné (paramètre de conception). */
  private spreadPct(livre: GrandLivre, credibilite: number): number {
    const dette = livre.stocks.detteNegociable / ETAT.detteNegociable.valeur - 1;
    return Math.max(0, (50 - credibilite) / 50) * 1.5 + Math.max(0, dette) * 2;
  }

  private contexteFlux(ecarts: Float64Array | null): ContexteFlux {
    const d = (id: string) => (ecarts ? (ecarts[idx(id)] as number) : 0);
    const bloques = ecarts ? this.acteurs.bloques(this.jour) : [];
    const pertesTva = bloques.reduce((s, c) => s + c.blocage.tva, 0);
    const mult: Partial<Record<FluxId, number>> = {
      tva: (1 + 0.01 * d("MAC3") + 0.01 * d("MAC4")) * (1 - pertesTva),
      ticpe: 1 - 0.005 * d("ENE4"),
      impot_revenu: 1 + 0.01 * d("URS1"),
      impot_societes: 1 + 0.02 * d("MAC3"),
      urssaf: 1 + 0.015 * d("URS1") - 0.01 * d("MAC2"),
      recettes_unedic: 1 + 0.015 * d("URS1"),
      chomage: 1 + 0.03 * d("MAC2"),
      ondam: 1 + 0.01 * d("SAN_M1"),
    };
    const { y } = cal.ymd(this.date);
    const plafond = this.plafondAcoss(y, !ecarts) + (ecarts ? this.plafondAcossBonus : 0);
    const iFin1 = idx("FIN1"), iMet1 = idx("MET1");
    return {
      multMacro: mult,
      tauxLongPct: ecarts ? (this.valeurs[iFin1] as number) : (this.valeursRef[iFin1] as number), // FIN1 inclut déjà la prime de risque
      spreadPct: 0,
      credibilite: ecarts ? this.credibilite : 50,
      plafondAcoss: plafond,
      vigilance: ecarts ? (this.valeurs[iMet1] as number) : (this.valeursRef[iMet1] as number),
      apportsPetrole: bloques.reduce((m, c) => Math.min(m, c.blocage.apportsPetrole), 1),
      liberationAieMt: ecarts ? this.aieEnAttente : 0,
      capaciteHebergementMult: ecarts ? this.capaciteHebergementMult : 1,
    };
  }

  // ------------------------------------------------------------------ pas quotidien
  etapeJour(): Interruption[] {
    if (this.fin) return [];
    this.jour++;
    const t = this.jour, date = this.date;
    const its: Interruption[] = [];
    const stop = (type: Interruption["type"], detail: string, critique = true) => its.push({ type, jour: t, date, detail, critique });
    /** Un même motif de mur ne coupe l'avance rapide qu'une fois par période de 30 jours (il reste signalé). */
    const stopMur = (cle: string, detail: string) => {
      const nouveau = t - (this.dernierArret[cle] ?? -1e9) >= 30;
      if (nouveau) this.dernierArret[cle] = t;
      stop("mur_tresorerie", detail, nouveau);
    };

    // 1. calendrier institutionnel
    const { y, m, d } = cal.ymd(date);
    if (date === cal.premierMardiOctobre(y)) {
      const tx = this.parlement.deposer(`Projet de loi de finances pour ${y + 1}`, "plf", this.mesuresBudgetEnAttente.splice(0), BOUSSOLE_NEUTRE, date);
      stop("institution", `${tx.titre} déposé : 70 jours d'examen`);
    }
    if (date === cal.depotPlfss(y)) {
      const tx = this.parlement.deposer(`Projet de loi de financement de la sécurité sociale pour ${y + 1}`, "plfss", [], BOUSSOLE_NEUTRE, date);
      stop("institution", `${tx.titre} déposé : 50 jours d'examen`);
    }

    if (m === 12 && d === 1) this.fixerPlafondAcoss(true, "lfss");

    // 2. macro en forme fermée
    const ecarts = this.macro.ecarts(t);
    const iFin1 = idx("FIN1");
    for (let i = 0; i < N_INDICATEURS; i++) {
      if (CATALOGUE[i]!.pilote === "flux") continue;
      const b = this.base[i]![t] as number;
      this.valeursRef[i] = this.bornes(i, b + (i === iFin1 ? this.spreadPct(this.livreRef, 50) : 0));
      this.valeurs[i] = this.bornes(i, b + this.echelle(i) * (ecarts[i] as number) + (i === iFin1 ? this.spreadPct(this.livre, this.credibilite) : 0));
    }

    // 3. flux du jeu et de la référence (uchronie comptable)
    const res = this.livre.step(date, this.contexteFlux(ecarts));
    this.livreRef.step(date, this.contexteFlux(null));
    this.aieEnAttente = 0;

    // 4. indicateurs comptables
    const iB = idx("BUD1"), iF = idx("FIN2"), iL = idx("LOG_M3");
    this.valeurs[iB] = this.livre.soldeEtatAnnee;
    this.valeursRef[iB] = this.livreRef.soldeEtatAnnee;
    this.valeurs[iF] = (this.fin2_0 * this.livre.stocks.detteNegociable) / ETAT.detteNegociable.valeur;
    this.valeursRef[iF] = (this.fin2_0 * this.livreRef.stocks.detteNegociable) / ETAT.detteNegociable.valeur;
    const places = PHYSIQUE.placesHebergement.valeur;
    const manque = (s: { demandeHebergement: number; capaciteHebergement: number }) => 100 * (1 + (5 * Math.max(0, s.demandeHebergement - s.capaciteHebergement)) / places);
    this.valeurs[iL] = manque(this.livre.stocks);
    this.valeursRef[iL] = manque(this.livreRef.stocks);
    for (let i = 0; i < N_INDICATEURS; i++) {
      this.ecartsComplets[i] = CATALOGUE[i]!.pilote === "flux"
        ? ((this.valeurs[i] as number) - (this.valeursRef[i] as number)) / this.echelleFlux(i)
        : (ecarts[i] as number);
      this.historique[i * 30 + (t % 30)] = this.valeurs[i] as number;
    }

    // 5. acteurs
    const blocages = this.acteurs.step(t, this.ecartsComplets, this.zeros, this.credibilite);
    for (const c of blocages) {
      this.macro.ajouter(`blocage-${c.id}-${t}`, c.blocage.libelle, "evenement", t, c.blocage.u, { delaiLatence: 2, amplitudePic: 1, tauxErosion: 0.15 });
      this.log("crise", `${c.libelle} : ${c.blocage.libelle}`);
      stop("crise_corps", `${c.libelle} : ${c.blocage.libelle}`);
      this.dossiers.ajouter({ slot: 3, source: "corps", famille: "dialogue", ministere: "travail_solidarites", titre: `Blocage : ${c.blocage.libelle}`,
        resume: `${c.libelle} : radicalisation au-delà du seuil de blocage`, gravite: 4, creeLe: t, indicateurs: Object.keys(c.blocage.u),
        options: ["dialogue_social"], reference: c.id });
    }
    const opinion = this.acteurs.opinion();
    this.opinionHist.push(opinion);
    if (this.opinionHist.length > 400) this.opinionHist.shift();
    // régénération calibrée pour environ 150 à 220 arbitrages payants sur un quinquennat (paramètre de conception)
    this.capitalPolitique = clamp(this.capitalPolitique + 0.7 + 0.008 * Math.max(0, opinion + 30), 0, this.parlement.plafondCP);
    this.credibilite = clamp(this.credibilite + 0.01 * (50 - this.credibilite), 0, 100);

    // 6. Parlement
    for (const ev of this.parlement.traiterJour(date, opinion, this.credibilite)) {
      if (ev.texte?.type === "plfss" && (ev.type === "texte_adopte" || ev.type === "ordonnance")) this.fixerPlafondAcoss(false, "lfss");
      if (ev.texte?.type === "plfss" && ev.type === "loi_speciale") this.fixerPlafondAcoss(false, "reconduction");
      if ((ev.type === "texte_adopte" || ev.type === "ordonnance") && ev.texte) {
        for (const gid of ev.texte.gabarits) this.appliquer(gabarit(gid), `texte ${ev.texte.id}`);
        this.log("parlement", `${ev.texte.titre} : ${ev.detail}`);
        if (ev.type === "ordonnance") this.capitalPolitique = clamp(this.capitalPolitique - 10, 0, this.parlement.plafondCP);
      } else if (ev.type === "censure_adoptee") {
        const plafond = this.parlement.demissionMatignon();
        this.capitalPolitique = Math.min(this.capitalPolitique, plafond);
        this.credibilite = clamp(this.credibilite - 5, 0, 100);
        this.log("parlement", `Motion de censure adoptée (${ev.detail}) : démission du gouvernement, plafond de capital politique ramené à ${plafond.toFixed(1)}`);
        stop("echeance_parlementaire", `Censure adoptée : ${ev.detail}`);
      } else if (ev.type === "loi_speciale") {
        this.credibilite = clamp(this.credibilite - 8, 0, 100);
        this.log("parlement", `${ev.texte?.titre} : ${ev.detail}`);
        stop("echeance_parlementaire", ev.detail);
      } else if (ev.type === "elections") {
        const o90 = this.opinion90();
        this.parlement.elections(o90);
        this.log("parlement", `Élections législatives anticipées (opinion moyenne sur 90 jours : ${o90.toFixed(1)})`);
        stop("echeance_parlementaire", "Résultats des élections législatives anticipées");
      } else this.log("parlement", ev.detail);
    }
    for (const ev of this.parlement.verifierPromesses(date, (depuis, g) => this.appliques.some((a) => a.gabarit === g && a.date >= depuis))) {
      if (ev.type === "promesse_rompue") { this.credibilite = clamp(this.credibilite - 15, 0, 100); stop("promesse", `Promesse rompue avec ${ev.detail} : alliance verrouillée 180 jours`); }
      this.log("promesse", `${ev.type === "promesse_tenue" ? "Promesse tenue" : "Promesse rompue"} : ${ev.detail}`);
    }
    for (const { texte, jalon } of this.parlement.echeancesProches(date, 1)) {
      if (jalon.nom === "commission") continue;
      stop("echeance_parlementaire", `${texte.titre} : ${jalon.nom.replace("_", " ")} le ${jalon.date}`);
      this.dossiers.ajouter({ slot: 2, source: "institution", famille: "parlement", ministere: "transversal", titre: `${texte.titre} : ${jalon.nom.replace("_", " ")}`,
        resume: `Échéance du ${jalon.date}. Seuil de censure : ${this.parlement.seuilCensure()} voix.`, gravite: 3, creeLe: t, indicateurs: [], options: [], reference: texte.id });
    }
    for (const p of this.parlement.promesses) if (p.statut === "active" && cal.diffDays(date, p.echeance) === 2) stop("promesse", `Promesse envers ${p.groupe} : échéance le ${p.echeance}`);
    if (cal.weekday(date) === 3 && !this.parlement.enElections()) this.motionSpontanee(opinion, stop);

    // 7. trésorerie : murs du jour et du lendemain
    for (const mur of res.murs) if (mur.critique) stopMur(mur.raison ?? mur.libelle, `${mur.libelle} : ${mur.raison ?? "mur critique"}`);
    for (const a of res.alertes) {
      this.log("tresorerie", a);
      if (a.startsWith("Plafond")) {
        this.dossiers.ajouter({ slot: 2, source: "institution", famille: "budget", ministere: "economie_finances", titre: "Plafond d'emprunt de l'Acoss dépassé",
          resume: a, gravite: 5, creeLe: t, indicateurs: [], options: ["relevement_plafond_acoss", "hausse_csg"], reference: "acoss" });
        stopMur("plafond_acoss", a);
      } else if (a.startsWith("Adjudication")) this.credibilite = clamp(this.credibilite - 2, 0, 100);
    }
    const demain = this.livre.projeter(cal.addDays(date, 1), this.contexteFlux(ecarts));
    for (const mur of demain.murs) if (mur.critique) stopMur(mur.raison ?? mur.libelle, `Demain : ${mur.libelle} (${mur.raison ?? "mur critique"})`);

    // 8. annulations par le Conseil d'État
    for (const a of this.annulations.filter((x) => x.jour === t)) {
      this.macro.annuler(a.impulsion, t);
      this.livre.modificateurs = this.livre.modificateurs.filter((mo) => !a.modifs.includes(mo.id));
      this.capitalPolitique = clamp(this.capitalPolitique - 5, 0, this.parlement.plafondCP);
      this.log("decret", `Le Conseil d'État annule un décret (${a.impulsion}) : effets retirés`);
    }
    this.annulations = this.annulations.filter((x) => x.jour !== t);

    // 9. dossiers : les échéances d'un texte sorti de la navette disparaissent ; l'expiration ne pénalise que les dossiers arbitrables
    this.dossiers.file = this.dossiers.file.filter((x) => x.source !== "institution" || !x.reference?.startsWith("T") || this.parlement.texte(x.reference)?.statut === "en_cours");
    for (const exp of this.dossiers.vieillir().filter((x) => x.options.length > 0)) {
      this.acteurs.appliquerEffets(undefined, Object.fromEntries(this.acteurs.segments.map((s) => [s.id, -2])) as Partial<Record<SegmentId, number>>);
      if (exp.ministere !== "transversal") this.acteurs.ajouterTension(exp.ministere, 10);
      this.log("dossier", `Dossier non traité pendant 60 jours : ${exp.titre}`);
    }
    this.genererDossiers(t, stop);
    for (const x of this.dossiers.file) {
      if (x.gravite >= 4 && !x.urgenceSignalee && x.options.length > 0) { x.urgenceSignalee = true; stop("urgence", `${x.titre} (gravité ${x.gravite.toFixed(1)})`); }
    }

    // 10. révélations des indicateurs de bilan
    while (this.revelations.length && this.revelations[0]!.jour <= t) {
      const r = this.revelations.shift()!;
      this.reveler(r.indicateur, t, stop);
    }

    if (t % 30 === 0) this.macro.compacter(t);
    if (t >= this.duree) { this.fin = true; stop("fin_mandat", "Fin du mandat : 1 825 jours"); }
    this.parapheurCourant = this.dossiers.parapheur(t);
    return its;
  }

  private echelleFlux(i: number): number {
    const id = CATALOGUE[i]!.id;
    if (id === "BUD1") return 0.01 * Math.abs(ETAT.chargeDette.valeur + 76_000_000_000); // 1 % d'un déficit annuel d'environ 128 Md€ (inféré)
    if (id === "FIN2") return 0.5;
    return 2;
  }

  opinion90(): number {
    const h = this.opinionHist.slice(-90);
    return h.length ? h.reduce((s, x) => s + x, 0) / h.length : 0;
  }

  private motionSpontanee(opinion: number, stop: (type: Interruption["type"], detail: string, critique?: boolean) => void): void {
    const rel = this.parlement.an.groupes.reduce((s, g) => s + g.relation * g.sieges, 0) / Math.max(1, this.parlement.an.siegesTotal);
    if (rel < -0.35 && opinion < -30 && this.rng.chance(0.15)) {
      const m = this.parlement.motionCensure(opinion, this.credibilite, false);
      this.log("parlement", `Motion de censure spontanée (art. 49 al. 2) : ${m.pour} voix pour, seuil ${m.seuil}`);
      if (m.adoptee) {
        const plafond = this.parlement.demissionMatignon();
        this.capitalPolitique = Math.min(this.capitalPolitique, plafond);
        stop("echeance_parlementaire", `Motion de censure spontanée adoptée (${m.pour} voix)`);
      }
    }
  }

  private genererDossiers(t: number, stop: (type: Interruption["type"], detail: string, critique?: boolean) => void): void {
    for (let i = 0; i < N_INDICATEURS; i++) {
      const s = CATALOGUE[i]!;
      const delta = this.ecartsComplets[i] as number;
      const defavorable = s.sens !== 0 && s.sens * delta < 0;
      if (s.origine === "pilotage") {
        const hist = this.historique.subarray(i * 30, i * 30 + 30);
        const z = ((this.valeurs[i] as number) - median(hist, 30)) / this.echelle(i);
        // divergence = part de l'écart imputable aux seules DÉCISIONS du joueur (événements et blocages exclus),
        // favorable ou défavorable : un effet massif d'une décision appelle un arbitrage dans les deux cas
        const part = Math.abs(delta) >= SEUIL_DIVERGENCE ? this.partDecisions(i) : 0;
        const divergence = Math.abs(part) >= SEUIL_DIVERGENCE;
        if (Math.abs(z) >= SEUIL_ANOMALIE || divergence) {
          const gravite = clamp(1 + Math.max(Math.abs(z) - SEUIL_ANOMALIE, divergence ? Math.abs(part) - SEUIL_DIVERGENCE : 0), 1, 5);
          const d = this.dossiers.ajouter({
            slot: 1, source: divergence ? "divergence" : "donnees", famille: s.famille, ministere: s.ministere,
            titre: `${s.libelle} : ${z > 0 || delta > 0 ? "hausse" : "baisse"} inhabituelle`,
            resume: divergence ? `Écart de ${part.toFixed(1)} unités à la trajectoire de référence, imputable aux décisions` : `Écart de ${z.toFixed(1)} unités à la médiane des 30 derniers jours`,
            gravite, creeLe: t, indicateurs: [s.id], options: this.optionsPour(s.ministere, s.famille),
          });
        }
      } else if (Math.abs(delta) >= SEUIL_DIVERGENCE && defavorable && t % 7 === 0) {
        this.acteurs.ajouterTension(s.ministere, 2 * Math.abs(delta));
      }
    }
    for (const mi of this.acteurs.ministres) {
      if (mi.tension > 70) this.dossiers.ajouter({ slot: 3, source: "ministere", famille: "ministre", ministere: mi.ministere,
        titre: `Ministre sous pression (${mi.ministere.replace(/_/g, " ")})`, resume: `${mi.nom} : tension sectorielle de ${mi.tension.toFixed(0)} sur 100`,
        gravite: 2 + mi.tension / 50, creeLe: t, indicateurs: [], options: this.optionsPour(mi.ministere, ""), reference: mi.ministere });
    }
    for (const c of this.acteurs.corps) {
      if (c.radicalisation > 60 && c.bloqueJusqua === null) this.dossiers.ajouter({ slot: 3, source: "corps", famille: "dialogue", ministere: "travail_solidarites",
        titre: `Tensions avec : ${c.libelle}`, resume: `Radicalisation ${c.radicalisation.toFixed(0)} sur 100 (blocage au-delà de 75)`,
        gravite: 1 + (c.radicalisation - 60) / 5, creeLe: t, indicateurs: [], options: ["dialogue_social"], reference: c.id });
    }
  }

  /** Somme des contributions des impulsions d'origine « decision » à l'écart (unités d'écart) de l'indicateur i. */
  partDecisions(i: number): number {
    const decisions = new Set(this.macro.impulsions.filter((x) => x.origine === "decision").map((x) => x.id));
    return this.macro.attribution(this.jour, i).reduce((s, p) => s + (decisions.has(p.id) ? p.contribution : 0), 0);
  }

  private reveler(id: string, t: number, stop: (type: Interruption["type"], detail: string, critique?: boolean) => void): void {
    const i = idx(id);
    const v = this.valeurs[i] as number;
    const avant = this.publiees[id]?.valeur;
    this.publiees[id] = { valeur: v, jour: t, precedente: avant ?? null };
    const slot = CATALOGUE[i]!;
    let message = `Révélation ${id} : ${slot.libelle} = ${v.toFixed(2)} ${slot.unite}`;
    for (const e of this.engagements.filter((x) => x.indicateur === id)) {
      const tenu = e.sens === "au_moins" ? v >= e.cible : v <= e.cible;
      this.credibilite = clamp(this.credibilite + (tenu ? 3 : -10), 0, 100);
      message += tenu ? " ; engagement tenu" : ` ; engagement manqué (cible ${e.cible})`;
      if (!tenu) stop("revelation", message, false);
    }
    this.engagements = this.engagements.filter((x) => x.indicateur !== id);
    if (avant !== undefined && slot.sens !== 0 && Math.abs(v - avant) > 2 * this.echelle(i)) {
      this.dossiers.ajouter({ slot: 3, source: "publication", famille: "publication", ministere: slot.ministere, titre: `Publication : ${slot.libelle}`,
        resume: message, gravite: 2, creeLe: t, indicateurs: [id], options: this.optionsPour(slot.ministere, slot.famille) });
    }
    this.log("revelation", message);
  }

  // ------------------------------------------------------------------ pacing adaptatif
  /** Avance par blocs de 7 jours au plus, interrompue au premier événement bloquant. Progresse toujours d'au moins 1 jour. */
  avancer(maxJours = 7): ResultatAvance {
    const toutes: Interruption[] = [];
    let n = 0;
    while (n < maxJours && !this.fin) {
      const its = this.etapeJour();
      n++;
      toutes.push(...its);
      if (its.some((x) => x.critique)) break;
    }
    return { jours: n, interruptions: toutes, parapheur: this.parapheurCourant, fin: this.fin };
  }

  // ------------------------------------------------------------------ décisions
  private appliquer(g: Gabarit, origine: string): string {
    const t = this.jour, date = this.date;
    const id = `${g.id}#${++this.seq}`;
    const imp: Impulsion = this.macro.ajouter(id, g.libelle, "decision", t, g.u, g.inertie);
    const modifs: string[] = [];
    for (const f of g.flux ?? []) {
      const mid = `${id}:${f.flux}`;
      this.livre.modificateurs.push({ id: mid, flux: f.flux, facteur: f.facteur, debut: date, ...(f.dureeJours ? { fin: cal.addDays(date, f.dureeJours) } : {}) });
      modifs.push(mid);
    }
    this.acteurs.appliquerEffets(g.corps, g.segments, g.radicalisationCorps);
    if (g.credibilite) this.credibilite = clamp(this.credibilite + g.credibilite, 0, 100);
    if (g.aieMt) this.aieEnAttente += Math.min(g.aieMt, this.livre.stocks.petrole);
    if (g.capaciteHebergement) this.capaciteHebergementMult += g.capaciteHebergement;
    if (g.plafondAcoss) this.plafondAcossBonus += g.plafondAcoss;
    this.acteurs.ajouterTension(g.ministere, -10);
    const n = this.appliques.length + 1;
    for (const k of Object.keys(this.boussoleJoueur) as (keyof Boussole)[]) this.boussoleJoueur[k] += (g.boussole[k] - this.boussoleJoueur[k]) / n;
    this.appliques.push({ gabarit: g.id, jour: t, date, impulsion: imp.id });
    this.log("decision", `${g.libelle} (${origine})`);
    return id + "|" + modifs.join(",");
  }

  /** Décision du joueur. Les lois et lois financières rectificatives passent par le Parlement. */
  decider(gabaritId: string, dossierId?: string): ResultatDecision {
    if (this.fin) return { ok: false, message: "mandat terminé", coutCP: 0 };
    const g = gabarit(gabaritId);
    let cout = g.coutCP, risque = 0;
    if (g.instrument === "decret") ({ cout, risque } = this.parlement.coutDecret(this.date, g.coutCP));
    if (cout > this.capitalPolitique) return { ok: false, message: `capital politique insuffisant (${this.capitalPolitique.toFixed(1)} pour ${cout.toFixed(1)})`, coutCP: cout };
    if ((g.instrument === "loi" || g.instrument === "plfr" || g.instrument === "plfssr") && this.parlement.enElections())
      return { ok: false, message: "Assemblée dissoute : aucun texte ne peut être déposé", coutCP: 0 };
    this.capitalPolitique -= cout;
    if (dossierId) this.dossiers.retirer(dossierId);
    if (g.instrument === "decret" || g.instrument === "executif") {
      const ref = this.appliquer(g, g.instrument);
      if (g.instrument === "decret") {
        this.parlement.enregistrerDecret(this.date);
        if (risque > 0 && this.rng.chance(risque)) {
          const [imp, modifs] = ref.split("|") as [string, string];
          this.annulations.push({ jour: this.jour + 30, impulsion: imp, modifs: modifs ? modifs.split(",") : [] });
        }
      }
      this.parapheurCourant = this.dossiers.parapheur(this.jour);
      return { ok: true, message: `${g.libelle} : effet immédiat`, coutCP: cout };
    }
    const type = g.instrument === "loi" ? "loi" : g.instrument;
    const texte = this.parlement.deposer(g.libelle, type, [g.id], g.boussole, this.date);
    this.log("parlement", `Dépôt : ${texte.titre}`);
    this.parapheurCourant = this.dossiers.parapheur(this.jour);
    return { ok: true, message: `${texte.titre} déposé : vote de l'Assemblée le ${texte.jalons.find((j) => j.nom === "vote_an")?.date}`, coutCP: cout, texte };
  }

  engager493(texteId: string): ResultatDecision {
    const t = this.parlement.texte(texteId);
    if (!t) return { ok: false, message: "texte inconnu", coutCP: 0 };
    const p = this.parlement.peut493(t, this.date);
    if (!p.ok) return { ok: false, message: p.raison, coutCP: 0 };
    const cout = 15 + Math.max(0, -this.acteurs.opinion()) / 10;
    if (cout > this.capitalPolitique) return { ok: false, message: "capital politique insuffisant", coutCP: cout };
    this.capitalPolitique -= cout;
    this.parlement.engager493(t, this.date);
    this.acteurs.appliquerEffets(undefined, Object.fromEntries(this.acteurs.segments.map((s) => [s.id, -3])) as Partial<Record<SegmentId, number>>);
    this.log("parlement", `Article 49.3 engagé sur ${t.titre} : motion de censure le ${cal.addDays(this.date, 2)}`);
    return { ok: true, message: `49.3 engagé (${p.raison})`, coutCP: cout, texte: t };
  }

  signerPromesse(groupe: string, gabaritId: string, type: "adopter" | "renoncer", jours: number): ResultatDecision {
    gabarit(gabaritId);
    if (this.capitalPolitique < 5) return { ok: false, message: "capital politique insuffisant", coutCP: 5 };
    try {
      const p = this.parlement.signerPromesse(groupe, { type, gabarit: gabaritId }, this.date, jours);
      this.capitalPolitique -= 5;
      this.log("promesse", `Promesse à ${groupe} : ${type} ${gabaritId} avant le ${p.echeance}`);
      return { ok: true, message: `promesse signée, échéance ${p.echeance}`, coutCP: 5 };
    } catch (e) {
      return { ok: false, message: (e as Error).message, coutCP: 0 };
    }
  }

  remanier(ministere: Ministere): ResultatDecision {
    const cout = 10;
    if (this.capitalPolitique < cout) return { ok: false, message: "capital politique insuffisant", coutCP: cout };
    this.capitalPolitique -= cout;
    const { ancien, nouveau } = this.acteurs.remanier(ministere, this.jour, this.rng, this.groupes());
    const pivot = this.parlement.an.groupes.find((g) => g.code === ancien.groupePivot);
    if (pivot) pivot.relation = clamp(pivot.relation - 0.15, -1, 1);
    this.dossiers.file = this.dossiers.file.filter((d) => !(d.source === "ministere" && d.reference === ministere));
    this.log("remaniement", `${ancien.nom} remplacé par ${nouveau.nom} (${ministere})`);
    return { ok: true, message: `${nouveau.nom} nommé`, coutCP: cout };
  }

  changerMatignon(): ResultatDecision {
    const plafond = this.parlement.demissionMatignon();
    this.capitalPolitique = Math.min(this.capitalPolitique, plafond);
    this.log("matignon", `Démission du Premier ministre : plafond de capital politique ${plafond.toFixed(1)}`);
    return { ok: true, message: `nouveau gouvernement, plafond de capital politique ${plafond.toFixed(1)}`, coutCP: 0 };
  }

  dissoudre(): ResultatDecision {
    const p = this.parlement.peutDissoudre(this.date);
    if (!p.ok) return { ok: false, message: p.raison, coutCP: 0 };
    if (this.capitalPolitique < 30) return { ok: false, message: "capital politique insuffisant", coutCP: 30 };
    this.capitalPolitique -= 30;
    const le = this.parlement.dissoudre(this.date);
    this.log("dissolution", `Dissolution : élections le ${le}`);
    return { ok: true, message: `élections le ${le} ; résultat fondé sur l'opinion moyenne des 90 derniers jours`, coutCP: 30 };
  }

  annoncerObjectif(indicateur: string, cible: number, sens: "au_moins" | "au_plus"): ResultatDecision {
    idx(indicateur);
    this.engagements.push({ indicateur, cible, sens, annonceLe: this.jour });
    this.log("engagement", `Objectif public : ${indicateur} ${sens === "au_moins" ? ">=" : "<="} ${cible}`);
    return { ok: true, message: "objectif annoncé, vérifié à la prochaine publication", coutCP: 0 };
  }

  /** Actions toujours disponibles : avancer n'est jamais bloqué (pas de soft-lock). */
  actionsDisponibles(): { type: string; cible?: string; ok: boolean; raison?: string }[] {
    const out: { type: string; cible?: string; ok: boolean; raison?: string }[] = [{ type: "avancer", ok: !this.fin }];
    for (const d of this.parapheurCourant) for (const o of d.options) {
      const g = gabarit(o);
      const cout = g.instrument === "decret" ? this.parlement.coutDecret(this.date, g.coutCP).cout : g.coutCP;
      out.push({ type: "decider", cible: o, ok: cout <= this.capitalPolitique, raison: cout <= this.capitalPolitique ? undefined : "capital politique insuffisant" });
    }
    for (const t of this.parlement.textes) if (t.statut === "en_cours") {
      const p = this.parlement.peut493(t, this.date);
      out.push({ type: "engager493", cible: t.id, ok: p.ok, raison: p.raison });
    }
    const dis = this.parlement.peutDissoudre(this.date);
    out.push({ type: "dissoudre", ok: dis.ok, raison: dis.raison });
    return out;
  }

  // ------------------------------------------------------------------ lecture d'état et score
  attribution(id: string): { id: string; libelle: string; contribution: number }[] {
    const i = idx(id);
    return this.macro.attribution(this.jour, i).map((p) => ({ ...p, contribution: p.contribution * this.echelle(i) }));
  }

  score(): { opinion: number; indicateurs: number; credibilite: number; dette: number; reformesLatentes: number; total: number } {
    let ind = 0, n = 0;
    for (let i = 0; i < N_INDICATEURS; i++) {
      const s = CATALOGUE[i]!;
      if (s.sens === 0) continue;
      ind += s.sens * (this.ecartsComplets[i] as number);
      n++;
    }
    let latent = 0;
    for (const imp of this.macro.impulsions) {
      if (imp.origine !== "decision" || imp.inertie.tauxErosion > 0) continue;
      const reste = imp.inertie.amplitudePic - sigma(this.jour - imp.t0, imp.inertie);
      for (let i = 0; i < N_INDICATEURS; i++) latent += (CATALOGUE[i]!.sens || 0) * (imp.Mu[i] as number) * reste;
    }
    const dette = (this.livre.stocks.detteNegociable - this.livreRef.stocks.detteNegociable) / ETAT.detteNegociable.valeur * 100;
    const opinion = this.opinion90();
    const indicateurs = n ? (ind / n) * 25 : 0;
    const total = 0.4 * opinion + 0.3 * indicateurs + 0.2 * (this.credibilite - 50) - 0.1 * dette * 10 + 2 * latent;
    return { opinion, indicateurs, credibilite: this.credibilite, dette, reformesLatentes: latent, total };
  }

  /** Vue complète pour l'interface (Cockpit, Hémicycle, Murs de trésorerie, Parapheur). */
  vue() {
    return {
      jour: this.jour, date: this.date, fin: this.fin,
      capitalPolitique: this.capitalPolitique, plafondCP: this.parlement.plafondCP, credibilite: this.credibilite,
      opinion: this.acteurs.opinion(), opinion90: this.opinion90(), boussole: this.boussoleJoueur,
      indicateurs: CATALOGUE.map((s, i) => ({
        id: s.id, libelle: s.libelle, unite: s.unite, ministere: s.ministere, origine: s.origine,
        jeu: this.valeurs[i] as number, reference: this.valeursRef[i] as number, ecart: this.ecartsComplets[i] as number,
        publiee: this.publiees[s.id] ?? null,
      })),
      tresorerie: { ...this.livre.stocks, soldeEtatAnnee: this.livre.soldeEtatAnnee, chargeInterets: this.livre.chargeAnnuelleInterets() },
      murs30j: this.livre.calendrier(cal.addDays(this.date, 1), 30),
      hemicycle: { seuilCensure: this.parlement.seuilCensure(), an: this.parlement.an, senat: this.parlement.senat, textes: this.parlement.textes.filter((t) => t.statut === "en_cours") },
      acteurs: { segments: this.acteurs.segments, corps: this.acteurs.corps, ministres: this.acteurs.ministres },
      parapheur: this.parapheurCourant, file: this.dossiers.file, journal: this.journal.slice(-30), score: this.score(),
    };
  }

  // ------------------------------------------------------------------ sauvegarde
  serialiser(): string {
    return JSON.stringify({
      v: 1, seed: this.seed, debut: this.debut, duree: this.duree, jour: this.jour, rng: this.rng.etat,
      macro: this.macro.impulsions.map((x) => ({ ...x, u: Array.from(x.u), Mu: undefined })),
      livre: this.livre, livreRef: this.livreRef, parlement: this.parlement, acteurs: this.acteurs,
      dossiers: { file: this.dossiers.file, historiqueSlot1: this.dossiers.historiqueSlot1, seq: this.dossiers.seq },
      etat: {
        credibilite: this.credibilite, capitalPolitique: this.capitalPolitique, opinionHist: this.opinionHist, journal: this.journal,
        appliques: this.appliques, engagements: this.engagements, boussoleJoueur: this.boussoleJoueur, fin: this.fin,
        plafondAcossBonus: this.plafondAcossBonus, plafondsAcoss: this.plafondsAcoss, plafondsAcossRef: this.plafondsAcossRef, dernierArret: this.dernierArret,
        capaciteHebergementMult: this.capaciteHebergementMult, aieEnAttente: this.aieEnAttente,
        annulations: this.annulations, mesuresBudgetEnAttente: this.mesuresBudgetEnAttente, revelations: this.revelations, publiees: this.publiees,
        historique: Array.from(this.historique), valeurs: Array.from(this.valeurs), valeursRef: Array.from(this.valeursRef),
        ecartsComplets: Array.from(this.ecartsComplets), seq: this.seq,
      },
    });
  }

  static restaurer(graine: Graine, json: string, cfg: ConfigSimulation = {}): Simulation {
    const s = JSON.parse(json);
    const sim = new Simulation(graine, { ...cfg, seed: s.seed, dureeMandat: s.duree });
    sim.jour = s.jour;
    sim.rng.etat = s.rng;
    sim.macro.impulsions.length = 0;
    for (const x of s.macro) {
      const u = Float64Array.from(x.u as number[]);
      sim.macro.impulsions.push({ ...x, u, Mu: sim.macro.M.mulVec(u) });
    }
    delete s.livre.ouvresCache; // cache interne (Map), reconstruit à la demande
    delete s.livreRef.ouvresCache;
    Object.assign(sim.livre, s.livre);
    Object.assign(sim.livreRef, s.livreRef);
    Object.assign(sim.parlement, s.parlement);
    Object.assign(sim.acteurs, s.acteurs);
    sim.dossiers.file = s.dossiers.file;
    sim.dossiers.historiqueSlot1 = s.dossiers.historiqueSlot1;
    sim.dossiers.seq = s.dossiers.seq;
    const e = s.etat;
    Object.assign(sim, {
      credibilite: e.credibilite, capitalPolitique: e.capitalPolitique, opinionHist: e.opinionHist, journal: e.journal,
      appliques: e.appliques, engagements: e.engagements, boussoleJoueur: e.boussoleJoueur, fin: e.fin,
      plafondAcossBonus: e.plafondAcossBonus, plafondsAcoss: e.plafondsAcoss, plafondsAcossRef: e.plafondsAcossRef, dernierArret: e.dernierArret,
      capaciteHebergementMult: e.capaciteHebergementMult, aieEnAttente: e.aieEnAttente,
      annulations: e.annulations, mesuresBudgetEnAttente: e.mesuresBudgetEnAttente, revelations: e.revelations, publiees: e.publiees, seq: e.seq,
    });
    sim.historique = Float64Array.from(e.historique);
    sim.valeurs = Float64Array.from(e.valeurs);
    sim.valeursRef = Float64Array.from(e.valeursRef);
    sim.ecartsComplets = Float64Array.from(e.ecartsComplets);
    sim.parapheurCourant = sim.dossiers.parapheur(sim.jour);
    return sim;
  }
}

export { MINISTERES };
export type { CorpsId };
