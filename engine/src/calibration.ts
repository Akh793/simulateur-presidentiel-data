/**
 * Montants annuels qui calibrent l'ordonnanceur comptable. Chaque valeur porte sa source ;
 * `statut` = "verifie" (lu dans la source), "infere" (calculé à partir de sources), "a_confirmer".
 * Montants en euros entiers. À réviser une fois par an (exécution budgétaire, LFSS, programme AFT).
 */

export interface Montant {
  valeur: number;
  unite: "€" | "Mt" | "places" | "%" | "ans";
  reference: string;
  source: string;
  statut: "verifie" | "infere" | "a_confirmer";
}

const DGFIP_2025 = "DGFiP, situations mensuelles budgétaires, séries longues, colonne 31/12/2025 (data.economie.gouv.fr)";

export const ETAT = {
  // recettes nettes du budget général 2025
  tva: { valeur: 98_067_165_507, unite: "€", reference: "2025", source: DGFIP_2025, statut: "verifie" },
  impotRevenu: { valeur: 94_943_503_973, unite: "€", reference: "2025", source: DGFIP_2025, statut: "verifie" },
  impotSocietes: { valeur: 59_917_571_412, unite: "€", reference: "2025", source: DGFIP_2025, statut: "verifie" },
  ticpe: { valeur: 16_276_657_083, unite: "€", reference: "2025", source: DGFIP_2025, statut: "verifie" },
  autresFiscales: { valeur: 87_193_027_535, unite: "€", reference: "2025", source: DGFIP_2025, statut: "verifie" },
  nonFiscales: { valeur: 23_991_731_874, unite: "€", reference: "2025", source: DGFIP_2025, statut: "verifie" },
  // dépenses 2025
  personnel: { valeur: 156_182_829_226, unite: "€", reference: "2025", source: `${DGFIP_2025} — agents de l'État uniquement`, statut: "verifie" },
  fonctionnement: { valeur: 70_074_042_700, unite: "€", reference: "2025", source: DGFIP_2025, statut: "verifie" },
  intervention: { valeur: 138_996_007_926, unite: "€", reference: "2025", source: DGFIP_2025, statut: "verifie" },
  investissement: { valeur: 22_194_569_750, unite: "€", reference: "2025", source: DGFIP_2025, statut: "verifie" },
  chargeDette: { valeur: 51_583_057_726, unite: "€", reference: "2025", source: DGFIP_2025, statut: "verifie" },
  psrCollectivites: { valeur: 46_074_157_228, unite: "€", reference: "2025", source: DGFIP_2025, statut: "verifie" },
  psrUnionEuropeenne: { valeur: 22_961_730_323, unite: "€", reference: "2025", source: DGFIP_2025, statut: "verifie" },
  dgf: { valeur: 27_400_000_000, unite: "€", reference: "2026", source: "DGCL, Guide pratique de la DGF 2026 (versée par douzièmes)", statut: "verifie" },
  // dette et financement
  programmeAft: { valeur: 310_000_000_000, unite: "€", reference: "2026", source: "AFT, programme de financement 2026 (émissions MLT nettes des rachats)", statut: "verifie" },
  detteNegociable: { valeur: 2_882_000_000_000, unite: "€", reference: "fin juillet 2026", source: "AFT, bulletin mensuel n° 435 (lu par résumé, à vérifier sur le PDF)", statut: "a_confirmer" },
  btf: { valeur: 220_000_000_000, unite: "€", reference: "fin juillet 2026", source: "AFT, bulletin mensuel n° 435 (lu par résumé, à vérifier sur le PDF)", statut: "a_confirmer" },
  dureeVieEmission: { valeur: 8.5, unite: "ans", reference: "2025", source: "AFT, rapport annuel 2025 : 8 ans et 184 jours à l'émission", statut: "verifie" },
} satisfies Record<string, Montant>;

export const SOCIAL = {
  pensionsBase: { valeur: 297_800_000_000, unite: "€", reference: "2025", source: "Commission des comptes de la Sécurité sociale, via AFP/Moneyvox : pensions des régimes de base", statut: "verifie" },
  prestationsCnaf: { valeur: 96_500_000_000, unite: "€", reference: "2025", source: "Assemblée nationale, rapport d'information n° 2994 (Cnaf)", statut: "verifie" },
  ondam: { valeur: 265_900_000_000, unite: "€", reference: "2025", source: "PLFSS 2026, ONDAM 2025 maintenu à 265,9 Md€", statut: "verifie" },
  deficitSecu2026: { valeur: 21_800_000_000, unite: "€", reference: "2026", source: "Sénat, rapport sur le PLFSS 2027 : déficit 2026 de 21,8 Md€", statut: "verifie" },
  detteAcossFin2026: { valeur: 82_300_000_000, unite: "€", reference: "fin 2026 (prévision)", source: "Sénat, rapport pour avis sur le PLACSS 2025", statut: "infere" },
  plafondAcoss2026: { valeur: 83_000_000_000, unite: "€", reference: "2026", source: "Assemblée nationale, commission des finances (PLFSS 2026) ; graine, substitution SUB_ACOSS_PLAFOND", statut: "a_confirmer" },
  plafondAcoss2027: { valeur: 85_000_000_000, unite: "€", reference: "2027", source: "Sénat, rapport sur le PLFSS 2027", statut: "a_confirmer" },
  depensesUnedic: { valeur: 46_600_000_000, unite: "€", reference: "2026", source: "Unédic, prévisions financières d'octobre 2026", statut: "verifie" },
  recettesUnedic: { valeur: 44_300_000_000, unite: "€", reference: "2026", source: "Unédic, prévisions financières, via Fondation iFRAP (octobre 2026)", statut: "verifie" },
} satisfies Record<string, Montant>;

/** Encaissements Urssaf pour les branches couvertes (inféré : dépenses modélisées - déficit 2026). */
export const ENCAISSEMENTS_ACOSS: Montant = {
  valeur: SOCIAL.pensionsBase.valeur + SOCIAL.prestationsCnaf.valeur + SOCIAL.ondam.valeur - SOCIAL.deficitSecu2026.valeur,
  unite: "€", reference: "2026", statut: "infere",
  source: "Inféré : pensions de base + prestations Cnaf + ONDAM - déficit 2026 ; périmètre approché des régimes obligatoires de base",
};

export const PHYSIQUE = {
  petroleStrategique: { valeur: 14.5, unite: "Mt", reference: "2026", source: "UFIP Énergies et Mobilités 2026 ; graine, substitution SUB_PETROLE", statut: "verifie" },
  /** environ 3 mois de consommation selon la même source, soit 14,5 / 91 Mt par jour (inféré) */
  consommationPetroleJour: { valeur: 14.5 / 91, unite: "Mt", reference: "2026", source: "Inféré : 14,5 Mt = environ 3 mois de consommation (UFIP)", statut: "infere" },
  placesHebergement: { valeur: 218_200, unite: "places", reference: "début 2021", source: "DREES, Dossiers n° 113 ; graine, substitution SUB_HEBERGEMENT", statut: "a_confirmer" },
} satisfies Record<string, Montant>;

/** Taux apparent initial de la dette négociable (inféré) : charge 2025 / encours. */
export const TAUX_APPARENT_INITIAL = ETAT.chargeDette.valeur / ETAT.detteNegociable.valeur;
