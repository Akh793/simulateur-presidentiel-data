import { describe, expect, it } from "vitest";
import { etatCorps, etatMinistre, traits } from "../src/components/svg/portrait-traits";

describe("portraits modulaires", () => {
  it("sont déterministes pour une même graine de personnage et variés entre personnages", () => {
    const a = traits("ministre:economie:Fabrice", { expression: "neutre", fatigue: 0 });
    expect(traits("ministre:economie:Fabrice", { expression: "neutre", fatigue: 0 })).toEqual(a);
    const signatures = new Set(Array.from({ length: 40 }, (_, i) => {
      const t = traits(`perso-${i}`, { expression: "neutre", fatigue: 0 });
      return `${t.morphologie}/${t.coiffure}/${t.teint}/${t.veste}`;
    }));
    expect(signatures.size).toBeGreaterThan(20);
  });

  it("borne la fatigue et dérive l'expression de l'état du moteur", () => {
    expect(traits("x", { expression: "neutre", fatigue: 3 }).fatigue).toBe(1);
    expect(etatMinistre({ tension: 80, loyaute: 90, popularite: 50 }).expression).toBe("inquiet");
    expect(etatMinistre({ tension: 10, loyaute: 30, popularite: 50 }).expression).toBe("colere");
    expect(etatMinistre({ tension: 10, loyaute: 80, popularite: 70 })).toEqual({ expression: "confiant", fatigue: 0.1 });
    expect(etatCorps({ radicalisation: 80, approbation: 0 }).expression).toBe("colere");
  });
});
