/** Échelles et tracés des graphiques vectoriels (logique pure, testée). */
export interface Point {
  x: number;
  y: number;
}

export function echelleLineaire(d0: number, d1: number, r0: number, r1: number): (v: number) => number {
  const span = d1 - d0 || 1;
  return (v) => r0 + ((v - d0) / span) * (r1 - r0);
}

/** Domaine arrondi avec marge de 8 %, jamais dégénéré. */
export function domaine(valeurs: number[]): [number, number] {
  const f = valeurs.filter(Number.isFinite);
  if (!f.length) return [0, 1];
  let lo = Math.min(...f), hi = Math.max(...f);
  if (hi - lo < 1e-9) { const m = Math.abs(hi) * 0.05 || 1; lo -= m; hi += m; }
  const marge = (hi - lo) * 0.08;
  return [lo - marge, hi + marge];
}

export function chemin(points: Point[]): string {
  return points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

/** Sous-échantillonnage (au plus `max` points) pour garder un tracé fluide sur 1 825 jours. */
export function sousEchantillonner<T>(xs: T[], max = 240): T[] {
  if (xs.length <= max) return xs;
  const pas = xs.length / max;
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(xs[Math.floor(i * pas)]!);
  out.push(xs[xs.length - 1]!);
  return out;
}

/** Zone de brouillard : de la dernière publication (jour) à aujourd'hui, ou toute la courbe pour un indicateur modélisé. */
export function zoneBrouillard(jours: number[], derniereVue: number | null, modele: boolean): { debut: number; fin: number } | null {
  if (!jours.length) return null;
  const fin = jours[jours.length - 1]!;
  if (modele) return { debut: jours[0]!, fin };
  if (derniereVue === null || derniereVue >= fin) return null;
  return { debut: Math.max(derniereVue, jours[0]!), fin };
}
