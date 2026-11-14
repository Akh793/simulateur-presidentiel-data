/**
 * Synchronisation au démarrage (logique pure, `fetch` injecté) :
 *  1. installe toujours le pack embarqué (jouable hors ligne) ;
 *  2. tente chaque URL configurée : graine + empreinte `.sha256` publiée par le relais ;
 *  3. importe la graine seulement si l'empreinte correspond (StorageService la vérifie) ;
 *  4. sinon (hors ligne, délai, 404, empreinte fausse, schéma invalide) : bascule sur les archives embarquées.
 */
import { installerPackEmbarque } from "../../../mobile-core/src/archives/pack";
import { SEED_EMBARQUEE } from "../../../mobile-core/src/archives/scenarios";
import type { SeedMeta, StorageService } from "../../../mobile-core/src/db/storage";

export type Fetch = (url: string, init?: { signal?: AbortSignal; headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

export interface ConfigSync {
  urls: string[];
  delaiMs: number;
  fetch: Fetch;
  /** Horloge injectable (tests). */
  maintenant?: () => number;
}

/** Au-delà, la graine reste jouable mais l'accueil signale que le relais n'a pas publié à temps. */
export const AGE_MAX_HEURES = 36;

export type ResultatSync =
  | { statut: "importee" | "deja_presente"; graine: SeedMeta; url: string; tentatives: string[]; ageHeures: number | null }
  | { statut: "hors_ligne"; graine: SeedMeta; tentatives: string[] };

async function telecharger(f: Fetch, url: string, delaiMs: number): Promise<string> {
  const ctl = new AbortController();
  const minuteur = setTimeout(() => ctl.abort(), delaiMs);
  try {
    const r = await f(url, { signal: ctl.signal, headers: { "Cache-Control": "no-cache" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } catch (e) {
    throw new Error(ctl.signal.aborted ? `délai de ${delaiMs} ms dépassé` : (e as Error).message);
  } finally {
    clearTimeout(minuteur);
  }
}

/** URL configurée encore générique (dépôt non renseigné) : inutile de la tenter. */
export const urlNonConfiguree = (u: string) => /\/OWNER\/|\/\/OWNER\.|\/REPO\//.test(u);

export async function synchroniserGraine(storage: StorageService, cfg: ConfigSync): Promise<ResultatSync> {
  const pack = await installerPackEmbarque(storage);
  const tentatives: string[] = [];
  for (const url of cfg.urls) {
    if (urlNonConfiguree(url)) { tentatives.push(`${url} : dépôt non configuré (app.json, extra.graine.urls)`); continue; }
    try {
      const [texte, empreinte] = await Promise.all([telecharger(cfg.fetch, url, cfg.delaiMs), telecharger(cfg.fetch, `${url}.sha256`, cfg.delaiMs)]);
      const avant = (await storage.listerGraines("quotidienne")).length;
      const graine = await storage.importerGraine(texte, { kind: "quotidienne", sha256Attendu: empreinte });
      const apres = (await storage.listerGraines("quotidienne")).length;
      const genere = Date.parse((JSON.parse(texte) as { meta?: { generated_at?: string } }).meta?.generated_at ?? "");
      const ageHeures = Number.isFinite(genere) ? ((cfg.maintenant ?? Date.now)() - genere) / 3_600_000 : null;
      return { statut: apres > avant ? "importee" : "deja_presente", graine, url, tentatives, ageHeures };
    } catch (e) {
      tentatives.push(`${url} : ${(e as Error).message}`);
    }
  }
  const derniere = (await storage.listerGraines("quotidienne"))[0];
  return { statut: "hors_ligne", graine: derniere ?? pack.find((g) => g.seedId === SEED_EMBARQUEE) ?? pack[0]!, tentatives };
}
