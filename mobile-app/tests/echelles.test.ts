import { describe, expect, it } from "vitest";
import { chemin, domaine, echelleLineaire, sousEchantillonner, zoneBrouillard } from "../src/components/svg/echelles";
import { formatAxe } from "../src/core/libelles";

describe("échelles et tracés", () => {
  it("projette linéairement et inverse l'axe vertical", () => {
    const y = echelleLineaire(0, 10, 200, 0);
    expect(y(0)).toBe(200);
    expect(y(5)).toBe(100);
    expect(y(10)).toBe(0);
  });

  it("donne un domaine avec marge, jamais dégénéré, en ignorant les valeurs non finies", () => {
    const [a, b] = domaine([2, 4, Number.NaN]);
    expect(a).toBeLessThan(2);
    expect(b).toBeGreaterThan(4);
    const [c, d] = domaine([3, 3, 3]);
    expect(d - c).toBeGreaterThan(0);
    expect(domaine([])).toEqual([0, 1]);
  });

  it("construit un chemin SVG et sous-échantillonne 1 825 jours en gardant le dernier point", () => {
    expect(chemin([{ x: 0, y: 1 }, { x: 2, y: 3 }, { x: Number.NaN, y: 0 }])).toBe("M0.0,1.0 L2.0,3.0");
    const xs = Array.from({ length: 1825 }, (_, i) => i);
    const e = sousEchantillonner(xs, 240);
    expect(e.length).toBeLessThanOrEqual(241);
    expect(e.at(-1)).toBe(1824);
  });

  it("couvre de brouillard la période non publiée, ou toute la courbe d'un indicateur modélisé", () => {
    const jours = [0, 1, 2, 3, 4, 5];
    expect(zoneBrouillard(jours, 2, false)).toEqual({ debut: 2, fin: 5 });
    expect(zoneBrouillard(jours, 5, false)).toBeNull();
    expect(zoneBrouillard(jours, null, true)).toEqual({ debut: 0, fin: 5 });
    expect(zoneBrouillard([], 0, true)).toBeNull();
  });

  it("gradue un axe de faible amplitude avec assez de décimales pour distinguer les graduations", () => {
    const g = [2.141, 2.143, 2.145].map((v) => formatAxe(v, "€/L", 0.004));
    expect(new Set(g).size).toBe(3);
    expect(formatAxe(56_582, "MW", 533)).toMatch(/^56\s?582\s?MW$/u);
  });
});
