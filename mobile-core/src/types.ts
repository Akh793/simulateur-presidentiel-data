import type { Interruption } from "../../engine/src/index";
import type { MemoireNarrative, Une } from "./narrative/types";

/** Part d'une impulsion (décision ou événement) dans l'écart au Réel d'un indicateur. */
export interface PartAttribution {
  impulsion: string;
  libelle: string;
  origine: "decision" | "evenement";
  contribution: number;   // dans l'unité de l'indicateur
  part: number;           // 0 … 1 de la somme des valeurs absolues
}

export interface Pastille {
  indicateur: string;
  libelle: string;
  unite: string;
  ecart: number;          // Jeu - Référence, unité de l'indicateur
  parts: PartAttribution[];
}

export interface DecisionJournal {
  type: "decider" | "engager493" | "promesse" | "remaniement" | "dissolution" | "matignon" | "objectif";
  cible?: string;
  libelle: string;
  ok: boolean;
  message: string;
  coutCP: number;
  jour: number;
}

export interface SyntheseJour {
  opinion: number;
  opinion90: number;
  capitalPolitique: number;
  plafondCP: number;
  credibilite: number;
  score: number;
  detteJeu: number;
  detteRef: number;
  soldeJeu: number;
  soldeRef: number;
}

/** Ligne de `turn_history`. `jeu` et `reference` suivent l'ordre de `catalogue` (stocké dans la sauvegarde). */
export interface TurnRecord {
  day: number;
  date: string;
  jeu: number[];
  reference: number[];
  synthese: SyntheseJour;
  decisions: DecisionJournal[];
  interruptions: Interruption[];
  attribution: Pastille[] | null;
  une: Une | null;
  breves: string[] | null;
}

export interface Progression {
  score: number;
  opinion90: number;
  capitalPolitique: number;
  credibilite: number;
  decisions: number;
  fin: boolean;
}

export interface SaveRecord {
  sessionId: string;
  seedId: string;
  seedDate: string;
  scenarioId: string | null;
  label: string;
  currentDay: number;
  gameDate: string;
  engineSeed: number;
  engineVersion: number;
  state: string;
  memoire: MemoireNarrative;
  catalogue: string[];
  progression: Progression;
  termine: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SaveMeta = Omit<SaveRecord, "state" | "memoire">;
