/**
 * Classes de caractères latines explicites (français), sans échappements Unicode `\p{…}` ni `normalize()` :
 * le moteur Hermes de React Native ne les prend en charge que dans ses versions récentes.
 */
export const LETTRE = "A-Za-zÀ-ÖØ-öø-ÿŒœÆæ";
export const MAJ = "A-ZÀ-ÖØ-ÞŒÆ";
export const MIN = "a-zß-öø-ÿœæ";

const ACCENTS: Record<string, string> = {
  à: "a", â: "a", ä: "a", á: "a", ã: "a", å: "a", ç: "c", é: "e", è: "e", ê: "e", ë: "e", í: "i", ì: "i", î: "i", ï: "i", ñ: "n",
  ó: "o", ò: "o", ô: "o", ö: "o", õ: "o", ú: "u", ù: "u", û: "u", ü: "u", ý: "y", ÿ: "y", œ: "oe", æ: "ae",
};

/** Minuscules sans diacritiques (comparaison insensible aux accents). */
export function sansAccents(s: string): string {
  let out = "";
  for (const c of s.toLowerCase()) out += ACCENTS[c] ?? c;
  return out;
}
