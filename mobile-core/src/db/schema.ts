/**
 * Schéma SQLite local (expo-sqlite). Versionné par `PRAGMA user_version` : chaque migration est appliquée
 * une seule fois, dans l'ordre, à l'intérieur d'une transaction.
 *
 * - `seeds`        : graines téléchargées (relais quotidien), graine embarquée et scénarios « Archives de Crise ».
 * - `saves`        : une ligne par partie ; l'état complet du moteur (`Simulation.serialiser()`) + métadonnées.
 * - `turn_history` : une ligne par jour simulé ; valeurs Jeu / Référence des 48 indicateurs (courbe duale),
 *                    décisions du jour, pastilles d'attribution causale, Une du 20h et brèves.
 */
export const VERSION_SCHEMA = 1;

export const PRAGMAS = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;
`;

export const MIGRATIONS: readonly string[] = [
  // v1
  `
CREATE TABLE IF NOT EXISTS seeds (
  seed_id      TEXT PRIMARY KEY,
  kind         TEXT NOT NULL CHECK (kind IN ('quotidienne', 'embarquee', 'archive')),
  titre        TEXT NOT NULL,
  date_jeu     TEXT NOT NULL,
  revision     INTEGER NOT NULL,
  schema_version TEXT NOT NULL,
  sha256       TEXT NOT NULL UNIQUE,
  taille       INTEGER NOT NULL,
  payload      TEXT NOT NULL,
  importee_le  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_seeds_date ON seeds (date_jeu DESC);

CREATE TABLE IF NOT EXISTS saves (
  session_id       TEXT PRIMARY KEY,
  seed_id          TEXT NOT NULL REFERENCES seeds (seed_id) ON DELETE RESTRICT,
  seed_date        TEXT NOT NULL,
  scenario_id      TEXT,
  label            TEXT NOT NULL,
  current_day      INTEGER NOT NULL CHECK (current_day >= 0),
  game_date        TEXT NOT NULL,
  engine_seed      INTEGER NOT NULL,
  engine_version   INTEGER NOT NULL,
  state            TEXT NOT NULL,
  narrative_memory TEXT NOT NULL,
  catalogue        TEXT NOT NULL,
  progression      TEXT NOT NULL,
  termine          INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_saves_maj ON saves (updated_at DESC);

CREATE TABLE IF NOT EXISTS turn_history (
  session_id    TEXT NOT NULL REFERENCES saves (session_id) ON DELETE CASCADE,
  day           INTEGER NOT NULL,
  game_date     TEXT NOT NULL,
  jeu           TEXT NOT NULL,
  reference     TEXT NOT NULL,
  synthese      TEXT NOT NULL,
  decisions     TEXT NOT NULL DEFAULT '[]',
  interruptions TEXT NOT NULL DEFAULT '[]',
  attribution   TEXT,
  une           TEXT,
  breves        TEXT,
  PRIMARY KEY (session_id, day)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS idx_turn_une ON turn_history (session_id, day) WHERE une IS NOT NULL;
`,
];
