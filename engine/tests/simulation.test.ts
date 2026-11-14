import { describe, expect, it } from "vitest";
import { GABARITS } from "../src/decisions";
import { CATALOGUE, N_INDICATEURS } from "../src/indicateurs";
import { SATURATION } from "../src/macro";
import { Rng } from "../src/rng";
import { DUREE_MANDAT, Simulation } from "../src/simulation";
import { MINISTERES } from "../src/types";
import { graineExemple } from "./helpers";

const graine = graineExemple();

function verifierEtat(sim: Simulation): void {
  const v = sim.vue();
  for (const ind of v.indicateurs) {
    expect(Number.isFinite(ind.jeu), `${ind.id} jeu`).toBe(true);
    expect(Number.isFinite(ind.reference), `${ind.id} référence`).toBe(true);
    const slot = CATALOGUE.find((s) => s.id === ind.id)!;
    if (slot.pilote === "macro") expect(Math.abs(ind.ecart)).toBeLessThanOrEqual(SATURATION + 1e-9);
    if (slot.min !== undefined) expect(ind.jeu).toBeGreaterThanOrEqual(slot.min);
  }
  for (const [k, x] of Object.entries(v.tresorerie)) expect(Number.isFinite(x), k).toBe(true);
  expect(v.tresorerie.petrole).toBeGreaterThanOrEqual(0);
  expect(v.capitalPolitique).toBeGreaterThanOrEqual(0);
  expect(v.capitalPolitique).toBeLessThanOrEqual(v.plafondCP + 1e-9);
  expect(v.parapheur.length).toBeLessThanOrEqual(3);
  expect(v.file.length).toBeLessThanOrEqual(12);
  for (const c of v.acteurs.corps) { expect(c.radicalisation).toBeGreaterThanOrEqual(0); expect(c.radicalisation).toBeLessThanOrEqual(100); }
  for (const s of v.acteurs.segments) expect(Math.abs(s.approbation)).toBeLessThanOrEqual(100);
}

/** Joueur aléatoire : à chaque arrêt, tente quelques actions ; renvoie le nombre de décisions appliquées. */
function jouer(sim: Simulation, rng: Rng, opts: { decisions: number; recharger: boolean }) {
  let appliquees = 0, arrets = 0, tours = 0;
  // échéancier : décision k due au jour k × pas, toutes avant les 30 derniers jours du mandat
  const pas = Math.max(1, Math.floor((DUREE_MANDAT - 30) / opts.decisions));
  while (!sim.fin) {
    const avant = sim.jour;
    const r = sim.avancer(7);
    tours++;
    expect(sim.jour).toBeGreaterThan(avant); // l'avance progresse toujours : pas de blocage
    expect(r.jours).toBeGreaterThanOrEqual(1);
    if (r.interruptions.some((i) => i.critique)) arrets++;
    if (sim.jour % 200 === 0) verifierEtat(sim);
    // rythme : environ une décision tous les `parJour` jours jusqu'au quota
    let essais = 0;
    while (!sim.fin && appliquees < opts.decisions && appliquees * pas <= sim.jour && essais++ < 40) {
      if (opts.recharger) sim.capitalPolitique = sim.parlement.plafondCP;
      const pioche = rng.next();
      let ok = false;
      if (pioche < 0.75) {
        const dossier = sim.parapheurCourant.length ? rng.pick(sim.parapheurCourant) : undefined;
        const option = dossier && dossier.options.length ? rng.pick(dossier.options) : rng.pick(GABARITS).id;
        ok = sim.decider(option, dossier?.id).ok;
      } else if (pioche < 0.85) {
        const t = sim.parlement.textes.find((x) => x.statut === "en_cours" && sim.parlement.peut493(x, sim.date).ok);
        ok = t ? sim.engager493(t.id).ok : sim.decider(rng.pick(GABARITS).id).ok;
      } else if (pioche < 0.93) {
        ok = sim.signerPromesse(rng.pick(sim.parlement.an.groupes).code, rng.pick(GABARITS).id, rng.chance(0.5) ? "adopter" : "renoncer", 60).ok;
      } else if (pioche < 0.98) {
        ok = sim.remanier(rng.pick(MINISTERES)).ok;
      } else {
        ok = sim.dissoudre().ok || sim.decider(rng.pick(GABARITS).id).ok;
      }
      if (ok) appliquees++;
      else if (!opts.recharger) break; // capital insuffisant : on attend
    }
  }
  return { appliquees, arrets, tours };
}

describe("simulation complète", () => {
  it("s'initialise sur la graine réelle du 14/11/2026", () => {
    const sim = new Simulation(graine, { seed: 42 });
    expect(sim.vue().indicateurs).toHaveLength(N_INDICATEURS);
    expect(sim.parlement.seuilCensure()).toBe(289);
    expect(sim.parapheurCourant.length).toBeGreaterThan(0);
    expect(sim.parapheurCourant.length).toBeLessThanOrEqual(3);
    expect(sim.parlement.textes.some((t) => t.type === "plf")).toBe(true); // PLF 2027 en discussion au 14/11/2026
    verifierEtat(sim);
  });

  it("1 825 tours avec 200 décisions aléatoires (capital rechargé) : aucune divergence numérique ni blocage", () => {
    const sim = new Simulation(graine, { seed: 7 });
    const t0 = performance.now();
    const r = jouer(sim, new Rng(99), { decisions: 200, recharger: true });
    const msParJour = (performance.now() - t0) / DUREE_MANDAT;
    expect(sim.fin).toBe(true);
    expect(sim.jour).toBe(DUREE_MANDAT);
    expect(r.appliquees).toBe(200);
    verifierEtat(sim);
    expect(sim.livre.stocks.detteNegociable).toBeLessThan(5_000_000_000_000);
    console.info(`stress : ${r.tours} avances, ${r.arrets} arrêts critiques, ${msParJour.toFixed(3)} ms par jour, score ${sim.score().total.toFixed(1)}`);
    expect(msParJour).toBeLessThan(2);
  });

  it("1 825 tours en jeu contraint par le capital politique : rythme d'arbitrage et absence de soft-lock", () => {
    const sim = new Simulation(graine, { seed: 11 });
    const r = jouer(sim, new Rng(5), { decisions: 400, recharger: false });
    expect(sim.fin).toBe(true);
    expect(r.appliquees).toBeGreaterThan(100);
    expect(sim.actionsDisponibles()[0]!.type).toBe("avancer");
    verifierEtat(sim);
    console.info(`contraint : ${r.appliquees} décisions, ${r.tours} avances, ${r.arrets} arrêts critiques`);
  });

  it("mandat sans décision : la partie reste sur la trajectoire de référence et l'avance rapide n'est pas hachée", () => {
    const sim = new Simulation(graine, { seed: 21 });
    let avances = 0, critiques = 0;
    while (!sim.fin) { const r = sim.avancer(7); avances++; critiques += r.interruptions.filter((i) => i.critique).length; }
    expect(sim.livre.stocks.detteNegociable).toBeCloseTo(sim.livreRef.stocks.detteNegociable, -6); // à 1 M€ près
    for (const i of sim.vue().indicateurs) if (CATALOGUE.find((s) => s.id === i.id)!.pilote === "flux") expect(Math.abs(i.ecart), i.id).toBeLessThan(0.05);
    expect(DUREE_MANDAT / avances).toBeGreaterThan(5);        // en moyenne plus de 5 jours par avance
    // sans décision, les dossiers ignorés s'aggravent (x1,15 par jour) et coupent l'avance au franchissement de la gravité 4 :
    // c'est le coût de l'inaction, borné ici à moins de 40 arrêts critiques par an
    expect(critiques / 5).toBeLessThan(40);
    expect(sim.parlement.seuilCensure()).toBe(289);
  });

  it("est déterministe et se sauvegarde / restaure sans écart", () => {
    const decider = (sim: Simulation, j: number) => { if (j % 17 === 0) sim.decider(GABARITS[j % GABARITS.length]!.id); };
    const a = new Simulation(graine, { seed: 3 });
    for (let j = 0; j < 400; j++) { a.etapeJour(); decider(a, j); }
    const b0 = new Simulation(graine, { seed: 3 });
    for (let j = 0; j < 250; j++) { b0.etapeJour(); decider(b0, j); }
    const b = Simulation.restaurer(graine, b0.serialiser());
    for (let j = 250; j < 400; j++) { b.etapeJour(); decider(b, j); }
    const va = a.vue(), vb = b.vue();
    expect(vb.jour).toBe(va.jour);
    for (let i = 0; i < N_INDICATEURS; i++) expect(vb.indicateurs[i]!.jeu).toBeCloseTo(va.indicateurs[i]!.jeu, 6);
    expect(vb.tresorerie.detteNegociable).toBeCloseTo(va.tresorerie.detteNegociable, 0);
    expect(vb.opinion).toBeCloseTo(va.opinion, 9);
  });

  it("quota de diversité : une décision du jour ne fait pas disparaître le dossier présenté en Slot 1", () => {
    const sim = new Simulation(graine, { seed: 8 });
    const avant = sim.parapheurCourant.find((d) => d.slot === 1)!;
    sim.capitalPolitique = 100;
    sim.decider("dialogue_social");
    expect(sim.parapheurCourant.find((d) => d.slot === 1)?.id).toBe(avant.id);
    expect(sim.dossiers.historiqueSlot1.filter((h) => h.jour === 0)).toHaveLength(1);
  });

  it("les décisions massives produisent des dossiers de divergence (règle du tour 20 opérante)", () => {
    const sim = new Simulation(graine, { seed: 12 });
    let divergences = 0, presentees = 0;
    while (sim.jour < 400) {
      sim.capitalPolitique = sim.parlement.plafondCP;
      for (const g of ["baisse_ticpe", "plan_ferroviaire", "moratoire_normes", "plan_hopital"]) sim.decider(g);
      sim.avancer(7);
      divergences += sim.dossiers.file.filter((d) => d.source === "divergence").length;
      if (sim.parapheurCourant.some((d) => d.source === "divergence")) presentees++;
    }
    expect(divergences).toBeGreaterThan(0);
    expect(presentees).toBeGreaterThan(0);
  });

  it("l'attribution causale reconstitue exactement l'écart au Réel d'un indicateur", () => {
    const sim = new Simulation(graine, { seed: 5 });
    sim.capitalPolitique = 100;
    sim.decider("baisse_ticpe");
    sim.decider("cheque_energie");
    sim.decider("liberation_aie");
    for (let k = 0; k < 60; k++) sim.etapeJour();
    const parts = sim.attribution("MAC1");
    const somme = parts.reduce((s, p) => s + p.contribution, 0);
    const v = sim.vue().indicateurs.find((x) => x.id === "MAC1")!;
    // seule l'impulsion du PLFR n'est pas encore adoptée : l'écart vient du chèque, du déblocage AIE et des couplages
    expect(somme).toBeCloseTo(v.jeu - v.reference, 9);
  });
});
