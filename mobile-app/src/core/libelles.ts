import { capitale, nombre, valeur } from "../../../mobile-core/src/narrative/format";
import { MINISTERES_DE } from "../../../mobile-core/src/narrative/templates";

/** « de l'Économie et des Finances » → « Économie et Finances ». */
export const nomMinistere = (m: string) => capitale((MINISTERES_DE[m] ?? m).replace(/^(de la |de l'|du |des )/, "").replace(/ (des|de la|de l'|du) /g, " "));

/** Graduation d'axe : assez de décimales pour distinguer les graduations d'une courbe de faible amplitude. */
export function formatAxe(v: number, unite: string, amplitude: number): string {
  const dec = Math.max(0, Math.min(4, Math.ceil(-Math.log10(Math.max(amplitude, 1e-9) / 4))));
  if (unite === "€") return valeur(v, "€");
  const n = nombre(v, dec);
  return unite === "indice" || unite === "points" ? n : `${n}${unite === "%" || unite === "% du PIB" ? "\u202F%" : `\u202F${unite}`}`;
}

/** Écart signé dans l'unité de l'indicateur (points de pourcentage pour les taux). */
export function ecartTexte(v: number, unite: string): string {
  if (unite === "%" || unite === "% du PIB") return `${nombre(v, 1, true)} pt`;
  const t = valeur(v, unite);
  return v > 0 ? `+${t}` : t;
}
