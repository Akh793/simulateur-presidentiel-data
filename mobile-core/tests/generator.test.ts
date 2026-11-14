import { describe, expect, it } from "vitest";
import { GABARITS, Rng, Simulation } from "../../engine/src/index";
import { MINISTERES } from "../../engine/src/types";
import { buildTurnNarrative, niveau } from "../src/narrative/generator";
import { FAMILLES, NEUTRES } from "../src/narrative/templates";
import { MEMOIRE_VIDE, type MemoireNarrative, type NarrationTour } from "../src/narrative/types";
import { etatNarratif } from "../src/session/snapshot";
import { graineExemple } from "./helpers";

const graine = graineExemple();

function textes(n: NarrationTour): string[] {
  return [...n.dossiers.flatMap((d) => [d.titre, d.briefing, d.notes.bercy.titre, d.notes.bercy.texte, d.notes.social.titre, d.notes.social.texte]),
    ...n.une.titres.flatMap((l) => [l.titre, l.chapeau]), ...n.breves];
}

/** Mandat complet avec un joueur aléatoire agressif (capital rechargé) : toutes les familles et les divergences apparaissent. */
function mandat(seed: number, cb: (n: NarrationTour, sim: Simulation) => void): void {
  const sim = new Simulation(graine, { seed });
  const rng = new Rng(seed * 7 + 1);
  let mem: MemoireNarrative = MEMOIRE_VIDE;
  let derniere: { libelle: string; ok: boolean; jour: number } | null = null;
  while (!sim.fin) {
    const n = buildTurnNarrative(etatNarratif(sim), sim.parapheurCourant, derniere, { memoire: mem });
    mem = n.memoire;
    cb(n, sim);
    sim.capitalPolitique = sim.parlement.plafondCP;
    for (let k = 0; k < 2; k++) {
      const d = sim.parapheurCourant.length ? rng.pick(sim.parapheurCourant) : undefined;
      const g = d && d.options.length && rng.chance(0.6) ? d.options[rng.int(0, d.options.length - 1)]! : rng.pick(GABARITS).id;
      const r = sim.decider(g, d?.id);
      derniere = { libelle: GABARITS.find((x) => x.id === g)!.libelle, ok: r.ok, jour: sim.jour };
    }
    if (rng.chance(0.03)) sim.remanier(rng.pick(MINISTERES));
    sim.avancer(7);
  }
}

describe("narration sur des mandats complets", () => {
  it("aucun rejet, aucune variable restante, toutes les familles émises sont couvertes (3 mandats de 1 825 jours)", () => {
    const vues = new Map<string, number>();
    let tours = 0, rejets = 0, divergences = 0;
    for (const seed of [2, 5, 13]) mandat(seed, (n) => {
      tours++;
      rejets += n.rejets.length;
      if (n.rejets.length) console.error(JSON.stringify(n.rejets.slice(0, 3)));
      for (const d of n.dossiers) {
        vues.set(`${d.famille}/${d.source}`, (vues.get(`${d.famille}/${d.source}`) ?? 0) + 1);
        expect(FAMILLES[d.famille], d.famille).toBeDefined();
        expect(d.titre).not.toBe(NEUTRES.titre);
        if (d.source === "divergence") divergences++;
      }
      for (const t of textes(n)) expect(t).not.toMatch(/[{}]/);
      expect(n.une.titres).toHaveLength(3);
      expect(n.breves.length).toBeGreaterThan(0);
    });
    console.info(`tours ${tours}, divergences ${divergences}, familles/sources ${[...vues].map(([k, v]) => `${k}:${v}`).join(" ")}`);
    expect(rejets).toBe(0);
    expect(divergences).toBeGreaterThan(0);
    for (const f of ["energie", "meteo", "parlement", "publication", "ministre", "institutions"]) expect([...vues.keys()].some((k) => k.startsWith(`${f}/`)), f).toBe(true);
  });

  it("est déterministe : même état, mêmes dossiers, même mémoire, même texte", () => {
    const sim = new Simulation(graine, { seed: 4 });
    for (let k = 0; k < 90; k++) sim.etapeJour();
    const e = etatNarratif(sim);
    const a = buildTurnNarrative(e, sim.parapheurCourant, null, { memoire: MEMOIRE_VIDE });
    const b = buildTurnNarrative(JSON.parse(JSON.stringify(e)), sim.parapheurCourant, null, { memoire: MEMOIRE_VIDE });
    expect(b).toEqual(a);
  });

  it("anti-répétition : un même dossier relu avec la mémoire du tour précédent change de formulation", () => {
    const sim = new Simulation(graine, { seed: 4 });
    const e = etatNarratif(sim);
    const d = sim.parapheurCourant.slice(0, 1);
    const t1 = buildTurnNarrative(e, d, null, { memoire: MEMOIRE_VIDE });
    const t2 = buildTurnNarrative(e, d, null, { memoire: t1.memoire });
    const t3 = buildTurnNarrative(e, d, null, { memoire: t2.memoire });
    expect(t2.dossiers[0]!.titre).not.toBe(t1.dossiers[0]!.titre);
    expect(new Set([t1, t2, t3].map((x) => x.dossiers[0]!.briefing)).size).toBeGreaterThan(1);
  });

  it("chaque nombre du texte provient des faits ; la graine du jour est narrée sans rejet", () => {
    const sim = new Simulation(graine, { seed: 1 });
    const n = buildTurnNarrative(etatNarratif(sim), sim.parapheurCourant, null);
    expect(n.rejets).toEqual([]);
    expect(n.dossiers.map((d) => d.famille)).toEqual(["meteo", "institutions", "publication"]);
    expect(n.dossiers[0]!.niveau).toBe(niveau(3));
    expect(n.dossiers[0]!.briefing).toContain("14,0");      // vigilance du 14/11/2026
    expect(n.faits["D1.seuil"]).toBe("9,0");                // seuil d'alerte publié par le relais, disponible comme repère
    expect(n.dossiers[1]!.briefing).toContain("289");       // seuil de censure du moteur, pas celui de la graine
    // la valeur affichée est celle du jeu (baseline bruitée du moteur) ; la précédente vient de la graine
    expect(n.dossiers[2]!.briefing).toContain(n.faits["D3.valeur"]!);
    expect(n.dossiers[2]!.briefing).toContain("103,07");
  });

  it("l'inaction aggrave l'urgence sans exagérer les faits : vocabulaire réglé sur la gravité initiale", () => {
    const sim = new Simulation(graine, { seed: 1 });
    const e = etatNarratif(sim);
    const d = { ...sim.parapheurCourant[2]!, gravite: 1.3 * Math.pow(1.15, 10), joursInaction: 10 };
    const n = buildTurnNarrative(e, [d], null);
    expect(n.dossiers[0]!.niveau).toBe(3);
    expect(n.dossiers[0]!.intensite).toBe(1);
    expect(n.dossiers[0]!.briefing).toMatch(/depuis 10 jours/);
    expect(n.dossiers[0]!.titre).not.toMatch(/coup de tonnerre|inquiète/);
  });

  it("le bandeau n'annonce jamais une échéance déjà passée ni un encaissement comme un mur", () => {
    const sim = new Simulation(graine, { seed: 1 });
    const n = buildTurnNarrative(etatNarratif(sim), sim.parapheurCourant, null);
    expect(n.breves.join(" ")).not.toMatch(/octobre 2026/);
    expect(n.breves.join(" ")).not.toMatch(/Mur de trésorerie[^.]*\+/);
  });

  it("les conseillers ne recommandent que des mesures du dossier, de sa famille si elle en a", () => {
    const sim = new Simulation(graine, { seed: 1 });
    const n = buildTurnNarrative(etatNarratif(sim), sim.parapheurCourant, null);
    const meteo = n.dossiers[0]!;
    expect(meteo.notes.bercy.recommandation).toBe("plan_intemperies");
    for (const d of n.dossiers) for (const a of ["bercy", "social"] as const) {
      const r = d.notes[a].recommandation;
      if (r) expect(d.options.map((o) => o.gabaritId)).toContain(r);
    }
  });
});
