"""Génère `schema/graine.schema.json` et `shared/schema.ts` (zod + types) depuis seed/schema.py.

Usage : python3 gen_ts.py [--check]
  --check : n'écrit rien, échoue (code 1) si les fichiers générés diffèrent du dépôt (CI).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from seed.schema import Graine  # noqa: E402

JSON_OUT = ROOT / "schema" / "graine.schema.json"
TS_OUT = ROOT / "shared" / "schema.ts"

HEADER = """// FICHIER GÉNÉRÉ par pipeline/gen_ts.py depuis pipeline/seed/schema.py — ne pas modifier à la main.
// Validation à l'exécution de graine_du_jour.json avant tout usage par le moteur.
import { z } from "zod";
"""


def ref_name(ref: str) -> str:
    return ref.rsplit("/", 1)[-1]


def to_zod(s: dict) -> str:
    if "$ref" in s:
        return ref_name(s["$ref"])
    if "anyOf" in s:
        opts = [o for o in s["anyOf"] if o.get("type") != "null"]
        nullable = len(opts) != len(s["anyOf"])
        inner = to_zod(opts[0]) if len(opts) == 1 else "z.union([" + ", ".join(to_zod(o) for o in opts) + "])"
        return inner + (".nullable()" if nullable else "")
    if "const" in s:
        return f"z.literal({json.dumps(s['const'], ensure_ascii=False)})"
    if "enum" in s:
        vals = s["enum"]
        if all(isinstance(v, str) for v in vals):
            return "z.enum([" + ", ".join(json.dumps(v, ensure_ascii=False) for v in vals) + "])"
        return "z.union([" + ", ".join(f"z.literal({json.dumps(v)})" for v in vals) + "])"
    t = s.get("type")
    if t == "string":
        return "z.string()"
    if t in ("number", "integer"):
        out = "z.number()" + (".int()" if t == "integer" else "")
        if "minimum" in s:
            out += f".min({s['minimum']})"
        if "maximum" in s:
            out += f".max({s['maximum']})"
        return out
    if t == "boolean":
        return "z.boolean()"
    if t == "array":
        out = f"z.array({to_zod(s['items'])})"
        if "maxItems" in s:
            out += f".max({s['maxItems']})"
        return out
    if t == "object":
        if "properties" in s:
            req = set(s.get("required", []))
            fields = []
            for k, v in s["properties"].items():
                z = to_zod(v)
                if k not in req:
                    z += ".optional()"
                fields.append(f"  {k}: {z},")
            return "z.object({\n" + "\n".join(fields) + "\n}).strict()"
        ap = s.get("additionalProperties")
        if isinstance(ap, dict):
            return f"z.record(z.string(), {to_zod(ap)})"
        return "z.record(z.string(), z.unknown())"
    raise ValueError(f"Type JSON Schema non géré : {s}")


def deps(s, acc: set) -> set:
    if isinstance(s, dict):
        if "$ref" in s:
            acc.add(ref_name(s["$ref"]))
        for v in s.values():
            deps(v, acc)
    elif isinstance(s, list):
        for v in s:
            deps(v, acc)
    return acc


def generate() -> tuple[str, str]:
    schema = Graine.model_json_schema(mode="serialization")
    defs = schema.pop("$defs", {})
    defs["Graine"] = schema
    order, seen = [], set()

    def visit(name: str):
        if name in seen:
            return
        seen.add(name)
        for d in sorted(deps(defs[name], set())):
            visit(d)
        order.append(name)

    for name in sorted(defs):
        visit(name)
    parts = [HEADER]
    for name in order:
        parts.append(f"export const {name} = {to_zod(defs[name])};\nexport type {name} = z.infer<typeof {name}>;\n")
    parts.append("export const SCHEMA_VERSION = \"1.0.0\" as const;\n")
    parts.append(
        "/** Valide une graine téléchargée ; lève une erreur détaillée si elle ne respecte pas le schéma. */\n"
        "export function parseGraine(input: unknown): Graine {\n  return Graine.parse(input);\n}\n"
    )
    full_schema = dict(schema)
    full_schema["$defs"] = {k: v for k, v in defs.items() if k != "Graine"}
    full_schema["$schema"] = "https://json-schema.org/draft/2020-12/schema"
    return json.dumps(full_schema, ensure_ascii=False, indent=1) + "\n", "\n".join(parts)


def main() -> int:
    js, ts = generate()
    if "--check" in sys.argv:
        ok = JSON_OUT.exists() and TS_OUT.exists() and JSON_OUT.read_text() == js and TS_OUT.read_text() == ts
        print("schéma à jour" if ok else "schéma périmé : relancer python3 pipeline/gen_ts.py")
        return 0 if ok else 1
    JSON_OUT.parent.mkdir(parents=True, exist_ok=True)
    TS_OUT.parent.mkdir(parents=True, exist_ok=True)
    JSON_OUT.write_text(js)
    TS_OUT.write_text(ts)
    print(f"écrit {JSON_OUT.relative_to(ROOT)} et {TS_OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
