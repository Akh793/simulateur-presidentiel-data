import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseGraine, type Graine } from "../../shared/schema";

export const CHEMIN_GRAINE = fileURLToPath(new URL("../../pipeline/tests/graine_exemple.json", import.meta.url));
export const texteGraine = () => readFileSync(CHEMIN_GRAINE, "utf-8");
export const graineExemple = (): Graine => parseGraine(JSON.parse(texteGraine()));
