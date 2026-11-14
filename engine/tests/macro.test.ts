import { describe, expect, it } from "vitest";
import { CATALOGUE, idx, N_INDICATEURS } from "../src/indicateurs";
import { Mat, majorantRayonSpectral } from "../src/linalg";
import { BORNE_COEF, BORNE_GAIN, BORNE_LIGNE, BORNE_RHO, calibrer, CalibrationError, COUPLAGES, Macro, MAX_SORTANTS, mesurer, saturer, sigma, verifier } from "../src/macro";

describe("calibration de E et M = (I - E)^-1 — test CI bloquant", () => {
  const cal = calibrer();
  const r = cal.rapport;

  it("respecte toutes les bornes de la spécification", () => {
    expect(r.n).toBe(48);
    expect(N_INDICATEURS).toBe(48);
    expect(r.coefMax).toBeLessThanOrEqual(BORNE_COEF);
    expect(r.ligneMax).toBeLessThanOrEqual(BORNE_LIGNE + 1e-12);
    expect(r.sortantsMax).toBeLessThanOrEqual(MAX_SORTANTS);
    expect(r.rhoMajorant).toBeLessThan(BORNE_RHO);
    expect(r.gainM).toBeLessThan(BORNE_GAIN);
  });

  it("M est bien l'inverse de I - E", () => {
    const n = cal.E.n, IminusE = Mat.identite(n);
    for (let k = 0; k < n * n; k++) IminusE.a[k] = (IminusE.a[k] as number) - (cal.E.a[k] as number);
    const P = cal.M.mul(IminusE);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) expect(Math.abs(P.get(i, j) - (i === j ? 1 : 0))).toBeLessThan(1e-10);
  });

  it("confirme ρ(E) < 0,5 par la formule de Gelfand (||E^k||^(1/k))", () => {
    let P = cal.E.clone();
    for (let k = 0; k < 6; k++) P = P.mul(P); // E^64
    expect(Math.pow(P.normeInf(), 1 / 64)).toBeLessThan(BORNE_RHO);
  });

  it("exclut de E les indicateurs pilotés par le flux", () => {
    for (const id of ["BUD1", "FIN2", "LOG_M3"]) {
      const i = idx(id);
      for (let j = 0; j < N_INDICATEURS; j++) { expect(cal.E.get(i, j)).toBe(0); expect(cal.E.get(j, i)).toBe(0); }
    }
    expect(() => calibrer([...COUPLAGES, { de: "BUD1", vers: "MAC4", e: 0.1 }])).toThrow(CalibrationError);
  });

  it("rejette une matrice hors bornes", () => {
    const E = new Mat(48);
    for (let j = 1; j < 9; j++) E.set(0, j, 0.15); // ligne 0 : somme 1,2 et colonne chargée
    const M = new Mat(48);
    expect(() => verifier(mesurer(E, M, majorantRayonSpectral(E)))).toThrow(CalibrationError);
  });

  it("écrête, élague et normalise des couplages excessifs au lieu de diverger", () => {
    const excessifs = [...COUPLAGES, ...CATALOGUE.slice(1, 12).map((s) => ({ de: "MAC1", vers: s.id, e: 0.9 }))]
      .filter((c) => CATALOGUE[idx(c.vers)]!.pilote !== "flux" && c.vers !== c.de);
    const c2 = calibrer(excessifs);
    expect(c2.rapport.sortantsMax).toBeLessThanOrEqual(MAX_SORTANTS);
    expect(c2.rapport.ajustements.length).toBeGreaterThan(0);
  });
});

describe("inertie et attribution causale", () => {
  it("σ est nulle avant la décision, bornée par l'amplitude, et s'érode", () => {
    const p = { delaiLatence: 30, amplitudePic: 1, tauxErosion: 0.01 };
    expect(sigma(-1, p)).toBe(0);
    expect(sigma(0, p)).toBeCloseTo(0, 12);
    let max = 0;
    for (let t = 0; t < 2000; t++) max = Math.max(max, Math.abs(sigma(t, p)));
    expect(max).toBeLessThanOrEqual(1);
    expect(sigma(1000, p)).toBeLessThan(sigma(60, p));
  });

  it("la somme des contributions égale exactement l'écart (saturation comprise)", () => {
    const macro = new Macro(calibrer());
    const inert = { delaiLatence: 10, amplitudePic: 1, tauxErosion: 0 };
    macro.ajouter("a", "A", "decision", 0, { ENE4: -2.5, MAC1: -0.4 }, inert);
    macro.ajouter("b", "B", "decision", 5, { MAC1: 3, MAC4: -2 }, inert);
    for (let k = 0; k < 30; k++) macro.ajouter(`c${k}`, "C", "decision", k, { MAC1: 2 }, inert); // force la saturation
    const t = 200, i = idx("MAC1");
    const total = macro.attribution(t, i).reduce((s, p) => s + p.contribution, 0);
    expect(total).toBeCloseTo(macro.ecarts(t)[i] as number, 10);
    expect(Math.abs(macro.ecarts(t)[i] as number)).toBeLessThanOrEqual(4);
    expect(saturer(1e9)).toBeCloseTo(4, 9);
  });
});
