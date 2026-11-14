/**
 * Acteurs : 6 segments d'opinion, 8 corps intermédiaires, 12 ministres « fusibles ».
 * Pondérations, sensibilités et valeurs initiales = PARAMÈTRES DE CONCEPTION (aucune donnée de sondage).
 * Les ministres sont fictifs : noms générés, aucune personnalité réelle n'est représentée.
 */
import { CATALOGUE, idx } from "./indicateurs";
import type { Rng } from "./rng";
import { MINISTERES, type Ministere } from "./types";

export type SegmentId = "actifs_prive" | "cadres_independants" | "fonctionnaires" | "retraites" | "jeunes" | "rural";
export type CorpsId =
  | "patronat" | "syndicats_reformistes" | "syndicats_contestataires" | "monde_agricole"
  | "haute_fonction_publique" | "collectivites" | "associatif_ecolo" | "classes_moyennes";

export interface Segment {
  id: SegmentId;
  libelle: string;
  poids: number;          // part dans l'opinion globale (somme = 1)
  approbation: number;    // -100 … 100
  sensibilites: Record<string, number>; // indicateur -> poids (multiplié par sens x écart)
}

export interface Corps {
  id: CorpsId;
  libelle: string;
  influence: number;      // 0 … 100
  approbation: number;    // -100 … 100
  radicalisation: number; // 0 … 100
  sensibilites: Record<string, number>;
  /** Indicateurs frappés en cas de blocage (unités d'écart) et part de TVA amputée. */
  blocage: { u: Record<string, number>; tva: number; apportsPetrole: number; libelle: string };
  bloqueJusqua: number | null;
}

export interface Ministre {
  ministere: Ministere;
  nom: string;
  competence: number;   // 0 … 100
  loyaute: number;      // 0 … 100
  popularite: number;   // 0 … 100
  tension: number;      // 0 … 100, remise à zéro par un remaniement
  enPosteDepuis: number;
  groupePivot: string | null;
}

export const SEUIL_BLOCAGE = 75;

const SEGMENTS_DEF: [SegmentId, string, number, Record<string, number>][] = [
  ["actifs_prive", "Actifs du privé", 0.3, { MAC2: 1.2, MAC1: 0.8, ENE4: 0.6, MAC4: 0.6, MOB1: 0.3 }],
  ["cadres_independants", "Cadres et indépendants", 0.14, { MAC3: 0.9, FIN1: 0.5, MAC5: 0.5, MAC1: 0.4 }],
  ["fonctionnaires", "Fonctionnaires", 0.12, { EDU_M1: 0.8, SAN_M1: 0.6, MAC1: 0.6, JUS_M1: 0.3 }],
  ["retraites", "Retraités", 0.26, { MAC1: 1.2, SAN_M1: 0.7, INT_M1: 0.5, SAN3: 0.4 }],
  ["jeunes", "Jeunes et étudiants", 0.08, { MAC2: 1.0, LOG_M2: 0.8, EDU_M3: 0.5, CUL_M1: 0.2 }],
  ["rural", "Monde rural et périurbain", 0.1, { ENE4: 1.2, MOB1: 0.4, AGR_M2: 0.6, SAN_M1: 0.4 }],
];

export const CORPS_DEF: [CorpsId, string, number, Record<string, number>, Corps["blocage"]][] = [
  ["patronat", "Patronat", 70, { MAC3: 1, MAC5: 0.8, FIN1: 0.4 }, { u: { MAC5: -1.0, MAC3: -0.8 }, tva: 0.01, apportsPetrole: 1, libelle: "Grève de l'investissement" }],
  ["syndicats_reformistes", "Syndicats réformistes", 55, { MAC2: 1, MAC1: 0.6, SAN_M1: 0.4 }, { u: { MAC5: -0.8, MOB1: 1.2 }, tva: 0.02, apportsPetrole: 1, libelle: "Journées de grève interprofessionnelles" }],
  ["syndicats_contestataires", "Syndicats contestataires", 50, { MAC2: 1, MAC1: 0.8, EDU_M1: 0.3 }, { u: { MAC5: -1.5, MOB1: 2.5, ENE4: 1.5 }, tva: 0.04, apportsPetrole: 0.6, libelle: "Grèves reconductibles des transports et des raffineries" }],
  ["monde_agricole", "Monde agricole", 45, { AGR_M2: 1.2, ENE4: 0.8, EAU1: 0.4 }, { u: { MOB1: 1.0, MAC5: -0.4 }, tva: 0.01, apportsPetrole: 0.9, libelle: "Barrages routiers agricoles" }],
  ["haute_fonction_publique", "Haute fonction publique", 40, { JUS_M1: 0.5, EDU_M1: 0.5, SAN_M1: 0.5 }, { u: { JUS3: -1.0, JUS_M1: 1.0 }, tva: 0, apportsPetrole: 1, libelle: "Inertie administrative" }],
  ["collectivites", "Collectivités locales", 50, { LOG_M1: 0.6, INT_M1: 0.4, CUL_M2: 0.3 }, { u: { LOG_M1: -1.0, CUL_M3: -0.8 }, tva: 0.005, apportsPetrole: 1, libelle: "Fronde des élus locaux" }],
  ["associatif_ecolo", "Monde associatif et écologiste", 35, { EAU1: 0.6, MET2: 0.3, LOG_M3: 0.8 }, { u: { INT_M3: 1.5, MOB1: 0.6 }, tva: 0.005, apportsPetrole: 1, libelle: "Mobilisations et occupations de sites" }],
  ["classes_moyennes", "Classes moyennes", 60, { MAC1: 1, MAC4: 0.8, ENE4: 0.6 }, { u: { MOB1: 1.5, INT_M3: 2.0, MAC4: -1.0 }, tva: 0.03, apportsPetrole: 0.8, libelle: "Blocages des ronds-points" }],
];

const PRENOMS = ["Aline", "Bastien", "Céline", "Damien", "Élodie", "Fabrice", "Gaëlle", "Hugo", "Inès", "Julien", "Karine", "Lucas", "Maëlle", "Noé", "Odile", "Pascal", "Romane", "Simon", "Tiphaine", "Valentin"];
const SYLLABES = ["bar", "ven", "lor", "mau", "tel", "cor", "dal", "rin", "vel", "sar", "mon", "tir", "gal", "bel", "ver", "nac"];
const SUFFIXES = ["ac", "ière", "ot", "and", "el", "ieux", "ard", "on"];

export function nomFictif(rng: Rng): string {
  const s = rng.pick(SYLLABES) + rng.pick(SYLLABES) + rng.pick(SUFFIXES);
  return `${rng.pick(PRENOMS)} ${s.charAt(0).toUpperCase()}${s.slice(1)}`;
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export class Acteurs {
  segments: Segment[];
  corps: Corps[];
  ministres: Ministre[];

  constructor(rng: Rng, groupes: string[], approbationInitiale = -10) {
    this.segments = SEGMENTS_DEF.map(([id, libelle, poids, sensibilites]) => ({ id, libelle, poids, approbation: approbationInitiale, sensibilites }));
    this.corps = CORPS_DEF.map(([id, libelle, influence, sensibilites, blocage]) => ({
      id, libelle, influence, approbation: 0, radicalisation: 20 + rng.int(0, 15), sensibilites, blocage, bloqueJusqua: null,
    }));
    this.ministres = MINISTERES.map((m) => this.nouveauMinistre(m, 0, rng, groupes));
  }

  nouveauMinistre(ministere: Ministere, jour: number, rng: Rng, groupes: string[]): Ministre {
    return {
      ministere, nom: nomFictif(rng), competence: rng.int(35, 85), loyaute: rng.int(40, 90), popularite: rng.int(30, 70),
      tension: 0, enPosteDepuis: jour, groupePivot: groupes.length ? rng.pick(groupes) : null,
    };
  }

  /** Opinion globale pondérée (-100 … 100). */
  opinion(): number {
    let s = 0;
    for (const seg of this.segments) s += seg.poids * seg.approbation;
    return s;
  }

  /** Signal d'un groupe d'indicateurs : Σ poids x sens x écart (unités d'écart), positif = favorable. */
  private signal(sens: Record<string, number>, ecarts: Float64Array, ecartsBase: Float64Array): number {
    let s = 0;
    for (const [id, w] of Object.entries(sens)) {
      const i = idx(id);
      const sg = CATALOGUE[i]!.sens || 1;
      s += w * sg * ((ecarts[i] as number) - (ecartsBase[i] as number));
    }
    return s;
  }

  /**
   * Pas quotidien. `ecarts` : écarts normalisés du jeu ; `ecartsBase` : ceux de la référence (0 sauf chocs).
   * Retourne les corps qui entrent en blocage ce jour.
   */
  step(jour: number, ecarts: Float64Array, ecartsBase: Float64Array, credibilite: number): Corps[] {
    const nouveaux: Corps[] = [];
    for (const seg of this.segments) {
      const cible = clamp(-10 + 12 * this.signal(seg.sensibilites, ecarts, ecartsBase) + (credibilite - 50) * 0.2, -100, 100);
      seg.approbation = clamp(seg.approbation + 0.04 * (cible - seg.approbation), -100, 100);
    }
    for (const c of this.corps) {
      const cible = clamp(10 * this.signal(c.sensibilites, ecarts, ecartsBase), -100, 100);
      c.approbation = clamp(c.approbation + 0.03 * (cible - c.approbation), -100, 100);
      const pression = Math.max(0, -c.approbation) / 100;
      c.radicalisation = clamp(c.radicalisation + 0.6 * pression - 0.12, 0, 100);
      if (c.bloqueJusqua !== null && jour >= c.bloqueJusqua) {
        c.bloqueJusqua = null;
        c.radicalisation = clamp(c.radicalisation - 25, 0, 100); // la crise purge une partie de la tension
      }
      if (c.bloqueJusqua === null && c.radicalisation > SEUIL_BLOCAGE) {
        c.bloqueJusqua = jour + 5 + Math.round(c.influence / 10);
        nouveaux.push(c);
      }
    }
    for (const m of this.ministres) {
      const usure = 0.02 + (100 - m.competence) / 5000;
      m.popularite = clamp(m.popularite - usure + (this.opinion() > 0 ? 0.01 : -0.01), 0, 100);
      m.tension = clamp(m.tension * 0.995, 0, 100);
    }
    return nouveaux;
  }

  bloques(jour: number): Corps[] {
    return this.corps.filter((c) => c.bloqueJusqua !== null && jour < c.bloqueJusqua);
  }

  appliquerEffets(corps?: Partial<Record<CorpsId, number>>, segments?: Partial<Record<SegmentId, number>>, radicalisation?: number): void {
    for (const c of this.corps) {
      const d = corps?.[c.id];
      if (d) c.approbation = clamp(c.approbation + d, -100, 100);
      if (radicalisation) c.radicalisation = clamp(c.radicalisation + radicalisation, 0, 100);
    }
    for (const s of this.segments) {
      const d = segments?.[s.id];
      if (d) s.approbation = clamp(s.approbation + d, -100, 100);
    }
  }

  ajouterTension(ministere: Ministere, delta: number): void {
    const m = this.ministres.find((x) => x.ministere === ministere);
    if (m) m.tension = clamp(m.tension + delta, 0, 100);
  }

  /** Remaniement : nouveau titulaire, tension sectorielle remise à zéro. Le coût est appliqué par la simulation. */
  remanier(ministere: Ministere, jour: number, rng: Rng, groupes: string[]): { ancien: Ministre; nouveau: Ministre } {
    const k = this.ministres.findIndex((x) => x.ministere === ministere);
    const ancien = this.ministres[k]!;
    const nouveau = this.nouveauMinistre(ministere, jour, rng, groupes);
    this.ministres[k] = nouveau;
    return { ancien, nouveau };
  }
}
