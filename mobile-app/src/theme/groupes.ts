import { melange, P } from "./palette";

/**
 * Couleurs des 12 groupes de l'Assemblée, toutes dérivées de la palette (pas de couleurs de marque des partis).
 * Ordre de placement gauche → droite de l'hémicycle selon la disposition des groupes en séance.
 */
export const ORDRE_HEMICYCLE = ["LFI-NFP", "GDR", "ECOS", "SOC", "LIOT", "DEM", "EPR", "HOR", "DR", "UDR", "RN", "NI"] as const;

export const COULEURS_GROUPES: Record<string, string> = {
  "LFI-NFP": melange(P.rouge, P.nuit, 0.35),
  GDR: melange(P.rouge, P.nuit, 0.15),
  ECOS: melange(P.rouge, P.or, 0.45),
  SOC: P.rouge,
  LIOT: melange(P.or, P.papier, 0.35),
  DEM: P.or,
  EPR: melange(P.or, P.cobalt, 0.45),
  HOR: melange(P.cobalt, P.papier, 0.35),
  DR: P.cobalt,
  UDR: melange(P.cobalt, P.nuit, 0.45),
  RN: melange(P.nuit, P.papier, 0.38),
  NI: melange(P.ardoise, P.papier, 0.55),
};

export const couleurGroupe = (code: string) => COULEURS_GROUPES[code.toUpperCase()] ?? P.ardoise;
