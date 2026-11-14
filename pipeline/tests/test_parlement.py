"""Parlement : dédoublonnage par acteur et seuil de censure sur une archive AMO10 synthétique."""
import io
import json
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from seed.connectors import parlement  # noqa: E402


def _zip(files: dict) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        for name, obj in files.items():
            z.writestr(name, json.dumps(obj))
    return buf.getvalue()


def _acteur(uid, gp_mandats):
    m = [{"typeOrgane": "ASSEMBLEE", "dateFin": None, "organes": {"organeRef": "PO1"}}]
    m += [{"typeOrgane": "GP", "dateFin": None, "dateDebut": d, "organes": {"organeRef": gp}} for gp, d in gp_mandats]
    return {"acteur": {"uid": {"#text": uid}, "mandats": {"mandat": m}}}


def test_dedoublonnage_et_dernier_groupe():
    files = {"organe/PO10.json": {"organe": {"uid": "PO10", "codeType": "GP", "libelleAbrev": "A", "libelle": "Groupe A"}},
             "organe/PO20.json": {"organe": {"uid": "PO20", "codeType": "GP", "libelleAbrev": "B", "libelle": "Groupe B"}},
             # président de groupe : deux mandats de groupe actifs -> compté une seule fois, dans le plus récent
             "acteur/PA1.json": _acteur("PA1", [("PO10", "2024-07-18"), ("PO20", "2025-01-10")]),
             "acteur/PA2.json": _acteur("PA2", [("PO10", "2024-07-18")]),
             "acteur/PA2bis.json": _acteur("PA2", [("PO10", "2024-07-18")]),  # doublon de fichier
             "acteur/PA3.json": _acteur("PA3", [])}  # non-inscrit
    r = parlement.parse_amo10(_zip(files))
    assert r["sieges_pourvus"] == 3
    assert {g["code"]: g["sieges"] for g in r["groupes"]} == {"A": 1, "B": 1, "NI": 1}


def test_cohesion_scrutins():
    s = lambda date, pour, contre: {"scrutin": {"dateScrutin": date, "ventilationVotes": {"organe": {"groupes": {"groupe": [
        {"organeRef": "PO10", "vote": {"decompteVoix": {"pour": str(pour), "contre": str(contre), "abstentions": "0"}}}]}}}}}
    r = parlement.parse_scrutins_an(_zip({"a.json": s("2026-11-10", 9, 1), "b.json": s("2026-11-12", 10, 0),
                                          "c.json": s("2026-08-01", 0, 10)}))
    assert r["dernier"] == "2026-11-12" and r["scrutins_7j"] == 2
    assert r["cohesion"]["PO10"] == 0.95  # le scrutin d'août est hors fenêtre de 30 jours
