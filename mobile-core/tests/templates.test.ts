import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CATALOGUE, GABARITS, Simulation, type Dossier } from "../../engine/src/index";
import { buildTurnNarrative, articles } from "../src/narrative/generator";
import { referencesReelles } from "../src/narrative/personnalites";
import { DIVERGENCE, FAMILLES, GENRES, NEUTRES, THEMES, chainesGabarits } from "../src/narrative/templates";
import type { EtatNarratif } from "../src/narrative/etat";
import { etatNarratif } from "../src/session/snapshot";
import { SCENARIOS } from "../src/archives/scenarios";
import { graineExemple } from "./helpers";

const lire = (chemin: string) => readFileSync(new URL(chemin, import.meta.url), "utf-8");
const familles = (src: string, re: RegExp) => [...src.matchAll(re)].map((m) => m[1]!);

/** Familles réellement émises : catalogue (slot 1), littéraux du moteur, Tour 1 du relais, scénarios. */
const SLOT1 = [...new Set(CATALOGUE.filter((s) => s.origine === "pilotage").map((s) => s.famille))];
const MOTEUR = [...new Set(familles(lire("../../engine/src/simulation.ts"), /famille: "(\w+)"/g))];
const RELAIS = [...new Set(familles(lire("../../pipeline/seed/tour1.py"), /"famille_anomalie": "(\w+)"/g))];
const PLACEHOLDERS = new Set([
  "Indicateur", "indicateurTitre", "leIndicateur", "LeIndicateur", "deIndicateur", "valeur", "reference", "ecart", "sens", "precedente",
  "repere", "repereLe", "repereA", "repereDe", "scoreAnomalie", "partDecision", "decision", "evenement", "objet", "Objet", "theme", "menages",
  "texte", "Texte", "etape", "echeance", "seuil", "soutien", "siegesTotal", "acoss", "plafond", "usage", "solde", "soldeRef", "taux",
  "credibilite", "capital", "plafondCP", "opinionMoy", "seuilBlocage", "Corps", "corpsTitre", "corpsLe", "corpsDe", "radicalisation",
  "blocage", "blocageMin", "Ministre", "ministre", "ministereDe", "tension", "option", "impact", "ResumeCourt", "libelle", "montant", "date", "attente",
]);

describe("bibliothèque de gabarits : contrôles statiques", () => {
  const chaines = chainesGabarits();

  it("couvre toutes les familles de dossiers émises par le moteur et le relais", () => {
    expect(SLOT1.sort()).toEqual(["eau", "emploi", "energie", "meteo", "mobilite", "normes", "sante"]);
    expect(MOTEUR).toEqual(expect.arrayContaining(["dialogue", "parlement", "budget", "ministre", "publication"]));
    expect(RELAIS).toEqual(expect.arrayContaining(["institutions", "publication"]));
    for (const f of [...SLOT1, ...MOTEUR, ...RELAIS, ...SCENARIOS.map((s) => s.famille)]) expect(FAMILLES[f], f).toBeDefined();
    for (const s of CATALOGUE) expect(THEMES[s.famille], s.famille).toBeDefined();
    for (const g of GABARITS) expect(THEMES[g.famille] ?? FAMILLES[g.famille], g.famille).toBeDefined();
  });

  it("offre au moins deux variantes de titre et de constat par famille et par niveau", () => {
    for (const [f, g] of Object.entries(FAMILLES)) for (const n of [1, 2, 3] as const) {
      expect(g.titres[n].length, `${f} titres ${n}`).toBeGreaterThanOrEqual(2);
      expect(g.constats[n].length, `${f} constats ${n}`).toBeGreaterThanOrEqual(2);
      for (const l of ["economique", "generaliste", "populaire"] as const) expect(g.une[l].length).toBeGreaterThanOrEqual(2);
      expect(g.bercy.length).toBeGreaterThanOrEqual(2);
      expect(g.social.length).toBeGreaterThanOrEqual(2);
    }
    for (const n of [1, 2, 3] as const) { expect(DIVERGENCE.titres[n].length).toBeGreaterThanOrEqual(2); expect(DIVERGENCE.constats[n].length).toBeGreaterThanOrEqual(2); }
  });

  it("ne contient aucun chiffre, nombre en lettres, personnalité ou variable inconnue", () => {
    const lettres = /(?<![\p{L}])(deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|vingts?|trente|quarante|cinquante|soixante|cents?|mille|millions?|milliards?|dizaines?|centaines?|milliers?|moitié|tiers|quart|double|triple)(?![\p{L}])/iu;
    for (const c of chaines) {
      const sans = c.replace(/\{\w+\}/g, "");
      expect(/\d/.test(sans), c).toBe(false);
      expect(lettres.test(sans), c).toBe(false);
      expect(referencesReelles(c), c).toEqual([]);
      for (const m of c.matchAll(/\{(\w+)\}/g)) expect(PLACEHOLDERS.has(m[1]!), `${m[1]} dans « ${c} »`).toBe(true);
    }
  });

  it("connaît le genre de chaque libellé d'indicateur (articles le, la, l', les)", () => {
    for (const s of CATALOGUE) expect(GENRES[s.libelle.split(/[\s'’(]/)[0]!], s.libelle).toBeDefined();
    expect(articles("Trains supprimés ou en retard").de).toBe("des trains supprimés ou en retard");
    expect(articles("Indice des prix à la consommation, base 2025").le).toBe("l'indice des prix à la consommation, base 2025");
    expect(articles("Masse salariale du secteur privé").de).toBe("de la masse salariale du secteur privé");
    expect(articles("Taux de chômage (BIT)").de).toBe("du taux de chômage (BIT)");
  });
});

describe("chaque famille × source × niveau produit un dossier complet et valide", () => {
  const sim = new Simulation(graineExemple(), { seed: 9 });
  for (let k = 0; k < 40; k++) sim.etapeJour();
  const texte = sim.parlement.textes.find((t) => t.statut === "en_cours") ?? sim.parlement.deposer("Projet de loi d'essai", "loi", [], { economique: 0, social: 0, autorite: 0, europe: 0 }, sim.date);
  const base = etatNarratif(sim);
  const indicateurDe = (f: string) => CATALOGUE.find((s) => s.famille === f && s.origine === "pilotage")?.id ?? "MAC1";
  const cas: { famille: string; source: Dossier["source"]; slot: 1 | 2 | 3; ministere: Dossier["ministere"]; indicateurs: string[]; reference?: string }[] = [
    ...SLOT1.flatMap((f) => (["donnees", "divergence", "graine"] as const).map((source) => ({
      famille: f, source, slot: 1 as const, ministere: CATALOGUE.find((s) => s.id === indicateurDe(f))!.ministere, indicateurs: [indicateurDe(f)] }))),
    { famille: "institutions", source: "graine", slot: 2, ministere: "transversal", indicateurs: ["JUS3", "JUS1"] },
    { famille: "parlement", source: "institution", slot: 2, ministere: "transversal", indicateurs: [], reference: texte.id },
    { famille: "budget", source: "institution", slot: 2, ministere: "economie_finances", indicateurs: [], reference: "acoss" },
    { famille: "publication", source: "publication", slot: 3, ministere: "economie_finances", indicateurs: ["MAC1"] },
    { famille: "publication", source: "graine", slot: 3, ministere: "economie_finances", indicateurs: ["MAC1"] },
    { famille: "dialogue", source: "corps", slot: 3, ministere: "travail_solidarites", indicateurs: [], reference: "syndicats_contestataires" },
    { famille: "ministre", source: "ministere", slot: 3, ministere: "sante", indicateurs: [], reference: "sante" },
  ];
  for (const c of cas) for (const n of [1, 2, 3] as const) for (const bloque of c.famille === "dialogue" ? [false, true] : [false]) {
    it(`${c.famille} / ${c.source} / niveau ${n}${bloque ? " / blocage" : ""}`, () => {
      const etat: EtatNarratif = JSON.parse(JSON.stringify(base));
      if (c.source === "divergence") {
        const g = GABARITS.find((x) => x.famille === c.famille) ?? GABARITS[0]!;
        etat.attribution[c.indicateurs[0]!] = [{ impulsion: `${g.id}#1`, libelle: g.libelle, origine: "decision", contribution: 0.7, part: 0.8 },
          { impulsion: "evt", libelle: "Épisode d'essai", origine: "evenement", contribution: 0.2, part: 0.2 }];
      }
      if (bloque) etat.corps.find((x) => x.id === "syndicats_contestataires")!.bloque = true;
      const d: Dossier = { id: "DX", slot: c.slot, source: c.source, famille: c.famille, ministere: c.ministere, titre: "t", resume: "r",
        gravite: n === 1 ? 1.4 : n === 2 ? 2.5 : 4.6, creeLe: 0, joursInaction: 0, indicateurs: c.indicateurs,
        options: sim.optionsPour(c.ministere, c.famille), ...(c.reference ? { reference: c.reference } : {}) };
      const r = buildTurnNarrative(etat, [d], { libelle: "Mesure d'essai", ok: true, jour: etat.jour });
      expect(r.rejets, JSON.stringify(r.rejets)).toEqual([]);
      const x = r.dossiers[0]!;
      expect(x.niveau).toBe(n);
      expect(x.titre).not.toBe(NEUTRES.titre);
      expect(x.briefing).not.toBe(NEUTRES.briefing);
      expect(x.notes.bercy.texte).not.toBe(NEUTRES.note);
      expect(x.notes.social.texte).not.toBe(NEUTRES.note);
      for (const t of [x.titre, x.briefing, x.notes.bercy.texte, x.notes.social.texte, ...r.une.titres.flatMap((l) => [l.titre, l.chapeau]), ...r.breves])
        expect(t).not.toMatch(/\{|\}/);
      expect(r.une.titres.map((l) => l.ligne)).toEqual(["economique", "generaliste", "populaire"]);
      if (c.source === "divergence") expect(x.briefing).toContain("Épisode d'essai");
      if (bloque && n === 3) expect(x.briefing.length).toBeGreaterThan(0);
    });
  }
});
