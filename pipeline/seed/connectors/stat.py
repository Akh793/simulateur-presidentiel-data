"""Séries statistiques de bilan : INSEE BDM, Eurostat, Opendatasoft (DGFiP, Urssaf, ODRÉ)."""
from __future__ import annotations

from .. import net, rules
from . import Lecture, echec

EUROSTAT = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{ds}"


def bdm(idbank: str, n_obs: int = 2) -> Lecture:
    """Règle n° 1 : SDMX direct sans clé, ordre rétabli, série arrêtée => Lecture morte."""
    try:
        res = net.get(rules.BDM_URL.format(idbank=idbank), {"lastNObservations": n_obs})
        parsed = rules.parse_bdm(res.body.decode("utf-8", "replace"), idbank)
    except Exception as e:  # noqa: BLE001
        return echec(e)
    obs = parsed["obs"]
    if not obs:
        return Lecture(ok=False, http=200, info=f"BDM {idbank} : aucune observation")
    pts = [(rules.period_start(p).isoformat(), v) for p, v in obs]
    return Lecture(ok=True, http=200, derniere=pts[-1][0], info=parsed["titre"][:160], points=pts,
                   meta={"periodes": [rules.period_label(p) for p, _ in obs], "publiee_le": parsed["last_update"],
                         "titre": parsed["titre"]})


def eurostat(ds: str, params: dict, n_obs: int = 2) -> Lecture:
    p = dict(params)
    p["lastTimePeriod"] = n_obs
    try:
        d = net.get_json(EUROSTAT.format(ds=ds), p)
    except Exception as e:  # noqa: BLE001
        return echec(e)
    idx = d.get("dimension", {}).get("time", {}).get("category", {}).get("index", {})
    vals = d.get("value", {})
    obs = sorted(((t, vals[str(i)]) for t, i in idx.items() if str(i) in vals), key=lambda x: rules.period_start(x[0]))
    if not obs:
        return Lecture(ok=False, http=200, info=f"Eurostat {ds} {params} : réponse vide (poste non publié ?)")
    pts = [(rules.period_start(t).isoformat(), float(v)) for t, v in obs]
    return Lecture(ok=True, http=200, derniere=pts[-1][0], info=f"{ds} {params.get('geo', '')}", points=pts,
                   meta={"periodes": [rules.period_label(t) for t, _ in obs], "publiee_le": d.get("updated", "")[:10] or None})


def ods_records(host: str, ds: str, params: dict) -> dict:
    return net.get_json(f"https://{host}/api/explore/v2.1/catalog/datasets/{ds}/records", params)


def ods_fields(host: str, ds: str) -> list[dict]:
    return net.get_json(f"https://{host}/api/explore/v2.1/catalog/datasets/{ds}").get("fields", [])


def ods_max_date(host: str, ds: str, date_field: str, value_field: str | None) -> str | None:
    """Règle n° 2 : max(date) filtré sur la valeur renseignée."""
    d = ods_records(host, ds, rules.ods_freshness_params(date_field, value_field))
    res = d.get("results") or [{}]
    return res[0].get("m")


def dgfip_solde_budgetaire() -> Lecture:
    """Règle n° 3 : jeu large (une colonne par mois). Solde budgétaire cumulé depuis janvier, en euros."""
    host, ds = "data.economie.gouv.fr", "situations-mensuelles-budgetaires-series-longues"
    try:
        cols = rules.wide_month_columns(f["name"] for f in ods_fields(host, ds))
        d = ods_records(host, ds, {"where": "categorie='Solde budgétaire' AND ligne_d_information='Solde budgétaire'", "limit": 1})
        row = (d.get("results") or [None])[0]
    except Exception as e:  # noqa: BLE001
        return echec(e)
    if not row or not cols:
        return Lecture(ok=False, http=200, info="ligne « Solde budgétaire » ou colonnes mensuelles introuvables")
    pts = [(c_date.replace(day=1).isoformat(), float(row[c])) for c, c_date in cols if row.get(c) is not None]
    return Lecture(ok=True, http=200, derniere=pts[-1][0], info=f"{len(cols)} colonnes mensuelles", points=pts,
                   meta={"periodes": [p[:7] for p, _ in pts], "publiee_le": None})


def urssaf_masse_salariale() -> Lecture:
    host, ds = "open.urssaf.fr", "masse-salariale-du-secteur-prive-france-entiere"
    try:
        d = ods_records(host, ds, {"order_by": "dernier_jour_trim desc", "limit": 8})
    except Exception as e:  # noqa: BLE001
        return echec(e)
    rows = sorted(d.get("results") or [], key=lambda r: r["dernier_jour_trim"])
    pts, per = [], []
    for r in rows:
        v = r.get("ms_t_60j_cvs") or r.get("ms_t_50j_cvs")
        if v is None:
            continue
        an, tri = int(str(r["annee"])[:4]), int(r["trimestre"])
        per.append(f"{an}-T{tri}")
        pts.append((rules.period_start(f"{an}-T{tri}").isoformat(), float(v)))
    if not pts:
        return Lecture(ok=False, http=200, info="aucune masse salariale renseignée")
    last = rows[-1]
    return Lecture(ok=True, http=200, derniere=pts[-1][0], info="CVS ; estimation à 60 jours si disponible, sinon 50 jours",
                   points=pts, meta={"periodes": per, "publiee_le": None},
                   composantes={"glissement_annuel_pct": float(last.get("ga_ms_t_60j_cvs") or last.get("ga_ms_t_50j_cvs") or 0.0)})


def odre_stock_gaz_terega() -> Lecture:
    host, ds = "odre.opendatasoft.com", "stock-quotidien-stockages-gaz"
    try:
        d = ods_records(host, ds, {"where": "source='Teréga'", "order_by": "date desc", "limit": 40})
    except Exception as e:  # noqa: BLE001
        return echec(e)
    rows = sorted(d.get("results") or [], key=lambda r: r["date"])
    if not rows:
        return Lecture(ok=False, http=200, info="aucune ligne Teréga")
    # dernière journée et dernière journée du mois précédent (comparaison mois sur mois)
    last = rows[-1]
    prev = [r for r in rows if r["date"][:7] < last["date"][:7]]
    rows = ([prev[-1]] if prev else []) + [last]
    pts = [(r["date"][:10], float(r["stock_fin_de_journee"])) for r in rows]
    return Lecture(ok=True, http=200, derniere=pts[-1][0], points=pts,
                   info="Teréga seul : Storengy absent d'ODRÉ depuis le 30/06/2025",
                   meta={"periodes": [p[:7] for p, _ in pts], "publiee_le": None},
                   notes=["Stock partiel : Teréga uniquement (Storengy non publié sur ODRÉ depuis le 30/06/2025)."])
