/**
 * Traits des portraits modulaires (logique pure) : 4 calques déterminés par la graine du personnage fictif
 * (morphologie, coiffure et accessoires, tenue) et par son état (expression, cernes de fatigue).
 * Aucun trait ne cherche à ressembler à une personne réelle.
 */
import { melange, P } from "../../theme/palette";

export type Morphologie = "ovale" | "rond" | "carre" | "long";
export type Coiffure = "courte" | "raie" | "carre_plongeant" | "chignon" | "degarnie" | "boucles";
export type Expression = "neutre" | "confiant" | "inquiet" | "colere";

export interface TraitsPortrait {
  morphologie: Morphologie;
  teint: string;
  coiffure: Coiffure;
  cheveux: string;
  lunettes: boolean;
  barbe: boolean;
  veste: string;
  col: "cravate" | "foulard" | "col_ouvert";
  accent: string;
  expression: Expression;
  fatigue: number;         // 0 … 1 : cernes et paupières
}

const TEINTS = ["#F3D9C4", "#E8C2A0", "#D6A27C", "#B47B57", "#8A5A3C", "#6B4430"];
const CHEVEUX = ["#2B2420", "#4A3A2E", "#7A5B3A", "#A88A5B", "#C9C3B8", "#8C8C8C"];

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}

export function traits(graine: string, etat: { expression: Expression; fatigue: number }): TraitsPortrait {
  const h = hash(graine);
  const pick = <T,>(xs: readonly T[], decalage: number) => xs[(h >>> decalage) % xs.length]!;
  const vestes = [P.nuit, P.ardoise, melange(P.cobalt, P.nuit, 0.55), melange(P.ardoise, P.nuit, 0.5)];
  return {
    morphologie: pick(["ovale", "rond", "carre", "long"] as const, 0),
    teint: pick(TEINTS, 3),
    coiffure: pick(["courte", "raie", "carre_plongeant", "chignon", "degarnie", "boucles"] as const, 6),
    cheveux: pick(CHEVEUX, 9),
    lunettes: ((h >>> 12) & 3) === 0,
    barbe: ((h >>> 14) & 7) === 0,
    veste: pick(vestes, 17),
    col: pick(["cravate", "foulard", "col_ouvert"] as const, 20),
    accent: pick([P.rouge, P.or, P.cobalt], 23),
    expression: etat.expression,
    fatigue: Math.max(0, Math.min(1, etat.fatigue)),
  };
}

/** Expression et fatigue d'un ministre fictif selon son état dans le moteur. */
export function etatMinistre(m: { tension: number; loyaute: number; popularite: number }): { expression: Expression; fatigue: number } {
  const expression: Expression = m.tension >= 70 ? "inquiet" : m.loyaute < 45 ? "colere" : m.popularite >= 60 && m.tension < 40 ? "confiant" : "neutre";
  return { expression, fatigue: m.tension / 100 };
}

/** Expression d'un responsable de corps intermédiaire selon la radicalisation de son corps. */
export function etatCorps(c: { radicalisation: number; approbation: number }): { expression: Expression; fatigue: number } {
  const expression: Expression = c.radicalisation >= 75 ? "colere" : c.radicalisation >= 55 ? "inquiet" : c.approbation > 20 ? "confiant" : "neutre";
  return { expression, fatigue: c.radicalisation / 140 };
}
