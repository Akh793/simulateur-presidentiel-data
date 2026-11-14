/**
 * Mise en page de l'hémicycle (logique pure) : 577 sièges en demi-cercle, rangs concentriques, groupes en
 * secteurs de gauche à droite. Algorithme classique des diagrammes parlementaires : le nombre de sièges
 * d'un rang est proportionnel à son rayon ; les sièges sont ensuite triés par angle puis attribués aux groupes.
 */
import { ORDRE_HEMICYCLE } from "../../theme/groupes";

export interface Siege {
  x: number;
  y: number;
  r: number;
  groupe: string | null;   // null = siège vacant
  rang: number;
}

export interface GroupeSieges {
  code: string;
  sieges: number;
}

export function rangsPourSieges(total: number, rangs: number, r0: number, r1: number): number[] {
  const rayons = Array.from({ length: rangs }, (_, i) => r0 + ((r1 - r0) * i) / Math.max(1, rangs - 1));
  const somme = rayons.reduce((s, r) => s + r, 0);
  const n = rayons.map((r) => Math.floor((total * r) / somme));
  let reste = total - n.reduce((s, x) => s + x, 0);
  for (let i = rangs - 1; reste > 0; i = (i - 1 + rangs) % rangs, reste--) n[i]!++;
  return n;
}

/** Ordre gauche → droite : ordre de séance connu, puis groupes inconnus, les non-inscrits en dernier. */
export function ordonnerGroupes(groupes: GroupeSieges[]): GroupeSieges[] {
  const rang = (c: string) => {
    const k = (ORDRE_HEMICYCLE as readonly string[]).indexOf(c.toUpperCase());
    return k >= 0 ? k : c.toUpperCase() === "NI" ? 99 : 50;
  };
  return [...groupes].sort((a, b) => rang(a.code) - rang(b.code) || a.code.localeCompare(b.code));
}

export function disposerHemicycle(groupes: GroupeSieges[], total = 577, opts: { largeur?: number; rangs?: number } = {}): Siege[] {
  const L = opts.largeur ?? 360, R = opts.rangs ?? 12;
  const cx = L / 2, cy = L / 2 - 4, r1 = L / 2 - 8, r0 = r1 * 0.38;
  const parRang = rangsPourSieges(total, R, r0, r1);
  const pas = (r1 - r0) / Math.max(1, R - 1);
  const sieges: (Siege & { angle: number })[] = [];
  parRang.forEach((n, i) => {
    const r = r0 + pas * i;
    for (let k = 0; k < n; k++) {
      const angle = Math.PI - ((k + 0.5) * Math.PI) / n;   // de gauche (π) à droite (0)
      sieges.push({ x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle), r: Math.min(pas * 0.42, (Math.PI * r) / n * 0.42), groupe: null, rang: i, angle });
    }
  });
  sieges.sort((a, b) => b.angle - a.angle || a.rang - b.rang);
  let k = 0;
  for (const g of ordonnerGroupes(groupes)) for (let s = 0; s < g.sieges && k < sieges.length; s++) sieges[k++]!.groupe = g.code;
  return sieges.map(({ angle: _a, ...s }) => s);
}
