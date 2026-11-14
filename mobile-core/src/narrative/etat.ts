/**
 * État narratif : instantané purement déclaratif (sérialisable) extrait du moteur, seule entrée du générateur.
 * Il est construit par `session/snapshot.ts` ; le générateur ne lit jamais le moteur directement.
 */
import type { PartAttribution } from "../types";

export interface IndicateurNarratif {
  id: string;
  libelle: string;
  unite: string;
  ministere: string;
  famille: string;
  origine: "pilotage" | "bilan" | "modele";
  sens: -1 | 0 | 1;
  jeu: number;
  reference: number;
  /** Écart normalisé (unités d'écart du moteur), utilisé pour hiérarchiser ; jamais affiché. */
  ecartUnites: number;
  publiee: { valeur: number; jour: number; precedente: number | null } | null;
  /** Normale récente (médiane des 30 derniers jours, moteur) : repère des anomalies de données. */
  normale: number;
  /** Anomalie calculée par le relais pour la graine du jour (repère des dossiers « graine »). */
  anomalieGraine: { methode: string; score: number | null; seuil: number } | null;
}

export interface CorpsNarratif {
  id: string;
  libelle: string;
  radicalisation: number;
  approbation: number;
  bloque: boolean;
  blocage: string;
}

export interface MinistreNarratif {
  ministere: string;
  nom: string;
  competence: number;
  loyaute: number;
  popularite: number;
  tension: number;
}

export interface TexteNarratif {
  id: string;
  titre: string;
  type: string;
  prochaine: { nom: string; date: string } | null;
}

export interface EtatNarratif {
  jour: number;
  date: string;
  seed: number;
  capitalPolitique: number;
  plafondCP: number;
  credibilite: number;
  opinion: number;
  opinion90: number;
  seuilBlocage: number;
  indicateurs: IndicateurNarratif[];
  tresorerie: { soldeEtat: number; soldeEtatRef: number; dette: number; detteRef: number; acoss: number; plafondAcoss: number; tauxLong: number };
  segments: { id: string; poids: number; approbation: number }[];
  corps: CorpsNarratif[];
  ministres: MinistreNarratif[];
  parlement: { seuilCensure: number; siegesTotal: number; soutien: number; textes: TexteNarratif[] };
  murs: { date: string; libelle: string; montant: number }[];
  /** Attribution causale (unité de l'indicateur) des indicateurs cités par les dossiers du tour. */
  attribution: Record<string, PartAttribution[]>;
  scenario: { id: string; titre: string; evenement: string } | null;
}

export interface DerniereDecision {
  gabaritId?: string;
  libelle: string;
  ok: boolean;
  jour: number;
}
