/**
 * Calendrier civil et institutionnel (dates ISO AAAA-MM-JJ, calculs en UTC pour éviter tout décalage horaire).
 *
 * Règles sourcées :
 * - PLF déposé au plus tard le premier mardi d'octobre (art. 39 LOLF), 70 jours d'examen (art. 47 C) ;
 * - PLFSS déposé au plus tard le 15 octobre (art. LO 111-6 CSS), 50 jours d'examen (art. 47-1 C) ;
 * - session ordinaire du premier jour ouvrable d'octobre au dernier jour ouvrable de juin (art. 28 C) ;
 * - adjudications AFT : OAT long terme le 1er jeudi, moyen terme et indexées le 3e jeudi, BTF chaque lundi ;
 * - acomptes d'IS les 15 mars, 15 juin, 15 septembre et 15 décembre.
 */

const MS_JOUR = 86_400_000;

export function toDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  return toIso(new Date(toDate(iso).getTime() + n * MS_JOUR));
}

export function diffDays(a: string, b: string): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / MS_JOUR);
}

/** 0 = lundi … 6 = dimanche. */
export function weekday(iso: string): number {
  return (toDate(iso).getUTCDay() + 6) % 7;
}

export function ymd(iso: string): { y: number; m: number; d: number } {
  const d = toDate(iso);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}

export function isoOf(y: number, m: number, d: number): string {
  return toIso(new Date(Date.UTC(y, m - 1, d)));
}

/** Dimanche de Pâques (algorithme de Meeus/Jones/Butcher). */
export function paques(y: number): string {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1;
  return isoOf(y, mois, jour);
}

const feriesCache = new Map<number, Set<string>>();

export function joursFeries(y: number): Set<string> {
  let s = feriesCache.get(y);
  if (!s) {
    const p = paques(y);
    s = new Set([
      isoOf(y, 1, 1), addDays(p, 1), isoOf(y, 5, 1), isoOf(y, 5, 8), addDays(p, 39), addDays(p, 50),
      isoOf(y, 7, 14), isoOf(y, 8, 15), isoOf(y, 11, 1), isoOf(y, 11, 11), isoOf(y, 12, 25),
    ]);
    feriesCache.set(y, s);
  }
  return s;
}

export function estOuvre(iso: string): boolean {
  return weekday(iso) < 5 && !joursFeries(ymd(iso).y).has(iso);
}

/** Premier jour ouvré à partir de `iso` (inclus), vers l'avant ou l'arrière. */
export function ouvre(iso: string, sens: 1 | -1 = 1): string {
  let d = iso;
  while (!estOuvre(d)) d = addDays(d, sens);
  return d;
}

/** n-ième jour de semaine `wd` (0 = lundi) du mois. */
export function nieme(y: number, m: number, wd: number, n: number): string {
  const premier = isoOf(y, m, 1);
  const decal = (wd - weekday(premier) + 7) % 7;
  return addDays(premier, decal + 7 * (n - 1));
}

export function dernierJourMois(y: number, m: number): string {
  return addDays(isoOf(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1), -1);
}

export function premierMardiOctobre(y: number): string {
  return nieme(y, 10, 1, 1);
}

/** Date limite de dépôt du PLFSS : 15 octobre, ou premier jour ouvrable suivant si dimanche. */
export function depotPlfss(y: number): string {
  const d = isoOf(y, 10, 15);
  return weekday(d) === 6 ? addDays(d, 1) : d;
}

/** Bornes de la session ordinaire contenant `iso` (null hors session). */
export function sessionOrdinaire(iso: string): { debut: string; fin: string; annee: number } | null {
  const { y, m } = ymd(iso);
  const anneeDebut = m >= 10 ? y : y - 1;
  const debut = ouvre(isoOf(anneeDebut, 10, 1), 1);
  const fin = ouvre(isoOf(anneeDebut + 1, 6, 30), -1);
  return iso >= debut && iso <= fin ? { debut, fin, annee: anneeDebut } : null;
}

/** Ramène une échéance mensuelle (jour fixe) au prochain jour ouvré. */
export function echeanceMensuelle(y: number, m: number, jour: number): string {
  const j = Math.min(jour, ymd(dernierJourMois(y, m)).d);
  return ouvre(isoOf(y, m, j), 1);
}

/** Règle de l'audit 2 pour la paie de l'État : deux jours ouvrés avant le dernier jour ouvré du mois. */
export function paieRegleAudit(y: number, m: number): string {
  let d = ouvre(dernierJourMois(y, m), -1);
  for (let k = 0; k < 2; k++) d = ouvre(addDays(d, -1), -1);
  return d;
}

export function trimestreCivil(iso: string): string {
  const { y, m } = ymd(iso);
  return `${y}-T${Math.floor((m - 1) / 3) + 1}`;
}
