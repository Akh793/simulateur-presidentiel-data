/**
 * Gabarits de décisions (étape 2). Tous les coûts sont DÉTERMINISTES : impulsions en unités d'écart
 * des indicateurs, effets budgétaires exprimés en pourcentage d'un flux calibré (jamais un montant inventé).
 * Ce sont des paramètres de conception, à équilibrer en jeu ; la narration (étape 3) ne fait que les décrire.
 */
import type { CorpsId, SegmentId } from "./acteurs";
import type { FluxId } from "./flux";
import type { Inertie } from "./macro";
import type { Boussole, Ministere } from "./types";

export type Instrument = "decret" | "executif" | "loi" | "plfr" | "plfssr";

export interface EffetFlux {
  flux: FluxId;
  facteur: number;
  dureeJours?: number;
}

export interface Gabarit {
  id: string;
  libelle: string;
  famille: string;
  ministere: Ministere;
  instrument: Instrument;
  u: Record<string, number>;
  inertie: Inertie;
  coutCP: number;
  flux?: EffetFlux[];
  corps?: Partial<Record<CorpsId, number>>;
  segments?: Partial<Record<SegmentId, number>>;
  boussole: Boussole;
  credibilite?: number;
  aieMt?: number;
  capaciteHebergement?: number;
  plafondAcoss?: number;
  radicalisationCorps?: number;
}

const rapide: Inertie = { delaiLatence: 7, amplitudePic: 1, tauxErosion: 0.01 };
const moyen: Inertie = { delaiLatence: 90, amplitudePic: 1, tauxErosion: 0.002 };
const reforme: Inertie = { delaiLatence: 365, amplitudePic: 1, tauxErosion: 0 };

export const GABARITS: readonly Gabarit[] = [
  { id: "baisse_ticpe", libelle: "Baisse de 15 % des accises sur les carburants pendant un an", famille: "energie", ministere: "ecologie_energie", instrument: "plfr",
    u: { ENE4: -2.5, MAC1: -0.4, MAC4: 0.6 }, inertie: rapide, coutCP: 8, flux: [{ flux: "ticpe", facteur: 0.85, dureeJours: 365 }],
    corps: { monde_agricole: 8, patronat: 4, associatif_ecolo: -12 }, segments: { rural: 8, actifs_prive: 4 },
    boussole: { economique: 0.3, social: 0, autorite: 0, europe: -0.1 } },
  { id: "cheque_energie", libelle: "Chèque énergie exceptionnel pour les ménages modestes", famille: "energie", ministere: "ecologie_energie", instrument: "decret",
    u: { MAC4: 0.5 }, inertie: rapide, coutCP: 5, flux: [{ flux: "intervention", facteur: 1.01, dureeJours: 180 }],
    segments: { retraites: 5, rural: 5 }, boussole: { economique: -0.3, social: 0.1, autorite: 0, europe: 0 } },
  { id: "liberation_aie", libelle: "Déblocage coordonné de 1 Mt de stocks stratégiques (AIE)", famille: "energie", ministere: "ecologie_energie", instrument: "executif",
    u: { ENE4: -1.5 }, inertie: { delaiLatence: 5, amplitudePic: 1, tauxErosion: 0.03 }, coutCP: 4, aieMt: 1,
    boussole: { economique: 0, social: 0, autorite: 0, europe: 0.2 } },
  { id: "revalorisation_pensions", libelle: "Revalorisation des pensions de 1 %", famille: "social", ministere: "travail_solidarites", instrument: "plfssr",
    u: { MAC4: 0.4 }, inertie: moyen, coutCP: 6, flux: [{ flux: "pensions", facteur: 1.01 }],
    corps: { syndicats_reformistes: 5 }, segments: { retraites: 12 }, boussole: { economique: -0.3, social: 0, autorite: 0, europe: 0 } },
  { id: "hausse_csg", libelle: "Hausse de la CSG (+2 % des encaissements Urssaf)", famille: "social", ministere: "travail_solidarites", instrument: "plfssr",
    u: { MAC4: -0.6 }, inertie: moyen, coutCP: 9, flux: [{ flux: "urssaf", facteur: 1.02 }], credibilite: 4,
    segments: { retraites: -8, actifs_prive: -5, cadres_independants: -4 }, boussole: { economique: -0.2, social: 0, autorite: 0, europe: 0 } },
  { id: "reforme_assurance_chomage", libelle: "Durcissement des règles d'assurance chômage", famille: "emploi", ministere: "travail_solidarites", instrument: "decret",
    u: { MAC2: -0.3, TRA2: 0.3 }, inertie: { delaiLatence: 180, amplitudePic: 1, tauxErosion: 0 }, coutCP: 10, flux: [{ flux: "chomage", facteur: 0.95 }],
    corps: { syndicats_reformistes: -12, syndicats_contestataires: -15, patronat: 8 }, segments: { actifs_prive: -4, jeunes: -6 },
    boussole: { economique: 0.5, social: -0.1, autorite: 0.1, europe: 0 } },
  { id: "gel_point_indice", libelle: "Gel du point d'indice des agents de l'État", famille: "budget", ministere: "economie_finances", instrument: "decret",
    u: { EDU_M1: 0.5 }, inertie: moyen, coutCP: 7, flux: [{ flux: "personnel", facteur: 0.99 }], credibilite: 3,
    corps: { syndicats_contestataires: -10, haute_fonction_publique: -5 }, segments: { fonctionnaires: -12 },
    boussole: { economique: 0.4, social: 0, autorite: 0, europe: 0 } },
  { id: "hausse_point_indice", libelle: "Revalorisation de 1,5 % du point d'indice", famille: "budget", ministere: "economie_finances", instrument: "decret",
    u: { EDU_M1: -0.8, MAC4: 0.2 }, inertie: moyen, coutCP: 6, flux: [{ flux: "personnel", facteur: 1.015 }],
    corps: { syndicats_reformistes: 6, haute_fonction_publique: 4 }, segments: { fonctionnaires: 10 },
    boussole: { economique: -0.3, social: 0, autorite: 0, europe: 0 } },
  { id: "austerite_depenses", libelle: "Plan d'économies sur le fonctionnement et les interventions", famille: "budget", ministere: "economie_finances", instrument: "plfr",
    u: { MAC3: -0.3, MAC4: -0.4, FIN1: -0.3 }, inertie: moyen, coutCP: 12,
    flux: [{ flux: "fonctionnement", facteur: 0.97 }, { flux: "intervention", facteur: 0.98 }], credibilite: 8,
    corps: { haute_fonction_publique: -8, collectivites: -6, associatif_ecolo: -8 }, segments: { fonctionnaires: -6, retraites: -3 },
    boussole: { economique: 0.5, social: 0, autorite: 0, europe: 0.1 } },
  { id: "baisse_impots_production", libelle: "Baisse des impôts de production", famille: "conjoncture", ministere: "economie_finances", instrument: "plfr",
    u: { MAC5: 0.8, MAC3: 0.6 }, inertie: reforme, coutCP: 8, flux: [{ flux: "autres_recettes", facteur: 0.99 }],
    corps: { patronat: 12, syndicats_contestataires: -6 }, segments: { cadres_independants: 5 },
    boussole: { economique: 0.6, social: 0, autorite: 0, europe: 0 } },
  { id: "hausse_is", libelle: "Surtaxe d'impôt sur les sociétés des grandes entreprises", famille: "conjoncture", ministere: "economie_finances", instrument: "plfr",
    u: { MAC3: -0.6 }, inertie: moyen, coutCP: 7, flux: [{ flux: "impot_societes", facteur: 1.08, dureeJours: 730 }], credibilite: 3,
    corps: { patronat: -15, classes_moyennes: 3 }, segments: { actifs_prive: 3 }, boussole: { economique: -0.6, social: 0.1, autorite: 0, europe: 0 } },
  { id: "plan_hopital", libelle: "Plan d'urgence pour l'hôpital (+1 % d'ONDAM)", famille: "sante", ministere: "sante", instrument: "plfssr",
    u: { SAN_M1: -1.5, SAN1: -0.2 }, inertie: { delaiLatence: 120, amplitudePic: 1, tauxErosion: 0.001 }, coutCP: 7, flux: [{ flux: "ondam", facteur: 1.01 }],
    corps: { syndicats_reformistes: 5 }, segments: { retraites: 4, actifs_prive: 2, fonctionnaires: 3 },
    boussole: { economique: -0.3, social: 0.1, autorite: 0, europe: 0 } },
  { id: "plan_medicaments", libelle: "Relocalisation et stocks de sécurité de médicaments", famille: "sante", ministere: "sante", instrument: "decret",
    u: { SAN3: -1.2 }, inertie: { delaiLatence: 200, amplitudePic: 1, tauxErosion: 0 }, coutCP: 5, flux: [{ flux: "intervention", facteur: 1.002 }],
    corps: { patronat: 3 }, boussole: { economique: -0.2, social: 0, autorite: 0, europe: -0.2 } },
  { id: "plan_urgence_115", libelle: "Ouverture de places d'hébergement d'urgence (+5 %)", famille: "hebergement", ministere: "transports_logement", instrument: "executif",
    u: {}, inertie: rapide, coutCP: 4, capaciteHebergement: 0.05, flux: [{ flux: "intervention", facteur: 1.002, dureeJours: 180 }],
    corps: { associatif_ecolo: 10 }, boussole: { economique: -0.2, social: 0.4, autorite: 0, europe: 0 } },
  { id: "plan_logement", libelle: "Plan de relance de la construction de logements", famille: "logement", ministere: "transports_logement", instrument: "loi",
    u: { LOG_M1: 1.2, LOG_M2: -0.6, MAC5: 0.2 }, inertie: reforme, coutCP: 8, flux: [{ flux: "investissement", facteur: 1.02, dureeJours: 1095 }],
    corps: { collectivites: 6, patronat: 4 }, segments: { jeunes: 6 }, boussole: { economique: -0.2, social: 0.2, autorite: 0, europe: 0 } },
  { id: "renforts_police", libelle: "Renforts de forces de l'ordre dans les quartiers", famille: "securite", ministere: "interieur", instrument: "decret",
    u: { INT_M1: -0.8, INT_M3: -0.3 }, inertie: { delaiLatence: 180, amplitudePic: 1, tauxErosion: 0.001 }, coutCP: 6, flux: [{ flux: "fonctionnement", facteur: 1.003 }],
    corps: { associatif_ecolo: -4, classes_moyennes: 4 }, segments: { rural: 3, retraites: 4 }, boussole: { economique: 0, social: -0.1, autorite: 0.6, europe: 0 } },
  { id: "loi_asile", libelle: "Loi d'accélération du traitement des demandes d'asile", famille: "asile", ministere: "interieur", instrument: "loi",
    u: { INT_M2: -1.0 }, inertie: { delaiLatence: 240, amplitudePic: 1, tauxErosion: 0 }, coutCP: 10,
    corps: { associatif_ecolo: -15 }, segments: { rural: 4, jeunes: -5 }, boussole: { economique: 0, social: -0.4, autorite: 0.5, europe: -0.3 } },
  { id: "regularisation_metiers_tension", libelle: "Titres de séjour pour les métiers en tension", famille: "asile", ministere: "interieur", instrument: "decret",
    u: { INT_M2: -0.4, TRA2: 0.2 }, inertie: moyen, coutCP: 7, corps: { patronat: 4, associatif_ecolo: 6 }, segments: { rural: -3 },
    boussole: { economique: 0.2, social: 0.4, autorite: -0.2, europe: 0.2 } },
  { id: "programmation_justice", libelle: "Loi de programmation de la justice", famille: "justice", ministere: "justice", instrument: "loi",
    u: { JUS_M1: -1.2, JUS2: -0.4 }, inertie: reforme, coutCP: 8, flux: [{ flux: "fonctionnement", facteur: 1.002 }],
    corps: { haute_fonction_publique: 5 }, boussole: { economique: -0.1, social: 0.1, autorite: 0.2, europe: 0 } },
  { id: "recrutement_enseignants", libelle: "Plan de recrutement d'enseignants", famille: "education", ministere: "education_esr", instrument: "plfr",
    u: { EDU_M1: -1.5, EDU_M3: -0.6 }, inertie: { delaiLatence: 300, amplitudePic: 1, tauxErosion: 0 }, coutCP: 7, flux: [{ flux: "personnel", facteur: 1.004 }],
    corps: { syndicats_reformistes: 4 }, segments: { fonctionnaires: 6, jeunes: 4 }, boussole: { economique: -0.3, social: 0.2, autorite: 0, europe: 0 } },
  { id: "soutien_agriculteurs", libelle: "Aides d'urgence aux exploitations agricoles", famille: "agriculture", ministere: "agriculture", instrument: "decret",
    u: { AGR_M2: 1.2 }, inertie: rapide, coutCP: 5, flux: [{ flux: "intervention", facteur: 1.003, dureeJours: 180 }],
    corps: { monde_agricole: 15, associatif_ecolo: -5 }, segments: { rural: 8 }, boussole: { economique: -0.3, social: -0.1, autorite: 0, europe: -0.1 } },
  { id: "plan_secheresse", libelle: "Restrictions d'usage de l'eau et plan sécheresse", famille: "eau", ministere: "agriculture", instrument: "decret",
    u: { AGR_M1: 0.3, EAU1: 0.2 }, inertie: { delaiLatence: 30, amplitudePic: 1, tauxErosion: 0.005 }, coutCP: 5,
    corps: { associatif_ecolo: 6, monde_agricole: -6 }, boussole: { economique: -0.1, social: 0, autorite: 0.2, europe: 0 } },
  { id: "programmation_militaire", libelle: "Actualisation de la loi de programmation militaire", famille: "defense", ministere: "armees", instrument: "loi",
    u: { ARM_M1: 1.0, ARM_M2: 1.2 }, inertie: { delaiLatence: 500, amplitudePic: 1, tauxErosion: 0 }, coutCP: 8, flux: [{ flux: "investissement", facteur: 1.01 }],
    corps: { patronat: 3 }, boussole: { economique: 0, social: 0, autorite: 0.3, europe: 0.1 } },
  { id: "retrait_opex", libelle: "Réduction du format d'une opération extérieure", famille: "defense", ministere: "armees", instrument: "executif",
    u: { ARM_M3: -1.5 }, inertie: moyen, coutCP: 6, flux: [{ flux: "fonctionnement", facteur: 0.998 }],
    boussole: { economique: 0, social: 0, autorite: -0.1, europe: -0.2 } },
  { id: "negociation_ue", libelle: "Renégociation de la contribution au budget européen", famille: "europe", ministere: "europe_affaires_etrangeres", instrument: "executif",
    u: { EUR_M1: -1.0, EUR_M2: -0.3 }, inertie: { delaiLatence: 180, amplitudePic: 1, tauxErosion: 0 }, coutCP: 9, flux: [{ flux: "psr_ue", facteur: 0.98 }],
    boussole: { economique: 0, social: 0, autorite: 0, europe: -0.3 } },
  { id: "plan_culture_tourisme", libelle: "Plan de soutien à la culture et au tourisme", famille: "culture", ministere: "culture_sports", instrument: "decret",
    u: { CUL_M1: 0.8, CUL_M2: 0.6, CUL_M3: 0.8, CUL_M4: 0.4 }, inertie: moyen, coutCP: 4, flux: [{ flux: "intervention", facteur: 1.001, dureeJours: 365 }],
    corps: { associatif_ecolo: 3, collectivites: 3 }, boussole: { economique: -0.2, social: 0.2, autorite: 0, europe: 0.1 } },
  { id: "dialogue_social", libelle: "Conférence sociale et dialogue avec les corps intermédiaires", famille: "dialogue", ministere: "travail_solidarites", instrument: "executif",
    u: {}, inertie: rapide, coutCP: 5, radicalisationCorps: -10,
    corps: { syndicats_reformistes: 6, syndicats_contestataires: 3, patronat: 2, monde_agricole: 2, collectivites: 2, associatif_ecolo: 2 },
    boussole: { economique: 0, social: 0, autorite: -0.1, europe: 0 } },
  { id: "plan_intemperies", libelle: "Plan d'urgence intempéries et cellule interministérielle de crise", famille: "meteo", ministere: "interieur", instrument: "executif",
    u: { SAN_M1: -0.3, MOB1: -0.5, INT_M3: -0.3 }, inertie: rapide, coutCP: 4, flux: [{ flux: "intervention", facteur: 1.002, dureeJours: 90 }],
    corps: { collectivites: 6 }, segments: { rural: 3, retraites: 2 }, boussole: { economique: 0, social: 0, autorite: 0.1, europe: 0 } },
  { id: "moratoire_normes", libelle: "Moratoire sur les normes nouvelles et priorité aux décrets d'application", famille: "normes", ministere: "justice", instrument: "decret",
    u: { JUS3: 1.0, JUS1: -0.8, MAC3: 0.2 }, inertie: moyen, coutCP: 5,
    corps: { patronat: 5, collectivites: 4, haute_fonction_publique: -3 }, boussole: { economique: 0.2, social: 0, autorite: 0, europe: 0 } },
  { id: "plan_ferroviaire", libelle: "Plan d'urgence pour la régularité ferroviaire", famille: "mobilite", ministere: "transports_logement", instrument: "plfr",
    u: { MOB1: -1.5, MAC5: 0.2 }, inertie: moyen, coutCP: 7, flux: [{ flux: "investissement", facteur: 1.03 }],
    corps: { syndicats_reformistes: 3 }, segments: { actifs_prive: 4, rural: 3 }, boussole: { economique: -0.2, social: 0, autorite: 0, europe: 0 } },
  { id: "relevement_plafond_acoss", libelle: "Relèvement d'urgence du plafond d'emprunt de l'Acoss (+10 Md€)", famille: "budget", ministere: "economie_finances", instrument: "decret",
    u: {}, inertie: rapide, coutCP: 10, plafondAcoss: 10_000_000_000, credibilite: -5,
    boussole: { economique: 0, social: 0, autorite: 0, europe: 0 } },
];

export const GABARITS_PAR_ID: ReadonlyMap<string, Gabarit> = new Map(GABARITS.map((g) => [g.id, g]));

export function gabarit(id: string): Gabarit {
  const g = GABARITS_PAR_ID.get(id);
  if (!g) throw new Error(`gabarit inconnu : ${id}`);
  return g;
}
