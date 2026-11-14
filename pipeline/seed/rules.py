"""Les 8 règles d'ingestion de l'audit, sous forme de fonctions pures et testables.

R1 INSEE BDM : voie SDMX directe, ordre chronologique rétabli, rejet des séries arrêtées.
R2 Opendatasoft : fraîcheur = max(date) sur les lignes dont la valeur est renseignée.
R3 Jeux « larges » DGFiP : colonnes mensuelles détectées par motif ^\\d{2}_\\d{2}_\\d{4}$.
R4 data.gouv.fr : épinglage par slug, ressource = année maximale dans le titre.
R5 Bureautique : en-têtes attendus validés, nombres nettoyés (« 18 691 »).
R6 Parlement : téléchargement conditionnel ETag/Last-Modified, dédoublonnage par acteur.
R7 sources_health : statut vivante / en_retard / morte (voir health.py).
R8 Substitutions : valeurs de référence sourcées pour les sources fermées (config/parametres.yml).
"""
from __future__ import annotations

import datetime as dt
import math
import re
import statistics
from typing import Iterable, Optional

# ---------------------------------------------------------------- R1 INSEE BDM
BDM_URL = "https://bdm.insee.fr/series/sdmx/data/SERIES_BDM/{idbank}"
RE_ARRETEE = re.compile(r"[Ss][ée]ries?\s+arr[êe]t[ée]e?s?")


class SerieArretee(ValueError):
    """La série BDM porte la mention « Série arrêtée » : elle ne sera plus mise à jour."""


def parse_bdm(xml: str, idbank: str) -> dict:
    """Retourne {titre, last_update, freq, obs:[(periode, valeur)] du plus ancien au plus récent}."""
    m = re.search(r"<Series ([^>]+)>", xml)
    if not m:
        raise ValueError(f"BDM {idbank} : aucune série dans la réponse")
    attrs = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
    titre = attrs.get("TITLE_FR", "")
    if RE_ARRETEE.search(titre):
        raise SerieArretee(f"BDM {idbank} : « {titre} »")
    obs = []
    for o in re.findall(r"<Obs ([^>]+)/?>", xml):
        a = dict(re.findall(r'(\w+)="([^"]*)"', o))
        if a.get("OBS_VALUE") not in (None, "", "NaN"):
            obs.append((a["TIME_PERIOD"], float(a["OBS_VALUE"])))
    obs.sort(key=lambda x: period_start(x[0]))  # la BDM renvoie le plus récent en premier
    return {"titre": titre, "last_update": attrs.get("LAST_UPDATE"), "freq": attrs.get("FREQ"), "obs": obs}


def period_start(p: str) -> dt.date:
    """'2026-10' -> 1er oct. ; '2026-Q3'/'2026-T3' -> 1er juil. ; '2026-S45'/'2026-W45' -> lundi ISO ; '2026' -> 1er janv."""
    p = str(p).strip()
    if m := re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", p[:10]):
        return dt.date(int(m[1]), int(m[2]), int(m[3]))
    if m := re.fullmatch(r"(\d{4})-[QT](\d)", p):
        return dt.date(int(m[1]), 3 * int(m[2]) - 2, 1)
    if m := re.fullmatch(r"(\d{4})-[SW](\d{1,2})", p):
        return dt.date.fromisocalendar(int(m[1]), int(m[2]), 1)
    if m := re.fullmatch(r"(\d{4})-(\d{2})", p):
        return dt.date(int(m[1]), int(m[2]), 1)
    if m := re.fullmatch(r"(\d{4})", p):
        return dt.date(int(m[1]), 1, 1)
    raise ValueError(f"période illisible : {p}")


def period_label(p: str) -> str:
    """Libellé français : '2026-Q3' -> '2026-T3'."""
    return re.sub(r"-Q(\d)$", r"-T\1", str(p))


# ---------------------------------------------------------------- R2 Opendatasoft
def ods_freshness_params(date_field: str, value_field: Optional[str]) -> dict:
    """Paramètres de la requête max(date) filtrée sur la valeur renseignée (jamais metas.default.modified)."""
    p = {"select": f"max({date_field}) as m"}
    if value_field:
        p["where"] = f"{value_field} is not null"
    return p


# ---------------------------------------------------------------- R3 jeux larges
RE_COL_MENSUELLE = re.compile(r"^\d{2}_\d{2}_\d{4}$")


def wide_month_columns(names: Iterable[str]) -> list[tuple[str, dt.date]]:
    """Colonnes JJ_MM_AAAA triées chronologiquement, avec leur date."""
    out = []
    for n in names:
        if RE_COL_MENSUELLE.match(n):
            j, m, a = n.split("_")
            try:
                out.append((n, dt.date(int(a), int(m), int(j))))
            except ValueError:
                continue
    return sorted(out, key=lambda x: x[1])


# ---------------------------------------------------------------- R4 data.gouv.fr
RE_ANNEE = re.compile(r"(?<!\d)(19|20)\d{2}(?!\d)")
RE_DATE_8 = re.compile(r"(?<!\d)(\d{2})(\d{2})((?:19|20)\d{2})(?!\d)")  # 01092026 dans un nom de fichier


def resource_rank(res: dict) -> tuple:
    """Clé de tri d'une ressource : (date JJMMAAAA du nom, année max du titre, last_modified)."""
    title = res.get("title") or ""
    url = res.get("url") or ""
    d8 = [dt.date(int(a), int(m), int(j)) for j, m, a in RE_DATE_8.findall(url + " " + title)
          if 1 <= int(m) <= 12 and 1 <= int(j) <= 31]
    years = [int(y.group(0)) for y in RE_ANNEE.finditer(title)]
    return (max(d8) if d8 else dt.date.min, max(years) if years else 0, res.get("last_modified") or "")


def pick_resource(resources: list[dict], title_pattern: str = "", fmt: Optional[str] = None) -> Optional[dict]:
    """Choisit, parmi les ressources dont le titre contient le motif, celle de l'année (ou date) maximale."""
    rx = re.compile(title_pattern, re.I) if title_pattern else None
    cand = [r for r in resources
            if (rx is None or rx.search(r.get("title") or "") or rx.search(r.get("url") or ""))
            and (fmt is None or (r.get("format") or "").lower() == fmt.lower())]
    return max(cand, key=resource_rank) if cand else None


# ---------------------------------------------------------------- R5 bureautique
def clean_number(x) -> Optional[float]:
    """'18 691 ' / '18 691' / '6,2 %' / 90020.0 -> nombre ; '--', '' -> None."""
    if x is None:
        return None
    if isinstance(x, (int, float)):
        return None if (isinstance(x, float) and math.isnan(x)) else float(x)
    s = str(x).replace(" ", "").replace("\xa0", "").replace(" ", "").replace("%", "").replace(",", ".").strip()
    if s in ("", "-", "--", "n.d.", "nd"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


class EnTeteInattendu(ValueError):
    pass


def require_headers(found: Iterable[str], expected: Iterable[str], where: str) -> None:
    """Refuse l'insertion si une colonne attendue manque (changement de format du producteur)."""
    f = {str(x).strip().lower() for x in found if x is not None}
    missing = [e for e in expected if e.lower() not in f]
    if missing:
        raise EnTeteInattendu(f"{where} : en-têtes absents {missing}")


# ---------------------------------------------------------------- R6 Parlement
def majorite_absolue(sieges_pourvus: int) -> int:
    """Majorité des membres composant l'Assemblée, calculée sur les sièges effectivement pourvus."""
    return sieges_pourvus // 2 + 1


def cohesion(decompte: dict) -> Optional[float]:
    """Part des votants exprimés alignés sur la position majoritaire du groupe."""
    v = [int(decompte.get(k, 0) or 0) for k in ("pour", "contre", "abstentions")]
    tot = sum(v)
    return max(v) / tot if tot else None


# ---------------------------------------------------------------- anomalies (pilotage)
def robust_z(history: list[float], current: float) -> Optional[float]:
    """z robuste = (x - médiane) / (1,4826 x MAD). None si moins de 8 points ou MAD nulle."""
    if len(history) < 8:
        return None
    med = statistics.median(history)
    mad = statistics.median(abs(h - med) for h in history)
    if mad == 0:
        return None
    return (current - med) / (1.4826 * mad)


def gravite_from_score(score: Optional[float], seuil: float) -> int:
    if score is None:
        return 0
    a = abs(score)
    if a < seuil:
        return 0 if a < seuil / 2 else 1
    return min(5, 2 + int((a - seuil) // 1.0))


# ---------------------------------------------------------------- brouillard statistique
def cadence_months(cadence: str) -> int:
    return {"mensuelle": 1, "trimestrielle": 3, "annuelle": 12}[cadence]


def add_months(d: dt.date, n: int) -> dt.date:
    y, m = divmod(d.month - 1 + n, 12)
    return dt.date(d.year + y, m + 1, min(d.day, 28))


def periods_elapsed(last_period_start: dt.date, today: dt.date, cadence: str) -> int:
    months = (today.year - last_period_start.year) * 12 + today.month - last_period_start.month
    return max(0, months // cadence_months(cadence) - 1)


def estimation_cabinet(obs: list[tuple[str, float]], cadence: str, today: dt.date) -> Optional[dict]:
    """Persistance amortie : dernière valeur + 50 % de la dernière variation par période écoulée.
    Fourchette = ± |dernière variation| x périodes écoulées (au moins 0,5 % de la valeur)."""
    if not obs:
        return None
    last_p, last_v = obs[-1]
    k = periods_elapsed(period_start(last_p), today, cadence)
    if len(obs) >= 2:
        delta = last_v - obs[-2][1]
        val = last_v + 0.5 * delta * k
        half = max(abs(delta) * max(k, 1), abs(last_v) * 0.005)
        meth = "persistance_amortie"
    else:
        val, half, meth = last_v, abs(last_v) * 0.01, "persistance"
    return {"valeur": round(val, 4), "bas": round(val - half, 4), "haut": round(val + half, 4),
            "methode": meth, "periodes_ecoulees": k}


MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre",
           "octobre", "novembre", "décembre"]


def libelle_brouillard(periode: Optional[str], prochaine: Optional[dt.date], estimee: bool) -> str:
    if not periode:
        return "Aucune donnée certifiée disponible"
    base = f"Donnée {period_label(periode)}"
    if not prochaine:
        return base
    quand = f"{MOIS_FR[prochaine.month - 1]} {prochaine.year}"
    return f"{base} — prochaine publication {'estimée en' if estimee else 'le'} {quand if estimee else prochaine.strftime('%d/%m/%Y')}"
