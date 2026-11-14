/**
 * Ordonnanceur comptable « Stocks vs Flux » au pas Δt = 1 jour :  S(t+1) = S(t) + Σ entrées(t) − Σ sorties(t).
 *
 * Calendrier (règles sourcées dans calendrier.ts et calibration.ts) :
 * - quotidien (jours ouvrés) : TVA, TICPE, autres recettes ; fonctionnement, intervention, investissement de l'État ;
 *   remboursements de soins (ONDAM) côté Acoss ;
 * - mensuel : CAF le 5, pensions le 9, impôt prélevé à la source, encaissements Urssaf et allocations chômage le 15,
 *   coupons et tombées de dette le 25, paie des agents de l'État le 28, DGF et prélèvements sur recettes par douzièmes ;
 * - hebdomadaire : adjudications d'OAT les 1er et 3e jeudis (règlement à J+2 ouvrés), BTF le lundi ;
 * - trimestriel : acomptes d'IS les 15 mars, juin, septembre, décembre.
 * Une échéance tombant un jour non ouvré est reportée au jour ouvré suivant.
 *
 * Les stocks physiques (pétrole, places d'hébergement) ne peuvent jamais devenir négatifs.
 */
import * as cal from "./calendrier";
import { ENCAISSEMENTS_ACOSS, ETAT, PHYSIQUE, SOCIAL, TAUX_APPARENT_INITIAL } from "./calibration";

export type Compte = "etat" | "acoss" | "unedic";

export type FluxId =
  | "tva" | "ticpe" | "autres_recettes" | "impot_revenu" | "impot_societes"
  | "fonctionnement" | "intervention" | "investissement" | "personnel" | "dgf" | "psr_collectivites" | "psr_ue"
  | "charge_dette" | "amortissement" | "emission_oat" | "btf"
  | "ondam" | "caf" | "pensions" | "urssaf" | "chomage" | "recettes_unedic" | "interets_acoss";

type Regle =
  | { type: "ouvre" }
  | { type: "mensuel"; jour: number }
  | { type: "paie" }
  | { type: "trimestriel_is" };

interface DefFlux {
  id: FluxId;
  compte: Compte;
  sens: 1 | -1;
  annuel: number;
  regle: Regle;
  libelle: string;
}

const autresPsr = ETAT.psrCollectivites.valeur - ETAT.dgf.valeur;

const DEFS: readonly DefFlux[] = [
  { id: "tva", compte: "etat", sens: 1, annuel: ETAT.tva.valeur, regle: { type: "ouvre" }, libelle: "TVA" },
  { id: "ticpe", compte: "etat", sens: 1, annuel: ETAT.ticpe.valeur, regle: { type: "ouvre" }, libelle: "Accises énergétiques (TICPE)" },
  { id: "autres_recettes", compte: "etat", sens: 1, annuel: ETAT.autresFiscales.valeur + ETAT.nonFiscales.valeur, regle: { type: "ouvre" }, libelle: "Autres recettes" },
  { id: "impot_revenu", compte: "etat", sens: 1, annuel: ETAT.impotRevenu.valeur, regle: { type: "mensuel", jour: 15 }, libelle: "Impôt sur le revenu (prélèvement à la source)" },
  { id: "impot_societes", compte: "etat", sens: 1, annuel: ETAT.impotSocietes.valeur, regle: { type: "trimestriel_is" }, libelle: "Acompte d'impôt sur les sociétés" },
  { id: "fonctionnement", compte: "etat", sens: -1, annuel: ETAT.fonctionnement.valeur, regle: { type: "ouvre" }, libelle: "Fonctionnement de l'État" },
  { id: "intervention", compte: "etat", sens: -1, annuel: ETAT.intervention.valeur, regle: { type: "ouvre" }, libelle: "Dépenses d'intervention" },
  { id: "investissement", compte: "etat", sens: -1, annuel: ETAT.investissement.valeur, regle: { type: "ouvre" }, libelle: "Investissement de l'État" },
  { id: "personnel", compte: "etat", sens: -1, annuel: ETAT.personnel.valeur, regle: { type: "paie" }, libelle: "Paie des agents de l'État" },
  { id: "dgf", compte: "etat", sens: -1, annuel: ETAT.dgf.valeur, regle: { type: "mensuel", jour: 1 }, libelle: "DGF (douzième)" },
  { id: "psr_collectivites", compte: "etat", sens: -1, annuel: autresPsr, regle: { type: "mensuel", jour: 1 }, libelle: "Autres prélèvements au profit des collectivités" },
  { id: "psr_ue", compte: "etat", sens: -1, annuel: ETAT.psrUnionEuropeenne.valeur, regle: { type: "mensuel", jour: 1 }, libelle: "Prélèvement au profit de l'Union européenne" },
  { id: "ondam", compte: "acoss", sens: -1, annuel: SOCIAL.ondam.valeur, regle: { type: "ouvre" }, libelle: "Remboursements de soins (ONDAM)" },
  { id: "caf", compte: "acoss", sens: -1, annuel: SOCIAL.prestationsCnaf.valeur, regle: { type: "mensuel", jour: 5 }, libelle: "Prestations CAF" },
  { id: "pensions", compte: "acoss", sens: -1, annuel: SOCIAL.pensionsBase.valeur, regle: { type: "mensuel", jour: 9 }, libelle: "Pensions de retraite (régimes de base)" },
  { id: "urssaf", compte: "acoss", sens: 1, annuel: ENCAISSEMENTS_ACOSS.valeur, regle: { type: "mensuel", jour: 15 }, libelle: "Encaissements Urssaf" },
  { id: "chomage", compte: "unedic", sens: -1, annuel: SOCIAL.depensesUnedic.valeur, regle: { type: "mensuel", jour: 15 }, libelle: "Allocations chômage" },
  { id: "recettes_unedic", compte: "unedic", sens: 1, annuel: SOCIAL.recettesUnedic.valeur, regle: { type: "mensuel", jour: 15 }, libelle: "Contributions d'assurance chômage" },
];

export interface ReglesFlux {
  /** "jour_28" (spécification) ou "audit" (2 jours ouvrés avant le dernier jour ouvré). */
  paie: "jour_28" | "audit";
}

export const REGLES_DEFAUT: ReglesFlux = { paie: "jour_28" };

export interface Stocks {
  /** Position du compte du Trésor relative au jour 0 (€) ; un déficit se refinance en BTF. */
  tresorerieEtat: number;
  detteNegociable: number;
  btf: number;
  /** Négatif = encours d'emprunt de l'Acoss (€). */
  tresorerieAcoss: number;
  /** Position relative au jour 0 (€) ; aucune donnée ouverte sur l'encours de l'Unédic n'est câblée. */
  tresorerieUnedic: number;
  petrole: number;
  demandeHebergement: number;
  capaciteHebergement: number;
}

export interface Cohorte {
  encours: number;
  taux: number; // taux nominal annuel (0,031 = 3,1 %)
  emiseLe: string;
}

export interface Modificateur {
  id: string;
  flux: FluxId;
  facteur: number; // multiplicatif : 0,9 = -10 %
  debut: string;
  fin?: string;
}

/** Contexte du jour fourni par la simulation (état macro, décisions, crises). */
export interface ContexteFlux {
  multMacro: Partial<Record<FluxId, number>>;
  tauxLongPct: number;      // FIN1 du jeu (%)
  spreadPct: number;        // prime de risque liée à la crédibilité (points de %)
  credibilite: number;      // 0-100
  plafondAcoss: number;     // €
  vigilance: number;        // MET1 (points)
  apportsPetrole: number;   // multiplicateur des approvisionnements (1 = normal)
  liberationAieMt: number;  // déblocage de stocks stratégiques décidé ce jour (Mt)
  capaciteHebergementMult: number;
}

export interface Mur {
  date: string;
  compte: Compte;
  libelle: string;
  montant: number;      // net du jour pour ce compte (€)
  positionApres: number;
  critique: boolean;
  raison?: string;
}

export interface ResultatJour {
  date: string;
  mouvements: { id: FluxId; compte: Compte; montant: number }[];
  murs: Mur[];
  alertes: string[];
}

const SEUIL_MUR = 5_000_000_000; // un mouvement net quotidien de plus de 5 Md€ est un « mur »

export class GrandLivre {
  stocks: Stocks;
  cohortes: Cohorte[];
  modificateurs: Modificateur[] = [];
  soldeEtatAnnee: number;
  annee: number;
  reglementsOat: { date: string; montant: number; taux: number }[] = [];
  private ouvresCache = new Map<number, number>();

  constructor(dateDebut: string, soldeEtatAnneeInitial: number, readonly regles: ReglesFlux = REGLES_DEFAUT) {
    this.annee = cal.ymd(dateDebut).y;
    this.soldeEtatAnnee = soldeEtatAnneeInitial;
    this.stocks = {
      tresorerieEtat: 0,
      detteNegociable: ETAT.detteNegociable.valeur,
      btf: ETAT.btf.valeur,
      tresorerieAcoss: -SOCIAL.detteAcossFin2026.valeur,
      tresorerieUnedic: 0,
      petrole: PHYSIQUE.petroleStrategique.valeur,
      demandeHebergement: PHYSIQUE.placesHebergement.valeur,
      capaciteHebergement: PHYSIQUE.placesHebergement.valeur,
    };
    const mlt = ETAT.detteNegociable.valeur - ETAT.btf.valeur;
    this.cohortes = [
      { encours: mlt, taux: TAUX_APPARENT_INITIAL, emiseLe: "historique" },
      { encours: ETAT.btf.valeur, taux: TAUX_APPARENT_INITIAL, emiseLe: "btf" },
    ];
  }

  clone(): GrandLivre {
    const g = Object.create(GrandLivre.prototype) as GrandLivre;
    Object.assign(g, this);
    g.stocks = { ...this.stocks };
    g.cohortes = this.cohortes.map((c) => ({ ...c }));
    g.modificateurs = [...this.modificateurs];
    g.reglementsOat = this.reglementsOat.map((r) => ({ ...r }));
    g.ouvresCache = this.ouvresCache;
    return g;
  }

  private joursOuvres(y: number): number {
    let n = this.ouvresCache.get(y);
    if (n === undefined) {
      n = 0;
      for (let d = cal.isoOf(y, 1, 1); cal.ymd(d).y === y; d = cal.addDays(d, 1)) if (cal.estOuvre(d)) n++;
      this.ouvresCache.set(y, n);
    }
    return n;
  }

  private facteurDecisions(id: FluxId, date: string): number {
    let f = 1;
    for (const m of this.modificateurs) if (m.flux === id && date >= m.debut && (!m.fin || date < m.fin)) f *= m.facteur;
    return f;
  }

  /** Échéances du jour pour une règle (true si le flux tombe ce jour). Exposé pour le calendrier des murs. */
  static tombe(regle: Regle, date: string, regles: ReglesFlux): number {
    const { y, m } = cal.ymd(date);
    switch (regle.type) {
      case "ouvre":
        return cal.estOuvre(date) ? 1 : 0;
      case "mensuel":
        return cal.echeanceMensuelle(y, m, regle.jour) === date ? 1 : 0;
      case "paie": {
        const d = regles.paie === "audit" ? cal.paieRegleAudit(y, m) : cal.ouvre(cal.isoOf(y, m, 28), -1);
        return d === date ? 1 : 0;
      }
      case "trimestriel_is":
        return [3, 6, 9, 12].includes(m) && cal.echeanceMensuelle(y, m, 15) === date ? 1 : 0;
    }
  }

  private montantRegle(def: DefFlux, date: string): number {
    const { y } = cal.ymd(date);
    const k = GrandLivre.tombe(def.regle, date, this.regles);
    if (!k) return 0;
    switch (def.regle.type) {
      case "ouvre": return def.annuel / this.joursOuvres(y);
      case "mensuel": case "paie": return def.annuel / 12;
      case "trimestriel_is": return def.annuel / 4;
    }
  }

  /** Jours d'adjudication d'OAT : 1er jeudi (long terme) et 3e jeudi (moyen terme) ; un seul en décembre. */
  static estAdjudication(date: string): boolean {
    const { y, m } = cal.ymd(date);
    const j1 = cal.nieme(y, m, 3, 1), j3 = cal.nieme(y, m, 3, 3);
    return date === j1 || (m !== 12 && date === j3);
  }

  /** Avance d'un jour. */
  step(date: string, ctx: ContexteFlux): ResultatJour {
    const { y, d, m } = cal.ymd(date);
    if (y !== this.annee) { this.annee = y; this.soldeEtatAnnee = 0; }
    const mouv: ResultatJour["mouvements"] = [];
    const alertes: string[] = [];
    const ajouter = (id: FluxId, compte: Compte, montant: number) => {
      if (montant === 0 || !Number.isFinite(montant)) return;
      mouv.push({ id, compte, montant });
      if (compte === "etat") { this.stocks.tresorerieEtat += montant; if (id !== "emission_oat" && id !== "amortissement" && id !== "btf") this.soldeEtatAnnee += montant; }
      else if (compte === "acoss") this.stocks.tresorerieAcoss += montant;
      else this.stocks.tresorerieUnedic += montant;
    };

    // 1. flux réguliers
    for (const def of DEFS) {
      const base = this.montantRegle(def, date);
      if (!base) continue;
      const f = (ctx.multMacro[def.id] ?? 1) * this.facteurDecisions(def.id, date);
      ajouter(def.id, def.compte, def.sens * base * Math.max(0, f));
    }

    // 2. dette de l'État : coupons et tombées le 25, adjudications, BTF
    if (cal.echeanceMensuelle(y, m, 25) === date) {
      let interets = 0;
      for (const c of this.cohortes) interets += (c.encours * c.taux) / 12;
      ajouter("charge_dette", "etat", -interets * this.facteurDecisions("charge_dette", date));
      // tombées : programme - besoin lié au déficit, réparti par douzièmes (inféré, échéancier AFT non câblé)
      const amort = Math.max(0, (ETAT.programmeAft.valeur - Math.max(0, -this.soldePrevuAnnuel())) / 12);
      const hist = this.cohortes[0]!;
      const a = Math.min(amort, hist.encours);
      hist.encours -= a;
      this.stocks.detteNegociable -= a;
      ajouter("amortissement", "etat", -a);
    }
    if (GrandLivre.estAdjudication(date)) {
      const montant = ETAT.programmeAft.valeur / 23;
      const taux = Math.max(0, (ctx.tauxLongPct + ctx.spreadPct) / 100);
      const reglement = cal.ouvre(cal.addDays(cal.ouvre(cal.addDays(date, 1)), 1));
      this.reglementsOat.push({ date: reglement, montant, taux });
      if (ctx.credibilite < 25) alertes.push("Adjudication tendue : demande insuffisante, prime de risque en hausse");
    }
    for (const r of this.reglementsOat.filter((x) => x.date === date)) {
      this.cohortes.push({ encours: r.montant, taux: r.taux, emiseLe: date });
      this.stocks.detteNegociable += r.montant;
      ajouter("emission_oat", "etat", r.montant);
    }
    this.reglementsOat = this.reglementsOat.filter((x) => x.date > date);
    if (cal.weekday(date) === 0 && cal.estOuvre(date)) {
      // BTF : ramène la trésorerie vers 0 (émission si négative, remboursement si positive)
      const ajust = -this.stocks.tresorerieEtat;
      const btfCohorte = this.cohortes[1]!;
      const variation = Math.max(-btfCohorte.encours, ajust);
      btfCohorte.encours += variation;
      btfCohorte.taux = Math.max(0, (ctx.tauxLongPct - 1 + ctx.spreadPct) / 100);
      this.stocks.btf += variation;
      this.stocks.detteNegociable += variation;
      ajouter("btf", "etat", variation);
    }

    // 3. intérêts de l'Acoss sur son encours (taux court approché : taux long - 1,5 point)
    if (this.stocks.tresorerieAcoss < 0) {
      const tc = Math.max(0, (ctx.tauxLongPct - 1.5) / 100);
      ajouter("interets_acoss", "acoss", (this.stocks.tresorerieAcoss * tc) / 365);
    }

    // 4. stocks physiques
    const conso = PHYSIQUE.consommationPetroleJour.valeur;
    const reference = PHYSIQUE.petroleStrategique.valeur;
    const reconstitution = this.stocks.petrole < reference ? 1.02 : 1;
    const apports = conso * ctx.apportsPetrole * (ctx.apportsPetrole >= 1 ? reconstitution : 1);
    const avant = this.stocks.petrole;
    this.stocks.petrole = Math.min(reference * 1.05, Math.max(0, this.stocks.petrole + apports - conso - Math.max(0, ctx.liberationAieMt)));
    if (avant > 0 && this.stocks.petrole === 0) alertes.push("Stocks stratégiques pétroliers épuisés");
    const hiver = [11, 12, 1, 2, 3].includes(m) ? 0.03 : 0;
    const base = PHYSIQUE.placesHebergement.valeur;
    this.stocks.demandeHebergement = Math.max(0, base * (1 + hiver + 0.04 * Math.min(3, ctx.vigilance / 9)));
    this.stocks.capaciteHebergement = Math.max(0, base * ctx.capaciteHebergementMult);

    // 5. murs de trésorerie
    const murs: Mur[] = [];
    const net: Record<Compte, number> = { etat: 0, acoss: 0, unedic: 0 };
    for (const x of mouv) if (x.id !== "emission_oat" && x.id !== "btf") net[x.compte] += x.montant;
    const pos: Record<Compte, number> = { etat: this.stocks.tresorerieEtat, acoss: this.stocks.tresorerieAcoss, unedic: this.stocks.tresorerieUnedic };
    for (const compte of ["etat", "acoss", "unedic"] as Compte[]) {
      if (Math.abs(net[compte]) < SEUIL_MUR) continue;
      const libelles = mouv.filter((x) => x.compte === compte && Math.abs(x.montant) >= 1e9).map((x) => DEFS.find((f) => f.id === x.id)?.libelle ?? x.id);
      const mur: Mur = { date, compte, libelle: [...new Set(libelles)].join(", "), montant: net[compte], positionApres: pos[compte], critique: false };
      if (compte === "acoss" && -pos.acoss > 0.97 * ctx.plafondAcoss) { mur.critique = true; mur.raison = "encours Acoss au-delà de 97 % du plafond d'emprunt"; }
      if (compte === "etat" && this.stocks.btf > ETAT.btf.valeur * 1.5) { mur.critique = true; mur.raison = "financement de court terme saturé (BTF > 150 % du niveau initial)"; }
      if (compte === "unedic" && pos.unedic < -10_000_000_000) { mur.critique = true; mur.raison = "trésorerie de l'Unédic dégradée de plus de 10 Md€"; }
      murs.push(mur);
    }
    if (-this.stocks.tresorerieAcoss > ctx.plafondAcoss) alertes.push("Plafond d'emprunt de l'Acoss dépassé : relèvement d'urgence nécessaire");
    void d;
    return { date, mouvements: mouv, murs, alertes };
  }

  /** Solde annuel prévu de l'État (base de calcul des tombées), sur les montants de référence. */
  soldePrevuAnnuel(): number {
    let s = 0;
    for (const def of DEFS) if (def.compte === "etat") s += def.sens * def.annuel;
    let interets = 0;
    for (const c of this.cohortes) interets += c.encours * c.taux;
    return s - interets;
  }

  chargeAnnuelleInterets(): number {
    let s = 0;
    for (const c of this.cohortes) s += c.encours * c.taux;
    return s;
  }

  /** Échéances prévues (sans les appliquer) pour l'écran « Calendrier des murs de trésorerie ». */
  calendrier(debut: string, jours: number): { date: string; compte: Compte; libelle: string; montant: number }[] {
    const out: { date: string; compte: Compte; libelle: string; montant: number }[] = [];
    for (let k = 0; k < jours; k++) {
      const date = cal.addDays(debut, k);
      for (const def of DEFS) {
        if (def.regle.type === "ouvre") continue;
        const v = this.montantRegle(def, date);
        if (v) out.push({ date, compte: def.compte, libelle: def.libelle, montant: def.sens * v * this.facteurDecisions(def.id, date) });
      }
      if (GrandLivre.estAdjudication(date)) out.push({ date, compte: "etat", libelle: "Adjudication d'OAT", montant: ETAT.programmeAft.valeur / 23 });
    }
    return out;
  }

  /** Projection d'un jour sur une copie : sert au pacing (interrompre AVANT un mur critique). */
  projeter(date: string, ctx: ContexteFlux): ResultatJour {
    return this.clone().step(date, ctx);
  }
}

export const DEFINITIONS_FLUX = DEFS;
