"""Sources servies en fichiers : data.gouv.fr (épinglage par slug), XLSX, archives DILA, CSV."""
from __future__ import annotations

import csv
import datetime as dt
import io
import re
import tarfile
from collections import Counter, defaultdict

from .. import net, rules
from . import Lecture, echec

DG_API = "https://www.data.gouv.fr/api/1/datasets/{slug}/"


def dg_resources(slug: str) -> list[dict]:
    """Règle n° 4 : résolution par slug, jamais par recherche plein texte."""
    return net.get_json(DG_API.format(slug=slug)).get("resources", [])


# ------------------------------------------------------------------ JUS2 population carcérale
PRISON_SLUG = "statistique-mensuelle-de-la-population-ecrouee-et-detenue-en-france"
PRISON_LIGNES = {"Ecroués détenus": "detenus", "Places opérationnelles": "places", "Matelas au sol": "matelas_au_sol",
                 "Ecroués": "ecroues", "dont prévenus": "prevenus"}
RE_DATE_FR = re.compile(r"au (1er|\d{1,2}) (\w+) (\d{4})", re.I)


def _prison_xlsx(content: bytes) -> dict:
    import openpyxl
    import warnings
    warnings.filterwarnings("ignore", module="openpyxl")
    wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)  # pas de read_only : dimensions absentes du fichier
    if "Chiffres_cles" not in wb.sheetnames:
        raise rules.EnTeteInattendu("onglet Chiffres_cles absent")
    rows = [[c for c in r] for r in wb["Chiffres_cles"].iter_rows(values_only=True)]
    flat = [str(c) for r in rows for c in r if c is not None]
    rules.require_headers(flat, ["Catégories", "Au 1er du mois", "Ecroués détenus", "Places opérationnelles"], "JUS2 Chiffres_cles")
    titre = next((s for s in flat if s.startswith("Les chiffres au")), "")
    m = RE_DATE_FR.search(titre)
    if not m:
        raise rules.EnTeteInattendu(f"date de référence illisible : {titre!r}")
    mois = rules.MOIS_FR.index(m.group(2).lower()) + 1
    ref = dt.date(int(m.group(3)), mois, 1)
    out = {"ref": ref.isoformat()}
    for r in rows:
        if r and r[0] in PRISON_LIGNES and PRISON_LIGNES[r[0]] not in out:
            v = rules.clean_number(r[1])  # règle n° 5 : « 18 691 » -> 18691
            if v is not None:
                out[PRISON_LIGNES[r[0]]] = v
        for i, c in enumerate(r or []):
            if c == "Total France entière" and i + 1 < len(r):
                out["densite_pct"] = rules.clean_number(r[i + 1])
    for k in ("detenus", "places"):
        if k not in out:
            raise rules.EnTeteInattendu(f"ligne {k} absente")
    return out


def prison() -> Lecture:
    try:
        res = [r for r in dg_resources(PRISON_SLUG) if (r.get("format") or "").lower() == "xlsx"]
        res.sort(key=rules.resource_rank, reverse=True)
        lus = []
        for r in res[:2]:  # dernière et avant-dernière publication
            lus.append(_prison_xlsx(net.get(r["url"], timeout=120).body))
    except Exception as e:  # noqa: BLE001
        return echec(e)
    lus.sort(key=lambda x: x["ref"])
    last = lus[-1]
    comp = {k: v for k, v in last.items() if k != "ref" and v is not None}
    return Lecture(ok=True, http=200, derniere=last["ref"], points=[(x["ref"], x["detenus"]) for x in lus],
                   composantes=comp, meta={"periodes": [x["ref"][:7] for x in lus], "publiee_le": None},
                   info=f"situation au {last['ref']}")


# ------------------------------------------------------------------ JUS1 Journal officiel
JORF_DIR = "https://echanges.dila.gouv.fr/OPENDATA/JORF/"
NATURES_NORMATIVES = ("LOI", "LOI_ORGANIQUE", "ORDONNANCE", "DECRET", "ARRETE")


def jorf(jours: int = 10) -> Lecture:
    """Nombre de textes normatifs (lois, ordonnances, décrets, arrêtés) par date de publication."""
    try:
        listing = net.get_text(JORF_DIR)
        files = sorted(set(re.findall(r'href="(JORF_(\d{8})-\d{6}\.tar\.gz)"', listing)))
    except Exception as e:  # noqa: BLE001
        return echec(e)
    lim = (dt.date.today() - dt.timedelta(days=jours)).strftime("%Y%m%d")
    lim_iso, today_iso = f"{lim[:4]}-{lim[4:6]}-{lim[6:]}", dt.date.today().isoformat()
    par_date: dict[str, Counter] = defaultdict(Counter)
    for name, d8 in files:
        if d8 < lim:
            continue
        try:
            tf = tarfile.open(fileobj=io.BytesIO(net.get(JORF_DIR + name, timeout=120).body), mode="r:gz")
        except Exception:  # noqa: BLE001
            continue
        for m in tf.getmembers():
            if not (m.isfile() and m.name.endswith(".xml") and "/texte/" in m.name and "/struct/" in m.name):
                continue
            x = tf.extractfile(m).read().decode("utf-8", "replace")
            nat = re.search(r"<NATURE>([^<]*)</NATURE>", x)
            dpub = re.search(r"<DATE_PUBLI>(\d{4}-\d{2}-\d{2})</DATE_PUBLI>", x)
            # les archives embarquent aussi des textes anciens (versions, rectificatifs) : on ne compte que la fenêtre
            if nat and dpub and lim_iso <= dpub.group(1) <= today_iso:
                par_date[dpub.group(1)][nat.group(1)] += 1
    if not par_date:
        return Lecture(ok=False, http=200, info="aucun texte lu dans les archives récentes")
    jours_l = sorted(par_date)
    pts = [(j, float(sum(par_date[j][n] for n in NATURES_NORMATIVES))) for j in jours_l]
    last = par_date[jours_l[-1]]
    comp = {n.lower(): float(last[n]) for n in NATURES_NORMATIVES}
    return Lecture(ok=True, http=200, derniere=jours_l[-1], points=pts, composantes=comp,
                   info=f"{len(files)} archives listées ; JO du {jours_l[-1]}")


# ------------------------------------------------------------------ JUS3 baromètre de l'application des lois
BAROMETRE_CSV = "https://barometre.assemblee-nationale.fr/barometre_application_lois_assemblee.csv"


def barometre(legislature: int) -> Lecture:
    """Taux d'application des mesures réglementaires des lois de la législature en cours (%)."""
    try:
        txt = net.get_text(BAROMETRE_CSV, timeout=120)
    except Exception as e:  # noqa: BLE001
        return echec(e)
    reader = csv.DictReader(io.StringIO(txt.lstrip("﻿")), delimiter=";")
    rules.require_headers(reader.fieldnames or [], ["Législature", "Nombre de mesures à appliquer", "Nombre de mesures appliquées",
                                                    "Date de publication de la loi"], "JUS3")
    a_app = app = lois = attente = 0
    derniere = None
    for r in reader:
        if str(r.get("Législature", "")).strip() != str(legislature):
            continue
        lois += 1
        n1 = rules.clean_number(r["Nombre de mesures à appliquer"]) or 0
        n2 = rules.clean_number(r["Nombre de mesures appliquées"]) or 0
        a_app += n1
        app += n2
        attente += int(n2 < n1)
        derniere = max(derniere or "", r["Date de publication de la loi"])
    if not a_app:
        return Lecture(ok=False, http=200, info=f"aucune mesure pour la législature {legislature}")
    taux = round(100.0 * app / a_app, 1)
    jour = dt.date.today().isoformat()
    return Lecture(ok=True, http=200, derniere=jour, points=[(jour, taux)],
                   composantes={"lois": lois, "lois_en_attente_de_decrets": attente, "mesures_a_appliquer": a_app,
                                "mesures_appliquees": app},
                   info=f"législature {legislature}, dernière loi publiée le {derniere}")


# ------------------------------------------------------------------ SAN3 disponibilité des médicaments
BDPM_DISPO = "https://base-donnees-publique.medicaments.gouv.fr/download/file/CIS_CIP_Dispo_Spec.txt"


def medicaments() -> Lecture:
    """Spécialités en rupture (statut 1) ou en tension (statut 2) sans remise à disposition (BDPM / ANSM)."""
    try:
        txt = net.get_text(BDPM_DISPO, encoding="latin-1", timeout=90)
    except Exception as e:  # noqa: BLE001
        return echec(e)
    rows = [l.split("\t") for l in txt.strip().splitlines()]
    rows = [r for r in rows if len(r) >= 8]
    if not rows:
        return Lecture(ok=False, http=200, info="fichier vide ou format inattendu (8 colonnes attendues)")
    actifs = [r for r in rows if r[2] in ("1", "2") and not r[6].strip()]
    rupt = sum(r[2] == "1" for r in actifs)
    tens = sum(r[2] == "2" for r in actifs)
    maj = max((dt.datetime.strptime(r[5], "%d/%m/%Y").date() for r in rows if re.fullmatch(r"\d{2}/\d{2}/\d{4}", r[5])),
              default=dt.date.today())
    return Lecture(ok=True, http=200, derniere=maj.isoformat(), points=[(maj.isoformat(), float(rupt + tens))],
                   composantes={"ruptures": rupt, "tensions": tens, "lignes": len(rows)},
                   info=f"{len(rows)} lignes, dernière mise à jour de statut {maj}")
