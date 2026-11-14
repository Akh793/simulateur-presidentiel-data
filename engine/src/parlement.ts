/**
 * Moteur parlementaire et exécutif.
 *
 * - Hémicycles initialisés depuis la graine (sièges et cohésion des groupes sur 30 jours, données réelles).
 * - AUCUNE position idéologique des groupes réels n'est codée : l'alignement de chaque groupe est une donnée
 *   d'entrée (neutre par défaut) ; seules la taille, la cohésion et la relation construite en jeu jouent.
 * - Seuil de censure : floor(sièges_total / 2) + 1 = 289 (règle demandée). La pratique de l'Assemblée calcule
 *   la majorité absolue sur les sièges pourvus (288 en décembre 2024) : option `baseMajorite: "sieges_pourvus"`.
 * - 49.3 : Assemblée seulement ; illimité sur PLF, PLFSS et lois de finances rectificatives ; sinon un texte par
 *   session ordinaire ; motion de censure votée 48 heures après l'engagement.
 * - Décrets : coût en capital politique croissant dans le trimestre, risque d'annulation au-delà de 5.
 * - Dissolution : délai d'un an après les dernières élections, élections 30 jours plus tard, résultat
 *   fondé sur la moyenne glissante de l'opinion sur 90 jours.
 * - Chaque démission de Matignon abaisse définitivement le plafond de capital politique de 10 %.
 */
import type { Chambre as ChambreGraine } from "../../shared/schema";
import * as cal from "./calendrier";
import type { Rng } from "./rng";
import { BOUSSOLE_NEUTRE, type Boussole } from "./types";

export type BaseMajorite = "sieges_total" | "sieges_pourvus";

export interface ConfigParlement {
  baseMajorite: BaseMajorite;
  derniereElection: string;      // dernières élections législatives (art. 12 C)
  socle: string[];               // groupes choisis par le joueur comme socle de départ
  alignements: Record<string, Boussole>; // alignement facultatif par code de groupe (neutre sinon)
}

export const CONFIG_PARLEMENT_DEFAUT: ConfigParlement = {
  baseMajorite: "sieges_total",
  derniereElection: "2024-07-07",
  socle: [],
  alignements: {},
};

export interface GroupeParl {
  code: string;
  libelle: string;
  sieges: number;
  cohesion: number;
  relation: number;            // -1 … 1, construite en jeu
  verrouilleJusqua: string | null;
  alignement: Boussole;
}

export interface ChambreParl {
  code: "AN" | "SENAT";
  siegesTotal: number;
  siegesPourvus: number;
  groupes: GroupeParl[];
}

export type TypeTexte = "loi" | "plf" | "plfss" | "plfr" | "plfssr";
export type StatutTexte = "en_cours" | "adopte" | "rejete" | "ordonnance" | "loi_speciale";

export interface Jalon {
  nom: "commission" | "vote_an" | "vote_senat" | "lecture_definitive" | "motion_censure" | "delai_constitutionnel";
  date: string;
  fait: boolean;
}

export interface Texte {
  id: string;
  titre: string;
  type: TypeTexte;
  gabarits: string[];          // mesures portées par le texte
  boussole: Boussole;
  depotLe: string;
  jalons: Jalon[];
  statut: StatutTexte;
  engage493: boolean;
  promulgueLe: string | null;
}

export interface Promesse {
  id: string;
  groupe: string;
  engagement: { type: "adopter" | "renoncer"; gabarit: string };
  signeeLe: string;
  echeance: string;
  statut: "active" | "tenue" | "rompue";
}

export interface ResultatVote {
  pour: number;
  contre: number;
  abstention: number;
  adopte: boolean;
  details: { code: string; position: "pour" | "contre" | "abstention"; score: number }[];
}

export interface EvenementParl {
  type: "jalon" | "texte_adopte" | "texte_rejete" | "censure_adoptee" | "censure_rejetee" | "promesse_rompue"
    | "promesse_tenue" | "ordonnance" | "loi_speciale" | "elections" | "motion_spontanee";
  texte?: Texte;
  detail: string;
}

export function estBudgetaire(t: TypeTexte): boolean {
  return t === "plf" || t === "plfss" || t === "plfr" || t === "plfssr";
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

function distance(a: Boussole, b: Boussole): number {
  return Math.hypot(a.economique - b.economique, a.social - b.social, a.autorite - b.autorite, a.europe - b.europe);
}

function chambreDepuisGraine(c: ChambreGraine, cfg: ConfigParlement, rng: Rng): ChambreParl {
  return {
    code: c.code,
    siegesTotal: c.sieges_total,
    siegesPourvus: c.sieges_pourvus,
    groupes: c.groupes.map((g) => ({
      code: g.code,
      libelle: g.libelle,
      sieges: g.sieges,
      cohesion: g.cohesion_30j ?? 0.9,
      relation: cfg.socle.includes(g.code) ? 0.4 : clamp(-0.1 + 0.2 * (rng.next() - 0.5), -1, 1),
      verrouilleJusqua: null,
      alignement: cfg.alignements[g.code] ?? BOUSSOLE_NEUTRE,
    })),
  };
}

export class Parlement {
  an: ChambreParl;
  senat: ChambreParl;
  textes: Texte[] = [];
  promesses: Promesse[] = [];
  usages493: Record<number, number> = {};      // session (année de début) -> textes non budgétaires
  decrets: Record<string, number> = {};        // trimestre -> nombre de décrets
  derniereElection: string;
  electionsLe: string | null = null;
  plafondCP = 100;
  numeroMatignon = 1;
  private seq = 0;

  constructor(an: ChambreGraine | null, senat: ChambreGraine | null, readonly cfg: ConfigParlement, rng: Rng) {
    const vide = (code: "AN" | "SENAT", total: number): ChambreGraine => ({
      code, legislature: null, sieges_total: total, sieges_pourvus: total, majorite_absolue: Math.floor(total / 2) + 1,
      seuil_censure: null, groupes: [{ code: "NI", libelle: "Groupe unique (graine sans données)", sieges: total, cohesion_30j: 0.9, scrutins_30j: 0 }],
      scrutins_7j: 0, maj_source: null,
    });
    this.an = chambreDepuisGraine(an ?? vide("AN", 577), cfg, rng);
    this.senat = chambreDepuisGraine(senat ?? vide("SENAT", 348), cfg, rng);
    this.derniereElection = cfg.derniereElection;
  }

  /** Seuil de censure (Assemblée nationale). */
  seuilCensure(): number {
    const base = this.cfg.baseMajorite === "sieges_total" ? this.an.siegesTotal : this.an.siegesPourvus;
    return Math.floor(base / 2) + 1;
  }

  enElections(): boolean {
    return this.electionsLe !== null;
  }

  // ------------------------------------------------------------------ votes
  score(g: GroupeParl, boussole: Boussole, opinion: number, credibilite: number): number {
    const affinite = 0.25 - 0.3 * distance(boussole, g.alignement);
    return clamp(g.relation + affinite + opinion / 400 + (credibilite - 50) / 500, -2, 2);
  }

  voter(ch: ChambreParl, boussole: Boussole, opinion: number, credibilite: number): ResultatVote {
    let pour = 0, contre = 0, abstention = 0;
    const details: ResultatVote["details"] = [];
    for (const g of ch.groupes) {
      const s = this.score(g, boussole, opinion, credibilite);
      const position = s > 0.15 ? "pour" : s < -0.15 ? "contre" : "abstention";
      const fideles = g.sieges * g.cohesion, autres = g.sieges - fideles;
      if (position === "pour") { pour += fideles; abstention += autres / 2; contre += autres / 2; }
      else if (position === "contre") { contre += fideles; abstention += autres / 2; pour += autres / 2; }
      else { abstention += fideles; pour += autres / 2; contre += autres / 2; }
      details.push({ code: g.code, position, score: s });
    }
    return { pour: Math.round(pour), contre: Math.round(contre), abstention: Math.round(abstention), adopte: pour > contre, details };
  }

  /** Motion de censure : seuls les votes pour sont comptés (art. 49 C). */
  motionCensure(opinion: number, credibilite: number, apres493: boolean): { pour: number; seuil: number; adoptee: boolean } {
    let pour = 0;
    for (const g of this.an.groupes) {
      const s = this.score(g, BOUSSOLE_NEUTRE, opinion, credibilite) - (apres493 ? 0.15 : 0);
      if (s < -0.15) pour += g.sieges * g.cohesion;
      else if (s < 0.15) pour += g.sieges * (1 - g.cohesion) * 0.3;
      else pour += g.sieges * (1 - g.cohesion) * 0.1;
    }
    const seuil = this.seuilCensure();
    return { pour: Math.round(pour), seuil, adoptee: Math.round(pour) >= seuil };
  }

  // ------------------------------------------------------------------ procédure
  deposer(titre: string, type: TypeTexte, gabarits: string[], boussole: Boussole, date: string): Texte {
    const plan: [Jalon["nom"], number][] =
      type === "plf" ? [["commission", 10], ["vote_an", 40], ["vote_senat", 60], ["lecture_definitive", 69], ["delai_constitutionnel", 70]]
      : type === "plfss" ? [["commission", 7], ["vote_an", 20], ["vote_senat", 35], ["lecture_definitive", 49], ["delai_constitutionnel", 50]]
      : type === "plfr" || type === "plfssr" ? [["commission", 5], ["vote_an", 15], ["vote_senat", 25], ["lecture_definitive", 35]]
      : [["commission", 14], ["vote_an", 28], ["vote_senat", 49], ["lecture_definitive", 63]];
    const t: Texte = {
      id: `T${++this.seq}`, titre, type, gabarits, boussole, depotLe: date, statut: "en_cours", engage493: false, promulgueLe: null,
      jalons: plan.map(([nom, j]) => ({ nom, date: cal.addDays(date, j), fait: false })),
    };
    this.textes.push(t);
    return t;
  }

  peut493(t: Texte, date: string): { ok: boolean; raison: string } {
    if (t.statut !== "en_cours") return { ok: false, raison: "texte non en discussion" };
    if (this.enElections()) return { ok: false, raison: "Assemblée dissoute" };
    if (estBudgetaire(t.type)) return { ok: true, raison: "texte financier : 49.3 sans limite" };
    const s = cal.sessionOrdinaire(date);
    if (!s) return { ok: false, raison: "hors session ordinaire" };
    if ((this.usages493[s.annee] ?? 0) >= 1) return { ok: false, raison: "49.3 déjà utilisé sur un texte non financier pendant cette session" };
    return { ok: true, raison: "un texte non financier par session ordinaire" };
  }

  engager493(t: Texte, date: string): void {
    const p = this.peut493(t, date);
    if (!p.ok) throw new Error(`49.3 impossible : ${p.raison}`);
    if (!estBudgetaire(t.type)) {
      const s = cal.sessionOrdinaire(date)!;
      this.usages493[s.annee] = (this.usages493[s.annee] ?? 0) + 1;
    }
    t.engage493 = true;
    const an = t.jalons.find((j) => j.nom === "vote_an");
    if (an) an.fait = true;
    t.jalons.push({ nom: "motion_censure", date: cal.addDays(date, 2), fait: false });
    t.jalons.sort((a, b) => a.date.localeCompare(b.date));
  }

  /** Coût du prochain décret dans le trimestre et risque d'annulation par le Conseil d'État. */
  coutDecret(date: string, base: number): { cout: number; risque: number; rang: number } {
    const n = (this.decrets[cal.trimestreCivil(date)] ?? 0) + 1;
    return { cout: base * Math.pow(1.25, n - 1), risque: n > 5 ? Math.min(0.6, 0.1 * (n - 5)) : 0, rang: n };
  }

  enregistrerDecret(date: string): void {
    const q = cal.trimestreCivil(date);
    this.decrets[q] = (this.decrets[q] ?? 0) + 1;
  }

  // ------------------------------------------------------------------ promesses
  signerPromesse(groupe: string, engagement: Promesse["engagement"], date: string, jours: number): Promesse {
    const g = this.an.groupes.find((x) => x.code === groupe);
    if (!g) throw new Error(`groupe inconnu ${groupe}`);
    if (g.verrouilleJusqua && date < g.verrouilleJusqua) throw new Error(`alliance verrouillée avec ${groupe} jusqu'au ${g.verrouilleJusqua}`);
    g.relation = clamp(g.relation + 0.35, -1, 1);
    const p: Promesse = { id: `P${++this.seq}`, groupe, engagement, signeeLe: date, echeance: cal.addDays(date, jours), statut: "active" };
    this.promesses.push(p);
    return p;
  }

  /** Vérifie les promesses arrivées à échéance. `adoptes` = gabarits appliqués depuis la signature. */
  verifierPromesses(date: string, adoptesDepuis: (depuis: string, gabarit: string) => boolean): EvenementParl[] {
    const ev: EvenementParl[] = [];
    for (const p of this.promesses) {
      if (p.statut !== "active") continue;
      const fait = adoptesDepuis(p.signeeLe, p.engagement.gabarit);
      const tenue = p.engagement.type === "adopter" ? fait : !fait;
      const g = this.an.groupes.find((x) => x.code === p.groupe);
      if (p.engagement.type === "renoncer" && fait) { this.rompre(p, g, date); ev.push({ type: "promesse_rompue", detail: p.groupe }); continue; }
      if (date < p.echeance) continue;
      if (tenue) { p.statut = "tenue"; if (g) g.relation = clamp(g.relation + 0.1, -1, 1); ev.push({ type: "promesse_tenue", detail: p.groupe }); }
      else { this.rompre(p, g, date); ev.push({ type: "promesse_rompue", detail: p.groupe }); }
    }
    return ev;
  }

  private rompre(p: Promesse, g: GroupeParl | undefined, date: string): void {
    p.statut = "rompue";
    if (g) { g.relation = -1; g.verrouilleJusqua = cal.addDays(date, 180); }
    for (const autre of this.an.groupes) if (autre !== g) autre.relation = clamp(autre.relation - 0.05, -1, 1);
  }

  // ------------------------------------------------------------------ dissolution et Matignon
  peutDissoudre(date: string): { ok: boolean; raison: string } {
    if (this.enElections()) return { ok: false, raison: "élections en cours" };
    const j = cal.diffDays(this.derniereElection, date);
    return j >= 365 ? { ok: true, raison: "" } : { ok: false, raison: `dissolution impossible avant ${cal.addDays(this.derniereElection, 365)} (art. 12)` };
  }

  dissoudre(date: string): string {
    const p = this.peutDissoudre(date);
    if (!p.ok) throw new Error(p.raison);
    this.electionsLe = cal.addDays(date, 30);
    for (const t of this.textes) if (t.statut === "en_cours" && !estBudgetaire(t.type)) t.statut = "rejete"; // textes caducs
    return this.electionsLe;
  }

  /** Recomposition de l'Assemblée selon la moyenne d'opinion sur 90 jours. */
  elections(opinion90: number): void {
    const part = clamp(0.3 + opinion90 / 250, 0.1, 0.6);
    const soutiens = this.an.groupes.filter((g) => g.relation > 0);
    const autres = this.an.groupes.filter((g) => g.relation <= 0);
    const total = this.an.siegesTotal;
    const repartir = (gs: GroupeParl[], sieges: number) => {
      const somme = gs.reduce((s, g) => s + g.sieges, 0) || 1;
      gs.forEach((g) => { g.sieges = Math.round((g.sieges / somme) * sieges); });
    };
    if (soutiens.length && autres.length) { repartir(soutiens, Math.round(total * part)); repartir(autres, total - Math.round(total * part)); }
    const ecart = total - this.an.groupes.reduce((s, g) => s + g.sieges, 0);
    const plusGrand = [...this.an.groupes].sort((a, b) => b.sieges - a.sieges)[0];
    if (plusGrand) plusGrand.sieges += ecart; // reste de l'arrondi
    this.an.siegesPourvus = total;
    for (const g of this.an.groupes) g.relation = clamp(g.relation > 0 ? g.relation + 0.2 : g.relation - 0.1, -1, 1);
    this.derniereElection = this.electionsLe ?? this.derniereElection;
    this.electionsLe = null;
  }

  demissionMatignon(): number {
    this.plafondCP *= 0.9;
    this.numeroMatignon++;
    for (const g of this.an.groupes) g.relation = clamp(g.relation + 0.1, -1, 1); // brève lune de miel
    return this.plafondCP;
  }

  /**
   * Traite les jalons échus. La simulation applique ensuite les effets (gabarits adoptés, chute du gouvernement).
   * Tant que l'Assemblée est dissoute, les votes sont reportés après les élections.
   */
  traiterJour(date: string, opinion: number, credibilite: number): EvenementParl[] {
    const ev: EvenementParl[] = [];
    if (this.electionsLe && date >= this.electionsLe) ev.push({ type: "elections", detail: date });
    for (const t of this.textes) {
      if (t.statut !== "en_cours") continue;
      for (const j of t.jalons) {
        if (j.fait || j.date > date) continue;
        if (this.enElections() && j.nom !== "delai_constitutionnel") { j.date = cal.addDays(this.electionsLe!, 3); continue; }
        j.fait = true;
        if (j.nom === "commission") ev.push({ type: "jalon", texte: t, detail: `${t.titre} : examen en commission` });
        else if (j.nom === "vote_an") {
          const v = this.voter(this.an, t.boussole, opinion, credibilite);
          ev.push({ type: "jalon", texte: t, detail: `${t.titre} : vote de l'Assemblée ${v.pour} pour, ${v.contre} contre` });
          if (!v.adopte && !estBudgetaire(t.type)) { t.statut = "rejete"; ev.push({ type: "texte_rejete", texte: t, detail: "rejet en première lecture" }); break; }
        } else if (j.nom === "motion_censure") {
          const m = this.motionCensure(opinion, credibilite, true);
          if (m.adoptee) { t.statut = "rejete"; ev.push({ type: "censure_adoptee", texte: t, detail: `${m.pour} voix pour, seuil ${m.seuil}` }); break; }
          ev.push({ type: "censure_rejetee", texte: t, detail: `${m.pour} voix pour, seuil ${m.seuil}` });
        } else if (j.nom === "vote_senat") {
          const v = this.voter(this.senat, t.boussole, opinion, credibilite);
          ev.push({ type: "jalon", texte: t, detail: `${t.titre} : Sénat ${v.adopte ? "adopte" : "rejette"} (${v.pour} pour, ${v.contre} contre)` });
        } else if (j.nom === "lecture_definitive") {
          const v = t.engage493 ? { adopte: true, pour: 0, contre: 0 } : this.voter(this.an, t.boussole, opinion, credibilite);
          if (v.adopte) { t.statut = "adopte"; t.promulgueLe = date; ev.push({ type: "texte_adopte", texte: t, detail: t.engage493 ? "adopté par l'article 49.3" : `adopté (${v.pour} pour, ${v.contre} contre)` }); }
          else if (t.type === "plf" || t.type === "plfss") { t.statut = "loi_speciale"; ev.push({ type: "loi_speciale", texte: t, detail: "budget rejeté : loi spéciale, crédits reconduits" }); }
          else { t.statut = "rejete"; ev.push({ type: "texte_rejete", texte: t, detail: "rejet en lecture définitive" }); }
          break;
        } else if (j.nom === "delai_constitutionnel") {
          t.statut = "ordonnance"; t.promulgueLe = date;
          ev.push({ type: "ordonnance", texte: t, detail: "Parlement hors délai : mise en œuvre par ordonnance (art. 47 / 47-1)" });
          break;
        }
      }
    }
    return ev;
  }

  texte(id: string): Texte | undefined {
    return this.textes.find((t) => t.id === id);
  }

  echeancesProches(date: string, jours: number): { texte: Texte; jalon: Jalon }[] {
    const fin = cal.addDays(date, jours);
    const out: { texte: Texte; jalon: Jalon }[] = [];
    for (const t of this.textes) if (t.statut === "en_cours")
      for (const j of t.jalons) if (!j.fait && j.date > date && j.date <= fin) out.push({ texte: t, jalon: j });
    return out;
  }
}
