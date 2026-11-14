// FICHIER GÉNÉRÉ par pipeline/gen_ts.py depuis pipeline/seed/schema.py — ne pas modifier à la main.
// Validation à l'exécution de graine_du_jour.json avant tout usage par le moteur.
import { z } from "zod";

export const Anomalie = z.object({
  methode: z.enum(["mad_robuste", "seuil_direct", "historique_insuffisant"]),
  score: z.number().nullable(),
  seuil: z.number(),
  depasse: z.boolean(),
  sens: z.enum(["hausse", "baisse", "neutre"]),
  fenetre: z.number().int(),
  gravite: z.number().int().min(0).max(5),
}).strict();
export type Anomalie = z.infer<typeof Anomalie>;

export const Groupe = z.object({
  code: z.string(),
  libelle: z.string(),
  sieges: z.number().int().min(0),
  cohesion_30j: z.number().nullable(),
  scrutins_30j: z.number().int().min(0),
}).strict();
export type Groupe = z.infer<typeof Groupe>;

export const Chambre = z.object({
  code: z.enum(["AN", "SENAT"]),
  legislature: z.number().int().nullable(),
  sieges_total: z.number().int(),
  sieges_pourvus: z.number().int(),
  majorite_absolue: z.number().int(),
  seuil_censure: z.number().int().nullable(),
  groupes: z.array(Groupe),
  scrutins_7j: z.number().int(),
  maj_source: z.string().nullable(),
}).strict();
export type Chambre = z.infer<typeof Chambre>;

export const Couverture = z.object({
  pilotage_cablees: z.number().int(),
  bilan_cablees: z.number().int(),
  cible_sous_categories: z.number().int(),
  manquantes: z.array(z.string()),
}).strict();
export type Couverture = z.infer<typeof Couverture>;

export const Ministere = z.enum(["economie_finances", "travail_solidarites", "sante", "ecologie_energie", "transports_logement", "interieur", "justice", "education_esr", "agriculture", "armees", "europe_affaires_etrangeres", "culture_sports", "transversal"]);
export type Ministere = z.infer<typeof Ministere>;

export const Dossier = z.object({
  id: z.string(),
  slot: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  type: z.enum(["urgence_data", "institutionnel", "ministeriel"]),
  famille_anomalie: z.string(),
  ministere: Ministere,
  titre: z.string(),
  resume: z.string(),
  gravite: z.number().int().min(1).max(5),
  indicateurs: z.array(z.string()),
  faits: z.record(z.string(), z.number()),
  hausse_gravite_inaction: z.number(),
}).strict();
export type Dossier = z.infer<typeof Dossier>;

export const EstimationCabinet = z.object({
  valeur: z.number(),
  bas: z.number(),
  haut: z.number(),
  methode: z.enum(["persistance_amortie", "persistance"]),
  periodes_ecoulees: z.number().int(),
}).strict();
export type EstimationCabinet = z.infer<typeof EstimationCabinet>;

export const Point = z.object({
  d: z.string(),
  v: z.number(),
}).strict();
export type Point = z.infer<typeof Point>;

export const ProchainePublication = z.object({
  date: z.string().nullable(),
  estimee: z.boolean(),
}).strict();
export type ProchainePublication = z.infer<typeof ProchainePublication>;

export const Publication = z.object({
  periode: z.string(),
  d: z.string(),
  valeur: z.number(),
  publiee_le: z.string().nullable(),
}).strict();
export type Publication = z.infer<typeof Publication>;

export const Source = z.object({
  producteur: z.string(),
  jeu: z.string(),
  url: z.string(),
  licence: z.string(),
  officiel: z.boolean(),
}).strict();
export type Source = z.infer<typeof Source>;

export const StatutSource = z.enum(["vivante", "en_retard", "morte"]);
export type StatutSource = z.infer<typeof StatutSource>;

export const IndicateurBilan = z.object({
  id: z.string(),
  ministere: Ministere,
  sous_categorie: z.string(),
  libelle: z.string(),
  unite: z.string(),
  cadence: z.enum(["mensuelle", "trimestrielle", "annuelle"]),
  source: Source,
  statut_source: StatutSource,
  derniere: Publication.nullable(),
  precedente: Publication.nullable(),
  prochaine: ProchainePublication,
  estimation_cabinet: EstimationCabinet.nullable(),
  libelle_brouillard: z.string(),
  serie: z.array(Point).max(60),
}).strict();
export type IndicateurBilan = z.infer<typeof IndicateurBilan>;

export const IndicateurPilotage = z.object({
  id: z.string(),
  famille_anomalie: z.string(),
  ministere: Ministere,
  sous_categorie: z.string(),
  libelle: z.string(),
  unite: z.string(),
  cadence: z.enum(["quotidienne", "hebdomadaire"]),
  source: Source,
  statut_source: StatutSource,
  derniere_date: z.string().nullable(),
  derniere_valeur: z.number().nullable(),
  serie: z.array(Point).max(120),
  anomalie: Anomalie,
  composantes: z.record(z.string(), z.number()),
  notes: z.array(z.string()),
}).strict();
export type IndicateurPilotage = z.infer<typeof IndicateurPilotage>;

export const Jeton = z.object({
  nom: z.string(),
  usage: z.string(),
  configure: z.boolean(),
  expire_le: z.string().nullable(),
  jours_restants: z.number().int().nullable(),
  alerte_j30: z.boolean(),
}).strict();
export type Jeton = z.infer<typeof Jeton>;

export const Meta = z.object({
  generated_at: z.string(),
  date_jeu: z.string(),
  mode: z.enum(["quotidien", "horaire"]),
  revision: z.number().int().min(0),
  pipeline_version: z.string(),
  duree_s: z.number(),
  couverture: Couverture,
  alertes: z.array(z.string()),
}).strict();
export type Meta = z.infer<typeof Meta>;

export const Parlement = z.object({
  an: Chambre.nullable(),
  senat: Chambre.nullable(),
}).strict();
export type Parlement = z.infer<typeof Parlement>;

export const SanteSource = z.object({
  id: z.string(),
  libelle: z.string(),
  statut: StatutSource,
  http: z.number().int().nullable(),
  derniere_donnee: z.string().nullable(),
  age_jours: z.number().int().nullable(),
  tolerance_jours: z.number().int(),
  echecs_consecutifs: z.number().int(),
  verifie_le: z.string(),
  info: z.string(),
}).strict();
export type SanteSource = z.infer<typeof SanteSource>;

export const Substitution = z.object({
  id: z.string(),
  libelle: z.string(),
  valeur: z.number(),
  unite: z.string(),
  reference: z.string(),
  source_libelle: z.string(),
  source_url: z.string(),
  statut: z.enum(["verifie", "a_confirmer"]),
  note: z.string(),
}).strict();
export type Substitution = z.infer<typeof Substitution>;

export const Note = z.object({
  auteur: z.enum(["bercy", "social"]),
  titre: z.string(),
  texte: z.string(),
  mode: z.enum(["llm", "gabarit"]),
  modele: z.string().nullable(),
  rejets: z.array(z.string()),
}).strict();
export type Note = z.infer<typeof Note>;

export const Une = z.object({
  titre: z.string(),
  sous_titre: z.string(),
  bandeau_20h: z.array(z.string()).max(6),
}).strict();
export type Une = z.infer<typeof Une>;

export const Tour1 = z.object({
  date_jeu: z.string(),
  jour_calme: z.boolean(),
  dossiers: z.array(Dossier).max(3),
  notes: z.array(Note).max(2),
  une: Une,
}).strict();
export type Tour1 = z.infer<typeof Tour1>;

export const Graine = z.object({
  schema_version: z.literal("1.0.0"),
  meta: Meta,
  sources_health: z.array(SanteSource),
  jetons: z.array(Jeton),
  pilotage: z.array(IndicateurPilotage),
  bilan: z.array(IndicateurBilan),
  parlement: Parlement,
  substitutions: z.array(Substitution),
  tour1: Tour1,
}).strict();
export type Graine = z.infer<typeof Graine>;

export const SCHEMA_VERSION = "1.0.0" as const;

/** Valide une graine téléchargée ; lève une erreur détaillée si elle ne respecte pas le schéma. */
export function parseGraine(input: unknown): Graine {
  return Graine.parse(input);
}
