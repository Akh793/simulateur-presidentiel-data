/**
 * Générateur pseudo-aléatoire déterministe (mulberry32) : une partie rejouée avec la même graine
 * et les mêmes décisions produit exactement le même mandat. L'état tient dans un entier (sauvegarde SQLite).
 */
export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  get etat(): number {
    return this.s;
  }

  set etat(v: number) {
    this.s = v >>> 0;
  }

  /** Uniforme sur [0, 1). */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Loi normale centrée réduite (Box-Muller). */
  normal(): number {
    const u = Math.max(this.next(), 1e-12);
    const v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  int(min: number, maxInclus: number): number {
    return min + Math.floor(this.next() * (maxInclus - min + 1));
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error("pick sur un tableau vide");
    return arr[Math.floor(this.next() * arr.length)] as T;
  }

  chance(p: number): boolean {
    return this.next() < p;
  }
}

/** Graine entière stable dérivée d'une chaîne (ex. date du jour de la graine). */
export function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
