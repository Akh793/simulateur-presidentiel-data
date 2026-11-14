import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseGraine, type Graine } from "../../shared/schema";

/** Graine réelle produite par le relais le 14/11/2026 (pipeline/tests/graine_exemple.json). */
export function graineExemple(): Graine {
  const p = fileURLToPath(new URL("../../pipeline/tests/graine_exemple.json", import.meta.url));
  return parseGraine(JSON.parse(readFileSync(p, "utf-8")));
}
