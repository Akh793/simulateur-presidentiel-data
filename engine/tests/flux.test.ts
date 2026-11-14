import { describe, expect, it } from "vitest";
import * as cal from "../src/calendrier";
import { ETAT, PHYSIQUE, SOCIAL } from "../src/calibration";
import { GrandLivre, type ContexteFlux } from "../src/flux";

const ctx = (over: Partial<ContexteFlux> = {}): ContexteFlux => ({
  multMacro: {}, tauxLongPct: 3.5, spreadPct: 0, credibilite: 50, plafondAcoss: SOCIAL.plafondAcoss2026.valeur, vigilance: 0,
  apportsPetrole: 1, liberationAieMt: 0, capaciteHebergementMult: 1, ...over,
});

function annee(y: number, over: Partial<ContexteFlux> = {}) {
  const g = new GrandLivre(cal.isoOf(y, 1, 1), 0);
  const sommes: Record<string, number> = {};
  const jours: Record<string, string[]> = {};
  for (let d = cal.isoOf(y, 1, 1); cal.ymd(d).y === y; d = cal.addDays(d, 1)) {
    const r = g.step(d, ctx(over));
    for (const m of r.mouvements) { sommes[m.id] = (sommes[m.id] ?? 0) + m.montant; (jours[m.id] ??= []).push(d); }
  }
  return { g, sommes, jours };
}

describe("calendrier des murs de trésorerie", () => {
  const { sommes, jours } = annee(2027);

  it("verse CAF le 5, pensions le 9, encaisse impôt et Urssaf le 15, paie l'État le 28 (jours ouvrés)", () => {
    expect(jours.caf).toHaveLength(12);
    for (const d of jours.caf!) expect(d).toBe(cal.echeanceMensuelle(cal.ymd(d).y, cal.ymd(d).m, 5));
    for (const d of jours.pensions!) expect(d).toBe(cal.echeanceMensuelle(cal.ymd(d).y, cal.ymd(d).m, 9));
    for (const d of jours.urssaf!) expect(d).toBe(cal.echeanceMensuelle(cal.ymd(d).y, cal.ymd(d).m, 15));
    for (const d of jours.impot_revenu!) expect(cal.ymd(d).d).toBeGreaterThanOrEqual(15);
    for (const d of jours.personnel!) { expect(cal.ymd(d).d).toBeLessThanOrEqual(28); expect(cal.estOuvre(d)).toBe(true); }
  });

  it("encaisse l'IS les 15 mars, juin, septembre et décembre", () => {
    expect(jours.impot_societes!.map((d) => cal.ymd(d).m)).toEqual([3, 6, 9, 12]);
  });

  it("règle les OAT après les adjudications des 1er et 3e jeudis (une seule en décembre)", () => {
    expect(jours.emission_oat).toHaveLength(23);
    expect(GrandLivre.estAdjudication(cal.nieme(2027, 5, 3, 1))).toBe(true);
    expect(GrandLivre.estAdjudication(cal.nieme(2027, 5, 3, 3))).toBe(true);
    expect(GrandLivre.estAdjudication(cal.nieme(2027, 12, 3, 3))).toBe(false);
  });

  it("retrouve les montants annuels calibrés (exécution 2025, à 0,5 % près)", () => {
    expect(sommes.tva!).toBeCloseTo(ETAT.tva.valeur, -9);
    expect(-sommes.personnel!).toBeCloseTo(ETAT.personnel.valeur, -9);
    expect(-sommes.pensions!).toBeCloseTo(SOCIAL.pensionsBase.valeur, -9);
    expect(-sommes.dgf!).toBeCloseTo(ETAT.dgf.valeur, -9);
    expect(Math.abs(sommes.emission_oat! - ETAT.programmeAft.valeur)).toBeLessThan(0.005 * ETAT.programmeAft.valeur);
  });
});

describe("stocks et substitutions", () => {
  it("le stock pétrolier ne devient jamais négatif, même sans apports et avec déblocages AIE répétés", () => {
    const g = new GrandLivre("2027-01-01", 0);
    let d = "2027-01-01";
    for (let k = 0; k < 400; k++) { g.step(d, ctx({ apportsPetrole: 0, liberationAieMt: 2 })); expect(g.stocks.petrole).toBeGreaterThanOrEqual(0); d = cal.addDays(d, 1); }
    expect(g.stocks.petrole).toBe(0);
  });

  it("se reconstitue vers la référence légale de 14,5 Mt une fois la crise passée", () => {
    const g = new GrandLivre("2027-01-01", 0);
    g.stocks.petrole = 10;
    let d = "2027-01-01";
    for (let k = 0; k < 2000; k++) { g.step(d, ctx()); d = cal.addDays(d, 1); }
    expect(g.stocks.petrole).toBeGreaterThanOrEqual(PHYSIQUE.petroleStrategique.valeur);
  });

  it("module la demande d'hébergement par la vigilance météo", () => {
    const g = new GrandLivre("2027-01-10", 0);
    g.step("2027-01-10", ctx({ vigilance: 0 }));
    const calme = g.stocks.demandeHebergement;
    g.step("2027-01-11", ctx({ vigilance: 27 }));
    expect(g.stocks.demandeHebergement).toBeGreaterThan(calme);
  });

  it("signale le dépassement du plafond d'emprunt de l'Acoss", () => {
    const g = new GrandLivre("2027-01-01", 0);
    g.stocks.tresorerieAcoss = -SOCIAL.plafondAcoss2026.valeur * 1.01;
    const r = g.step("2027-01-04", ctx());
    expect(r.alertes.some((a) => a.startsWith("Plafond"))).toBe(true);
  });

  it("la dette nette croît du besoin de financement, jamais sans limite sur 5 ans", () => {
    const g = new GrandLivre("2027-01-01", 0);
    let d = "2027-01-01";
    for (let k = 0; k < 1825; k++) { g.step(d, ctx({ tauxLongPct: 6 })); d = cal.addDays(d, 1); }
    expect(Number.isFinite(g.stocks.detteNegociable)).toBe(true);
    expect(g.stocks.detteNegociable).toBeLessThan(ETAT.detteNegociable.valeur * 1.6);
    expect(g.chargeAnnuelleInterets()).toBeGreaterThan(ETAT.chargeDette.valeur); // les nouvelles OAT coûtent plus cher
  });
});

describe("projection des trésoreries pour l'interface", () => {
  it("projette 30 jours sans modifier l'état de la partie", async () => {
    const { Simulation } = await import("../src/simulation");
    const { graineExemple } = await import("./helpers");
    const sim = new Simulation(graineExemple(), { seed: 2 });
    const avant = JSON.stringify(sim.livre.stocks);
    const p = sim.projectionTresorerie(30);
    expect(p).toHaveLength(30);
    expect(JSON.stringify(sim.livre.stocks)).toBe(avant);
    expect(p.some((j) => j.mouvements.some((m) => m.id === "pensions"))).toBe(true);
    for (const j of p) expect(Number.isFinite(j.acoss) && Number.isFinite(j.etat)).toBe(true);
  });
});
