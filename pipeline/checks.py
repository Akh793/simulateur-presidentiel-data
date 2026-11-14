"""Contrôle de non-régression des sources du Simulateur présidentiel.

Usage : python3 -I -u checks.py [sortie.json]
Chaque contrôle renvoie : statut HTTP, date de la dernière donnée, retard en jours, verdict.
Verdicts : OK (frais), RETARD (au-delà du retard toléré), AUTH (clé requise, attendu),
           ECHEC (injoignable ou format cassé).
"""
import json, re, sys, datetime as dt
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, __file__.rsplit("/", 1)[0])
import hc

TODAY = dt.date.today()

def _d(s):
    """Normalise une date (YYYY, YYYY-MM, YYYY-Qn, YYYY-MM-DD, YYYYMMDD, RFC 1123) en date."""
    s = str(s).strip()
    for fmt in ("%a, %d %b %Y %H:%M:%S GMT",):
        try: return dt.datetime.strptime(s, fmt).date()
        except ValueError: pass
    m = re.match(r"^(\d{4})-Q(\d)$", s)
    if m: return dt.date(int(m[1]), 3 * int(m[2]), 1)
    m = re.match(r"^(\d{4})(\d{2})(\d{2})", s)
    if m and "-" not in s[:8]: return dt.date(int(m[1]), int(m[2]), int(m[3]))
    m = re.match(r"^(\d{4})-(\d{2})(?:-(\d{2}))?", s)
    if m: return dt.date(int(m[1]), int(m[2]), int(m[3] or 1))
    m = re.match(r"^(\d{4})$", s)
    if m: return dt.date(int(m[1]), 12, 31)
    raise ValueError(s)

# ---------- extracteurs ----------
def ods_max(host, ds, field=None, where=None):
    if not field:
        r = hc.fetch(f"https://{host}/api/explore/v2.1/catalog/datasets/{ds}", tries=4)
        if r.status != 200: return r.status, None, f"catalogue HTTP {r.status}"
        f = [x["name"] for x in r.json().get("fields", []) if x["type"] in ("date", "datetime")]
        if not f: return r.status, None, "aucun champ date"
        field = f[0]
    r = hc.fetch(f"https://{host}/api/explore/v2.1/catalog/datasets/{ds}/records",
                 params={"select": f"max({field}) as m", **({"where": where} if where else {})}, tries=4)
    if r.status != 200: return r.status, None, r.text(120)
    return 200, r.json()["results"][0]["m"], field

def ods_widecol(host, ds):
    """Jeux « larges » (une colonne par mois, nommée JJ_MM_AAAA) : la fraîcheur est la dernière colonne."""
    r = hc.fetch(f"https://{host}/api/explore/v2.1/catalog/datasets/{ds}", tries=4)
    if r.status != 200: return r.status, None, ""
    cols = [f["name"] for f in r.json().get("fields", []) if re.match(r"^\d{2}_\d{2}_\d{4}$", f["name"])]
    if not cols: return 200, None, "aucune colonne mensuelle"
    last = max(cols, key=lambda c: (c[6:], c[3:5], c[:2]))
    return 200, f"{last[6:]}-{last[3:5]}-{last[:2]}", f"{len(cols)} colonnes mensuelles"

def bdm(idbank):
    r = hc.fetch(f"https://bdm.insee.fr/series/sdmx/data/SERIES_BDM/{idbank}", params={"lastNObservations": 1}, tries=4)
    t = r.text()
    p = re.findall(r'TIME_PERIOD="([^"]+)" OBS_VALUE="([^"]+)"', t)
    note = "SÉRIE ARRÊTÉE" if re.search(r"[Ss][ée]ries? arr[êe]t", t) else ""
    return r.status, (p[0][0] if p else None), (f"{p[0][1]} {note}".strip() if p else t[:120])

def head(url):
    r = hc.fetch(url, method="HEAD", tries=4)
    lm = r.headers.get("Last-Modified") or r.headers.get("last-modified")
    return r.status, lm, (r.headers.get("Content-Length") or r.headers.get("content-length") or "")

def dg(slug):
    r = hc.fetch(f"https://www.data.gouv.fr/api/1/datasets/{slug}/", tries=4)
    if r.status != 200: return r.status, None, ""
    d = r.json()
    res = sorted((x.get("last_modified") or "" for x in d.get("resources", [])), reverse=True)
    return 200, (res[0] if res else d.get("last_update")), d.get("frequency")

def eurostat(ds, **p):
    p.setdefault("lastTimePeriod", 1)
    r = hc.fetch(f"https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{ds}", params=p, tries=4, timeout=60)
    if r.status != 200: return r.status, None, r.text(120)
    d = r.json(); idx = d["dimension"]["time"]["category"]["index"]
    last = max(idx, key=idx.get); val = d.get("value", {}).get(str(idx[last]))
    return 200, last, val

def vigilance():
    r = hc.fetch("https://files.data.gouv.fr/meteofrance/data/vigilance/vigilance-hexagone-tree.json", tries=4, timeout=60)
    if r.status != 200: return r.status, None, ""
    t = r.json(); y = max(t); m = max(t[y]); d = max(t[y][m]); h = max(t[y][m][d])
    return 200, f"{y}-{m}-{d}", f"bulletin {h} : metropole/{y}/{m}/{d}/{h}/CDP_CARTE_EXTERNE.json"

def indeed():
    r = hc.fetch("https://raw.githubusercontent.com/hiring-lab/job_postings_tracker/master/FR/aggregate_job_postings_FR.csv", tries=4)
    if r.status != 200: return r.status, None, ""
    last = r.text().strip().splitlines()[-1].split(",")
    return 200, last[0], last[1] if len(last) > 1 else ""

def senat_html():
    y = TODAY.year if TODAY.month >= 10 else TODAY.year - 1
    r = hc.fetch(f"https://www.senat.fr/scrutin-public/scr{y}.html", tries=4)
    n = len(set(re.findall(rf'href="{y}/scr{y}-(\d+)\.html"', r.text()))) if r.status == 200 else 0
    return r.status, None, f"session {y} : {n} scrutins listés"

def dila():
    r = hc.fetch("https://echanges.dila.gouv.fr/OPENDATA/JORF/", tries=4)
    f = sorted(re.findall(r'JORF_(\d{8})-\d{6}\.tar\.gz', r.text())) if r.status == 200 else []
    return r.status, (f[-1] if f else None), f"{len(f)} archives"

def status_only(url, method="GET", data=None):
    r = hc.fetch(url, method=method, data=data, tries=3)
    return r.status, None, r.text(80)

def lampions():
    r = hc.fetch("https://lampions.org/ai/scrutin/VTANR5L17V1", tries=3)
    return r.status, (r.json().get("date") if r.status == 200 else None), "API tierce (agrégateur privé)"

# ---------- registre : (id, domaine, libellé, retard toléré en jours, fonction, args) ----------
ODRE, ECO = "odre.opendatasoft.com", "data.economie.gouv.fr"
CHECKS = [
    ("ENE1", "Énergie", "eCO2mix national temps réel (RTE), consommation mesurée", 2, ods_max, (ODRE, "eco2mix-national-tr", "date_heure", "consommation is not null")),
    ("ENE2", "Énergie", "Stock gaz Teréga (ODRÉ)", 75, ods_max, (ODRE, "stock-quotidien-stockages-gaz", "date")),
    ("ENE3", "Énergie", "Stocks GNL terminaux méthaniers (ODRÉ)", 10, ods_max, (ODRE, "evolution-journaliere-stocks-gnl-terminaux-methaniers")),
    ("ENE4", "Énergie", "Prix carburants flux instantané", 2, ods_max, (ECO, "prix-des-carburants-en-france-flux-instantane-v2")),
    ("BUD1", "Budget", "Situations mensuelles budgétaires, séries longues (DGFiP)", 75, ods_widecol, (ECO, "situations-mensuelles-budgetaires-series-longues")),
    ("MAC1", "Économie", "IPC base 2025, ensemble (INSEE 011814630)", 50, bdm, ("011814630",)),
    ("MAC2", "Économie", "Chômage BIT France entière (INSEE 011818543)", 150, bdm, ("011818543",)),
    ("MAC3", "Économie", "Climat des affaires (INSEE 001565530)", 50, bdm, ("001565530",)),
    ("MAC4", "Économie", "Confiance des ménages (INSEE 001587668)", 50, bdm, ("001587668",)),
    ("MAC5", "Économie", "Production industrielle base 2021 (INSEE 010768261)", 80, bdm, ("010768261",)),
    ("MAC6", "Démographie", "Naissances mensuelles (INSEE 000436391)", 80, bdm, ("000436391",)),
    ("MAC7", "Économie", "IPC base 2015 (INSEE 001759970) — doit être ARRÊTÉE", 9999, bdm, ("001759970",)),
    ("FIN1", "Finances", "Taux long terme FR mensuel (Eurostat irt_lt_mcby_m)", 60, eurostat, ("irt_lt_mcby_m",), {"geo": "FR"}),
    ("FIN2", "Finances", "Dette publique trimestrielle (Eurostat gov_10q_ggdebt)", 200, eurostat, ("gov_10q_ggdebt",), {"geo": "FR", "unit": "PC_GDP", "sector": "S13", "na_item": "GD"}),
    ("FIN3", "Finances", "Solde des services FR mensuel (Eurostat bop_c6_m)", 120, eurostat, ("bop_c6_m",), {"geo": "FR", "bop_item": "S", "partner": "WRL_REST", "stk_flow": "BAL", "currency": "MIO_EUR"}),
    ("PAR1", "Parlement", "AN scrutins XVIIe (ZIP)", 10, head, ("https://data.assemblee-nationale.fr/static/openData/repository/17/loi/scrutins/Scrutins.json.zip",)),
    ("PAR2", "Parlement", "AN députés actifs AMO10 (ZIP)", 10, head, ("https://data.assemblee-nationale.fr/static/openData/repository/17/amo/deputes_actifs_mandats_actifs_organes/AMO10_deputes_actifs_mandats_actifs_organes.json.zip",)),
    ("PAR3", "Parlement", "Sénat DOSLEG (dump SQL, scrutins + votes nominatifs)", 5, head, ("https://data.senat.fr/data/dosleg/dosleg.zip",)),
    ("PAR4", "Parlement", "Sénat scrutins (pages HTML de session)", 9999, senat_html, ()),
    ("PAR5", "Parlement", "Lampions, scrutin unitaire (tiers)", 9999, lampions, ()),
    ("JUS1", "Justice", "JORF quotidien (DILA)", 3, dila, ()),
    ("JUS2", "Justice", "Population écrouée mensuelle (data.gouv)", 75, dg, ("statistique-mensuelle-de-la-population-ecrouee-et-detenue-en-france",)),
    ("JUS3", "Justice", "Baromètre d'application des lois (data.gouv)", 40, dg, ("donnees-du-barometre-de-lapplication-des-lois",)),
    ("INT1", "Intérieur", "Demandes d'asile OFPRA (data.gouv)", 400, dg, ("demandes-dasile-et-de-statut-dapatride-deposees-devant-lofpra",)),
    ("MET1", "Météo", "Vigilance Météo-France (archive data.gouv)", 1, vigilance, ()),
    ("MET2", "Météo", "Climatologie quotidienne Météo-France (data.gouv)", 10, dg, ("donnees-climatologiques-de-base-quotidiennes",)),
    ("TRA1", "Travail", "Demandeurs d'emploi France Travail (data.gouv)", 100, dg, ("demandeurs-demploi-inscrits-a-france-travail",)),
    ("TRA2", "Travail", "Offres en ligne Indeed Hiring Lab FR (non officiel)", 10, indeed, ()),
    ("TRA3", "Travail", "API Offres France Travail (clé requise)", 9999, status_only, ("https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?range=0-0",)),
    ("CUL1", "Culture", "Fréquentation des musées de France (data.gouv)", 400, dg, ("frequentation-des-musees-de-france-1",)),
]

def run(c):
    cid, dom, lab, lag, fn, args = c[:6]
    kw = c[6] if len(c) > 6 else {}
    st, last, info = None, None, ""
    for attempt in range(2):  # une relance si la réponse est tronquée (JSON invalide)
        try:
            st, last, info = fn(*args, **kw); break
        except Exception as e:
            st, last, info = None, None, f"{type(e).__name__}: {e}"[:160]
    age = None
    if last:
        try: age = (TODAY - _d(last)).days
        except Exception: pass
    if st in (401, 403) and cid.startswith("TRA3"): verdict = "AUTH"
    elif st != 200: verdict = "ECHEC"
    elif "ARRÊTÉE" in str(info): verdict = "ARRÊTÉE" if not cid == "MAC7" else "OK"
    elif age is not None and age > lag: verdict = "RETARD"
    else: verdict = "OK"
    return {"id": cid, "domaine": dom, "source": lab, "http": st, "derniere_donnee": str(last)[:25] if last else None,
            "age_jours": age, "tolerance_jours": lag, "verdict": verdict, "info": str(info)[:160]}

if __name__ == "__main__":
    with ThreadPoolExecutor(max_workers=6) as ex:
        out = list(ex.map(run, CHECKS))
    for o in out:
        print(f"{o['verdict']:8} {o['id']:5} {o['http']!s:5} {str(o['derniere_donnee']):26} age={o['age_jours']!s:5} {o['source']} | {o['info'][:90]}", flush=True)
    if len(sys.argv) > 1:
        json.dump({"date": str(TODAY), "resultats": out}, open(sys.argv[1], "w"), ensure_ascii=False, indent=1)
