/**
 * « Archives de Crise » : scénarios jouables immédiatement hors ligne.
 *
 * Principe (aucune donnée historique inventée) : chaque scénario rejoue un choc DE MÊME NATURE qu'une crise
 * passée sur la situation RÉELLE de la graine embarquée (14 novembre 2026). L'accroche historique ne contient
 * que des faits sourcés, listés dans `faits` et vérifiés par les tests ; le choc injecté dans le moteur
 * (impulsions en unités d'écart, radicalisation des corps) est un paramètre de conception.
 *
 * Une véritable graine historique (valeurs de 2020 ou 2022 comme point de départ) suppose que le relais
 * reconstruise une graine datée à partir des archives des sources : ce n'est pas encore le cas.
 */
import type { CorpsId, Inertie, Ministere, SegmentId, Simulation } from "../../../engine/src/index";

export interface SourceHistorique {
  titre: string;
  url: string;
  statut: "primaire" | "secondaire";
}

export interface ScenarioArchive {
  id: string;
  titre: string;
  periode: string;
  /** Libellé de l'impulsion « evenement » (affiché dans les pastilles d'attribution) : sans nombre. */
  evenement: string;
  accroche: string;
  /** Chaque nombre et chaque date de l'accroche, avec sa source. */
  faits: Record<string, string>;
  sources: SourceHistorique[];
  seedBase: string;
  famille: string;
  ministere: Ministere;
  indicateurs: string[];
  gravite: number;
  choc: { u: Record<string, number>; inertie: Inertie };
  /** Radicalisation minimale imposée au jour 0 (au-delà de 75, le blocage démarre dès le premier jour). */
  corps?: Partial<Record<CorpsId, number>>;
  segments?: Partial<Record<SegmentId, number>>;
  options: string[];
}

export const SEED_EMBARQUEE = "embarquee:2026-11-14";

export const SCENARIOS: readonly ScenarioArchive[] = [
  {
    id: "confinement-2020",
    titre: "Archive de crise : confinement sanitaire",
    periode: "printemps 2020",
    evenement: "Confinement sanitaire national",
    accroche: "Le 17 mars 2020 à 12 h, la France entrait dans un confinement national, prolongé jusqu'au 11 mai 2020. Ce scénario rejoue un choc sanitaire de même nature sur la situation réelle du 14 novembre 2026.",
    faits: { debut: "17 mars 2020", heure: "12", fin: "11 mai 2020", graine: "14 novembre 2026" },
    sources: [{ titre: "Vie-publique.fr, questions sur le coronavirus et le Covid-19", url: "https://www.vie-publique.fr/questions-reponses/273959-questions-sur-le-coronavirus-et-le-covid-19", statut: "primaire" }],
    seedBase: SEED_EMBARQUEE, famille: "sante", ministere: "sante", indicateurs: ["SAN1"], gravite: 3.5,
    choc: {
      u: { SAN1: 3, SAN_M1: 3.5, MOB1: 3, MAC3: -3.5, MAC5: -3.5, URS1: -2.5, MAC2: 1.5, MAC4: -2.5, TRA2: -3, CUL_M1: -3.5, CUL_M2: -3.5, CUL_M3: -3.5, ENE1: -1.5 },
      inertie: { delaiLatence: 5, amplitudePic: 1, tauxErosion: 0.02 },
    },
    segments: { actifs_prive: -4, jeunes: -6 },
    options: ["plan_hopital", "plan_medicaments", "dialogue_social"],
  },
  {
    id: "choc-energetique-2022",
    titre: "Archive de crise : flambée des prix de l'énergie",
    periode: "hiver 2021-2022",
    evenement: "Flambée des prix de l'énergie",
    accroche: "Au 1er février 2022, la hausse moyenne des tarifs réglementés de l'électricité a été limitée à 4 % TTC par le bouclier tarifaire, selon la Commission de régulation de l'énergie. Ce scénario rejoue une flambée des prix de l'énergie sur la situation réelle du 14 novembre 2026.",
    faits: { date: "1er février 2022", hausse: "4 %", graine: "14 novembre 2026" },
    sources: [{ titre: "CRE, délibération n° 2022-198 du 7 juillet 2022 (tarifs réglementés de vente d'électricité)", url: "https://www.cre.fr/content/download/25801/file/220707_2022-198_TRVE_S2_2022.pdf", statut: "primaire" }],
    seedBase: SEED_EMBARQUEE, famille: "energie", ministere: "ecologie_energie", indicateurs: ["ENE4"], gravite: 3.5,
    choc: {
      u: { ENE4: 2.5, MAC1: 2, MAC4: -2, MAC3: -1.5, MAC5: -1.5, ENE2: -1.5 },
      inertie: { delaiLatence: 20, amplitudePic: 1, tauxErosion: 0.004 },
    },
    corps: { classes_moyennes: 62, patronat: 55 },
    options: ["cheque_energie", "baisse_ticpe", "liberation_aie"],
  },
  {
    id: "penurie-carburants-2022",
    titre: "Archive de crise : pénurie de carburants",
    periode: "octobre 2022",
    evenement: "Grève reconductible des raffineries",
    accroche: "Le 11 octobre 2022 au soir, les grèves dans les raffineries privaient 31,3 % des stations-service d'au moins un carburant, selon le ministère de la Transition énergétique. Ce scénario rejoue une grève reconductible des raffineries sur la situation réelle du 14 novembre 2026.",
    faits: { date: "11 octobre 2022", part: "31,3 %", graine: "14 novembre 2026" },
    sources: [
      { titre: "Ma Commune Info (dépêche AFP du 12 octobre 2022), chiffre du ministère de la Transition énergétique", url: "https://www.macommune.info/carburants-les-penuries-continuent-le-gouvernement-requisitionne-le-personnel-greviste", statut: "secondaire" },
      { titre: "Assemblée nationale, question écrite n° 2255 (XVIe législature) sur la pénurie de carburant", url: "https://www.assemblee-nationale.fr/dyn/16/questions/QANR5L16QE2255.pdf", statut: "primaire" },
    ],
    seedBase: SEED_EMBARQUEE, famille: "energie", ministere: "ecologie_energie", indicateurs: ["ENE4"], gravite: 3.5,
    choc: { u: { ENE4: 2, MOB1: 2.5, MAC5: -1 }, inertie: { delaiLatence: 3, amplitudePic: 1, tauxErosion: 0.05 } },
    corps: { syndicats_contestataires: 78 },
    options: ["liberation_aie", "dialogue_social", "baisse_ticpe"],
  },
  {
    id: "tempetes-1999",
    titre: "Archive de crise : tempêtes de fin d'année",
    periode: "décembre 1999",
    evenement: "Tempêtes de fin d'année",
    accroche: "Fin décembre 1999, les tempêtes Lothar et Martin ont fait 92 morts en France ; au plus fort de la crise, le 28 décembre, 3 450 000 foyers étaient privés d'électricité. Les sinistres assurés ont atteint 7 Md€. Ce scénario rejoue un épisode de même nature sur la situation réelle du 14 novembre 2026.",
    faits: { annee: "1999", morts: "92", date: "28 décembre", foyers: "3 450 000", sinistres: "7 Md€", graine: "14 novembre 2026" },
    sources: [
      { titre: "Maire-info, 2 janvier 2002 (bilan EDF des tempêtes de 1999)", url: "https://www.maire-info.com/edf-s%27est-fixe-l%27objectif-de-pouvoir-depanner-95-des-clients-en-moins-de-cinq-jours-d%27ici-2015-avec-l%27espoir-de-le-faire-d%27ici-2005--article2-1366", statut: "secondaire" },
      { titre: "Responsabilité & Environnement (Annales des Mines), 2002 : les tempêtes de 1999 vues par les assureurs (FFSA)", url: "https://www.annales.org/ri/2002/425/075-78.pdf", statut: "primaire" },
    ],
    seedBase: SEED_EMBARQUEE, famille: "meteo", ministere: "interieur", indicateurs: ["MET1"], gravite: 3.5,
    choc: { u: { MET1: 4, MOB1: 3, ENE1: -2, MAC5: -1, AGR_M1: -1.5, LOG_M1: -1 }, inertie: { delaiLatence: 1, amplitudePic: 1, tauxErosion: 0.08 } },
    corps: { collectivites: 55 },
    options: ["soutien_agriculteurs", "plan_logement", "dialogue_social"],
  },
];

export function scenario(id: string): ScenarioArchive {
  const s = SCENARIOS.find((x) => x.id === id);
  if (!s) throw new Error(`scénario inconnu : ${id}`);
  return s;
}

/** Applique le choc initial au jour 0 d'une simulation neuve. */
export function appliquerScenario(sim: Simulation, s: ScenarioArchive): void {
  if (sim.jour !== 0) throw new Error("un scénario ne s'applique qu'au jour 0");
  sim.macro.ajouter(`scenario-${s.id}`, s.evenement, "evenement", 0, s.choc.u, s.choc.inertie);
  for (const [id, v] of Object.entries(s.corps ?? {})) {
    const c = sim.acteurs.corps.find((x) => x.id === id);
    if (c && v !== undefined) c.radicalisation = Math.max(c.radicalisation, v);
  }
  sim.acteurs.appliquerEffets(undefined, s.segments);
  sim.dossiers.ajouter({
    slot: 1, source: "graine", famille: s.famille, ministere: s.ministere, titre: s.titre, resume: s.accroche,
    gravite: s.gravite, creeLe: 0, indicateurs: s.indicateurs, options: s.options, reference: `scenario:${s.id}`,
  });
  sim.parapheurCourant = sim.dossiers.parapheur(0);
}
