/**
 * Pilote de test : `node:sqlite` (Node 22) derrière l'interface asynchrone d'expo-sqlite.
 * Les transactions sont émulées par BEGIN / COMMIT / ROLLBACK, comme le fait expo-sqlite.
 */
import { DatabaseSync } from "node:sqlite";
import type { SqlDatabase, SqlParams, SqlRunResult } from "../src/db/driver";

export function baseMemoire(chemin = ":memory:"): SqlDatabase & { fermer(): void } {
  const db = new DatabaseSync(chemin);
  const conv = (p: SqlParams) => p.map((v) => (v instanceof Uint8Array ? Buffer.from(v) : v)) as (string | number | null | Buffer)[];
  return {
    async execAsync(source: string) { db.exec(source); },
    async runAsync(source: string, params: SqlParams): Promise<SqlRunResult> {
      const r = db.prepare(source).run(...conv(params));
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    async getFirstAsync<T>(source: string, params: SqlParams) { return (db.prepare(source).get(...conv(params)) as T | undefined) ?? null; },
    async getAllAsync<T>(source: string, params: SqlParams) { return db.prepare(source).all(...conv(params)) as T[]; },
    async withTransactionAsync(task: () => Promise<void>) {
      db.exec("BEGIN");
      try { await task(); db.exec("COMMIT"); } catch (e) { db.exec("ROLLBACK"); throw e; }
    },
    fermer() { db.close(); },
  };
}
