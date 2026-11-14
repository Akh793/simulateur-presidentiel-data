/**
 * Trajectoire de référence (« Réel » de la courbe duale) : ce que deviendraient les indicateurs sans le joueur.
 *
 * Point de départ : la dernière valeur certifiée de la graine (ou 100 pour un indicateur modélisé).
 * Projection : tendance récente amortie (demi-vie 120 jours) + bruit AR(1) + chocs rares (événements de données),
 * tirés d'un générateur déterministe. Le tout est précalculé pour les 1 826 jours du mandat.
 * Hypothèses de conception, non une prévision : pas de saisonnalité (SAN1, MET2, ENE1 en auraient une).
 */
import type { Graine } from "../../shared/schema";
import { CATALOGUE, N_INDICATEURS } from "./indicateurs";
import { Rng } from "./rng";

export const HORIZON = 1826;

export interface Reference {
  v0: number;
  dateValeur: string | null;
  /** Unité d'écart s_i : 1 unité = variation « notable » de l'indicateur. */
  echelle: number;
  tendanceJour: number;
  cadence: "quotidienne" | "hebdomadaire" | "mensuelle" | "trimestrielle" | "annuelle" | "modele";
  serieGraine: { d: string; v: number }[];
}

function mad(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const med = s[Math.floor(s.length / 2)] as number;
  const dev = s.map((x) => Math.abs(x - med)).sort((a, b) => a - b);
  return dev[Math.floor(dev.length / 2)] as number;
}

function plancher(unite: string, v0: number): number {
  if (unite === "%" || unite === "% du PIB" || unite === "°C" || unite === "m") return 0.1;
  return Math.max(Math.abs(v0) * 0.005, 1e-6);
}

const JOURS_CADENCE = { quotidienne: 1, hebdomadaire: 7, mensuelle: 30.4, trimestrielle: 91.3, annuelle: 365, modele: 1 } as const;

export function references(g: Graine): Reference[] {
  const pil = new Map(g.pilotage.map((p) => [p.id, p]));
  const bil = new Map(g.bilan.map((b) => [b.id, b]));
  return CATALOGUE.map((slot) => {
    const p = pil.get(slot.id);
    if (p && p.derniere_valeur !== null) {
      const serie = p.serie.slice(-60);
      const diffs = serie.slice(1).map((pt, k) => pt.v - (serie[k] as { v: number }).v);
      const pas = p.cadence === "hebdomadaire" ? 7 : 1;
      const echelle = Math.max(1.4826 * mad(diffs) * Math.sqrt(7 / pas), plancher(slot.unite, p.derniere_valeur));
      const med = diffs.length >= 4 ? [...diffs].sort((a, b) => a - b)[Math.floor(diffs.length / 2)] as number : 0;
      return { v0: p.derniere_valeur, dateValeur: p.derniere_date, echelle, tendanceJour: med / pas, cadence: p.cadence, serieGraine: p.serie };
    }
    const b = bil.get(slot.id);
    if (b && b.derniere) {
      const prev = b.precedente?.valeur;
      const delta = prev === undefined ? 0 : b.derniere.valeur - prev;
      const jours = JOURS_CADENCE[b.cadence];
      const echelle = Math.max(Math.abs(delta) * 1.5, plancher(slot.unite, b.derniere.valeur));
      return { v0: b.derniere.valeur, dateValeur: b.derniere.d, echelle, tendanceJour: (delta / jours) * 0.5, cadence: b.cadence, serieGraine: b.serie };
    }
    // indicateur modélisé, ou source absente de la graine du jour
    return { v0: 100, dateValeur: null, echelle: 2, tendanceJour: 0, cadence: "modele", serieGraine: [] };
  });
}

/** Trajectoires de référence [indicateur][jour], déterministes pour une graine RNG donnée. */
export function trajectoires(refs: Reference[], seed: number): Float64Array[] {
  const rng = new Rng(seed ^ 0x5eed);
  return refs.map((r, i) => {
    const slot = CATALOGUE[i]!;
    const out = new Float64Array(HORIZON);
    let ar = 0, choc = 0;
    const sdBruit = 0.12 * r.echelle;
    for (let t = 0; t < HORIZON; t++) {
      ar = 0.92 * ar + sdBruit * rng.normal();
      if (rng.chance(0.004)) choc += (rng.chance(0.5) ? 1 : -1) * (2.5 + 1.5 * rng.next()) * r.echelle;
      choc *= 0.93; // demi-vie d'environ 10 jours
      const tendance = r.tendanceJour * 120 * (1 - Math.exp(-t / 120));
      let v = r.v0 + tendance + ar + choc;
      if (slot.min !== undefined) v = Math.max(slot.min, v);
      if (slot.max !== undefined) v = Math.min(slot.max, v);
      out[t] = v;
    }
    return out;
  });
}

export function nIndicateurs(): number {
  return N_INDICATEURS;
}
