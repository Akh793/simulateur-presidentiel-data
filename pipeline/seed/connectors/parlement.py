"""Parlement (règle n° 6) : téléchargement conditionnel, dédoublonnage par acteur, cohésion des groupes.

Aucun nom d'élu ne sort de ce module : la graine ne contient que des effectifs et des taux,
conformément à l'interdiction de représenter des personnalités politiques réelles.
"""
from __future__ import annotations

import datetime as dt
import io
import json
import re
import zipfile
from collections import Counter, defaultdict
from typing import Callable, Optional

from .. import net, rules

AN_BASE = "https://data.assemblee-nationale.fr/static/openData/repository/{leg}"
AN_AMO10 = AN_BASE + "/amo/deputes_actifs_mandats_actifs_organes/AMO10_deputes_actifs_mandats_actifs_organes.json.zip"
AN_SCRUTINS = AN_BASE + "/loi/scrutins/Scrutins.json.zip"
SENAT_GENERAL = "https://data.senat.fr/data/senateurs/ODSEN_GENERAL.json"
SENAT_DOSLEG = "https://data.senat.fr/data/dosleg/dosleg.zip"


def _hdr(res, name):
    return next((v for k, v in (res.headers or {}).items() if k.lower() == name.lower()), None)


def conditionnel(etat, url: str, parse: Callable[[bytes], dict], force: bool = False) -> tuple[dict, str, Optional[str]]:
    """HEAD d'abord ; si ETag et Last-Modified sont inchangés, réutiliser le résultat analysé en cache."""
    head = net.get(url, method="HEAD", timeout=60)
    etag, lm = _hdr(head, "ETag"), _hdr(head, "Last-Modified")
    cache = etat.cache_get(url)
    if cache and not force and cache["payload"] is not None and cache["etag"] == etag and cache["last_modified"] == lm:
        return cache["payload"], "cache", lm
    payload = parse(net.get(url, timeout=300).body)
    etat.cache_put(url, etag, lm, payload)
    return payload, "telecharge", lm


def detect_legislature(start: int = 17, horizon: int = 3) -> int:
    """La législature en cours est la plus haute dont l'archive AMO10 existe (HEAD 200)."""
    leg = start
    for cand in range(start + 1, start + 1 + horizon):
        try:
            if net.get(AN_AMO10.format(leg=cand), method="HEAD", passes=1, tries=2).status == 200:
                leg = cand
        except net.FetchError:
            break
    return leg


# ------------------------------------------------------------------ Assemblée nationale
def parse_amo10(content: bytes) -> dict:
    z = zipfile.ZipFile(io.BytesIO(content))
    organes, acteurs = {}, []
    for n in z.namelist():
        if not n.endswith(".json"):
            continue
        d = json.loads(z.read(n))
        if "organe" in d:
            o = d["organe"]
            if o.get("codeType") == "GP" and not (o.get("viMoDe") or {}).get("dateFin"):
                organes[o["uid"]] = {"code": o.get("libelleAbrev") or o["uid"], "libelle": o.get("libelle") or ""}
        elif "acteur" in d:
            acteurs.append(d["acteur"])
    sieges = Counter()
    en_exercice = 0
    vus = set()
    for a in acteurs:
        uid = a["uid"]["#text"] if isinstance(a.get("uid"), dict) else a.get("uid")
        if uid in vus:  # dédoublonnage par acteur.uid
            continue
        vus.add(uid)
        mandats = a.get("mandats", {}).get("mandat", [])
        mandats = [mandats] if isinstance(mandats, dict) else mandats
        actifs = [m for m in mandats if not m.get("dateFin")]
        if not any(m.get("typeOrgane") == "ASSEMBLEE" for m in actifs):
            continue
        en_exercice += 1
        gps = sorted((m for m in actifs if m.get("typeOrgane") == "GP"), key=lambda m: m.get("dateDebut") or "")
        ref = None
        if gps:
            org = gps[-1].get("organes", {}).get("organeRef")
            ref = org[0] if isinstance(org, list) else org
        sieges[ref if ref in organes else "NI"] += 1
    groupes = [{"uid": k, "code": organes.get(k, {}).get("code", "NI"), "libelle": organes.get(k, {}).get("libelle", "Non-inscrits"),
                "sieges": v} for k, v in sieges.most_common()]
    return {"sieges_pourvus": en_exercice, "groupes": groupes}


def parse_scrutins_an(content: bytes, jours: int = 30) -> dict:
    """Cohésion par groupe sur les scrutins des `jours` derniers jours (à partir du dernier scrutin)."""
    z = zipfile.ZipFile(io.BytesIO(content))
    scr = []
    for n in z.namelist():
        if n.endswith(".json"):
            s = json.loads(z.read(n)).get("scrutin", {})
            if s.get("dateScrutin"):
                scr.append(s)
    if not scr:
        return {"dernier": None, "cohesion": {}, "scrutins_7j": 0}
    dernier = max(s["dateScrutin"] for s in scr)
    lim30 = (dt.date.fromisoformat(dernier) - dt.timedelta(days=jours)).isoformat()
    lim7 = (dt.date.fromisoformat(dernier) - dt.timedelta(days=7)).isoformat()
    coh, nb = defaultdict(list), Counter()
    for s in scr:
        if s["dateScrutin"] < lim30:
            continue
        gs = s.get("ventilationVotes", {}).get("organe", {}).get("groupes", {}).get("groupe", [])
        gs = [gs] if isinstance(gs, dict) else gs
        for g in gs:
            c = rules.cohesion(g.get("vote", {}).get("decompteVoix", {}))
            if c is not None:
                coh[g["organeRef"]].append(c)
                nb[g["organeRef"]] += 1
    return {"dernier": dernier, "scrutins_7j": sum(1 for s in scr if s["dateScrutin"] >= lim7),
            "cohesion": {k: round(sum(v) / len(v), 3) for k, v in coh.items()}, "nb": dict(nb)}


def assemblee(etat) -> dict:
    leg = detect_legislature()
    compo, src1, lm = conditionnel(etat, AN_AMO10.format(leg=leg), parse_amo10)
    votes, src2, _ = conditionnel(etat, AN_SCRUTINS.format(leg=leg), parse_scrutins_an)
    groupes = [{"code": g["code"], "libelle": g["libelle"], "sieges": g["sieges"],
                "cohesion_30j": votes["cohesion"].get(g["uid"]), "scrutins_30j": votes.get("nb", {}).get(g["uid"], 0)}
               for g in compo["groupes"]]
    pourvus = compo["sieges_pourvus"]
    return {"code": "AN", "legislature": leg, "sieges_total": 577, "sieges_pourvus": pourvus,
            "majorite_absolue": rules.majorite_absolue(pourvus), "seuil_censure": rules.majorite_absolue(pourvus),
            "groupes": groupes, "scrutins_7j": votes["scrutins_7j"], "maj_source": lm,
            "_info": f"AMO10 {src1}, scrutins {src2}, dernier scrutin {votes['dernier']}"}


# ------------------------------------------------------------------ Sénat
def parse_senat_general(content: bytes) -> dict:
    d = json.loads(content.decode("utf-8"))
    recs = d if isinstance(d, list) else next(v for v in d.values() if isinstance(v, list))
    actifs = [r for r in recs if r.get("Etat") == "ACTIF"]
    sieges = Counter(r.get("Groupe_politique") or "NI" for r in actifs)
    return {"sieges_pourvus": len(actifs), "groupes": [{"code": k, "sieges": v} for k, v in sieges.most_common()],
            "matricule_groupe": {r["Matricule"]: r.get("Groupe_politique") or "NI" for r in actifs}}


def _copy_rows(sql: str, table: str) -> tuple[list[str], list[list[str]]]:
    m = re.search(r"COPY (?:public\.)?" + table + r" \(([^)]*)\) FROM stdin;\n", sql)
    if not m:
        raise rules.EnTeteInattendu(f"DOSLEG : table {table} absente")
    end = sql.find("\n\\.\n", m.end())
    return [c.strip() for c in m.group(1).split(",")], [l.split("\t") for l in sql[m.end():end].split("\n") if l]


def parse_dosleg(content: bytes, jours: int = 30) -> dict:
    """Tables scr (scrutins) et votsen (votes nominatifs) : on ne garde que dates, effectifs et positions."""
    z = zipfile.ZipFile(io.BytesIO(content))
    sql = z.read(next(n for n in z.namelist() if n.endswith(".sql"))).decode("utf-8", "replace")
    cols, scr = _copy_rows(sql, "scr")
    rules.require_headers(cols, ["sesann", "scrnum", "scrdat", "scrpou", "scrcon"], "DOSLEG scr")
    i = {c: k for k, c in enumerate(cols)}
    dates = {(r[i["sesann"]], r[i["scrnum"]]): r[i["scrdat"]][:10] for r in scr}
    dernier = max(dates.values())
    lim30 = (dt.date.fromisoformat(dernier) - dt.timedelta(days=jours)).isoformat()
    lim7 = (dt.date.fromisoformat(dernier) - dt.timedelta(days=7)).isoformat()
    recents = {k for k, d in dates.items() if d >= lim30}
    vcols, vots = _copy_rows(sql, "votsen")
    rules.require_headers(vcols, ["sesann", "scrnum", "senmat", "posvotcod"], "DOSLEG votsen")
    j = {c: k for k, c in enumerate(vcols)}
    # posvot : 1 pour, 2 contre, 3 abstention, 4 non-votant (table posvot du dump) ; les non-votants sont exclus
    votes = [(r[j["sesann"]], r[j["scrnum"]], r[j["senmat"]], r[j["posvotcod"]]) for r in vots
             if (r[j["sesann"]], r[j["scrnum"]]) in recents and r[j["posvotcod"]] in ("1", "2", "3")]
    return {"dernier": dernier, "scrutins_7j": sum(1 for d in dates.values() if d >= lim7), "scrutins_30j": len(recents),
            "votes": votes}


def senat(etat) -> dict:
    compo, src1, lm = conditionnel(etat, SENAT_GENERAL, parse_senat_general)
    vot, src2, _ = conditionnel(etat, SENAT_DOSLEG, parse_dosleg)
    mg = compo["matricule_groupe"]
    par = defaultdict(lambda: defaultdict(Counter))  # groupe -> scrutin -> position
    for ses, num, mat, pos in vot["votes"]:
        if mat in mg:
            par[mg[mat]][(ses, num)][pos] += 1
    coh = {}
    for g, scr in par.items():
        vals = [max(c.values()) / sum(c.values()) for c in scr.values() if sum(c.values())]
        coh[g] = (round(sum(vals) / len(vals), 3), len(vals)) if vals else (None, 0)
    groupes = [{"code": g["code"], "libelle": g["code"], "sieges": g["sieges"], "cohesion_30j": coh.get(g["code"], (None, 0))[0],
                "scrutins_30j": coh.get(g["code"], (None, 0))[1]} for g in compo["groupes"]]
    pourvus = compo["sieges_pourvus"]
    return {"code": "SENAT", "legislature": None, "sieges_total": 348, "sieges_pourvus": pourvus,
            "majorite_absolue": rules.majorite_absolue(pourvus), "seuil_censure": None, "groupes": groupes,
            "scrutins_7j": vot["scrutins_7j"], "maj_source": lm,
            "_info": f"ODSEN {src1}, DOSLEG {src2}, dernier scrutin {vot['dernier']}"}
