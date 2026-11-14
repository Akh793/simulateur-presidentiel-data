/** API publique de mobile-core (étape 3) : persistance locale et narration hors ligne. */
export { ouvrirBaseExpo, type SqlDatabase, type SqlParams, type SqlRunResult, type SqlValue } from "./db/driver";
export { MIGRATIONS, PRAGMAS, VERSION_SCHEMA } from "./db/schema";
export { sha256 } from "./db/sha256";
export { EmpreinteInvalide, GraineInvalide, StorageService, type SeedMeta, type TypeGraine } from "./db/storage";

export { PACK_EMBARQUE, installerPackEmbarque, type EntreePack } from "./archives/pack";
export { SCENARIOS, SEED_EMBARQUEE, appliquerScenario, scenario, type ScenarioArchive, type SourceHistorique } from "./archives/scenarios";

export { GameSession, VERSION_MOTEUR, type OptionsNouvellePartie, type ResultatTour } from "./session/game-session";
export { CATALOGUE_IDS, etatNarratif, ligneDuJour, partsAttribution, pastilles } from "./session/snapshot";

export { buildTurnNarrative, impactBudgetaire, niveau, rendre, articles, type OptionsNarration } from "./narrative/generator";
export { enrichirNarration, consignes, type Enrichisseur, type OptionsEnrichissement, type RequeteEnrichissement, type TypeBloc } from "./narrative/enrich";
export { indexer, valider, normaliserNombre, INSTITUTIONS, type IndexPayload } from "./narrative/validator";
export { referencesReelles } from "./narrative/personnalites";
export * as format from "./narrative/format";
export * as gabarits from "./narrative/templates";
export type { DerniereDecision, EtatNarratif, IndicateurNarratif } from "./narrative/etat";
export type * from "./narrative/types";
export type * from "./types";
