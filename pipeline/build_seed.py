"""Relais quotidien du Simulateur présidentiel : produit `graine_du_jour.json`.

Usage :
  python3 -I -u pipeline/build_seed.py --mode quotidien --data data --out site
  python3 -I -u pipeline/build_seed.py --mode horaire   --data data --out site

Mode quotidien (09h15, Europe/Paris) : toutes les sources, Parlement, contrôles checks.py, Tour 1 (LLM si clé).
Mode horaire : flux continus seulement (eCO2mix, carburants, vigilance, JORF, SNCF, Eurostat) ; le reste est
repris de la graine du jour ; révision +1. Sans graine du jour, le mode horaire bascule en quotidien.

Code de sortie : 0 si une graine valide est écrite (même dégradée), 1 si la graine est invalide (la
publication précédente reste alors en ligne), 2 si plus de la moitié des indicateurs de pilotage sont morts.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import sys
import time
import traceback
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import checks  # noqa: E402  (contrôles de non-régression existants)
from seed import archive, narrative, net, rules, tour1  # noqa: E402
from seed.connectors import Lecture, echec, fichiers, parlement, stat, temps_reel, today_paris  # noqa: E402
from seed.health import Etat  # noqa: E402
from seed.registry import BILAN, MANQUANTES, PILOTAGE, Spec  # noqa: E402
from seed.schema import CIBLE_SOUS_CATEGORIES, SCHEMA_VERSION, Graine  # noqa: E402

PIPELINE_VERSION = "1.0.0"
ROOT = HERE.parent


# ------------------------------------------------------------------ lecture des sources
class Contexte:
    def __init__(self, data_dir: Path, etat: Etat, params: dict):
        self.data_dir, self.etat, self.params = data_dir, etat, params
        self.legislature = 17
        self.eco2mix_ajouts = 0


def _panel_piezo(ctx: Contexte) -> dict:
    path = ctx.data_dir / "config" / "panel_piezo.json"
    try:
        panel = json.loads(path.read_text())
        if panel.get("valide_jusqu_au", "") >= today_paris().isoformat() and panel.get("stations"):
            return panel["stations"]
    except (OSError, ValueError):
        pass
    stations = temps_reel.choisir_panel_piezo()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"choisi_le": today_paris().isoformat(),
                                "valide_jusqu_au": (today_paris() + dt.timedelta(days=30)).isoformat(),
                                "stations": stations}, ensure_ascii=False, indent=1))
    return stations


def lire_pilotage(spec: Spec, ctx: Contexte) -> Lecture:
    sae = float(ctx.params["sae_passages_urgences_annuels"]["valeur"])
    if spec.id == "ENE1":
        rows, ctx.eco2mix_ajouts = archive.eco2mix_update(ctx.data_dir)
        return temps_reel.eco2mix(rows)
    if spec.id == "MOB1":
        archive.sncf_append(ctx.data_dir, temps_reel.sncf_snapshot())
        return temps_reel.sncf(archive.sncf_samples(ctx.data_dir))
    table = {
        "ENE4": temps_reel.carburants,
        "MET1": temps_reel.vigilance,
        "MET2": temps_reel.climatologie,
        "EAU1": lambda: temps_reel.nappes(_panel_piezo(ctx)),
        "EAU2": temps_reel.debits,
        "JUS1": fichiers.jorf,
        "JUS3": lambda: fichiers.barometre(ctx.legislature),
        "SAN1": lambda: temps_reel.odisse(sae),
        "SAN3": fichiers.medicaments,
        "TRA2": temps_reel.indeed,
        "TRA3": temps_reel.france_travail,
    }
    return table[spec.id]()


def lire_bilan(spec: Spec) -> Lecture:
    if spec.producteur == "INSEE":
        return stat.bdm(spec.jeu, spec.n_obs)
    eurostat = {
        "FIN1": ("irt_lt_mcby_m", {"geo": "FR"}),
        "FIN4": ("irt_lt_mcby_m", {"geo": "EA"}),
        "FIN2": ("gov_10q_ggdebt", {"geo": "FR", "unit": "PC_GDP", "sector": "S13", "na_item": "GD"}),
        "FIN3": ("bop_c6_m", {"geo": "FR", "bop_item": "S", "partner": "WRL_REST", "stk_flow": "BAL", "currency": "MIO_EUR"}),
    }
    if spec.id in eurostat:
        ds, p = eurostat[spec.id]
        return stat.eurostat(ds, p, spec.n_obs)
    return {"BUD1": stat.dgfip_solde_budgetaire, "JUS2": fichiers.prison, "URS1": stat.urssaf_masse_salariale,
            "ENE2": stat.odre_stock_gaz_terega}[spec.id]()


def _safe(fn, *a) -> Lecture:
    try:
        return fn(*a)
    except Exception as e:  # noqa: BLE001  — une source cassée ne doit jamais casser la graine
        traceback.print_exc(limit=2)
        return echec(e)


# ------------------------------------------------------------------ construction des entrées
def _age(d: str | None, today: dt.date) -> int | None:
    if not d:
        return None
    try:
        return (today - rules.period_start(d)).days
    except ValueError:
        return None


def _source(spec: Spec) -> dict:
    return {"producteur": spec.producteur, "jeu": spec.jeu, "url": spec.url, "licence": spec.licence, "officiel": spec.officiel}


def anomalie(spec: Spec, valeurs: list[float], lec: Lecture) -> dict:
    if spec.anomalie == "direct":
        cur = valeurs[-1] if valeurs else None
        orange = lec.composantes.get("departements_orange", 0)
        rouge = lec.composantes.get("departements_rouge", 0)
        grav = 0 if cur is None else min(5, (1 if cur > 0 else 0) + int(orange) + 3 * int(rouge))
        return {"methode": "seuil_direct", "score": cur, "seuil": spec.seuil, "depasse": bool(cur is not None and cur >= spec.seuil),
                "sens": "hausse" if cur else "neutre", "fenetre": 1, "gravite": grav}
    serie = lec.meta.get("serie_anomalie") or valeurs
    if len(serie) < 9:
        return {"methode": "historique_insuffisant", "score": None, "seuil": spec.seuil, "depasse": False, "sens": "neutre",
                "fenetre": max(0, len(serie) - 1), "gravite": 0}
    hist, cur = serie[-(spec.fenetre + 1):-1], serie[-1]
    z = rules.robust_z(hist, cur)
    if z is None:
        return {"methode": "mad_robuste", "score": None, "seuil": spec.seuil, "depasse": False, "sens": "neutre",
                "fenetre": len(hist), "gravite": 0}
    return {"methode": "mad_robuste", "score": round(z, 2), "seuil": spec.seuil, "depasse": abs(z) >= spec.seuil,
            "sens": "hausse" if z > 0 else "baisse", "fenetre": len(hist), "gravite": rules.gravite_from_score(z, spec.seuil)}


def entree_pilotage(spec: Spec, lec: Lecture, etat: Etat, today: dt.date) -> dict:
    if lec.ok and lec.points:
        etat.put_obs(spec.id, lec.points)
    hist = etat.get_obs(spec.id, 400)
    derniere = hist[-1] if hist else None
    age = _age(derniere[0], today) if derniere else None
    h = etat.record(spec.id, spec.libelle, spec.url, lec.ok, lec.http, derniere[0] if derniere else None, age,
                    spec.tolerance_jours, lec.info or ("ok" if lec.ok else "échec"), lec.arretee)
    return {"id": spec.id, "famille_anomalie": spec.famille, "ministere": spec.ministere, "sous_categorie": spec.sous_categorie,
            "libelle": spec.libelle, "unite": spec.unite, "cadence": spec.cadence, "source": _source(spec),
            "statut_source": h["statut"], "derniere_date": derniere[0] if derniere else None,
            "derniere_valeur": derniere[1] if derniere else None,
            "serie": [{"d": d, "v": v} for d, v in hist[-120:]],
            "anomalie": anomalie(spec, [v for _, v in hist], lec),
            "composantes": {k: float(v) for k, v in lec.composantes.items()}, "notes": spec.notes + lec.notes}


def _prochaine(lec: Lecture, spec: Spec) -> tuple[dt.date | None, bool]:
    if not lec.points:
        return None, True
    k = rules.cadence_months(spec.cadence)
    pub = lec.meta.get("publiee_le")
    base = dt.date.fromisoformat(pub) if pub else rules.add_months(dt.date.fromisoformat(lec.points[-1][0]), 2 * k)
    nxt = rules.add_months(base, k)
    today = today_paris()
    while nxt < today:
        nxt = rules.add_months(nxt, k)
    return nxt, True


def entree_bilan(spec: Spec, lec: Lecture, etat: Etat, today: dt.date, prev: dict | None) -> dict:
    if not lec.ok and prev:  # garder la dernière publication connue, statut dégradé
        h = etat.record(spec.id, spec.libelle, spec.url, False, lec.http, prev.get("derniere", {}) and prev["derniere"]["d"],
                        _age(prev["derniere"]["d"], today) if prev.get("derniere") else None, spec.tolerance_jours, lec.info, lec.arretee)
        return {**prev, "statut_source": h["statut"]}
    per = lec.meta.get("periodes") or [d[:7] for d, _ in lec.points]
    pubs = [{"periode": p, "d": d, "valeur": v, "publiee_le": None} for p, (d, v) in zip(per, lec.points)]
    if pubs:
        pubs[-1]["publiee_le"] = lec.meta.get("publiee_le")
    nxt, est = _prochaine(lec, spec)
    der = pubs[-1] if pubs else None
    age = _age(der["d"], today) if der else None
    h = etat.record(spec.id, spec.libelle, spec.url, lec.ok, lec.http, der["d"] if der else None, age,
                    spec.tolerance_jours, lec.info or ("ok" if lec.ok else "échec"), lec.arretee)
    est_cab = rules.estimation_cabinet([(p["periode"], p["valeur"]) for p in pubs], spec.cadence, today) if pubs else None
    return {"id": spec.id, "ministere": spec.ministere, "sous_categorie": spec.sous_categorie, "libelle": spec.libelle,
            "unite": spec.unite, "cadence": spec.cadence, "source": _source(spec), "statut_source": h["statut"],
            "derniere": der, "precedente": pubs[-2] if len(pubs) > 1 else None,
            "prochaine": {"date": nxt.isoformat() if nxt else None, "estimee": est},
            "estimation_cabinet": est_cab,
            "libelle_brouillard": rules.libelle_brouillard(der["periode"] if der else None, nxt, est),
            "serie": [{"d": d, "v": v} for d, v in lec.points[-60:]]}


def chambres(ctx: Contexte) -> dict:
    out = {"an": None, "senat": None}
    for key, fn, sid, lib, url in (("an", parlement.assemblee, "PAR_AN", "Assemblée nationale (AMO10 + scrutins)", parlement.AN_AMO10.format(leg=ctx.legislature)),
                                   ("senat", parlement.senat, "PAR_SENAT", "Sénat (ODSEN + DOSLEG)", parlement.SENAT_DOSLEG)):
        try:
            ch = fn(ctx.etat)
            info = ch.pop("_info", "")
            ctx.etat.record(sid, lib, url, True, 200, today_paris().isoformat(), 0, 10, info)
            out[key] = ch
        except Exception as e:  # noqa: BLE001
            traceback.print_exc(limit=2)
            ctx.etat.record(sid, lib, url, False, getattr(e, "status", None), None, None, 10, f"{type(e).__name__}: {e}"[:300])
    return out


def controles_checks(ctx: Contexte, deja: set[str]) -> None:
    """Réutilise checks.py pour les sources témoins sans connecteur dédié (GNL, OFPRA, DEFM, culture...)."""
    autres = [c for c in checks.CHECKS if c[0] not in deja and c[0] != "MAC7"]
    with ThreadPoolExecutor(max_workers=6) as ex:
        res = list(ex.map(checks.run, autres))
    for r in res:
        ctx.etat.record(f"CHK_{r['id']}", r["source"], "", r["http"] == 200, r["http"],
                        (r["derniere_donnee"] or "")[:10] or None, r["age_jours"],
                        min(r["tolerance_jours"], 3650), f"{r['verdict']} {r['info']}"[:300])


def jetons(today: dt.date) -> list[dict]:
    conf = yaml.safe_load((ROOT / "config" / "tokens.yml").read_text(encoding="utf-8"))
    out = []
    for j in conf.get("jetons", []):
        exp = j.get("expire_le")
        reste = (dt.date.fromisoformat(str(exp)) - today).days if exp else None
        out.append({"nom": j["nom"], "usage": j["usage"], "configure": bool(os.environ.get(j["nom"])),
                    "expire_le": str(exp) if exp else None, "jours_restants": reste,
                    "alerte_j30": reste is not None and reste <= 30})
    return out


# ------------------------------------------------------------------ orchestration
def build(mode: str, data_dir: Path, out_dir: Path, use_llm: bool = True) -> int:
    t0 = time.time()
    today = today_paris()
    params = yaml.safe_load((ROOT / "config" / "parametres.yml").read_text(encoding="utf-8"))
    etat = Etat(data_dir / "etat.sqlite")
    ctx = Contexte(data_dir, etat, params)
    prev = archive.load_seed(data_dir / "graines" / f"{today.isoformat()}.json")
    if mode == "horaire" and not prev:
        print("aucune graine du jour : bascule en mode quotidien", flush=True)
        mode = "quotidien"
    quotidien = mode == "quotidien"
    prev_p = {p["id"]: p for p in (prev or {}).get("pilotage", [])}
    prev_b = {b["id"]: b for b in (prev or {}).get("bilan", [])}

    if quotidien:
        try:
            ctx.legislature = parlement.detect_legislature()
        except Exception:  # noqa: BLE001
            pass

    # TRA3 n'existe que si la clé France Travail est configurée (sinon : jeton « non configuré », repli TRA2)
    actifs = [s for s in PILOTAGE if s.id != "TRA3" or os.environ.get("FT_CLIENT_ID")]
    if not os.environ.get("FT_CLIENT_ID"):
        etat.forget("TRA3")
    prev_p = {k: v for k, v in prev_p.items() if k in {s.id for s in actifs}}
    p_specs = [s for s in actifs if quotidien or s.horaire]
    b_specs = [s for s in BILAN if quotidien or s.horaire]
    with ThreadPoolExecutor(max_workers=6) as ex:
        p_lec = dict(zip([s.id for s in p_specs], ex.map(lambda s: _safe(lire_pilotage, s, ctx), p_specs)))
        b_lec = dict(zip([s.id for s in b_specs], ex.map(lambda s: _safe(lire_bilan, s), b_specs)))

    pilotage = [entree_pilotage(s, p_lec[s.id], etat, today) if s.id in p_lec else prev_p[s.id]
                for s in actifs if s.id in p_lec or s.id in prev_p]
    bilan = [entree_bilan(s, b_lec[s.id], etat, today, prev_b.get(s.id)) if s.id in b_lec else prev_b[s.id]
             for s in BILAN if s.id in b_lec or s.id in prev_b]

    if quotidien:
        parl = chambres(ctx)
        controles_checks(ctx, {s.id for s in PILOTAGE + BILAN})
        etat.purge()
    else:
        parl = (prev or {}).get("parlement") or {"an": None, "senat": None}

    # Tour 1 : recalculé à chaque passage, notes LLM seulement si la composition des dossiers change
    dossiers, calme = tour1.composer(pilotage, bilan, parl, today.isoformat())
    prev_t1 = (prev or {}).get("tour1") or {}
    same = [d["id"] for d in dossiers] == [d["id"] for d in prev_t1.get("dossiers", [])]
    notes = prev_t1["notes"] if (same and prev_t1.get("notes")) else narrative.notes_tour1(dossiers, use_llm=use_llm)

    health = etat.all_health()
    alertes = []
    for j in jetons(today):
        if j["alerte_j30"]:
            alertes.append(f"Jeton {j['nom']} : expiration dans {j['jours_restants']} jours")
    for h in health:
        if h["statut"] == "morte" and not h["id"].startswith("CHK_"):
            alertes.append(f"Source morte : {h['id']} ({h['libelle']})")
    for hl in net.HEADER_LOG:
        if hl.get("deprecation"):
            alertes.append(f"Dépréciation annoncée par Opendatasoft : {hl['url']} ({hl['deprecation']})")
        if hl.get("dataset_remaining") and str(hl["dataset_remaining"]).isdigit() and int(hl["dataset_remaining"]) < 5000:
            alertes.append(f"Quota Opendatasoft bas : {hl['url']} ({hl['dataset_remaining']} appels restants)")
    ene1 = next((p for p in pilotage if p["id"] == "ENE1"), None)
    if ene1 and ene1["statut_source"] != "vivante":
        alertes.append("Archive eCO2mix : flux interrompu, la fenêtre de 75 jours de la source continue de glisser")

    revision = 0 if quotidien else int((prev or {}).get("meta", {}).get("revision", 0)) + 1
    seed = {
        "schema_version": SCHEMA_VERSION,
        "meta": {"generated_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                 "date_jeu": today.isoformat(), "mode": mode, "revision": revision, "pipeline_version": PIPELINE_VERSION,
                 "duree_s": round(time.time() - t0, 1),
                 "couverture": {"pilotage_cablees": sum(1 for p in pilotage if p["derniere_valeur"] is not None),
                                "bilan_cablees": sum(1 for b in bilan if b["derniere"]),
                                "cible_sous_categories": CIBLE_SOUS_CATEGORIES, "manquantes": MANQUANTES},
                 "alertes": sorted(set(alertes))},
        "sources_health": health,
        "jetons": jetons(today),
        "pilotage": pilotage,
        "bilan": bilan,
        "parlement": parl,
        "substitutions": params["substitutions"],
        "tour1": {"date_jeu": today.isoformat(), "jour_calme": calme, "dossiers": dossiers, "notes": notes,
                  "une": tour1.une(dossiers, today.isoformat())},
    }
    try:
        Graine.model_validate(seed)
    except Exception as e:  # noqa: BLE001
        print(f"GRAINE INVALIDE, publication annulée : {e}", flush=True)
        etat.close()
        return 1
    body = json.dumps(seed, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "graine_du_jour.json").write_bytes(body)
    (out_dir / "graine_du_jour.json.sha256").write_text(hashlib.sha256(body).hexdigest() + "  graine_du_jour.json\n")
    (out_dir / "sources_health.json").write_text(json.dumps(health, ensure_ascii=False, indent=1), encoding="utf-8")
    archive.save_seed(data_dir, seed)
    if quotidien:  # marqueur lu par la garde du workflow : un seul lot de 09h15 par jour
        try:
            from zoneinfo import ZoneInfo
            local = dt.datetime.now(ZoneInfo("Europe/Paris")).strftime("%Y-%m-%dT%H:%M:%S")
        except Exception:  # noqa: BLE001
            local = dt.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        (data_dir / "lots").mkdir(parents=True, exist_ok=True)
        (data_dir / "lots" / f"{today.isoformat()}.txt").write_text(local + "\n")
    etat.close()

    morts = sum(1 for p in pilotage if p["statut_source"] == "morte")
    print(f"graine {mode} r{revision} : {len(body)} octets, {len(pilotage)} pilotage, {len(bilan)} bilan, "
          f"{morts} morts, {len(alertes)} alertes, {seed['meta']['duree_s']} s", flush=True)
    return 2 if morts > len(PILOTAGE) / 2 else 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--mode", choices=["quotidien", "horaire"], default="quotidien")
    ap.add_argument("--data", type=Path, default=ROOT / "data")
    ap.add_argument("--out", type=Path, default=ROOT / "site")
    ap.add_argument("--no-llm", action="store_true", help="forcer les gabarits déterministes")
    a = ap.parse_args(argv)
    return build(a.mode, a.data.resolve(), a.out.resolve(), use_llm=not a.no_llm)


if __name__ == "__main__":
    sys.exit(main())
