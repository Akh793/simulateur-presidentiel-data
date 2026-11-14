import { describe, expect, it } from "vitest";
import { Parlement, CONFIG_PARLEMENT_DEFAUT } from "../src/parlement";
import { Rng } from "../src/rng";
import { BOUSSOLE_NEUTRE } from "../src/types";
import { graineExemple } from "./helpers";

const g = graineExemple();
const nouveau = (over = {}) => new Parlement(g.parlement.an, g.parlement.senat, { ...CONFIG_PARLEMENT_DEFAUT, ...over }, new Rng(1));

describe("règles constitutionnelles", () => {
  it("seuil de censure à 289 sur 577 sièges, quel que soit le nombre de sièges vacants", () => {
    const p = nouveau();
    expect(p.an.siegesPourvus).toBe(574);
    expect(p.seuilCensure()).toBe(289);
    expect(nouveau({ baseMajorite: "sieges_pourvus" }).seuilCensure()).toBe(288);
  });

  it("49.3 : une fois par session pour un texte ordinaire, illimité pour les textes financiers", () => {
    const p = nouveau();
    const d = "2027-01-12";
    const l1 = p.deposer("Loi A", "loi", [], BOUSSOLE_NEUTRE, d), l2 = p.deposer("Loi B", "loi", [], BOUSSOLE_NEUTRE, d);
    expect(p.peut493(l1, d).ok).toBe(true);
    p.engager493(l1, d);
    expect(p.peut493(l2, d).ok).toBe(false);
    for (let k = 0; k < 5; k++) { const f = p.deposer(`PLFR ${k}`, "plfr", [], BOUSSOLE_NEUTRE, d); expect(p.peut493(f, d).ok).toBe(true); p.engager493(f, d); }
    const l3 = p.deposer("Loi C", "loi", [], BOUSSOLE_NEUTRE, "2027-10-05");
    expect(p.peut493(l3, "2027-10-05").ok).toBe(true); // nouvelle session ordinaire
    const horsSession = p.deposer("Loi D", "loi", [], BOUSSOLE_NEUTRE, "2027-07-20");
    expect(p.peut493(horsSession, "2027-07-20").ok).toBe(false);
  });

  it("dissolution : délai d'un an après les élections, résultat sur l'opinion moyenne de 90 jours", () => {
    const p = nouveau();
    expect(p.peutDissoudre("2025-07-01").ok).toBe(false);
    expect(p.peutDissoudre("2026-11-15").ok).toBe(true);
    const le = p.dissoudre("2026-11-15");
    expect(le).toBe("2026-12-15");
    p.elections(40);
    expect(p.an.groupes.reduce((s, x) => s + x.sieges, 0)).toBe(577);
    expect(p.peutDissoudre("2027-06-01").ok).toBe(false);
    expect(p.peutDissoudre("2027-12-15").ok).toBe(true);
  });

  it("chaque démission de Matignon abaisse définitivement le plafond de capital politique", () => {
    const p = nouveau();
    expect(p.demissionMatignon()).toBeCloseTo(90);
    expect(p.demissionMatignon()).toBeCloseTo(81);
  });

  it("une promesse rompue verrouille l'alliance pendant 180 jours", () => {
    const p = nouveau();
    const grp = p.an.groupes[0]!.code;
    p.signerPromesse(grp, { type: "adopter", gabarit: "plan_hopital" }, "2027-01-10", 30);
    p.verifierPromesses("2027-02-10", () => false);
    expect(p.an.groupes[0]!.relation).toBe(-1);
    expect(() => p.signerPromesse(grp, { type: "adopter", gabarit: "plan_hopital" }, "2027-03-01", 30)).toThrow();
  });

  it("le coût des décrets croît dans le trimestre et le risque d'annulation apparaît au-delà de 5", () => {
    const p = nouveau();
    const couts = [];
    for (let k = 0; k < 7; k++) { couts.push(p.coutDecret("2027-02-01", 6)); p.enregistrerDecret("2027-02-01"); }
    expect(couts[1]!.cout).toBeGreaterThan(couts[0]!.cout);
    expect(couts[4]!.risque).toBe(0);
    expect(couts[6]!.risque).toBeGreaterThan(0);
    expect(p.coutDecret("2027-04-02", 6).cout).toBe(6); // nouveau trimestre
  });

  it("vote pondéré par la cohésion réelle des groupes", () => {
    const p = nouveau({ socle: p0Socle() });
    const v = p.voter(p.an, BOUSSOLE_NEUTRE, 0, 50);
    expect(v.pour + v.contre + v.abstention).toBeGreaterThan(560);
    expect(v.details).toHaveLength(p.an.groupes.length);
  });
});

function p0Socle(): string[] {
  return g.parlement.an!.groupes.slice(0, 3).map((x) => x.code);
}
