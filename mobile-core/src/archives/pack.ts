/**
 * Pack embarqué dans l'application : jouable au premier lancement, sans réseau.
 * La graine est celle produite par le relais de l'étape 1 le 14 novembre 2026 (pipeline/tests/graine_exemple.json).
 */
import type { SeedMeta, StorageService } from "../db/storage";
import graine20261114 from "./graine-2026-11-14.json";
import { SEED_EMBARQUEE } from "./scenarios";

export interface EntreePack {
  seedId: string;
  titre: string;
  donnees: unknown;
}

export const PACK_EMBARQUE: readonly EntreePack[] = [
  { seedId: SEED_EMBARQUEE, titre: "France réelle au 14 novembre 2026 (graine du relais)", donnees: graine20261114 as unknown },
];

/** Installe le pack (idempotent : une graine déjà présente n'est pas réimportée). */
export async function installerPackEmbarque(storage: StorageService): Promise<SeedMeta[]> {
  const out: SeedMeta[] = [];
  for (const e of PACK_EMBARQUE) out.push(await storage.importerGraine(e.donnees, { kind: "embarquee", titre: e.titre, seedId: e.seedId }));
  return out;
}
