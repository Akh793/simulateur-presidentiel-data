/** Palette imposée par la Style Bible (assets-bible/STYLE_BIBLE.md). Aucune autre teinte de base. */
export const P = {
  nuit: "#0B192C",      // Bleu Nuit Élysée
  papier: "#F7F4EB",    // Papier Ministériel
  rouge: "#C82834",     // Rouge République
  or: "#C49A3A",        // Or Dorure
  ardoise: "#5A6577",   // Gris Ardoise
  cobalt: "#1D5B9E",    // Bleu Cobalt
  encre: "#0B192C",     // trait de la ligne claire = bleu nuit
} as const;

/** Mélange linéaire de deux couleurs hexadécimales (t = 0 → a, t = 1 → b) : teintes dérivées de la palette. */
export function melange(a: string, b: string, t: number): string {
  const ha = parseInt(a.slice(1), 16), hb = parseInt(b.slice(1), 16);
  const c = (s: number) => Math.round(((ha >> s) & 255) * (1 - t) + ((hb >> s) & 255) * t);
  return `#${((1 << 24) + (c(16) << 16) + (c(8) << 8) + c(0)).toString(16).slice(1).toUpperCase()}`;
}

export const T = {
  fond: P.nuit,
  carte: P.papier,
  carteOmbre: melange(P.papier, P.ardoise, 0.25),
  texte: P.nuit,
  texteClair: P.papier,
  discret: P.ardoise,
  alerte: P.rouge,
  accent: P.or,
  lien: P.cobalt,
  chemise: melange(P.or, P.papier, 0.55),       // carton de chemise ministérielle
  chemiseBord: melange(P.or, P.nuit, 0.25),
  filet: melange(P.ardoise, P.papier, 0.55),
} as const;

export const POLICE = {
  titre: "serif",       // serif système (Georgia sur iOS, Noto Serif sur Android) : aucun téléchargement de police
  texte: "System",
  chiffres: "System",
} as const;
