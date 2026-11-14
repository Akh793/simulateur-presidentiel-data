/**
 * Formatage français déterministe, sans `Intl` (dont le support varie selon le moteur JavaScript mobile).
 * Espace fine insécable (U+202F) pour les milliers et avant les unités, virgule décimale, signe moins U+2212.
 * Ces fonctions sont les SEULES à produire les nombres du texte : le validateur compare chaque nombre
 * du texte final aux faits formatés par elles.
 */
export const NNBSP = " ";
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export function nombre(v: number, decimales = 0, signe = false): string {
  if (!Number.isFinite(v)) return "n.d.";
  const arrondi = Number(v.toFixed(decimales));
  const abs = Math.abs(arrondi).toFixed(decimales);
  const [ent, dec] = abs.split(".") as [string, string | undefined];
  const groupes = ent.replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
  const corps = dec ? `${groupes},${dec}` : groupes;
  if (arrondi < 0) return `−${corps}`;
  return signe && arrondi > 0 ? `+${corps}` : corps;
}

/** Nombre de décimales lisible selon l'ordre de grandeur. */
export function decimalesAuto(v: number): number {
  const a = Math.abs(v);
  return a >= 100 ? 0 : a >= 10 ? 1 : 2;
}

export function valeur(v: number, unite: string, decimales = decimalesAuto(v)): string {
  if (unite === "€") return euros(v);
  if (unite === "%") return `${nombre(v, Math.min(decimales, 1))}${NNBSP}%`;
  if (unite === "% du PIB") return `${nombre(v, 1)}${NNBSP}% du PIB`;
  if (unite === "indice") return nombre(v, Math.abs(v) < 1000 ? 2 : 0);
  if (unite === "points") return nombre(v, 1);
  return `${nombre(v, decimales)}${NNBSP}${unite}`;
}

export function euros(v: number, signe = false): string {
  const a = Math.abs(v);
  if (a >= 1e9) return `${nombre(v / 1e9, 1, signe)}${NNBSP}Md€`;
  if (a >= 1e6) return `${nombre(v / 1e6, 1, signe)}${NNBSP}M€`;
  return `${nombre(v, 0, signe)}${NNBSP}€`;
}

export function pourcent(v: number, decimales = 1, signe = false): string {
  return `${nombre(v, decimales, signe)}${NNBSP}%`;
}

/** « 14 novembre 2026 » (premier du mois : « 1er novembre 2026 »). */
export function date(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number) as [number, number, number];
  return `${d === 1 ? "1er" : String(d)} ${MOIS[m - 1]} ${y}`;
}

/** Première lettre en capitale (titres construits à partir de groupes nominaux). */
export function capitale(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
