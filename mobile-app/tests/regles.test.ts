import { describe, expect, it } from "vitest";
import { GABARITS } from "../../engine/src/index";
import { parseGraine } from "../../shared/schema";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { badgeSource, eclairage, jalonDuJour, phaseSuivante, situationsEmergentes, tamponsDisponibles, themePourDossier, themePourInterruption } from "../src/core/regles";
import { CORPS_DEF } from "../../engine/src/acteurs";

const graine = parseGraine(JSON.parse(readFileSync(fileURLToPath(new URL("../../pipeline/tests/graine_exemple.json", import.meta.url)), "utf-8")));

describe("horloge du Bureau", () => {
  it("avance au rythme des actions sans jamais reculer avant la semaine suivante", () => {
    expect(phaseSuivante("matin", "arbitrage")).toBe("conseil");
    expect(phaseSuivante("conseil", "hemicycle")).toBe("parlement");
    expect(phaseSuivante("parlement", "arbitrage")).toBe("parlement");
    expect(phaseSuivante("parlement", "une")).toBe("soir");
    expect(phaseSuivante("soir", "semaine")).toBe("matin");
    expect([eclairage("matin"), eclairage("parlement"), eclairage("soir")]).toEqual(["matin", "apres-midi", "nuit"]);
  });
});

describe("tampons", () => {
  const decret = GABARITS.find((g) => g.instrument === "decret")!;
  const loi = GABARITS.find((g) => g.instrument === "loi")!;
  const peut = () => ({ ok: true, raison: "" });

  it("propose Décret ou Projet de loi selon l'instrument, et toujours Ajourner", () => {
    expect(tamponsDisponibles({ famille: "energie", reference: undefined }, decret.id, peut, 50, () => 5).map((t) => t.type)).toEqual(["decret", "ajourner"]);
    expect(tamponsDisponibles({ famille: "energie", reference: undefined }, loi.id, peut, 50, () => 5).map((t) => t.type)).toEqual(["loi", "ajourner"]);
    expect(tamponsDisponibles({ famille: "energie", reference: undefined }, null, peut, 50, () => 5).map((t) => t.type)).toEqual(["ajourner"]);
  });

  it("désactive le tampon quand le capital politique est insuffisant, avec la raison", () => {
    const t = tamponsDisponibles({ famille: "energie", reference: undefined }, decret.id, peut, 3, () => 8)[0]!;
    expect(t.actif).toBe(false);
    expect(t.raison).toContain("capital politique insuffisant");
  });

  it("ne propose le 49.3 que pour un dossier parlementaire lié à un texte, selon la règle du moteur", () => {
    const sans = tamponsDisponibles({ famille: "institutions", reference: undefined }, loi.id, peut, 50, () => 5);
    expect(sans.some((t) => t.type === "493")).toBe(false);
    const refuse = tamponsDisponibles({ famille: "parlement", reference: "plf" }, loi.id, () => ({ ok: false, raison: "déjà utilisé" }), 50, () => 5);
    expect(refuse.find((t) => t.type === "493")).toEqual({ type: "493", actif: false, raison: "déjà utilisé" });
  });
});

describe("Situations Émergentes, badges et jalons", () => {
  it("remonte les blocages et le premier mur critique en tête", () => {
    const e = situationsEmergentes({ dossiers: [] } as never, [{ libelle: "Routiers", bloque: true, blocage: "Barrages filtrants" }],
      [{ date: "2026-11-28", libelle: "paie", critique: true }]);
    expect(e.map((x) => x.cle)).toEqual(["blocage:Routiers", "mur:2026-11-28"]);
    expect(e[0]!.libelle).toBe("Routiers : barrages filtrants");
  });

  it("certifie le badge avec le producteur réel de la graine, et signale un indicateur modélisé", () => {
    const p = graine.pilotage[0]!;
    expect(badgeSource({ famille: "energie", indicateurs: [p.id] }, graine)).toEqual({ libelle: p.source.producteur, certifie: p.source.officiel });
    expect(badgeSource({ famille: "sante", indicateurs: ["SAN_M1"] }, graine)).toEqual({ libelle: "Modèle de simulation", certifie: false });
  });

  it("reconnaît les jalons du calendrier dans les mouvements du jour", () => {
    expect(jalonDuJour([{ id: "pensions" }, { id: "tva" }])).toEqual(["pensions"]);
    expect(jalonDuJour([{ id: "urssaf" }, { id: "personnel" }])).toEqual(["prelevements", "paie"]);
  });
});

describe("panoramas de crise", () => {
  it("illustre un dossier selon sa famille, l'énergie selon l'indicateur", () => {
    expect(themePourDossier("energie", ["ENE4"])).toBe("carburant");
    expect(themePourDossier("energie", ["ENE1"])).toBe("reseau");
    expect(themePourDossier("sante", [])).toBe("urgences");
    expect(themePourDossier("prisons", ["JUS2"])).toBe("prison");
    expect(themePourDossier("institutions", [])).toBeNull();
  });

  it("illustre l'arrêt de semaine à partir des libellés de blocage du moteur", () => {
    const theme = (id: string) => {
      const c = CORPS_DEF.find((x) => x[0] === id)!;
      return themePourInterruption({ type: "crise_corps", detail: `${c[1]} : ${c[4].libelle}` });
    };
    expect(theme("syndicats_contestataires")).toBe("carburant");
    expect(theme("monde_agricole")).toBe("blocage");
    expect(theme("classes_moyennes")).toBe("blocage");
    expect(theme("patronat")).toBe("marches");
    expect(themePourInterruption({ type: "mur_tresorerie", detail: "" })).toBe("marches");
    expect(themePourInterruption({ type: "promesse", detail: "" })).toBeNull();
  });
});
