/** Types partagés du moteur. Les types de la graine viennent du schéma généré (shared/schema.ts). */
import type { Ministere as MinistereGraine } from "../../shared/schema";

export type Ministere = MinistereGraine;

export const MINISTERES: readonly Ministere[] = [
  "economie_finances", "travail_solidarites", "sante", "ecologie_energie", "transports_logement", "interieur",
  "justice", "education_esr", "agriculture", "armees", "europe_affaires_etrangeres", "culture_sports",
];

/** Boussole idéologique à 4 axes, chaque coordonnée dans [-1, 1]. */
export interface Boussole {
  economique: number; // -1 interventionniste … +1 libéral
  social: number;     // -1 conservateur … +1 progressiste
  autorite: number;   // -1 libertés … +1 ordre
  europe: number;     // -1 souverainiste … +1 fédéraliste
}

export const BOUSSOLE_NEUTRE: Boussole = { economique: 0, social: 0, autorite: 0, europe: 0 };

export type TypeInterruption =
  | "urgence"
  | "mur_tresorerie"
  | "echeance_parlementaire"
  | "promesse"
  | "crise_corps"
  | "institution"
  | "revelation"
  | "fin_mandat";

export interface Interruption {
  type: TypeInterruption;
  jour: number;
  date: string;
  detail: string;
  critique: boolean;
}

export interface Journal {
  jour: number;
  date: string;
  type: string;
  message: string;
}
