/** Types du moteur narratif hors ligne. Tous les textes sont des chaînes finales, validées. */
export type Niveau = 1 | 2 | 3;
export type LigneEditoriale = "economique" | "generaliste" | "populaire";
export type Auteur = "bercy" | "social";

export interface Note {
  auteur: Auteur;
  titre: string;
  texte: string;
  /** Registre retenu : Bercy « marge | vigilance | alerte », Cabinet social « apaise | tendu | rupture ». */
  registre: string;
  recommandation: string | null;   // identifiant du gabarit recommandé
}

export interface OptionNarree {
  gabaritId: string;
  libelle: string;
  instrument: string;
  coutCP: string;
  impactBudget: string | null;     // texte « +1,2 Md€ par an » ou null si sans effet budgétaire
  recommandePar: Auteur[];
}

export interface DossierNarre {
  id: string;
  famille: string;
  source: string;
  /** Urgence actuelle (gravité courante, aggravée par l'inaction) : couleur et rang dans l'interface. */
  niveau: Niveau;
  /** Ampleur des faits (gravité initiale, hors inaction) : règle le vocabulaire du titre et du constat. */
  intensite: Niveau;
  joursInaction: number;
  titre: string;
  briefing: string;
  notes: { bercy: Note; social: Note };
  options: OptionNarree[];
}

export interface TitreUne {
  ligne: LigneEditoriale;
  edition: string;
  titre: string;
  chapeau: string;
}

export interface Une {
  jour: number;
  date: string;
  titres: TitreUne[];               // toujours trois : économique, généraliste, populaire
}

export interface Rejet {
  bloc: string;
  motifs: string[];
}

/** Mémoire anti-répétition : derniers indices de variante utilisés, par clé « famille|bloc ». */
export interface MemoireNarrative {
  v: 1;
  recents: Record<string, number[]>;
}

export interface NarrationTour {
  jour: number;
  date: string;
  mode: "gabarit" | "enrichi";
  dossiers: DossierNarre[];
  une: Une;
  breves: string[];
  /** Blocs rejetés par le validateur et remplacés par leur version neutre (vide en fonctionnement normal). */
  rejets: Rejet[];
  /** Payload de faits formatés : seule source autorisée des nombres et dates du texte. */
  faits: Record<string, string>;
  /** Chaînes du payload d'entrée (libellés, titres de textes, mesures) et noms fictifs : base du validateur. */
  sources: string[];
  noms: string[];
  memoire: MemoireNarrative;
}

export const MEMOIRE_VIDE: MemoireNarrative = { v: 1, recents: {} };
