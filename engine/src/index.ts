/** API publique du moteur (100 % local, sans I/O). */
export { Simulation, DUREE_MANDAT, type ConfigSimulation, type ResultatAvance, type ResultatDecision } from "./simulation";
export { calibrer, mesurer, verifier, sigma, saturer, COUPLAGES, CalibrationError, Macro, type Calibration, type Couplage, type Inertie, type RapportCalibration } from "./macro";
export { CATALOGUE, INDEX, N_INDICATEURS, idx, type SlotIndicateur } from "./indicateurs";
export { GrandLivre, DEFINITIONS_FLUX, REGLES_DEFAUT, type ContexteFlux, type FluxId, type Mur, type Stocks } from "./flux";
export { Parlement, CONFIG_PARLEMENT_DEFAUT, estBudgetaire, type ConfigParlement, type Texte, type Promesse } from "./parlement";
export { Acteurs, SEUIL_BLOCAGE, type Corps, type CorpsId, type Ministre, type Segment, type SegmentId } from "./acteurs";
export { FileDossiers, AGGRAVATION, QUOTA_FENETRE, TOUR_BASCULE, type Dossier } from "./dossiers";
export { GABARITS, gabarit, type Gabarit, type Instrument } from "./decisions";
export { ETAT, SOCIAL, PHYSIQUE, ENCAISSEMENTS_ACOSS, type Montant } from "./calibration";
export * as calendrier from "./calendrier";
export { Mat, majorantRayonSpectral } from "./linalg";
export { Rng, hashSeed } from "./rng";
export type { Boussole, Interruption, Journal, Ministere, TypeInterruption } from "./types";
