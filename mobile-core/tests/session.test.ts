import { describe, expect, it } from "vitest";
import { Simulation } from "../../engine/src/index";
import { installerPackEmbarque } from "../src/archives/pack";
import { SEED_EMBARQUEE } from "../src/archives/scenarios";
import { StorageService } from "../src/db/storage";
import { GameSession } from "../src/session/game-session";
import { CATALOGUE_IDS } from "../src/session/snapshot";
import { baseMemoire } from "./node-sqlite";

async function storage() {
  const s = await StorageService.ouvrir(baseMemoire());
  await installerPackEmbarque(s);
  return s;
}

describe("GameSession : partie 100 % hors ligne", () => {
  it("crée une partie sur la graine embarquée, journalise chaque jour et sauvegarde après chaque arbitrage", async () => {
    const st = await storage();
    const p = await GameSession.nouvelle(st, { seedId: SEED_EMBARQUEE, sessionId: "S1", config: { seed: 21 } });
    expect(p.narration.dossiers.length).toBeGreaterThan(0);
    expect(p.narration.rejets).toEqual([]);
    expect(await st.nombreTours("S1")).toBe(1);

    let jours = 0;
    for (let k = 0; k < 10; k++) jours += (await p.avancer(7)).jours;
    expect(await st.nombreTours("S1")).toBe(jours + 1);

    const d = p.narration.dossiers.find((x) => x.options.length)!;
    const r = await p.decider(d.options[0]!.gabaritId, d.id);
    const save = await st.chargerPartie("S1");
    expect(save!.progression.decisions).toBe(r.ok ? 1 : 0);
    const h = await st.historique("S1", p.sim.jour, p.sim.jour);
    expect(h[0]!.decisions[0]!.libelle).toBe(d.options[0]!.libelle);
    expect(h[0]!.une?.titres).toHaveLength(3);

    const courbe = await st.courbe("S1", "ENE4");
    expect(courbe).toHaveLength(jours + 1);
    expect(courbe.at(-1)!.jeu).toBeCloseTo(p.sim.valeur("ENE4"), 4);
  });

  it("appelle le rappel de chaque jour simulé (animation de la semaine) et s'arrête sur interruption critique", async () => {
    const st = await storage();
    const p = await GameSession.nouvelle(st, { seedId: SEED_EMBARQUEE, sessionId: "J", config: { seed: 21 } });
    const vus: number[] = [];
    const r = await p.avancer(7, { surJour: (j) => { vus.push(j.jour); } });
    expect(vus).toHaveLength(r.jours);
    expect(vus.at(-1)).toBe(p.sim.jour);
    if (r.jours < 7) expect(r.interruptions.some((i) => i.critique)).toBe(true);
  });

  it("reprise après fermeture : l'état et la suite de partie sont identiques à une partie ininterrompue", async () => {
    const st = await storage();
    const a = await GameSession.nouvelle(st, { seedId: SEED_EMBARQUEE, sessionId: "A", config: { seed: 33 } });
    const b0 = await GameSession.nouvelle(st, { seedId: SEED_EMBARQUEE, sessionId: "B", config: { seed: 33 } });
    const jouer = async (s: GameSession, n: number) => {
      for (let k = 0; k < n; k++) {
        await s.avancer(7);
        const d = s.narration.dossiers.find((x) => x.options.length);
        if (d && k % 3 === 0) await s.decider(d.options[0]!.gabaritId, d.id);
      }
    };
    await jouer(a, 12);
    await jouer(b0, 6);
    const b = await GameSession.reprendre(st, "B");
    expect(b.narration).toEqual(b0.narration);
    await jouer(b, 6);
    expect(b.sim.jour).toBe(a.sim.jour);
    for (const id of CATALOGUE_IDS) expect(b.sim.valeur(id)).toBeCloseTo(a.sim.valeur(id), 9);
    expect(b.narration.une).toEqual(a.narration.une);
    expect(b.narration.dossiers.map((x) => x.titre)).toEqual(a.narration.dossiers.map((x) => x.titre));
  });

  it("joue un scénario « Archives de Crise » et le retrouve à la reprise", async () => {
    const st = await storage();
    const p = await GameSession.nouvelle(st, { seedId: SEED_EMBARQUEE, scenarioId: "penurie-carburants-2022", sessionId: "C", config: { seed: 5 } });
    expect(p.narration.dossiers[0]!.famille).toBe("energie");
    await p.avancer(7);
    const r = await GameSession.reprendre(st, "C");
    expect(r.meta.scenarioId).toBe("penurie-carburants-2022");
    expect(r.sim.macro.impulsions.some((x) => x.id === "scenario-penurie-carburants-2022")).toBe(true);
    expect((await st.listerParties()).map((x) => x.label)).toContain("Archive de crise : pénurie de carburants");
  });

  it("mandat complet (1 825 jours) persisté sans erreur, narration sans rejet", async () => {
    const st = await storage();
    const p = await GameSession.nouvelle(st, { seedId: SEED_EMBARQUEE, sessionId: "M", config: { seed: 77 } });
    let tours = 0, rejets = 0;
    const t0 = performance.now();
    while (!p.sim.fin) {
      const r = await p.avancer(7);
      tours++;
      rejets += r.narration.rejets.length;
      if (tours % 4 === 0) {
        const d = r.narration.dossiers.find((x) => x.options.length);
        if (d) await p.decider(d.options[0]!.gabaritId, d.id);
      }
    }
    const ms = performance.now() - t0;
    expect(rejets).toBe(0);
    expect(await st.nombreTours("M")).toBe(1826);
    expect((await st.chargerPartie("M"))!.termine).toBe(true);
    console.info(`mandat persisté : ${tours} tours, ${(ms / tours).toFixed(1)} ms par tour (simulation + narration + SQLite)`);
    expect(Simulation).toBeDefined();
  });
});
