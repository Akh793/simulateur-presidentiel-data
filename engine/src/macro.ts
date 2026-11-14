/**
 * Propagation macroéconomique en FORME FERMÉE.
 *
 * Interdiction d'itérer (I + αE) au fil des tours : l'audit a montré une divergence vers le tour 75.
 * On calcule une seule fois M = (I − E)^-1 à la calibration, puis pour chaque décision k d'impulsion u_k :
 *     Δ_i(t) = Σ_k (M u_k)_i · σ_k(t − t_k)        (en « unités d'écart » s_i de l'indicateur i)
 *     V_jeu(i, t) = V_base(i, t) + s_i · sat(Δ_i(t))
 * La somme étant finie et chaque σ_k bornée, l'état est borné quel que soit le nombre de tours ;
 * l'attribution causale est exacte (somme des contributions = écart total, saturation comprise).
 *
 * Contraintes de calibration (test CI bloquant) : |e_ij| <= 0,15 ; Σ_j |e_ij| <= 0,6 par ligne ;
 * au plus 6 liens sortants par indicateur ; ρ(E) < 0,5 ; ||M||∞ < 3.
 * Les coefficients ci-dessous sont des PARAMÈTRES DE CONCEPTION (ordres de grandeur et signes plausibles),
 * pas des élasticités estimées économétriquement.
 */
import { CATALOGUE, INDEX, N_INDICATEURS } from "./indicateurs";
import { Mat, majorantRayonSpectral } from "./linalg";

export const BORNE_COEF = 0.15;
export const BORNE_LIGNE = 0.6;
export const MAX_SORTANTS = 6;
export const BORNE_RHO = 0.5;
export const BORNE_GAIN = 3;
/** Saturation douce : |écart| plafonné à SATURATION unités d'écart (bornes physiques et lisibilité). */
export const SATURATION = 4;

export interface Couplage {
  de: string;   // indicateur source j
  vers: string; // indicateur affecté i
  e: number;    // effet sur i d'un écart d'une unité de j (en unités d'écart)
}

/** Couplages de conception. Les indicateurs pilotés par le flux (BUD1, FIN2, LOG_M3) sont exclus de E. */
export const COUPLAGES: readonly Couplage[] = [
  { de: "ENE4", vers: "MAC1", e: 0.12 }, { de: "ENE4", vers: "MAC4", e: -0.08 }, { de: "ENE4", vers: "AGR_M2", e: -0.06 },
  { de: "ENE4", vers: "INT_M3", e: 0.05 },
  { de: "MAC1", vers: "MAC4", e: -0.12 }, { de: "MAC1", vers: "FIN1", e: 0.08 }, { de: "MAC1", vers: "URS1", e: 0.05 },
  { de: "MAC1", vers: "INT_M3", e: 0.05 }, { de: "MAC1", vers: "LOG_M2", e: 0.03 },
  { de: "MAC2", vers: "MAC4", e: -0.12 }, { de: "MAC2", vers: "URS1", e: -0.12 }, { de: "MAC2", vers: "TRA2", e: -0.06 },
  { de: "MAC2", vers: "INT_M1", e: 0.04 }, { de: "MAC2", vers: "LOG_M2", e: 0.05 }, { de: "MAC2", vers: "INT_M3", e: 0.05 },
  { de: "MAC5", vers: "MAC3", e: 0.1 }, { de: "MAC5", vers: "MAC2", e: -0.06 }, { de: "MAC5", vers: "ENE1", e: 0.06 },
  { de: "MAC5", vers: "URS1", e: 0.06 }, { de: "MAC5", vers: "FIN3", e: 0.03 },
  { de: "MAC3", vers: "MAC5", e: 0.08 }, { de: "MAC3", vers: "TRA2", e: 0.1 }, { de: "MAC3", vers: "MAC2", e: -0.05 },
  { de: "MAC3", vers: "LOG_M1", e: 0.06 }, { de: "MAC3", vers: "URS1", e: 0.04 },
  { de: "MAC4", vers: "MAC3", e: 0.05 }, { de: "MAC4", vers: "CUL_M2", e: 0.04 }, { de: "MAC4", vers: "MAC6", e: 0.03 },
  { de: "MAC4", vers: "INT_M3", e: -0.06 },
  { de: "URS1", vers: "MAC4", e: 0.06 }, { de: "URS1", vers: "TRA2", e: 0.04 },
  { de: "TRA2", vers: "MAC2", e: -0.06 },
  { de: "FIN1", vers: "MAC3", e: -0.06 }, { de: "FIN1", vers: "LOG_M1", e: -0.1 }, { de: "FIN1", vers: "MAC5", e: -0.03 },
  { de: "FIN1", vers: "FIN4", e: 0.05 },
  { de: "FIN4", vers: "FIN1", e: 0.1 },
  { de: "FIN3", vers: "MAC3", e: 0.03 },
  { de: "SAN1", vers: "SAN_M1", e: 0.12 }, { de: "SAN3", vers: "SAN_M1", e: 0.05 },
  { de: "SAN_M1", vers: "MAC4", e: -0.03 }, { de: "SAN_M1", vers: "INT_M3", e: 0.03 },
  { de: "MET2", vers: "ENE1", e: -0.08 }, { de: "MET2", vers: "SAN1", e: 0.04 }, { de: "MET2", vers: "EAU2", e: -0.04 },
  { de: "MET2", vers: "AGR_M1", e: -0.04 },
  { de: "MET1", vers: "SAN1", e: 0.03 }, { de: "MET1", vers: "MOB1", e: 0.1 }, { de: "MET1", vers: "ENE1", e: 0.03 },
  { de: "MET1", vers: "AGR_M2", e: -0.04 },
  { de: "EAU2", vers: "EAU1", e: 0.05 }, { de: "EAU1", vers: "AGR_M1", e: 0.06 },
  { de: "ENE1", vers: "ENE2", e: -0.05 },
  { de: "MOB1", vers: "MAC4", e: -0.03 }, { de: "MOB1", vers: "CUL_M2", e: -0.03 }, { de: "MOB1", vers: "INT_M3", e: 0.04 },
  { de: "INT_M3", vers: "MAC3", e: -0.04 }, { de: "INT_M3", vers: "MOB1", e: 0.06 }, { de: "INT_M3", vers: "INT_M1", e: 0.03 },
  { de: "INT_M3", vers: "CUL_M2", e: -0.04 },
  { de: "INT_M1", vers: "JUS_M1", e: 0.08 }, { de: "INT_M1", vers: "JUS2", e: 0.06 }, { de: "INT_M1", vers: "MAC4", e: -0.03 },
  { de: "JUS_M1", vers: "JUS2", e: 0.04 },
  { de: "INT_M2", vers: "INT_M3", e: 0.02 },
  { de: "LOG_M1", vers: "MAC5", e: 0.03 }, { de: "LOG_M1", vers: "LOG_M2", e: -0.05 },
  { de: "EDU_M1", vers: "EDU_M3", e: 0.08 }, { de: "EDU_M3", vers: "INT_M1", e: 0.03 },
  { de: "AGR_M1", vers: "MAC1", e: -0.03 }, { de: "AGR_M2", vers: "INT_M3", e: -0.05 },
  { de: "ARM_M3", vers: "ARM_M2", e: -0.05 }, { de: "ARM_M2", vers: "ARM_M1", e: 0.05 },
  { de: "EUR_M2", vers: "AGR_M2", e: 0.05 },
  { de: "CUL_M3", vers: "CUL_M2", e: 0.06 }, { de: "CUL_M2", vers: "FIN3", e: 0.05 }, { de: "CUL_M4", vers: "CUL_M1", e: 0.03 },
  { de: "CUL_M1", vers: "CUL_M2", e: 0.02 },
  { de: "JUS1", vers: "JUS3", e: 0.04 },
];

export interface RapportCalibration {
  n: number;
  liens: number;
  coefMax: number;
  ligneMax: number;
  sortantsMax: number;
  rhoMajorant: number;
  gainM: number;
  ajustements: string[];
}

export class CalibrationError extends Error {}

export interface Calibration {
  E: Mat;
  M: Mat;
  rapport: RapportCalibration;
}

export function calibrer(couplages: readonly Couplage[] = COUPLAGES): Calibration {
  const n = N_INDICATEURS, E = new Mat(n), ajustements: string[] = [];
  for (const c of couplages) {
    const i = INDEX.get(c.vers), j = INDEX.get(c.de);
    if (i === undefined || j === undefined) throw new CalibrationError(`couplage inconnu ${c.de} -> ${c.vers}`);
    if (i === j) throw new CalibrationError(`auto-couplage interdit sur ${c.de}`);
    if (CATALOGUE[i]?.pilote === "flux" || CATALOGUE[j]?.pilote === "flux")
      throw new CalibrationError(`${c.de} -> ${c.vers} : un indicateur piloté par le flux ne peut pas entrer dans E`);
    E.set(i, j, E.get(i, j) + c.e); // les doublons s'additionnent avant l'écrêtage
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const e = E.get(i, j);
    if (Math.abs(e) > BORNE_COEF) {
      ajustements.push(`${CATALOGUE[j]?.id}->${CATALOGUE[i]?.id} écrêté à ±${BORNE_COEF}`);
      E.set(i, j, Math.sign(e) * BORNE_COEF);
    }
  }
  // au plus MAX_SORTANTS liens sortants par indicateur source (colonne j) : on garde les plus forts
  for (let j = 0; j < n; j++) {
    const liens = [...Array(n).keys()].filter((i) => E.get(i, j) !== 0).sort((a, b) => Math.abs(E.get(b, j)) - Math.abs(E.get(a, j)));
    for (const i of liens.slice(MAX_SORTANTS)) {
      ajustements.push(`${CATALOGUE[j]?.id}->${CATALOGUE[i]?.id} supprimé (plus de ${MAX_SORTANTS} liens sortants)`);
      E.set(i, j, 0);
    }
  }
  // somme absolue par ligne <= BORNE_LIGNE
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += Math.abs(E.get(i, j));
    if (s > BORNE_LIGNE) {
      ajustements.push(`ligne ${CATALOGUE[i]?.id} ramenée de ${s.toFixed(3)} à ${BORNE_LIGNE}`);
      for (let j = 0; j < n; j++) E.set(i, j, (E.get(i, j) * BORNE_LIGNE) / s);
    }
  }
  // rayon spectral : mise à l'échelle globale si le majorant atteint la borne
  let rho = majorantRayonSpectral(E);
  if (rho >= BORNE_RHO) {
    const f = (0.98 * BORNE_RHO) / rho;
    for (let k = 0; k < n * n; k++) E.a[k] = (E.a[k] as number) * f;
    ajustements.push(`E multipliée par ${f.toFixed(4)} (majorant de ρ = ${rho.toFixed(4)})`);
    rho = majorantRayonSpectral(E);
  }
  const IminusE = Mat.identite(n);
  for (let k = 0; k < n * n; k++) IminusE.a[k] = (IminusE.a[k] as number) - (E.a[k] as number);
  const M = IminusE.inverse();
  const rapport = mesurer(E, M, rho, ajustements);
  verifier(rapport);
  return { E, M, rapport };
}

export function mesurer(E: Mat, M: Mat, rho: number, ajustements: string[] = []): RapportCalibration {
  const n = E.n;
  let coefMax = 0, ligneMax = 0, sortantsMax = 0, liens = 0;
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) {
      const v = Math.abs(E.get(i, j));
      coefMax = Math.max(coefMax, v);
      s += v;
      if (v > 0) liens++;
    }
    ligneMax = Math.max(ligneMax, s);
  }
  for (let j = 0; j < n; j++) {
    let c = 0;
    for (let i = 0; i < n; i++) if (E.get(i, j) !== 0) c++;
    sortantsMax = Math.max(sortantsMax, c);
  }
  return { n, liens, coefMax, ligneMax, sortantsMax, rhoMajorant: rho, gainM: M.normeInf(), ajustements };
}

export function verifier(r: RapportCalibration): void {
  const err: string[] = [];
  if (r.n !== 48) err.push(`E doit être 48 x 48 (reçu ${r.n})`);
  if (r.coefMax > BORNE_COEF + 1e-12) err.push(`|e_ij| max ${r.coefMax}`);
  if (r.ligneMax > BORNE_LIGNE + 1e-12) err.push(`somme de ligne ${r.ligneMax}`);
  if (r.sortantsMax > MAX_SORTANTS) err.push(`${r.sortantsMax} liens sortants`);
  if (!(r.rhoMajorant < BORNE_RHO)) err.push(`ρ(E) <= ${r.rhoMajorant} non < ${BORNE_RHO}`);
  if (!(r.gainM < BORNE_GAIN)) err.push(`||M||∞ = ${r.gainM}`);
  if (err.length) throw new CalibrationError(`calibration hors bornes : ${err.join(" ; ")}`);
}

// ------------------------------------------------------------------ inertie des décisions
export interface Inertie {
  /** Jours avant la mi-montée de l'effet. */
  delaiLatence: number;
  /** Multiplicateur du pic (1 = effet plein de M u). */
  amplitudePic: number;
  /** Décroissance quotidienne après la latence (0 = réforme durable). */
  tauxErosion: number;
}

/** σ(τ) : sigmoïde de montée normalisée (σ(0) = 0), puis érosion exponentielle. |σ| <= amplitudePic. */
export function sigma(tau: number, p: Inertie): number {
  if (tau < 0) return 0;
  const w = Math.max(1, p.delaiLatence / 4);
  const s0 = 1 / (1 + Math.exp(p.delaiLatence / w));
  const s = 1 / (1 + Math.exp(-(tau - p.delaiLatence) / w));
  const montee = (s - s0) / (1 - s0);
  const erosion = Math.exp(-p.tauxErosion * Math.max(0, tau - p.delaiLatence));
  return p.amplitudePic * montee * erosion;
}

// ------------------------------------------------------------------ état macro
export interface Impulsion {
  id: string;              // identifiant unique de l'application (décision ou événement)
  libelle: string;
  origine: "decision" | "evenement";
  t0: number;              // jour d'application
  u: Float64Array;         // impulsion directe (unités d'écart)
  Mu: Float64Array;        // effet total M u, calculé une fois
  inertie: Inertie;
  annuleeA?: number;       // jour d'annulation (Conseil d'État, abrogation)
}

export class Macro {
  readonly M: Mat;
  readonly impulsions: Impulsion[] = [];
  private delta = new Float64Array(N_INDICATEURS);
  private brut = new Float64Array(N_INDICATEURS);

  constructor(cal: Calibration) {
    this.M = cal.M;
  }

  ajouter(id: string, libelle: string, origine: Impulsion["origine"], t0: number, u: Record<string, number>, inertie: Inertie): Impulsion {
    const v = new Float64Array(N_INDICATEURS);
    for (const [k, val] of Object.entries(u)) {
      const i = INDEX.get(k);
      if (i === undefined) throw new Error(`impulsion sur indicateur inconnu ${k}`);
      if (CATALOGUE[i]?.pilote === "flux") continue; // les indicateurs comptables passent par le flux
      v[i] = (v[i] as number) + val;
    }
    const imp: Impulsion = { id, libelle, origine, t0, u: v, Mu: this.M.mulVec(v), inertie };
    this.impulsions.push(imp);
    return imp;
  }

  annuler(id: string, t: number): boolean {
    const imp = this.impulsions.find((x) => x.id === id && x.annuleeA === undefined);
    if (!imp) return false;
    imp.annuleeA = t;
    return true;
  }

  private poids(imp: Impulsion, t: number): number {
    if (imp.annuleeA !== undefined && t >= imp.annuleeA) return 0;
    return sigma(t - imp.t0, imp.inertie);
  }

  /** Écarts saturés au jour t (unités d'écart). */
  ecarts(t: number): Float64Array {
    const brut = this.brut.fill(0);
    for (const imp of this.impulsions) {
      const w = this.poids(imp, t);
      if (w === 0) continue;
      for (let i = 0; i < N_INDICATEURS; i++) brut[i] = (brut[i] as number) + (imp.Mu[i] as number) * w;
    }
    for (let i = 0; i < N_INDICATEURS; i++) this.delta[i] = saturer(brut[i] as number);
    return this.delta;
  }

  /** Contribution exacte de chaque impulsion à l'écart saturé de l'indicateur i au jour t. */
  attribution(t: number, i: number): { id: string; libelle: string; contribution: number }[] {
    let total = 0;
    const parts: { id: string; libelle: string; contribution: number }[] = [];
    for (const imp of this.impulsions) {
      const c = (imp.Mu[i] as number) * this.poids(imp, t);
      if (c !== 0) { parts.push({ id: imp.id, libelle: imp.libelle, contribution: c }); total += c; }
    }
    const sat = saturer(total);
    const f = total === 0 ? 0 : sat / total; // la saturation est répartie au prorata : la somme reste exacte
    for (const p of parts) p.contribution *= f;
    return parts.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  }

  /** Retire les impulsions éteintes (érosion < 1e-6) pour borner le coût de calcul sur 1 825 tours. */
  compacter(t: number): void {
    for (let k = this.impulsions.length - 1; k >= 0; k--) {
      const imp = this.impulsions[k] as Impulsion;
      const fini = (imp.annuleeA !== undefined && t >= imp.annuleeA)
        || (t - imp.t0 > imp.inertie.delaiLatence * 3 && Math.abs(sigma(t - imp.t0, imp.inertie)) < 1e-6);
      if (fini) this.impulsions.splice(k, 1);
    }
  }
}

export function saturer(x: number): number {
  return SATURATION * Math.tanh(x / SATURATION);
}
