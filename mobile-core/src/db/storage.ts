/**
 * StorageService : unique point d'accès à la base locale. Toutes les opérations passent par une file
 * séquentielle (expo-sqlite n'offre que des transactions non exclusives), si bien que deux sauvegardes
 * automatiques ne peuvent jamais s'entrelacer.
 */
import { parseGraine, type Graine } from "../../../shared/schema";
import { MEMOIRE_VIDE, type MemoireNarrative, type Une } from "../narrative/types";
import type { DecisionJournal, Progression, SaveMeta, SaveRecord, TurnRecord } from "../types";
import type { SqlDatabase, SqlValue } from "./driver";
import { MIGRATIONS, PRAGMAS, VERSION_SCHEMA } from "./schema";
import { sha256 } from "./sha256";

export type TypeGraine = "quotidienne" | "embarquee" | "archive";

export interface SeedMeta {
  seedId: string;
  kind: TypeGraine;
  titre: string;
  dateJeu: string;
  revision: number;
  schemaVersion: string;
  sha256: string;
  taille: number;
  importeeLe: string;
}

export class GraineInvalide extends Error {
  constructor(message: string, readonly details: string[] = []) {
    super(message);
    this.name = "GraineInvalide";
  }
}

export class EmpreinteInvalide extends Error {
  constructor(readonly attendue: string, readonly calculee: string) {
    super(`empreinte SHA-256 différente : attendue ${attendue}, calculée ${calculee}`);
    this.name = "EmpreinteInvalide";
  }
}

interface LigneSeed {
  seed_id: string; kind: TypeGraine; titre: string; date_jeu: string; revision: number; schema_version: string;
  sha256: string; taille: number; importee_le: string; payload?: string;
}
interface LigneSave {
  session_id: string; seed_id: string; seed_date: string; scenario_id: string | null; label: string; current_day: number;
  game_date: string; engine_seed: number; engine_version: number; state?: string; narrative_memory?: string; catalogue: string;
  progression: string; termine: number; created_at: string; updated_at: string;
}
interface LigneTour {
  day: number; game_date: string; jeu: string; reference: string; synthese: string; decisions: string; interruptions: string;
  attribution: string | null; une: string | null; breves: string | null;
}

const maintenant = () => new Date().toISOString();

function seedMeta(r: LigneSeed): SeedMeta {
  return { seedId: r.seed_id, kind: r.kind, titre: r.titre, dateJeu: r.date_jeu, revision: r.revision, schemaVersion: r.schema_version,
    sha256: r.sha256, taille: r.taille, importeeLe: r.importee_le };
}

function saveMeta(r: LigneSave): SaveMeta {
  return {
    sessionId: r.session_id, seedId: r.seed_id, seedDate: r.seed_date, scenarioId: r.scenario_id, label: r.label,
    currentDay: r.current_day, gameDate: r.game_date, engineSeed: r.engine_seed, engineVersion: r.engine_version,
    catalogue: JSON.parse(r.catalogue) as string[], progression: JSON.parse(r.progression) as Progression,
    termine: r.termine === 1, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function tour(r: LigneTour): TurnRecord {
  return {
    day: r.day, date: r.game_date, jeu: JSON.parse(r.jeu), reference: JSON.parse(r.reference), synthese: JSON.parse(r.synthese),
    decisions: JSON.parse(r.decisions), interruptions: JSON.parse(r.interruptions),
    attribution: r.attribution ? JSON.parse(r.attribution) : null, une: r.une ? JSON.parse(r.une) : null,
    breves: r.breves ? JSON.parse(r.breves) : null,
  };
}

/** Arrondi à 6 chiffres significatifs : divise par deux la taille de l'historique sans effet visible sur les courbes. */
const compact = (xs: readonly number[]) => xs.map((x) => (Number.isFinite(x) ? Number(x.toPrecision(6)) : 0));

export class StorageService {
  private file: Promise<unknown> = Promise.resolve();
  private cacheGraines = new Map<string, Graine>();

  private constructor(readonly db: SqlDatabase) {}

  /** Ouvre la base, applique les PRAGMA et les migrations manquantes. */
  static async ouvrir(db: SqlDatabase): Promise<StorageService> {
    const s = new StorageService(db);
    await s.serie(async () => {
      await db.execAsync(PRAGMAS);
      const v = (await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version", []))?.user_version ?? 0;
      if (v > VERSION_SCHEMA) throw new Error(`base créée par une version plus récente (schéma ${v} > ${VERSION_SCHEMA})`);
      for (let k = v; k < VERSION_SCHEMA; k++) {
        await db.withTransactionAsync(async () => {
          await db.execAsync(MIGRATIONS[k]!);
          await db.execAsync(`PRAGMA user_version = ${k + 1}`);
        });
      }
    });
    return s;
  }

  /** Exécute les tâches une par une, dans l'ordre d'appel ; une erreur n'interrompt pas la file. */
  private serie<T>(tache: () => Promise<T>): Promise<T> {
    const r = this.file.then(tache, tache);
    this.file = r.catch(() => undefined);
    return r;
  }

  async versionSchema(): Promise<number> {
    return this.serie(async () => (await this.db.getFirstAsync<{ user_version: number }>("PRAGMA user_version", []))?.user_version ?? 0);
  }

  // ------------------------------------------------------------------ graines
  /**
   * Importe une graine : JSON, validation stricte contre `shared/schema.ts`, empreinte SHA-256 (comparée à
   * celle publiée par le relais si fournie). Idempotent : une graine déjà présente (même empreinte) est renvoyée.
   */
  importerGraine(source: string | unknown, opts: { kind: TypeGraine; titre?: string; sha256Attendu?: string; seedId?: string }): Promise<SeedMeta> {
    return this.serie(async () => {
      const texte = typeof source === "string" ? source : JSON.stringify(source);
      const empreinte = sha256(texte);
      if (opts.sha256Attendu && opts.sha256Attendu.trim().toLowerCase().split(/\s+/)[0] !== empreinte)
        throw new EmpreinteInvalide(opts.sha256Attendu.trim().split(/\s+/)[0]!, empreinte);
      let brut: unknown;
      try { brut = JSON.parse(texte); } catch (e) { throw new GraineInvalide(`JSON illisible : ${(e as Error).message}`); }
      let g: Graine;
      try { g = parseGraine(brut); } catch (e) {
        const issues = (e as { issues?: { path: (string | number)[]; message: string }[] }).issues ?? [];
        throw new GraineInvalide("graine non conforme au schéma partagé", issues.slice(0, 20).map((i) => `${i.path.join(".")} : ${i.message}`));
      }
      const existante = await this.db.getFirstAsync<LigneSeed>("SELECT seed_id, kind, titre, date_jeu, revision, schema_version, sha256, taille, importee_le FROM seeds WHERE sha256 = ?", [empreinte]);
      if (existante) return seedMeta(existante);
      const seedId = opts.seedId ?? `${opts.kind}:${g.meta.date_jeu}#${g.meta.revision}`;
      const ligne: LigneSeed = {
        seed_id: seedId, kind: opts.kind, titre: opts.titre ?? `Graine du ${g.meta.date_jeu}`, date_jeu: g.meta.date_jeu,
        revision: g.meta.revision, schema_version: String(g.schema_version), sha256: empreinte, taille: texte.length, importee_le: maintenant(),
      };
      await this.db.runAsync(
        "INSERT INTO seeds (seed_id, kind, titre, date_jeu, revision, schema_version, sha256, taille, payload, importee_le) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [ligne.seed_id, ligne.kind, ligne.titre, ligne.date_jeu, ligne.revision, ligne.schema_version, ligne.sha256, ligne.taille, texte, ligne.importee_le],
      );
      this.cacheGraines.set(seedId, g);
      return seedMeta(ligne);
    });
  }

  listerGraines(kind?: TypeGraine): Promise<SeedMeta[]> {
    return this.serie(async () => {
      const sql = "SELECT seed_id, kind, titre, date_jeu, revision, schema_version, sha256, taille, importee_le FROM seeds"
        + (kind ? " WHERE kind = ?" : "") + " ORDER BY date_jeu DESC, revision DESC";
      return (await this.db.getAllAsync<LigneSeed>(sql, kind ? [kind] : [])).map(seedMeta);
    });
  }

  /** Graine validée (mise en cache : une seule analyse zod par session d'application). */
  graine(seedId: string): Promise<Graine> {
    return this.serie(async () => {
      const c = this.cacheGraines.get(seedId);
      if (c) return c;
      const r = await this.db.getFirstAsync<{ payload: string }>("SELECT payload FROM seeds WHERE seed_id = ?", [seedId]);
      if (!r) throw new Error(`graine inconnue : ${seedId}`);
      const g = parseGraine(JSON.parse(r.payload));
      this.cacheGraines.set(seedId, g);
      return g;
    });
  }

  /** Refusé (contrainte RESTRICT) tant qu'une partie s'appuie sur la graine. */
  supprimerGraine(seedId: string): Promise<boolean> {
    return this.serie(async () => {
      const n = await this.db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM saves WHERE seed_id = ?", [seedId]);
      if ((n?.n ?? 0) > 0) throw new Error(`graine ${seedId} utilisée par ${n?.n} partie(s)`);
      this.cacheGraines.delete(seedId);
      return (await this.db.runAsync("DELETE FROM seeds WHERE seed_id = ?", [seedId])).changes > 0;
    });
  }

  // ------------------------------------------------------------------ parties
  /**
   * Sauvegarde atomique : état du moteur + jours simulés depuis la dernière sauvegarde. Les jours postérieurs
   * à `currentDay` (reliquat d'une ancienne branche) sont supprimés dans la même transaction.
   */
  sauvegarder(save: Omit<SaveRecord, "createdAt" | "updatedAt">, tours: readonly TurnRecord[] = [], decision?: { day: number; d: DecisionJournal }): Promise<void> {
    return this.serie(async () => {
      const t = maintenant();
      await this.db.withTransactionAsync(async () => {
        await this.db.runAsync(
          `INSERT INTO saves (session_id, seed_id, seed_date, scenario_id, label, current_day, game_date, engine_seed, engine_version, state,
             narrative_memory, catalogue, progression, termine, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (session_id) DO UPDATE SET current_day = excluded.current_day, game_date = excluded.game_date, label = excluded.label,
             state = excluded.state, narrative_memory = excluded.narrative_memory, progression = excluded.progression,
             termine = excluded.termine, updated_at = excluded.updated_at`,
          [save.sessionId, save.seedId, save.seedDate, save.scenarioId, save.label, save.currentDay, save.gameDate, save.engineSeed,
            save.engineVersion, save.state, JSON.stringify(save.memoire), JSON.stringify(save.catalogue), JSON.stringify(save.progression),
            save.termine ? 1 : 0, t, t],
        );
        for (const r of tours) await this.ecrireTour(save.sessionId, r);
        await this.db.runAsync("DELETE FROM turn_history WHERE session_id = ? AND day > ?", [save.sessionId, save.currentDay]);
        if (decision) await this.ajouterDecision(save.sessionId, decision.day, decision.d);
      });
    });
  }

  private async ecrireTour(sessionId: string, r: TurnRecord): Promise<void> {
    const v: SqlValue[] = [sessionId, r.day, r.date, JSON.stringify(compact(r.jeu)), JSON.stringify(compact(r.reference)), JSON.stringify(r.synthese),
      JSON.stringify(r.decisions), JSON.stringify(r.interruptions), r.attribution ? JSON.stringify(r.attribution) : null,
      r.une ? JSON.stringify(r.une) : null, r.breves ? JSON.stringify(r.breves) : null];
    await this.db.runAsync(
      `INSERT INTO turn_history (session_id, day, game_date, jeu, reference, synthese, decisions, interruptions, attribution, une, breves)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (session_id, day) DO UPDATE SET game_date = excluded.game_date, jeu = excluded.jeu, reference = excluded.reference,
         synthese = excluded.synthese, decisions = excluded.decisions, interruptions = excluded.interruptions,
         attribution = COALESCE(excluded.attribution, turn_history.attribution), une = COALESCE(excluded.une, turn_history.une),
         breves = COALESCE(excluded.breves, turn_history.breves)`, v);
  }

  /** Ajoute une décision au journal du jour (appelée dans la transaction de sauvegarde). */
  private async ajouterDecision(sessionId: string, day: number, d: DecisionJournal): Promise<void> {
    const r = await this.db.getFirstAsync<{ decisions: string }>("SELECT decisions FROM turn_history WHERE session_id = ? AND day = ?", [sessionId, day]);
    if (!r) return;
    const liste = JSON.parse(r.decisions) as DecisionJournal[];
    liste.push(d);
    await this.db.runAsync("UPDATE turn_history SET decisions = ? WHERE session_id = ? AND day = ?", [JSON.stringify(liste), sessionId, day]);
  }

  chargerPartie(sessionId: string): Promise<SaveRecord | null> {
    return this.serie(async () => {
      const r = await this.db.getFirstAsync<LigneSave>("SELECT * FROM saves WHERE session_id = ?", [sessionId]);
      if (!r) return null;
      const m = saveMeta(r);
      const memoire = r.narrative_memory ? (JSON.parse(r.narrative_memory) as MemoireNarrative) : MEMOIRE_VIDE;
      return { ...m, state: r.state ?? "", memoire };
    });
  }

  /** Liste rapide (sans l'état du moteur, qui pèse environ 150 Ko après cinq ans). */
  listerParties(): Promise<SaveMeta[]> {
    return this.serie(async () => (await this.db.getAllAsync<LigneSave>(
      `SELECT session_id, seed_id, seed_date, scenario_id, label, current_day, game_date, engine_seed, engine_version, catalogue, progression,
         termine, created_at, updated_at FROM saves ORDER BY updated_at DESC`, [])).map(saveMeta));
  }

  supprimerPartie(sessionId: string): Promise<boolean> {
    return this.serie(async () => (await this.db.runAsync("DELETE FROM saves WHERE session_id = ?", [sessionId])).changes > 0);
  }

  // ------------------------------------------------------------------ historique
  historique(sessionId: string, depuis = 0, jusqua = Number.MAX_SAFE_INTEGER): Promise<TurnRecord[]> {
    return this.serie(async () => (await this.db.getAllAsync<LigneTour>(
      "SELECT * FROM turn_history WHERE session_id = ? AND day BETWEEN ? AND ? ORDER BY day", [sessionId, depuis, jusqua])).map(tour));
  }

  /** Courbe duale (Réalité vs Uchronie) d'un indicateur, extraite en SQL (json_extract) sans charger l'historique. */
  courbe(sessionId: string, indicateur: string): Promise<{ day: number; date: string; jeu: number; reference: number }[]> {
    return this.serie(async () => {
      const s = await this.db.getFirstAsync<{ catalogue: string }>("SELECT catalogue FROM saves WHERE session_id = ?", [sessionId]);
      if (!s) throw new Error(`partie inconnue : ${sessionId}`);
      const i = (JSON.parse(s.catalogue) as string[]).indexOf(indicateur);
      if (i < 0) throw new Error(`indicateur inconnu : ${indicateur}`);
      const chemin = `$[${i}]`;
      return this.db.getAllAsync<{ day: number; date: string; jeu: number; reference: number }>(
        "SELECT day, game_date AS date, json_extract(jeu, ?) AS jeu, json_extract(reference, ?) AS reference FROM turn_history WHERE session_id = ? ORDER BY day",
        [chemin, chemin, sessionId]);
    });
  }

  /** Dernières Unes du journal du soir, de la plus récente à la plus ancienne. */
  unes(sessionId: string, limite = 30): Promise<Une[]> {
    return this.serie(async () => (await this.db.getAllAsync<{ une: string }>(
      "SELECT une FROM turn_history WHERE session_id = ? AND une IS NOT NULL ORDER BY day DESC LIMIT ?", [sessionId, limite]))
      .map((r) => JSON.parse(r.une) as Une));
  }

  nombreTours(sessionId: string): Promise<number> {
    return this.serie(async () => (await this.db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM turn_history WHERE session_id = ?", [sessionId]))?.n ?? 0);
  }
}
