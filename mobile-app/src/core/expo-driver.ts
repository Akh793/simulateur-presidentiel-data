/**
 * Adaptateur concret : `SQLiteDatabase` d'expo-sqlite (SDK 58) → contrat `SqlDatabase` de mobile-core.
 * Les paramètres sont toujours positionnels (tableau), forme acceptée par runAsync / getFirstAsync / getAllAsync.
 */
import { openDatabaseAsync, type SQLiteBindParams, type SQLiteDatabase } from "expo-sqlite";
import type { SqlDatabase, SqlParams, SqlRunResult } from "../../../mobile-core/src/db/driver";

export class ExpoSqliteDriver implements SqlDatabase {
  constructor(private readonly db: SQLiteDatabase) {}

  static async ouvrir(nom = "simpres.db"): Promise<ExpoSqliteDriver> {
    return new ExpoSqliteDriver(await openDatabaseAsync(nom));
  }

  execAsync(source: string): Promise<void> {
    return this.db.execAsync(source);
  }

  async runAsync(source: string, params: SqlParams): Promise<SqlRunResult> {
    const r = await this.db.runAsync(source, params as SQLiteBindParams);
    return { changes: r.changes, lastInsertRowId: r.lastInsertRowId };
  }

  getFirstAsync<T>(source: string, params: SqlParams): Promise<T | null> {
    return this.db.getFirstAsync<T>(source, params as SQLiteBindParams);
  }

  getAllAsync<T>(source: string, params: SqlParams): Promise<T[]> {
    return this.db.getAllAsync<T>(source, params as SQLiteBindParams);
  }

  withTransactionAsync(task: () => Promise<void>): Promise<void> {
    return this.db.withTransactionAsync(task);
  }

  fermer(): Promise<void> {
    return this.db.closeAsync();
  }
}
