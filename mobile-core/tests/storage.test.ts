import { describe, expect, it } from "vitest";
import { PACK_EMBARQUE, installerPackEmbarque } from "../src/archives/pack";
import { SEED_EMBARQUEE } from "../src/archives/scenarios";
import { sha256 } from "../src/db/sha256";
import { EmpreinteInvalide, GraineInvalide, StorageService } from "../src/db/storage";
import { VERSION_SCHEMA } from "../src/db/schema";
import { MEMOIRE_VIDE } from "../src/narrative/types";
import type { TurnRecord } from "../src/types";
import { baseMemoire } from "./node-sqlite";
import { texteGraine } from "./helpers";

const ouvrir = async () => StorageService.ouvrir(baseMemoire());
const tour = (day: number, une = false): TurnRecord => ({
  day, date: `2026-11-${String(14 + day).padStart(2, "0")}`, jeu: [day + 0.123456789, 2], reference: [day, 2],
  synthese: { opinion: 0, opinion90: 0, capitalPolitique: 50, plafondCP: 100, credibilite: 50, score: 0, detteJeu: 1, detteRef: 1, soldeJeu: 0, soldeRef: 0 },
  decisions: [], interruptions: [], attribution: null, une: une ? { jour: day, date: "2026-11-14", titres: [] } : null, breves: null,
});
const save = (sessionId: string, currentDay: number) => ({
  sessionId, seedId: SEED_EMBARQUEE, seedDate: "2026-11-14", scenarioId: null, label: "essai", currentDay, gameDate: "2026-11-14",
  engineSeed: 1, engineVersion: 1, state: "{}", memoire: MEMOIRE_VIDE, catalogue: ["MAC1", "MAC2"],
  progression: { score: 0, opinion90: 0, capitalPolitique: 50, credibilite: 50, decisions: 0, fin: false }, termine: false,
});

describe("StorageService (schéma SQLite compatible expo-sqlite)", () => {
  it("applique les migrations une seule fois (PRAGMA user_version)", async () => {
    const db = baseMemoire();
    await StorageService.ouvrir(db);
    const s = await StorageService.ouvrir(db);
    expect(await s.versionSchema()).toBe(VERSION_SCHEMA);
    const tables = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name", []);
    expect(tables.map((t) => t.name)).toEqual(["saves", "seeds", "turn_history"]);
  });

  it("importe une graine validée contre shared/schema.ts, vérifie l'empreinte et dédoublonne", async () => {
    const s = await ouvrir();
    const t = texteGraine();
    const m = await s.importerGraine(t, { kind: "quotidienne", sha256Attendu: `${sha256(t)}  graine_du_jour.json` });
    expect(m.dateJeu).toBe("2026-11-14");
    expect(m.seedId).toMatch(/^quotidienne:2026-11-14#/);
    expect((await s.importerGraine(t, { kind: "quotidienne" })).seedId).toBe(m.seedId);
    expect(await s.listerGraines()).toHaveLength(1);
    expect((await s.graine(m.seedId)).parlement.an?.sieges_total).toBe(577);
    await expect(s.importerGraine(t, { kind: "quotidienne", sha256Attendu: "0".repeat(64) })).rejects.toBeInstanceOf(EmpreinteInvalide);
  });

  it("refuse une graine non conforme ou illisible", async () => {
    const s = await ouvrir();
    const g = JSON.parse(texteGraine());
    delete g.meta;
    await expect(s.importerGraine(g, { kind: "quotidienne" })).rejects.toBeInstanceOf(GraineInvalide);
    await expect(s.importerGraine("{pas du json", { kind: "quotidienne" })).rejects.toBeInstanceOf(GraineInvalide);
    expect(await s.listerGraines()).toHaveLength(0);
  });

  it("installe le pack embarqué de manière idempotente", async () => {
    const s = await ouvrir();
    expect((await installerPackEmbarque(s)).map((x) => x.seedId)).toEqual(PACK_EMBARQUE.map((x) => x.seedId));
    await installerPackEmbarque(s);
    expect(await s.listerGraines("embarquee")).toHaveLength(1);
  });

  it("sauvegarde atomique, historique compacté, courbe duale et Unes", async () => {
    const s = await ouvrir();
    await installerPackEmbarque(s);
    await s.sauvegarder(save("P1", 2), [tour(0, true), tour(1), tour(2, true)]);
    expect(await s.nombreTours("P1")).toBe(3);
    const c = await s.courbe("P1", "MAC1");
    expect(c.map((x) => x.jeu)).toEqual([0.123457, 1.12346, 2.12346]);
    expect(c.map((x) => x.reference)).toEqual([0, 1, 2]);
    expect(await s.unes("P1")).toHaveLength(2);
    const p = await s.chargerPartie("P1");
    expect(p?.currentDay).toBe(2);
    expect(p?.catalogue).toEqual(["MAC1", "MAC2"]);
    expect((await s.listerParties())[0]).not.toHaveProperty("state");
  });

  it("journalise une décision dans la même transaction que la sauvegarde", async () => {
    const s = await ouvrir();
    await installerPackEmbarque(s);
    await s.sauvegarder(save("P1", 0), [tour(0)]);
    await s.sauvegarder(save("P1", 0), [], { day: 0, d: { type: "decider", libelle: "Mesure", ok: true, message: "ok", coutCP: 5, jour: 0, cible: "x" } });
    expect((await s.historique("P1"))[0]!.decisions).toHaveLength(1);
  });

  it("tronque l'historique au-delà du jour sauvegardé (reprise sur une branche plus ancienne)", async () => {
    const s = await ouvrir();
    await installerPackEmbarque(s);
    await s.sauvegarder(save("P1", 5), [0, 1, 2, 3, 4, 5].map((d) => tour(d)));
    await s.sauvegarder(save("P1", 3));
    expect((await s.historique("P1")).map((t) => t.day)).toEqual([0, 1, 2, 3]);
  });

  it("supprime une partie en cascade et protège une graine utilisée", async () => {
    const s = await ouvrir();
    await installerPackEmbarque(s);
    await s.sauvegarder(save("P1", 1), [tour(0), tour(1)]);
    await expect(s.supprimerGraine(SEED_EMBARQUEE)).rejects.toThrow(/utilisée/);
    expect(await s.supprimerPartie("P1")).toBe(true);
    expect(await s.nombreTours("P1")).toBe(0);
    expect(await s.supprimerGraine(SEED_EMBARQUEE)).toBe(true);
  });

  it("sérialise les accès concurrents (aucune sauvegarde entrelacée)", async () => {
    const s = await ouvrir();
    await installerPackEmbarque(s);
    await Promise.all(Array.from({ length: 20 }, (_, k) => s.sauvegarder(save("P1", k), [tour(k)])));
    expect((await s.chargerPartie("P1"))?.currentDay).toBe(19);
    expect(await s.nombreTours("P1")).toBe(20);
  });
});
