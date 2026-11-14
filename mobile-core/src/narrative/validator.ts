/**
 * Validateur anti-hallucination. Un texte n'est accepté que si :
 *  1. chaque nombre figure dans le payload d'entrée (faits formatés ou chaînes du payload), au signe près ;
 *  2. chaque date figure telle quelle dans le payload ;
 *  3. aucun nombre n'est écrit en toutes lettres (« trois cents », « des milliers ») hors payload ;
 *  4. aucun nom propre inconnu n'apparaît : liste blanche = institutions + mots des gabarits + chaînes du payload ;
 *  5. aucune personnalité ou formation politique réelle n'est citée (liste de blocage) ;
 *  6. aucune variable `{...}` ne reste et la longueur maximale du bloc est respectée.
 * Version durcie du validateur Python de l'étape 1 (pipeline/seed/narrative.py) : correspondance exacte
 * des nombres (plus d'arrondi toléré) et contrôle des nombres en lettres.
 */
import { LETTRE, MAJ } from "./lettres";
import { referencesReelles } from "./personnalites";

const ESP = "[\\s\\u00A0\\u202F\\u2009]";
const MOIS = "janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre";
export const RE_DATE = new RegExp(
  `\\b\\d{4}-\\d{2}-\\d{2}\\b|\\b\\d{2}/\\d{2}/\\d{4}\\b|(?<![${LETTRE}\\d])(?:1er|\\d{1,2})${ESP}(?:${MOIS})(?:${ESP}\\d{4})?(?![${LETTRE}\\d])`, "g");
export const RE_NOMBRE = new RegExp(
  `(?<![${LETTRE}\\d.,])[\\u2212\\u2013-]?\\d{1,3}(?:${ESP}\\d{3})+(?:[.,]\\d+)?(?![\\d${LETTRE}])|(?<![${LETTRE}\\d.,])[\\u2212\\u2013-]?\\d+(?:[.,]\\d+)?(?!\\d)`, "g");
const RE_LETTRES = new RegExp(`(?<![${LETTRE}])(deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingts?|trente|quarante|cinquante|soixante|cents?|mille|millions?|milliards?|dizaines?|centaines?|milliers?|moitié|tiers|quart|double|triple|quadruple)(?![${LETTRE}])`, "gi");
const RE_CIVILITE = new RegExp(`(?<![${LETTRE}])(M\\.|Mme|Mmes|MM\\.|Mlle|Monsieur|Madame|Mademoiselle|Me|Dr|Pr)\\s+([${MAJ}][${LETTRE}-]*)`, "g");
const RE_MOT_MAJ = new RegExp(`[${MAJ}][${LETTRE}-]*`, "g");
const RE_SUITE = new RegExp(`[${MAJ}][${LETTRE}-]+(?:[\\s\\u00A0](?:de|du|des|la|le)?[\\s\\u00A0]?[${MAJ}][${LETTRE}-]+)+`, "g");
const RE_PLACEHOLDER = /\{[^}]*\}/;

/** Institutions et mots-outils capitalisés admis partout (repris de l'étape 1 et complétés). */
export const INSTITUTIONS: readonly string[] = [
  "Bercy", "Matignon", "Élysée", "Assemblée", "Sénat", "Conseil", "État", "France", "Météo-France", "Banque", "Europe", "Union",
  "Insee", "INSEE", "Eurostat", "SNCF", "RTE", "ANSM", "Urssaf", "Acoss", "AFT", "DGFiP", "Journal", "Premier", "Président",
  "République", "Gouvernement", "Parlement", "Constitution", "Cour", "Comptes", "Trésor", "Agence", "Sécurité", "Sociale", "BCE",
  "Ministère", "Ministre", "Cabinet", "Note", "Social", "Unédic", "AIE", "TVA", "PLF", "PLFSS", "PLFR", "LFSS", "OAT", "BTF", "IS",
];

export interface IndexPayload {
  nombres: Set<string>;
  dates: Set<string>;
  mots: Set<string>;
  noms: Set<string>;
  lettres: Set<string>;
}

const normEsp = (s: string) => s.replace(/[\s   ]+/g, " ").trim();

export function normaliserNombre(tok: string): string {
  let s = tok.replace(/[\s   ]/g, "").replace(/[−–]/g, "-").replace(/^[+-]/, "").replace(",", ".");
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  s = s.replace(/^0+(?=\d)/, "");
  return s || "0";
}

function nombresDe(s: string): string[] {
  return [...s.replace(RE_DATE, " ").matchAll(RE_NOMBRE)].map((m) => normaliserNombre(m[0]));
}

export function motsCapitalises(s: string): string[] {
  return [...s.matchAll(RE_MOT_MAJ)].map((m) => m[0]).filter((w) => w.length > 1);
}

/** Construit l'index des éléments autorisés à partir du payload (chaînes et nombres) et du lexique statique. */
export function indexer(sources: Iterable<unknown>, opts: { noms?: Iterable<string>; lexique?: Iterable<string> } = {}): IndexPayload {
  const idx: IndexPayload = { nombres: new Set(), dates: new Set(), mots: new Set([...INSTITUTIONS, ...(opts.lexique ?? [])]), noms: new Set(), lettres: new Set() };
  etendreIndex(idx, sources, opts.noms);
  return idx;
}

/** Ajoute au payload indexé de nouvelles valeurs (faits formatés, chaînes source, noms fictifs). */
export function etendreIndex(idx: IndexPayload, sources: Iterable<unknown>, noms: Iterable<string> = []): void {
  const visiter = (x: unknown): void => {
    if (x === null || x === undefined) return;
    if (typeof x === "number") {
      if (!Number.isFinite(x)) return;
      idx.nombres.add(normaliserNombre(String(x)));
      if (!Number.isInteger(x)) for (const d of [1, 2]) idx.nombres.add(normaliserNombre(x.toFixed(d)));
    } else if (typeof x === "string") {
      for (const m of x.matchAll(RE_DATE)) idx.dates.add(normEsp(m[0]));
      for (const n of nombresDe(x)) idx.nombres.add(n);
      for (const w of motsCapitalises(x)) idx.mots.add(w);
      for (const m of x.matchAll(RE_LETTRES)) idx.lettres.add(m[0].toLowerCase());
    } else if (Array.isArray(x)) x.forEach(visiter);
    else if (typeof x === "object") Object.values(x as Record<string, unknown>).forEach(visiter);
  };
  for (const s of sources) visiter(s);
  for (const n of noms) {
    idx.noms.add(n);
    for (const w of motsCapitalises(n)) idx.mots.add(w);
  }
}

function debutDePhrase(texte: string, pos: number): boolean {
  let k = pos - 1;
  while (k >= 0 && /[\s  «"(]/.test(texte[k]!)) k--;
  return k < 0 || /[.!?:;—–\n]/.test(texte[k]!);
}

/** Motifs de rejet (tableau vide = texte accepté). */
export function valider(texte: string, idx: IndexPayload, maxCaracteres = 900): string[] {
  const motifs: string[] = [];
  if (RE_PLACEHOLDER.test(texte)) motifs.push(`variable non substituée : ${texte.match(RE_PLACEHOLDER)![0]}`);
  if (texte.length > maxCaracteres) motifs.push(`texte trop long (${texte.length} > ${maxCaracteres} caractères)`);
  for (const m of texte.matchAll(RE_DATE)) if (!idx.dates.has(normEsp(m[0]))) motifs.push(`date absente du payload : ${m[0]}`);
  for (const n of [...texte.replace(RE_DATE, " ").matchAll(RE_NOMBRE)]) {
    if (!idx.nombres.has(normaliserNombre(n[0]))) motifs.push(`nombre absent du payload : ${n[0].trim()}`);
  }
  for (const m of texte.matchAll(RE_LETTRES)) if (!idx.lettres.has(m[0].toLowerCase())) motifs.push(`nombre en toutes lettres : ${m[0]}`);
  for (const m of texte.matchAll(RE_CIVILITE)) {
    if (![...idx.noms].some((n) => n.includes(m[2]!))) motifs.push(`civilité suivie d'un nom hors payload : ${m[0]}`);
  }
  for (const m of texte.matchAll(RE_MOT_MAJ)) {
    const w = m[0];
    if (w.length < 2 || idx.mots.has(w) || debutDePhrase(texte, m.index!)) continue;
    motifs.push(`nom propre hors liste blanche : ${w}`);
  }
  for (const m of texte.matchAll(RE_SUITE)) {
    const inconnus = motsCapitalises(m[0]).filter((w) => !idx.mots.has(w));
    if (inconnus.length) motifs.push(`suite de noms propres non autorisée : ${m[0]}`);
  }
  for (const r of referencesReelles(texte, idx.noms)) motifs.push(`personnalité ou formation politique réelle : ${r}`);
  return [...new Set(motifs)];
}
