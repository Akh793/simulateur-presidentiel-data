/**
 * Catalogue des 48 sous-catégories (12 ministères). 26 sont câblées sur la graine du jour ;
 * les 22 autres sont MODÉLISÉES (indice de jeu base 100, sans source ouverte câblée à ce jour) et
 * doivent être affichées comme telles dans l'interface.
 *
 * `sens` : +1 si une hausse est favorable à l'opinion, -1 si défavorable, 0 si neutre.
 * `pilote` : "macro" (propagation M), "flux" (calculé par l'ordonnanceur comptable), "seuil" (niveau direct).
 */
import type { Ministere } from "./types";

export type Origine = "pilotage" | "bilan" | "modele";

export interface SlotIndicateur {
  id: string;
  ministere: Ministere;
  libelle: string;
  unite: string;
  origine: Origine;
  famille: string;
  sens: 1 | -1 | 0;
  pilote: "macro" | "flux";
  /** Bornes physiques de la valeur affichée (ex. un taux ne peut être négatif). */
  min?: number;
  max?: number;
}

const P = "pilotage", B = "bilan", Mo = "modele";

export const CATALOGUE: readonly SlotIndicateur[] = [
  // Économie, Finances (6)
  { id: "MAC1", ministere: "economie_finances", libelle: "Indice des prix à la consommation, base 2025", unite: "indice", origine: B, famille: "prix", sens: -1, pilote: "macro", min: 0 },
  { id: "MAC3", ministere: "economie_finances", libelle: "Climat des affaires", unite: "indice", origine: B, famille: "conjoncture", sens: 1, pilote: "macro", min: 0 },
  { id: "MAC5", ministere: "economie_finances", libelle: "Production industrielle", unite: "indice", origine: B, famille: "conjoncture", sens: 1, pilote: "macro", min: 0 },
  { id: "FIN1", ministere: "economie_finances", libelle: "Taux à long terme de l'État", unite: "%", origine: B, famille: "taux", sens: -1, pilote: "macro", min: -1, max: 25 },
  { id: "FIN2", ministere: "economie_finances", libelle: "Dette publique", unite: "% du PIB", origine: B, famille: "dette", sens: -1, pilote: "flux", min: 0 },
  { id: "BUD1", ministere: "economie_finances", libelle: "Solde budgétaire de l'État, cumulé depuis janvier", unite: "€", origine: B, famille: "budget", sens: 1, pilote: "flux" },
  // Travail, Solidarités (4)
  { id: "MAC2", ministere: "travail_solidarites", libelle: "Taux de chômage (BIT)", unite: "%", origine: B, famille: "emploi", sens: -1, pilote: "macro", min: 0, max: 60 },
  { id: "MAC4", ministere: "travail_solidarites", libelle: "Confiance des ménages", unite: "indice", origine: B, famille: "menages", sens: 1, pilote: "macro", min: 0 },
  { id: "URS1", ministere: "travail_solidarites", libelle: "Masse salariale du secteur privé", unite: "€", origine: B, famille: "emploi", sens: 1, pilote: "macro", min: 0 },
  { id: "TRA2", ministere: "travail_solidarites", libelle: "Offres d'emploi en ligne (non officiel)", unite: "indice", origine: P, famille: "emploi", sens: 1, pilote: "macro", min: 0 },
  // Santé (4)
  { id: "SAN1", ministere: "sante", libelle: "Passages aux urgences estimés (grippe, covid-19, gastro)", unite: "passages", origine: P, famille: "sante", sens: -1, pilote: "macro", min: 0 },
  { id: "SAN3", ministere: "sante", libelle: "Médicaments en rupture ou en tension", unite: "spécialités", origine: P, famille: "sante", sens: -1, pilote: "macro", min: 0 },
  { id: "MAC6", ministere: "sante", libelle: "Naissances mensuelles", unite: "naissances", origine: B, famille: "demographie", sens: 1, pilote: "macro", min: 0 },
  { id: "SAN_M1", ministere: "sante", libelle: "Tension hospitalière (modèle)", unite: "indice", origine: Mo, famille: "sante", sens: -1, pilote: "macro", min: 0 },
  // Écologie, Énergie (5)
  { id: "ENE1", ministere: "ecologie_energie", libelle: "Consommation électrique moyenne", unite: "MW", origine: P, famille: "energie", sens: 0, pilote: "macro", min: 0 },
  { id: "ENE4", ministere: "ecologie_energie", libelle: "Prix du gazole à la pompe", unite: "€/L", origine: P, famille: "energie", sens: -1, pilote: "macro", min: 0 },
  { id: "ENE2", ministere: "ecologie_energie", libelle: "Stock de gaz (Teréga seul)", unite: "GWh", origine: B, famille: "energie", sens: 1, pilote: "macro", min: 0 },
  { id: "MET2", ministere: "ecologie_energie", libelle: "Température maximale moyenne", unite: "°C", origine: P, famille: "meteo", sens: 0, pilote: "macro" },
  { id: "EAU2", ministere: "ecologie_energie", libelle: "Débit des grands fleuves", unite: "m³/s", origine: P, famille: "eau", sens: 0, pilote: "macro", min: 0 },
  // Transports, Logement (4)
  { id: "MOB1", ministere: "transports_logement", libelle: "Trains supprimés ou en retard", unite: "%", origine: P, famille: "mobilite", sens: -1, pilote: "macro", min: 0, max: 100 },
  { id: "LOG_M1", ministere: "transports_logement", libelle: "Mises en chantier de logements (modèle)", unite: "indice", origine: Mo, famille: "logement", sens: 1, pilote: "macro", min: 0 },
  { id: "LOG_M2", ministere: "transports_logement", libelle: "Demande de logement social (modèle)", unite: "indice", origine: Mo, famille: "logement", sens: -1, pilote: "macro", min: 0 },
  { id: "LOG_M3", ministere: "transports_logement", libelle: "Demandes non pourvues au 115 (modèle)", unite: "indice", origine: Mo, famille: "hebergement", sens: -1, pilote: "flux", min: 0 },
  // Intérieur (4)
  { id: "MET1", ministere: "interieur", libelle: "Indice de vigilance météorologique", unite: "points", origine: P, famille: "meteo", sens: -1, pilote: "macro", min: 0 },
  { id: "INT_M1", ministere: "interieur", libelle: "Délinquance enregistrée (modèle)", unite: "indice", origine: Mo, famille: "securite", sens: -1, pilote: "macro", min: 0 },
  { id: "INT_M2", ministere: "interieur", libelle: "Demandes d'asile en instance (modèle)", unite: "indice", origine: Mo, famille: "asile", sens: -1, pilote: "macro", min: 0 },
  { id: "INT_M3", ministere: "interieur", libelle: "Mobilisations et ordre public (modèle)", unite: "indice", origine: Mo, famille: "ordre_public", sens: -1, pilote: "macro", min: 0 },
  // Justice (4)
  { id: "JUS1", ministere: "justice", libelle: "Textes normatifs publiés au Journal officiel", unite: "textes", origine: P, famille: "normes", sens: 0, pilote: "macro", min: 0 },
  { id: "JUS2", ministere: "justice", libelle: "Personnes détenues", unite: "détenus", origine: B, famille: "prisons", sens: -1, pilote: "macro", min: 0 },
  { id: "JUS3", ministere: "justice", libelle: "Taux d'application des lois", unite: "%", origine: P, famille: "normes", sens: 1, pilote: "macro", min: 0, max: 100 },
  { id: "JUS_M1", ministere: "justice", libelle: "Stock d'affaires en attente (modèle)", unite: "indice", origine: Mo, famille: "justice", sens: -1, pilote: "macro", min: 0 },
  // Éducation, ESR (3)
  { id: "EDU_M1", ministere: "education_esr", libelle: "Postes d'enseignants non pourvus (modèle)", unite: "indice", origine: Mo, famille: "education", sens: -1, pilote: "macro", min: 0 },
  { id: "EDU_M2", ministere: "education_esr", libelle: "Effectifs scolaires (modèle)", unite: "indice", origine: Mo, famille: "education", sens: 0, pilote: "macro", min: 0 },
  { id: "EDU_M3", ministere: "education_esr", libelle: "Décrochage scolaire (modèle)", unite: "indice", origine: Mo, famille: "education", sens: -1, pilote: "macro", min: 0 },
  // Agriculture (3)
  { id: "EAU1", ministere: "agriculture", libelle: "Variation du niveau des nappes sur 7 jours", unite: "m", origine: P, famille: "eau", sens: 1, pilote: "macro" },
  { id: "AGR_M1", ministere: "agriculture", libelle: "Stocks céréaliers (modèle)", unite: "indice", origine: Mo, famille: "agriculture", sens: 1, pilote: "macro", min: 0 },
  { id: "AGR_M2", ministere: "agriculture", libelle: "Revenu agricole (modèle)", unite: "indice", origine: Mo, famille: "agriculture", sens: 1, pilote: "macro", min: 0 },
  // Armées (3)
  { id: "ARM_M1", ministere: "armees", libelle: "Disponibilité des équipements (modèle)", unite: "indice", origine: Mo, famille: "defense", sens: 1, pilote: "macro", min: 0 },
  { id: "ARM_M2", ministere: "armees", libelle: "Stocks de munitions (modèle)", unite: "indice", origine: Mo, famille: "defense", sens: 1, pilote: "macro", min: 0 },
  { id: "ARM_M3", ministere: "armees", libelle: "Coût des opérations extérieures (modèle)", unite: "indice", origine: Mo, famille: "defense", sens: -1, pilote: "macro", min: 0 },
  // Europe, Affaires étrangères (4)
  { id: "FIN4", ministere: "europe_affaires_etrangeres", libelle: "Taux à long terme, zone euro", unite: "%", origine: B, famille: "taux", sens: 0, pilote: "macro", min: -1, max: 25 },
  { id: "FIN3", ministere: "europe_affaires_etrangeres", libelle: "Solde des échanges de services", unite: "M€", origine: B, famille: "echanges", sens: 1, pilote: "macro" },
  { id: "EUR_M1", ministere: "europe_affaires_etrangeres", libelle: "Contribution au budget de l'UE (modèle)", unite: "indice", origine: Mo, famille: "europe", sens: -1, pilote: "macro", min: 0 },
  { id: "EUR_M2", ministere: "europe_affaires_etrangeres", libelle: "Fonds européens reçus (modèle)", unite: "indice", origine: Mo, famille: "europe", sens: 1, pilote: "macro", min: 0 },
  // Culture, Sports (4)
  { id: "CUL_M1", ministere: "culture_sports", libelle: "Fréquentation des musées (modèle)", unite: "indice", origine: Mo, famille: "culture", sens: 1, pilote: "macro", min: 0 },
  { id: "CUL_M2", ministere: "culture_sports", libelle: "Fréquentation touristique (modèle)", unite: "indice", origine: Mo, famille: "tourisme", sens: 1, pilote: "macro", min: 0 },
  { id: "CUL_M3", ministere: "culture_sports", libelle: "Grands événements (modèle)", unite: "indice", origine: Mo, famille: "culture", sens: 1, pilote: "macro", min: 0 },
  { id: "CUL_M4", ministere: "culture_sports", libelle: "Emploi culturel (modèle)", unite: "indice", origine: Mo, famille: "culture", sens: 1, pilote: "macro", min: 0 },
];

export const N_INDICATEURS = CATALOGUE.length;
export const INDEX: ReadonlyMap<string, number> = new Map(CATALOGUE.map((s, i) => [s.id, i]));

export function idx(id: string): number {
  const i = INDEX.get(id);
  if (i === undefined) throw new Error(`indicateur inconnu : ${id}`);
  return i;
}
