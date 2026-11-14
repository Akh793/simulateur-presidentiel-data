import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/** Code embarqué dans l'application (mobile-core/src, engine/src, shared) : contrôles de compatibilité Hermes / Metro. */
const RACINES = ["../src", "../../engine/src", "../../shared"].map((r) => fileURLToPath(new URL(r, import.meta.url)));
const fichiers = (d: string): string[] => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? fichiers(p) : p.endsWith(".ts") ? [p] : [];
});

describe("compatibilité React Native (Hermes) du code embarqué", () => {
  const sources = RACINES.flatMap(fichiers).map((p) => ({ p, s: readFileSync(p, "utf-8") }));
  it.each([
    ["échappement Unicode \\p{…} dans une expression régulière", /\\p\{[A-Za-z]/],
    ["String.prototype.normalize", /\.normalize\(/],
    ["Intl / toLocale*", /\bIntl\.|\.toLocale[A-Z]\w*\(/],
    ["structuredClone", /\bstructuredClone\(/],
    ["module Node.js", /from "node:|require\("node:/],
    ["accès réseau ou fichier", /\bfetch\(|XMLHttpRequest|from "fs"/],
  ])("aucun usage de : %s", (_, re) => {
    for (const { p, s } of sources) expect(re.test(s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")), p).toBe(false);
  });
});
