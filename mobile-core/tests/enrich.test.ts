import { describe, expect, it } from "vitest";
import { Simulation } from "../../engine/src/index";
import { enrichirNarration, type Enrichisseur } from "../src/narrative/enrich";
import { buildTurnNarrative } from "../src/narrative/generator";
import { etatNarratif } from "../src/session/snapshot";
import { graineExemple } from "./helpers";

const sim = new Simulation(graineExemple(), { seed: 2 });
const base = buildTurnNarrative(etatNarratif(sim), sim.parapheurCourant, null);
const fabrique = (f: (brouillon: string) => string | Promise<string>): Enrichisseur => ({ nom: "test", enrichir: async (r) => f(r.brouillon) });

describe("enrichissement LLM optionnel avec repli sur les gabarits", () => {
  it("hors ligne : renvoie la narration des gabarits telle quelle, immédiatement", async () => {
    expect(await enrichirNarration(base, fabrique(() => "x"), { enLigne: false })).toBe(base);
  });

  it("retient une réécriture qui respecte les faits", async () => {
    const r = await enrichirNarration(base, fabrique((b) => `En bref : ${b}`), { enLigne: true });
    expect(r.mode).toBe("enrichi");
    expect(r.dossiers[0]!.briefing.startsWith("En bref : ")).toBe(true);
  });

  it("rejette une réécriture qui invente un chiffre ou cite une personnalité réelle", async () => {
    const r1 = await enrichirNarration(base, fabrique((b) => `${b} Le coût atteindrait 12 345 €.`), { enLigne: true });
    expect(r1.mode).toBe("gabarit");
    expect(r1.dossiers[0]!.briefing).toBe(base.dossiers[0]!.briefing);
    expect(r1.rejets.some((x) => x.motifs.some((m) => m.includes("12 345")))).toBe(true);
    const r2 = await enrichirNarration(base, fabrique((b) => `${b} Emmanuel Macron s'exprimera.`), { enLigne: true });
    expect(r2.dossiers[0]!.briefing).toBe(base.dossiers[0]!.briefing);
  });

  it("repli instantané si le modèle dépasse le délai ou échoue", async () => {
    const lent = fabrique(() => new Promise((res) => setTimeout(() => res("trop tard"), 500)));
    const t0 = Date.now();
    const r = await enrichirNarration(base, lent, { enLigne: true, delaiMs: 50 });
    expect(Date.now() - t0).toBeLessThan(400);
    expect(r.dossiers[0]!.briefing).toBe(base.dossiers[0]!.briefing);
    const casse = fabrique(() => { throw new Error("réseau indisponible"); });
    expect((await enrichirNarration(base, casse, { enLigne: true })).mode).toBe("gabarit");
  });
});
