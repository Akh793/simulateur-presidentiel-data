import { describe, expect, it } from "vitest";
import { disposerHemicycle, ordonnerGroupes, rangsPourSieges } from "../src/components/svg/hemicycle-layout";

// Composition indicative (fictive pour le test) : la vraie composition vient de la graine du jour.
const GROUPES = [
  { code: "RN", sieges: 121 }, { code: "EPR", sieges: 90 }, { code: "LFI-NFP", sieges: 70 }, { code: "SOC", sieges: 68 },
  { code: "DR", sieges: 46 }, { code: "ECOS", sieges: 38 }, { code: "DEM", sieges: 36 }, { code: "HOR", sieges: 34 },
  { code: "LIOT", sieges: 22 }, { code: "UDR", sieges: 16 }, { code: "GDR", sieges: 17 }, { code: "NI", sieges: 16 },
];

describe("hémicycle", () => {
  it("répartit exactement le total de sièges entre les rangs, plus de sièges sur les rangs extérieurs", () => {
    const n = rangsPourSieges(577, 12, 60, 172);
    expect(n.reduce((s, x) => s + x, 0)).toBe(577);
    expect(n[11]!).toBeGreaterThan(n[0]!);
  });

  it("dispose 577 sièges, colorie chaque groupe avec son effectif et laisse les vacances en blanc", () => {
    const total = GROUPES.reduce((s, g) => s + g.sieges, 0);
    expect(total).toBe(574);
    const s = disposerHemicycle(GROUPES);
    expect(s).toHaveLength(577);
    for (const g of GROUPES) expect(s.filter((x) => x.groupe === g.code)).toHaveLength(g.sieges);
    expect(s.filter((x) => x.groupe === null)).toHaveLength(3);
    for (const x of s) {
      expect(Number.isFinite(x.x) && Number.isFinite(x.y) && x.r > 0).toBe(true);
      expect(x.y).toBeLessThanOrEqual(180);   // demi-cercle supérieur
    }
  });

  it("place les groupes de gauche à droite selon l'ordre de séance, non-inscrits en dernier", () => {
    const ordre = ordonnerGroupes(GROUPES).map((g) => g.code);
    expect(ordre[0]).toBe("LFI-NFP");
    expect(ordre.at(-1)).toBe("NI");
    expect(ordre.indexOf("SOC")).toBeLessThan(ordre.indexOf("EPR"));
    expect(ordre.indexOf("EPR")).toBeLessThan(ordre.indexOf("RN"));
    const s = disposerHemicycle(GROUPES);
    const xMoyen = (c: string) => { const xs = s.filter((x) => x.groupe === c); return xs.reduce((a, x) => a + x.x, 0) / xs.length; };
    expect(xMoyen("LFI-NFP")).toBeLessThan(xMoyen("EPR"));
    expect(xMoyen("EPR")).toBeLessThan(xMoyen("RN"));
  });

  it("accepte un groupe inconnu de la graine sans perdre de siège", () => {
    const s = disposerHemicycle([...GROUPES.slice(0, -1), { code: "NOUVEAU", sieges: 19 }]);
    expect(s.filter((x) => x.groupe === "NOUVEAU")).toHaveLength(19);
    expect(s.filter((x) => x.groupe === null)).toHaveLength(0);
  });
});
