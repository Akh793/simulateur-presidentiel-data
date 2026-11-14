/** Algèbre linéaire dense minimale (matrices carrées n x n en Float64Array, ordre ligne). */

export class Mat {
  readonly n: number;
  readonly a: Float64Array;

  constructor(n: number, a?: Float64Array) {
    this.n = n;
    this.a = a ?? new Float64Array(n * n);
  }

  static identite(n: number): Mat {
    const m = new Mat(n);
    for (let i = 0; i < n; i++) m.set(i, i, 1);
    return m;
  }

  get(i: number, j: number): number {
    return this.a[i * this.n + j] as number;
  }

  set(i: number, j: number, v: number): void {
    this.a[i * this.n + j] = v;
  }

  clone(): Mat {
    return new Mat(this.n, new Float64Array(this.a));
  }

  mulVec(v: ArrayLike<number>, out = new Float64Array(this.n)): Float64Array {
    const n = this.n;
    for (let i = 0; i < n; i++) {
      let s = 0;
      const o = i * n;
      for (let j = 0; j < n; j++) s += (this.a[o + j] as number) * (v[j] as number);
      out[i] = s;
    }
    return out;
  }

  mul(b: Mat): Mat {
    const n = this.n, r = new Mat(n);
    for (let i = 0; i < n; i++)
      for (let k = 0; k < n; k++) {
        const aik = this.get(i, k);
        if (aik === 0) continue;
        for (let j = 0; j < n; j++) r.a[i * n + j] = (r.a[i * n + j] as number) + aik * b.get(k, j);
      }
    return r;
  }

  /** Norme infinie = somme absolue maximale par ligne = gain maximal sur une impulsion bornée. */
  normeInf(): number {
    let m = 0;
    for (let i = 0; i < this.n; i++) {
      let s = 0;
      for (let j = 0; j < this.n; j++) s += Math.abs(this.get(i, j));
      m = Math.max(m, s);
    }
    return m;
  }

  /** Inverse par Gauss-Jordan à pivot partiel. */
  inverse(): Mat {
    const n = this.n, a = this.clone(), inv = Mat.identite(n);
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(a.get(r, c)) > Math.abs(a.get(p, c))) p = r;
      const piv = a.get(p, c);
      if (Math.abs(piv) < 1e-12) throw new Error("matrice singulière : (I - E) non inversible");
      if (p !== c) for (let j = 0; j < n; j++) {
        const t1 = a.get(c, j); a.set(c, j, a.get(p, j)); a.set(p, j, t1);
        const t2 = inv.get(c, j); inv.set(c, j, inv.get(p, j)); inv.set(p, j, t2);
      }
      for (let j = 0; j < n; j++) { a.set(c, j, a.get(c, j) / piv); inv.set(c, j, inv.get(c, j) / piv); }
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const f = a.get(r, c);
        if (f === 0) continue;
        for (let j = 0; j < n; j++) {
          a.set(r, j, a.get(r, j) - f * a.get(c, j));
          inv.set(r, j, inv.get(r, j) - f * inv.get(c, j));
        }
      }
    }
    return inv;
  }
}

/**
 * Majorant rigoureux du rayon spectral : ρ(E) <= ρ(|E|) (Perron-Frobenius) et, pour tout vecteur x > 0,
 * ρ(|E|) <= max_i (|E|x)_i / x_i (Collatz-Wielandt). L'itération de puissance resserre ce majorant.
 */
export function majorantRayonSpectral(m: Mat, iterations = 400): number {
  const n = m.n, abs = new Mat(n);
  for (let k = 0; k < n * n; k++) abs.a[k] = Math.abs(m.a[k] as number);
  let x: Float64Array = new Float64Array(n).fill(1);
  let borne = Infinity;
  for (let it = 0; it < iterations; it++) {
    const y = abs.mulVec(x);
    let maxRatio = 0, norme = 0;
    for (let i = 0; i < n; i++) {
      maxRatio = Math.max(maxRatio, (y[i] as number) / (x[i] as number));
      norme = Math.max(norme, y[i] as number);
    }
    borne = Math.min(borne, maxRatio);
    if (norme === 0) return 0;
    for (let i = 0; i < n; i++) y[i] = (y[i] as number) / norme + 1e-12; // x reste strictement positif
    x = y;
  }
  return borne;
}
