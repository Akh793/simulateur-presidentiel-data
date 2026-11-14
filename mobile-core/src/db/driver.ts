/**
 * Contrat minimal de base SQLite, calqué sur l'API asynchrone d'`expo-sqlite` (SDK 52 et suivants) :
 * un objet `SQLiteDatabase` renvoyé par `openDatabaseAsync()` le satisfait tel quel.
 * Le cœur ne dépend donc pas du module natif : les tests utilisent `node:sqlite` derrière la même interface.
 *
 * Seuls les paramètres positionnels (`?`) sont utilisés par le StorageService.
 */
export type SqlValue = string | number | null | Uint8Array;
export type SqlParams = SqlValue[];

export interface SqlRunResult {
  changes: number;
  lastInsertRowId: number;
}

export interface SqlDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlParams): Promise<SqlRunResult>;
  getFirstAsync<T>(source: string, params: SqlParams): Promise<T | null>;
  getAllAsync<T>(source: string, params: SqlParams): Promise<T[]>;
  /** Transaction non exclusive (comportement d'expo-sqlite) : le StorageService sérialise lui-même les accès. */
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

/**
 * Ouverture côté application Expo, sans import statique du module natif :
 *
 *   import * as SQLite from "expo-sqlite";
 *   const storage = await StorageService.ouvrir(await ouvrirBaseExpo(SQLite.openDatabaseAsync));
 */
export async function ouvrirBaseExpo(
  openDatabaseAsync: (nom: string) => Promise<SqlDatabase>,
  nom = "simpres.db",
): Promise<SqlDatabase> {
  return openDatabaseAsync(nom);
}
