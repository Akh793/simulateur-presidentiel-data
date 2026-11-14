import { LETTRE, sansAccents } from "./lettres";

/**
 * Liste de blocage des personnalités politiques réelles et des formations politiques.
 *
 * Elle ne sert qu'à REFUSER un texte : aucun de ces noms n'est jamais affiché. Elle complète la règle
 * structurelle du validateur (liste blanche des noms propres) et rattrape surtout les cas qu'elle laisse
 * passer : un nom isolé en début de phrase, ou une sortie de LLM.
 *
 * ⚠️ Liste non exhaustive par construction (responsables nationaux de la Ve République, gouvernements et chefs
 * de parti récents). Les noms ambigus (prénoms, noms communs, toponymes) ne sont bloqués que sous la forme
 * « prénom nom ».
 */

/** Patronymes assez distinctifs pour être bloqués seuls. */
export const PATRONYMES: readonly string[] = [
  "Macron", "Mélenchon", "Le Pen", "Bardella", "Attal", "Bayrou", "Barnier", "Lecornu", "Retailleau", "Darmanin", "Sarkozy",
  "Chirac", "Mitterrand", "Pompidou", "Giscard", "de Gaulle", "Ciotti", "Wauquiez", "Glucksmann", "Tondelier", "Zemmour",
  "Pécresse", "Hidalgo", "Jospin", "Castex", "Cazeneuve", "Fillon", "Villepin", "Raffarin", "Juppé", "Rocard", "Bérégovoy",
  "Balladur", "Mauroy", "Messmer", "Chaban-Delmas", "Couve de Murville", "Ayrault", "Valls", "Braun-Pivet", "Larcher", "Panot",
  "Quatennens", "Bompard", "Vallaud", "Jadot", "Véran", "Pannier-Runacher", "Dupond-Moretti", "Dati", "Taubira", "Montebourg",
  "Fabius", "Blanquer", "Montchalin", "Vautrin", "Fesneau", "Buzyn", "Guerini", "Lescure", "Bergé", "Autain",
];

/** Personnalités dont le nom seul est ambigu : bloquées sous la forme complète. */
export const NOMS_COMPLETS: readonly string[] = [
  "Édouard Philippe", "Élisabeth Borne", "François Hollande", "Fabien Roussel", "Xavier Bertrand", "Bruno Le Maire",
  "Olivier Faure", "Marion Maréchal", "Ségolène Royal", "Sandrine Rousseau", "François Ruffin", "Benoît Hamon", "Édith Cresson",
  "Clément Beaune", "Jean-Noël Barrot", "Roland Lescure", "Antoine Armand", "Laurent Saint-Martin", "Maud Bregeon",
  "Agnès Buzyn", "Christophe Castaner", "Nicolas Hulot", "Barbara Pompili", "Jean-Marie Le Pen", "Marine Le Pen",
  "Raymond Barre", "Pierre Messmer", "Michel Debré", "Jean-Luc Mélenchon", "Emmanuel Macron", "Brigitte Macron",
];

/** Formations politiques (forme capitalisée, sensible à la casse pour éviter les noms communs). */
export const FORMATIONS: readonly string[] = [
  "Rassemblement national", "France insoumise", "Renaissance", "Ensemble pour la République", "Les Républicains", "Parti socialiste",
  "Les Écologistes", "Europe Écologie", "Horizons", "MoDem", "Mouvement démocrate", "Reconquête", "Parti communiste",
  "Nouveau Front populaire", "Union des droites", "Front national", "En Marche", "La République en marche",
  "RN", "LFI", "LFI-NFP", "PS", "LR", "EELV", "PCF", "NFP", "UDR", "EPR", "LIOT", "LREM",
];

export { sansAccents };
const echapper = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const RE_PERSONNES = new RegExp(
  `(?<![${LETTRE}-])(?:${[...NOMS_COMPLETS, ...PATRONYMES].map((n) => echapper(sansAccents(n))).join("|")})(?![${LETTRE}-])`, "g");
const RE_FORMATIONS = new RegExp(`(?<![${LETTRE}-])(?:${FORMATIONS.map(echapper).join("|")})(?![${LETTRE}-])`, "g");

/** Occurrences de personnalités ou de formations réelles, hors noms explicitement autorisés (personnages fictifs du payload). */
export function referencesReelles(texte: string, autorises: ReadonlySet<string> = new Set()): string[] {
  const norm = sansAccents(texte);
  const autorisesNorm = [...autorises].map(sansAccents);
  const hits = new Set<string>();
  for (const m of norm.matchAll(RE_PERSONNES)) if (!autorisesNorm.some((a) => a.includes(m[0]))) hits.add(m[0]);
  for (const m of texte.matchAll(RE_FORMATIONS)) if (![...autorises].some((a) => a.includes(m[0]))) hits.add(m[0]);
  return [...hits];
}
