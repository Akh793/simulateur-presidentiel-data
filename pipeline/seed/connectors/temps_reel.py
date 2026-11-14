"""Indicateurs de pilotage à cadence quotidienne ou hebdomadaire."""
from __future__ import annotations

import csv
import datetime as dt
import gzip
import io
import os
import re
import statistics
from collections import Counter, defaultdict
from urllib.parse import urlsplit, urlunsplit

from .. import net, rules
from . import Lecture, echec, today_paris
from .stat import ods_records

ODRE = "odre.opendatasoft.com"
ECO = "data.economie.gouv.fr"
HUBEAU = "https://hubeau.eaufrance.fr/api"

# ------------------------------------------------------------------ ENE1 eCO2mix
ECO2MIX_COLS = ["date_heure", "date", "heure", "consommation", "prevision_j", "nucleaire", "eolien", "solaire",
                "hydraulique", "gaz", "charbon", "fioul", "bioenergies", "pompage", "ech_physiques", "taux_co2"]


def eco2mix_export(since_iso: str) -> list[dict]:
    """Toutes les lignes mesurées (consommation non nulle) depuis `since_iso`, via l'export CSV (pas de limite à 100)."""
    url = f"https://{ODRE}/api/explore/v2.1/catalog/datasets/eco2mix-national-tr/exports/csv"
    txt = net.get_text(url, {"select": ",".join(ECO2MIX_COLS),
                             "where": f"consommation is not null and date_heure >= '{since_iso}'",
                             "order_by": "date_heure", "delimiter": ";"}, timeout=120)
    return list(csv.DictReader(io.StringIO(txt.lstrip("\ufeff")), delimiter=";"))  # l'export commence par un BOM


def eco2mix(rows: list[dict]) -> Lecture:
    """Consommation moyenne journalière (MW) sur les jours complets ; mix du dernier jour complet."""
    if not rows:
        return Lecture(ok=False, http=200, info="export eCO2mix vide")
    by_day = defaultdict(list)
    for r in rows:
        by_day[r["date"]].append(r)
    jours = sorted(by_day)
    complets = [j for j in jours if len(by_day[j]) >= 90]  # 96 quarts d'heure attendus
    if not complets:
        return Lecture(ok=False, http=200, info="aucun jour complet dans l'export")
    pts = [(j, round(statistics.fmean(float(x["consommation"]) for x in by_day[j]), 1)) for j in complets]
    last = by_day[complets[-1]]

    def moy(col):
        vals = [float(x[col]) for x in last if x.get(col) not in (None, "")]
        return statistics.fmean(vals) if vals else 0.0

    prod = {c: moy(c) for c in ("nucleaire", "eolien", "solaire", "hydraulique", "gaz", "charbon", "fioul", "bioenergies")}
    tot = sum(v for v in prod.values() if v > 0) or 1.0
    comp = {f"part_{k}_pct": round(100 * v / tot, 1) for k, v in prod.items()}
    comp["taux_co2_g_kwh"] = round(moy("taux_co2"), 1)
    comp["solde_echanges_mw"] = round(moy("ech_physiques"), 1)
    comp["pointe_mw"] = max(float(x["consommation"]) for x in last)
    return Lecture(ok=True, http=200, derniere=complets[-1], points=pts, composantes=comp,
                   info=f"{len(rows)} quarts d'heure, {len(complets)} jours complets")


# ------------------------------------------------------------------ ENE4 carburants
def carburants() -> Lecture:
    """Prix moyen national des stations ayant mis à jour leur prix depuis 3 jours ; ruptures en cours."""
    ds = "prix-des-carburants-en-france-flux-instantane-v2"
    lim = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=3)).strftime("%Y-%m-%dT%H:%M:%S")
    try:
        prix = ods_records(ECO, ds, {"select": "avg(gazole_prix) as gazole, avg(e10_prix) as e10, avg(sp98_prix) as sp98, "
                                               "count(*) as n, max(gazole_maj) as maj",
                                     "where": f"gazole_maj >= '{lim}'"})["results"][0]
        rupt = ods_records(ECO, ds, {"select": "count(*) as n", "where": "gazole_rupture_type='temporaire'"})["results"][0]
    except Exception as e:  # noqa: BLE001
        return echec(e)
    if not prix.get("gazole"):
        return Lecture(ok=False, http=200, info="aucun prix gazole récent")
    jour = (prix.get("maj") or "")[:10] or today_paris().isoformat()
    return Lecture(ok=True, http=200, derniere=jour, points=[(jour, round(prix["gazole"], 4))],
                   composantes={"e10_eur_l": round(prix.get("e10") or 0, 4), "sp98_eur_l": round(prix.get("sp98") or 0, 4),
                                "stations_gazole_maj_3j": prix.get("n") or 0, "stations_rupture_gazole": rupt.get("n") or 0},
                   info=f"{prix.get('n')} stations à jour")


# ------------------------------------------------------------------ MET1 vigilance
VIGI_TREE = "https://files.data.gouv.fr/meteofrance/data/vigilance/vigilance-hexagone-tree.json"
VIGI_FILE = "https://files.data.gouv.fr/meteofrance/data/vigilance/metropole/{y}/{m}/{d}/{h}/CDP_CARTE_EXTERNE.json"
RE_DEPT = re.compile(r"^(\d{2}|2A|2B)$")


def vigilance() -> Lecture:
    """Indice de vigilance du jour J : jaune = 1, orange = 3, rouge = 9 points par département."""
    try:
        t = net.get_json(VIGI_TREE, timeout=90)
        y = max(t); m = max(t[y]); d = max(t[y][m]); h = max(t[y][m][d])
        carte = net.get_json(VIGI_FILE.format(y=y, m=m, d=d, h=h))
    except Exception as e:  # noqa: BLE001
        return echec(e)
    prod = carte.get("product", carte)
    per = next((p for p in prod.get("periods", []) if p.get("echeance") == "J"), None)
    if not per:
        return Lecture(ok=False, http=200, info="période J absente du bulletin")
    cnt = Counter()
    for dom in per.get("timelaps", {}).get("domain_ids", []):
        if RE_DEPT.match(str(dom.get("domain_id", ""))):
            cnt[int(dom.get("max_color_id", 1))] += 1
    indice = cnt[2] * 1 + cnt[3] * 3 + cnt[4] * 9
    jour = f"{y}-{m}-{d}"
    return Lecture(ok=True, http=200, derniere=jour, points=[(jour, float(indice))],
                   composantes={"departements_jaune": cnt[2], "departements_orange": cnt[3], "departements_rouge": cnt[4]},
                   meta={"bulletin": f"{h[:2]}:{h[2:4]} UTC", "maj": prod.get("update_time")},
                   info=f"bulletin {y}-{m}-{d} {h} : {dict(cnt)}")


# ------------------------------------------------------------------ MET2 climatologie
CLIMATO_SLUG = "donnees-climatologiques-de-base-quotidiennes"
PANEL_DEPTS = ["13", "21", "29", "31", "33", "35", "44", "59", "67", "69", "75", "86"]


def climatologie(depts: list[str] = PANEL_DEPTS) -> Lecture:
    """TX moyenne nationale (moyenne des moyennes départementales) et écart au même jour un an plus tôt.
    Pas de normale 1991-2020 : l'écart à N-1 est un repère, pas une anomalie climatique."""
    try:
        resources = net.get_json(f"https://www.data.gouv.fr/api/1/datasets/{CLIMATO_SLUG}/").get("resources", [])
    except Exception as e:  # noqa: BLE001
        return echec(e)
    par_jour: dict[str, list[float]] = defaultdict(list)
    lus = 0
    for dep in depts:
        res = rules.pick_resource(resources, rf"QUOT_departement_{dep}_periode_.*RR-T-Vent")  # règle n° 4
        if not res:
            continue
        try:
            raw = gzip.decompress(net.get(res["url"], timeout=120).body).decode("utf-8", "replace")
        except Exception:  # noqa: BLE001
            continue
        reader = csv.reader(io.StringIO(raw), delimiter=";")
        head = next(reader)
        rules.require_headers(head, ["NUM_POSTE", "AAAAMMJJ", "TX"], f"climatologie {dep}")  # règle n° 5
        i_d, i_tx = head.index("AAAAMMJJ"), head.index("TX")
        dep_jour: dict[str, list[float]] = defaultdict(list)
        for row in reader:
            if len(row) > i_tx and row[i_tx] not in ("", None):
                v = rules.clean_number(row[i_tx])
                if v is not None:
                    dep_jour[row[i_d]].append(v)
        for j, vals in dep_jour.items():
            par_jour[j].append(statistics.fmean(vals))
        lus += 1
    if not par_jour:
        return Lecture(ok=False, http=200, info="aucun fichier départemental lisible")
    jours = sorted(j for j, v in par_jour.items() if len(v) >= max(3, lus // 2))
    pts = [(f"{j[:4]}-{j[4:6]}-{j[6:]}", round(statistics.fmean(par_jour[j]), 2)) for j in jours]
    serie = dict(pts)
    last_d, last_v = pts[-1]
    a_1 = (dt.date.fromisoformat(last_d) - dt.timedelta(days=364)).isoformat()
    comp = {"departements_lus": lus}
    if a_1 in serie:
        comp["ecart_annee_precedente_c"] = round(last_v - serie[a_1], 2)
    # anomalie calculée sur l'écart au même jour N-1 (neutralise la saisonnalité), pas sur le niveau brut
    ecarts = [round(v - serie[(dt.date.fromisoformat(d) - dt.timedelta(days=364)).isoformat()], 2)
              for d, v in pts if (dt.date.fromisoformat(d) - dt.timedelta(days=364)).isoformat() in serie]
    return Lecture(ok=True, http=200, derniere=last_d, points=pts[-120:], composantes=comp,
                   meta={"serie_anomalie": ecarts[-120:]}, info=f"{lus} départements, dernier jour {last_d}")


# ------------------------------------------------------------------ EAU Hub'Eau
def _https(url: str) -> str:
    """Hub'Eau renvoie parfois `next` en http:// : on le reconstruit en HTTPS (jamais de rétrogradation)."""
    p = urlsplit(url)
    return urlunsplit(("https", p.netloc, p.path, p.query, p.fragment))


def hubeau_pages(url: str, params: dict, max_pages: int = 20) -> list[dict]:
    """Pagination Hub'Eau : accepte HTTP 206 (réponse partielle) et suit `next`."""
    out, page, nxt = [], 0, None
    while page < max_pages:
        d = net.get_json(nxt, None) if nxt else net.get_json(url, params)
        out.extend(d.get("data", []))
        nxt = d.get("next")
        if not nxt:
            break
        nxt = _https(nxt)
        page += 1
    return out


DEBIT_STATIONS = {  # stations débitmétriques vérifiées le 14/11/2026 (référentiel Hub'Eau v2)
    "F700000103": "La Seine à Paris - Austerlitz",
    "V720001002": "Le Rhône à Tarascon - DREAL",
    "M530001010": "La Loire à Montjean-sur-Loire",
    "O900001002": "La Garonne à Tonneins",
}


def debits() -> Lecture:
    """Somme des débits moyens journaliers (QmnJ) des 4 grands fleuves, en m³/s."""
    deb = (today_paris() - dt.timedelta(days=60)).isoformat()
    try:
        rows = hubeau_pages(f"{HUBEAU}/v2/hydrometrie/obs_elab",
                            {"code_entite": ",".join(DEBIT_STATIONS), "grandeur_hydro_elab": "QmnJ",
                             "date_debut_obs_elab": deb, "size": 1000})
    except Exception as e:  # noqa: BLE001
        return echec(e)
    par = defaultdict(dict)
    for r in rows:
        if r.get("resultat_obs_elab") is not None:
            par[r["date_obs_elab"][:10]][r["code_station"]] = float(r["resultat_obs_elab"]) / 1000.0  # l/s -> m³/s
    # stations présentes au dernier jour publié ; série sur les jours où ces mêmes stations sont toutes présentes
    if not par:
        return Lecture(ok=False, http=206, info="aucune observation QmnJ")
    presentes = set(par[max(par)])
    jours = sorted(j for j, v in par.items() if presentes <= set(v))
    if len(presentes) < 3 or not jours:
        return Lecture(ok=False, http=206, info=f"stations disponibles insuffisantes : {sorted(presentes)}")
    par = {j: {k: par[j][k] for k in presentes} for j in jours}
    pts = [(j, round(sum(par[j].values()), 1)) for j in jours]
    comp = {f"debit_{code}_m3s": round(v, 1) for code, v in par[jours[-1]].items()}
    manq = sorted(set(DEBIT_STATIONS) - presentes)
    return Lecture(ok=True, http=206, derniere=jours[-1], points=pts, composantes=comp,
                   notes=[f"Stations absentes du dernier jour : {', '.join(manq)}"] if manq else [],
                   info=f"{len(jours)} jours, {len(presentes)}/{len(DEBIT_STATIONS)} stations")


PIEZO_DEPTS = ["02", "14", "17", "21", "31", "33", "37", "45", "51", "59", "67", "86"]


def choisir_panel_piezo(depts: list[str] = PIEZO_DEPTS) -> dict[str, str]:
    """Calibration : par département, la station la plus documentée et encore active (mesure < 10 jours)."""
    lim = (today_paris() - dt.timedelta(days=10)).isoformat()
    panel = {}
    for dep in depts:
        try:
            st = net.get_json(f"{HUBEAU}/v1/niveaux_nappes/stations", {"code_departement": dep, "size": 200, "format": "json"})
        except Exception:  # noqa: BLE001
            continue
        ok = [s for s in st.get("data", []) if (s.get("date_fin_mesure") or "") >= lim]
        if ok:
            best = max(ok, key=lambda s: s.get("nb_mesures_piezo") or 0)
            panel[best["code_bss"]] = f"{dep} {best.get('nom_commune') or ''}".strip()
    return panel


def nappes(panel: dict[str, str]) -> Lecture:
    """Variation moyenne du niveau des nappes sur 7 jours (m) sur un panel fixe de piézomètres."""
    if not panel:
        return Lecture(ok=False, info="panel piézométrique vide")
    variations, par_jour = [], defaultdict(list)
    for bss in panel:
        try:
            rows = net.get_json(f"{HUBEAU}/v1/niveaux_nappes/chroniques_tr",
                                {"code_bss": bss, "size": 300, "sort": "desc", "fields": "date_mesure,niveau_eau_ngf"}).get("data", [])
        except Exception:  # noqa: BLE001
            continue
        jour = defaultdict(list)
        for r in rows:
            if r.get("niveau_eau_ngf") is not None:
                jour[r["date_mesure"][:10]].append(float(r["niveau_eau_ngf"]))
        if len(jour) < 2:
            continue
        js = sorted(jour)
        moy = {j: statistics.fmean(jour[j]) for j in js}
        ref = next((j for j in js if j <= (dt.date.fromisoformat(js[-1]) - dt.timedelta(days=7)).isoformat()), js[0])
        variations.append(moy[js[-1]] - moy[ref])
        for j in js:
            par_jour[j].append(moy[j] - moy[js[0]])
    if not variations:
        return Lecture(ok=False, http=206, info="aucune chronique exploitable")
    last = max(par_jour)
    v = round(statistics.fmean(variations), 3)
    return Lecture(ok=True, http=206, derniere=last, points=[(last, v)],
                   composantes={"piezometres": len(variations), "part_en_baisse_pct": round(100 * sum(x < 0 for x in variations) / len(variations), 1)},
                   info=f"{len(variations)}/{len(panel)} piézomètres")


# ------------------------------------------------------------------ SAN1 Odissé
ODISSE = "odisse.santepubliquefrance.fr"
ODISSE_JEUX = {
    "grippe": ("grippe-passages-aux-urgences-et-actes-sos-medecins-france", "taux_passages_grippe_sau"),
    "covid19": ("covid-19-passages-aux-urgences-et-actes-sos-medecins-france", "taux_passages_covid_sau"),
    "gastro": ("gastro-enterite-aigue-passages-aux-urgences-et-actes-sos-medecins-france", "taux_passages_gastro_sau"),
    # bronchiolite exclue : publiée pour la seule classe « 0 an », non convertible en volume tous âges
}


def odisse(passages_annuels: float) -> Lecture:
    """Passages hebdomadaires estimés = taux pour 100 000 passages x (passages annuels SAE / 52,18)."""
    hebdo = passages_annuels / 52.1786
    par_sem: dict[str, dict[str, float]] = defaultdict(dict)
    notes = []
    for patho, (ds, champ) in ODISSE_JEUX.items():
        try:
            d = ods_records(ODISSE, ds, {"where": "sursaud_cl_age_gene='Tous âges'", "order_by": "date_complet desc",
                                         "limit": 60, "select": f"date_complet, {champ}"})
        except Exception as e:  # noqa: BLE001
            notes.append(f"{patho} : {type(e).__name__}")
            continue
        for r in d.get("results", []):
            if r.get(champ) is not None:
                par_sem[r["date_complet"]][patho] = float(r[champ]) / 100000.0 * hebdo
    sem = sorted(s for s, v in par_sem.items() if len(v) == len(ODISSE_JEUX) - len(notes))
    if not sem:
        return Lecture(ok=False, http=200, info="; ".join(notes) or "aucune semaine complète")
    pts = [(s, round(sum(par_sem[s].values()))) for s in sem]
    comp = {f"passages_{k}": round(v) for k, v in par_sem[sem[-1]].items()}
    return Lecture(ok=True, http=200, derniere=sem[-1], points=pts, composantes=comp, notes=notes,
                   info=f"{len(sem)} semaines ; base SAE {passages_annuels:.0f} passages/an")


# ------------------------------------------------------------------ TRA2 / TRA3 emploi
INDEED_CSV = "https://raw.githubusercontent.com/hiring-lab/job_postings_tracker/master/FR/aggregate_job_postings_FR.csv"


def indeed() -> Lecture:
    try:
        txt = net.get_text(INDEED_CSV)
    except Exception as e:  # noqa: BLE001
        return echec(e)
    rows = [r for r in csv.DictReader(io.StringIO(txt)) if r.get("variable", "total postings") == "total postings"]
    if not rows:
        rows = list(csv.DictReader(io.StringIO(txt)))
    pts = [(r["date"], float(r["indeed_job_postings_index_SA"])) for r in rows if r.get("indeed_job_postings_index_SA")]
    pts.sort()
    return Lecture(ok=True, http=200, derniere=pts[-1][0], points=pts[-120:],
                   info="indice Indeed CVS, base 100 au 1er février 2020 (source non officielle)")


FT_TOKEN = "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire"
FT_SEARCH = "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search"


def france_travail() -> Lecture:
    """Offres créées la veille (API Offres v2). Nécessite FT_CLIENT_ID / FT_CLIENT_SECRET ; sinon Lecture en échec 401 attendu."""
    cid, sec = os.environ.get("FT_CLIENT_ID"), os.environ.get("FT_CLIENT_SECRET")
    if not cid or not sec:
        return Lecture(ok=False, http=401, info="clé France Travail non configurée (repli Indeed)")
    try:
        from urllib.parse import urlencode
        tok = net.get_json(FT_TOKEN, method="POST",
                           data=urlencode({"grant_type": "client_credentials", "client_id": cid, "client_secret": sec,
                                           "scope": "api_offresdemploiv2 o2dsoffre"}),
                           headers={"Content-Type": "application/x-www-form-urlencoded"})["access_token"]
        hier = today_paris() - dt.timedelta(days=1)
        res = net.get(FT_SEARCH, {"minCreationDate": f"{hier}T00:00:00Z", "maxCreationDate": f"{hier}T23:59:59Z", "range": "0-0"},
                      headers={"Authorization": f"Bearer {tok}"}, ok=(200, 206))
    except Exception as e:  # noqa: BLE001
        return echec(e)
    cr = next((v for k, v in res.headers.items() if k.lower() == "content-range"), "")
    m = re.search(r"/(\d+)$", cr)
    if not m:
        return Lecture(ok=False, http=res.status, info=f"Content-Range illisible : {cr!r}")
    return Lecture(ok=True, http=res.status, derniere=hier.isoformat(), points=[(hier.isoformat(), float(m.group(1)))],
                   info="offres créées la veille")


# ------------------------------------------------------------------ MOB1 SNCF GTFS-RT
GTFS_TRIP_UPDATES = "https://proxy.transport.data.gouv.fr/resource/sncf-gtfs-rt-trip-updates"


def sncf_snapshot() -> dict:
    """Instantané : trajets suivis, supprimés, en retard de 5 min ou plus au dernier arrêt connu."""
    from google.transit import gtfs_realtime_pb2  # dépendance gtfs-realtime-bindings
    body = net.get(GTFS_TRIP_UPDATES, timeout=90).body
    fm = gtfs_realtime_pb2.FeedMessage()
    fm.ParseFromString(body)
    trips = canc = late = 0
    for e in fm.entity:
        if not e.HasField("trip_update"):
            continue
        trips += 1
        tu = e.trip_update
        if tu.trip.schedule_relationship == 3:  # CANCELED
            canc += 1
            continue
        stus = [s for s in tu.stop_time_update if s.HasField("arrival") and s.arrival.HasField("delay")]
        if stus and stus[-1].arrival.delay >= 300:
            late += 1
    return {"ts": dt.datetime.fromtimestamp(fm.header.timestamp, dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "trajets": trips, "supprimes": canc, "retard_5min": late}


def sncf(samples: list[dict]) -> Lecture:
    """Part journalière (%) des trajets supprimés ou en retard >= 5 min, moyenne des instantanés horaires."""
    if not samples:
        return Lecture(ok=False, info="aucun instantané GTFS-RT")
    par = defaultdict(list)
    for s in samples:
        if int(s["trajets"]) > 0:
            par[s["ts"][:10]].append(100.0 * (int(s["supprimes"]) + int(s["retard_5min"])) / int(s["trajets"]))
    jours = sorted(par)
    pts = [(j, round(statistics.fmean(par[j]), 2)) for j in jours]
    last = samples[-1]
    return Lecture(ok=True, http=200, derniere=jours[-1], points=pts[-120:],
                   composantes={"instantanes_du_jour": len(par[jours[-1]]), "trajets_dernier_instantane": int(last["trajets"]),
                                "supprimes_dernier_instantane": int(last["supprimes"])},
                   info=f"{len(samples)} instantanés archivés")
