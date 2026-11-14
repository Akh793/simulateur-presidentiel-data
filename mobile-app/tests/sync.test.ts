import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sha256 } from "../../mobile-core/src/db/sha256";
import { StorageService } from "../../mobile-core/src/db/storage";
import { baseMemoire } from "../../mobile-core/tests/node-sqlite";
import { synchroniserGraine, urlNonConfiguree, type Fetch } from "../src/core/sync";

const texte = readFileSync(fileURLToPath(new URL("../../pipeline/tests/graine_exemple.json", import.meta.url)), "utf-8");
const URL_OK = "https://exemple.org/simpres/graine_du_jour.json";
const reponse = (corps: string, status = 200) => ({ ok: status < 400, status, text: async () => corps });

/** Faux réseau : sert la graine et son empreinte publiée (format `sha256sum`). */
function reseau(empreinte = `${sha256(texte)}  graine_du_jour.json\n`): Fetch & { appels: string[] } {
  const appels: string[] = [];
  const f = (async (url: string) => {
    appels.push(url);
    if (url === URL_OK) return reponse(texte);
    if (url === `${URL_OK}.sha256`) return reponse(empreinte);
    return reponse("introuvable", 404);
  }) as Fetch & { appels: string[] };
  f.appels = appels;
  return f;
}

const ouvrir = () => StorageService.ouvrir(baseMemoire());

describe("synchronisation de la graine au démarrage", () => {
  it("importe la graine du relais quand l'empreinte SHA-256 correspond, puis la reconnaît", async () => {
    const st = await ouvrir();
    const r = await synchroniserGraine(st, { urls: [URL_OK], delaiMs: 2000, fetch: reseau() });
    expect(r.statut).toBe("importee");
    expect(r.graine.kind).toBe("quotidienne");
    expect(r.graine.sha256).toBe(sha256(texte));
    const r2 = await synchroniserGraine(st, { urls: [URL_OK], delaiMs: 2000, fetch: reseau() });
    expect(r2.statut).toBe("deja_presente");
  });

  it("refuse une graine dont l'empreinte ne correspond pas et bascule sur les archives embarquées", async () => {
    const st = await ouvrir();
    const r = await synchroniserGraine(st, { urls: [URL_OK], delaiMs: 2000, fetch: reseau("0".repeat(64)) });
    expect(r.statut).toBe("hors_ligne");
    expect(r.graine.kind).toBe("embarquee");
    expect(r.tentatives[0]).toContain(URL_OK);
    expect(await st.listerGraines("quotidienne")).toHaveLength(0);
  });

  it("passe à l'URL suivante après une erreur HTTP et ignore les URL non configurées", async () => {
    const st = await ouvrir();
    const f = reseau();
    const urls = ["https://raw.githubusercontent.com/OWNER/REPO/data/public/graine_du_jour.json", "https://exemple.org/absent.json", URL_OK];
    const r = await synchroniserGraine(st, { urls, delaiMs: 2000, fetch: f });
    expect(r.statut).toBe("importee");
    expect(f.appels.some((u) => u.includes("OWNER"))).toBe(false);
    expect(r.tentatives).toHaveLength(2);
    expect(r.tentatives[1]).toContain("HTTP 404");
    expect(urlNonConfiguree("https://OWNER.github.io/REPO/graine_du_jour.json")).toBe(true);
  });

  it("abandonne après le délai et reste jouable hors ligne", async () => {
    const st = await ouvrir();
    const lent: Fetch = (_url, init) => new Promise((_res, rej) => init?.signal?.addEventListener("abort", () => rej(new Error("abort"))));
    const r = await synchroniserGraine(st, { urls: [URL_OK], delaiMs: 50, fetch: lent });
    expect(r.statut).toBe("hors_ligne");
    expect(r.tentatives[0]).toContain("délai de 50 ms dépassé");
  });

  it("mesure l'âge de la graine pour signaler un relais en retard (plus de 36 h)", async () => {
    const st = await ouvrir();
    const genere = Date.parse("2026-11-14T14:23:50Z");   // meta.generated_at de la graine d'exemple
    const r = await synchroniserGraine(st, { urls: [URL_OK], delaiMs: 2000, fetch: reseau(), maintenant: () => genere + 40 * 3_600_000 });
    expect(r.statut === "importee" && Math.round(r.ageHeures ?? 0)).toBe(40);
  });

  it("hors ligne, reprend la dernière graine quotidienne déjà importée plutôt que l'archive", async () => {
    const st = await ouvrir();
    await synchroniserGraine(st, { urls: [URL_OK], delaiMs: 2000, fetch: reseau() });
    const r = await synchroniserGraine(st, { urls: [URL_OK], delaiMs: 2000, fetch: async () => { throw new Error("réseau indisponible"); } });
    expect(r.statut).toBe("hors_ligne");
    expect(r.graine.kind).toBe("quotidienne");
  });
});
