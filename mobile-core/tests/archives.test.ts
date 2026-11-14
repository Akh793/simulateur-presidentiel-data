import { describe, expect, it } from "vitest";
import { CATALOGUE, GABARITS, Simulation } from "../../engine/src/index";
import { SCENARIOS, appliquerScenario } from "../src/archives/scenarios";
import { PACK_EMBARQUE } from "../src/archives/pack";
import { buildTurnNarrative } from "../src/narrative/generator";
import { referencesReelles } from "../src/narrative/personnalites";
import { indexer, valider } from "../src/narrative/validator";
import { MEMOIRE_VIDE } from "../src/narrative/types";
import { etatNarratif } from "../src/session/snapshot";
import { parseGraine } from "../../shared/schema";

describe("Archives de Crise", () => {
  const graine = parseGraine(PACK_EMBARQUE[0]!.donnees);

  for (const s of SCENARIOS) {
    it(`${s.id} : faits sourcés, aucune personnalité, choc cohérent`, () => {
      // chaque nombre et chaque date de l'accroche figurent dans les faits déclarés
      const idx = indexer([s.faits]);
      const motifs = valider(s.accroche, idx, 600).filter((m) => m.startsWith("nombre") || m.startsWith("date"));
      expect(motifs, s.accroche).toEqual([]);
      expect(referencesReelles(s.accroche)).toEqual([]);
      expect(s.sources.length).toBeGreaterThan(0);
      for (const src of s.sources) expect(src.url).toMatch(/^https:\/\//);
      for (const id of [...Object.keys(s.choc.u), ...s.indicateurs]) expect(CATALOGUE.some((c) => c.id === id), id).toBe(true);
      for (const o of s.options) expect(GABARITS.some((g) => g.id === o), o).toBe(true);
      expect(/\d/.test(s.evenement)).toBe(false);
    });

    it(`${s.id} : jouable 180 jours hors ligne, choc visible et narré sans rejet`, () => {
      const sim = new Simulation(graine, { seed: 17 });
      appliquerScenario(sim, s);
      expect(sim.parapheurCourant.some((d) => d.reference === `scenario:${s.id}`)).toBe(true);
      let mem = MEMOIRE_VIDE, evenementNarre = false;
      for (let t = 0; t < 26; t++) {
        const n = buildTurnNarrative(etatNarratif(sim, { id: s.id, titre: s.titre, evenement: s.evenement }), sim.parapheurCourant, null, { memoire: mem });
        mem = n.memoire;
        expect(n.rejets, JSON.stringify(n.rejets)).toEqual([]);
        if (n.dossiers.some((d) => d.briefing.includes(s.evenement))) evenementNarre = true;
        sim.avancer(7);
      }
      const touche = Object.keys(s.choc.u).some((id) => Math.abs(sim.valeur(id) - sim.valeurReference(id)) > 0);
      expect(touche).toBe(true);
      expect(evenementNarre).toBe(true);
    });
  }

  it("la grève des raffineries déclenche un blocage physique dès les premiers jours", () => {
    const sim = new Simulation(graine, { seed: 3 });
    appliquerScenario(sim, SCENARIOS.find((x) => x.id === "penurie-carburants-2022")!);
    for (let k = 0; k < 3; k++) sim.etapeJour();
    expect(sim.acteurs.corps.find((c) => c.id === "syndicats_contestataires")!.bloqueJusqua).not.toBeNull();
  });
});
