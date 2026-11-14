"""Tests hors réseau des 8 règles d'ingestion."""
import datetime as dt
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from seed import rules  # noqa: E402
from seed.health import Etat, statut  # noqa: E402

BDM_OK = """<message><Series IDBANK="011814630" FREQ="M" TITLE_FR="Indice des prix à la consommation - Base 2025 - Ensemble"
 LAST_UPDATE="2026-11-13"><Obs TIME_PERIOD="2026-10" OBS_VALUE="103.46"/><Obs TIME_PERIOD="2026-09" OBS_VALUE="103.07"/></Series></message>"""
BDM_STOP = """<message><Series IDBANK="001759970" FREQ="M" TITLE_FR="Indice des prix - Base 2015 - Ensemble - Séries arrêtées"
 LAST_UPDATE="2026-01-15"><Obs TIME_PERIOD="2025-12" OBS_VALUE="120.9"/></Series></message>"""


def test_r1_ordre_chronologique_retabli():
    p = rules.parse_bdm(BDM_OK, "011814630")
    assert [o[0] for o in p["obs"]] == ["2026-09", "2026-10"]
    assert p["last_update"] == "2026-11-13"


@pytest.mark.parametrize("titre", ["Séries arrêtées", "Série arrêtée", "series arretees"])
def test_r1_serie_arretee_rejetee(titre):
    with pytest.raises(rules.SerieArretee):
        rules.parse_bdm(BDM_STOP.replace("Séries arrêtées", titre), "001759970")


def test_periodes():
    assert rules.period_start("2026-Q3") == dt.date(2026, 7, 1)
    assert rules.period_start("2026-T3") == dt.date(2026, 7, 1)
    assert rules.period_start("2026-S45") == dt.date(2026, 11, 2)
    assert rules.period_start("2026") == dt.date(2026, 1, 1)
    assert rules.period_label("2026-Q2") == "2026-T2"


def test_r2_parametres_fraicheur():
    p = rules.ods_freshness_params("date_heure", "consommation")
    assert p == {"select": "max(date_heure) as m", "where": "consommation is not null"}


def test_r3_colonnes_larges():
    cols = rules.wide_month_columns(["categorie", "31_01_2024", "30_09_2026", "29_02_2024", "x_1"])
    assert [c for c, _ in cols] == ["31_01_2024", "29_02_2024", "30_09_2026"]


def test_r4_ressource_annee_max():
    res = [{"title": "QUOT_departement_69_periode_avant-1949_RR-T-Vent", "url": "a"},
           {"title": "QUOT_departement_69_periode_2025-2026_RR-T-Vent", "url": "b"},
           {"title": "QUOT_departement_69_periode_1950-2024_RR-T-Vent", "url": "c"},
           {"title": "QUOT_departement_69_periode_2025-2026_autres-parametres", "url": "d"}]
    assert rules.pick_resource(res, r"QUOT_departement_69_.*RR-T-Vent")["url"] == "b"
    prisons = [{"title": "Situation", "url": "x/statistique-etablissements-01082026.xlsx"},
               {"title": "Situation", "url": "x/statistique-etablissements-01092026.xlsx"},
               {"title": "Situation", "url": "x/statistique-etablissements-01122025.xlsx"}]
    assert rules.pick_resource(prisons)["url"].endswith("01092026.xlsx")


@pytest.mark.parametrize("brut,attendu", [("18 691 ", 18691.0), ("18 691", 18691.0), ("6,2 %", 6.2),
                                          (90020.0, 90020.0), ("--", None), ("", None), (None, None)])
def test_r5_nettoyage_nombres(brut, attendu):
    assert rules.clean_number(brut) == attendu


def test_r5_entetes():
    rules.require_headers(["NUM_POSTE", "AAAAMMJJ", "TX"], ["num_poste", "TX"], "t")
    with pytest.raises(rules.EnTeteInattendu):
        rules.require_headers(["NUM_POSTE"], ["TX"], "t")


def test_r6_seuil_censure_sur_sieges_pourvus():
    assert rules.majorite_absolue(577) == 289
    assert rules.majorite_absolue(574) == 288  # sièges vacants non comptés
    assert rules.majorite_absolue(348) == 175
    assert rules.cohesion({"pour": "30", "contre": "2", "abstentions": "0"}) == pytest.approx(30 / 32)


def test_r7_statuts(tmp_path):
    assert statut(True, 3, 10, 0) == "vivante"
    assert statut(True, 11, 10, 0) == "en_retard"
    assert statut(True, 41, 10, 0) == "morte"
    assert statut(False, None, 10, 1) == "en_retard"
    assert statut(False, None, 10, 3) == "morte"
    assert statut(True, 1, 10, 0, arretee=True) == "morte"
    e = Etat(tmp_path / "e.sqlite")
    for _ in range(3):
        h = e.record("X", "x", "u", False, None, None, None, 10, "échec")
    assert h["statut"] == "morte" and h["echecs_consecutifs"] == 3
    assert e.record("X", "x", "u", True, 200, "2026-11-13", 1, 10, "ok")["statut"] == "vivante"


def test_anomalie_z_robuste():
    hist = [100, 101, 99, 100, 102, 98, 100, 101, 99, 100]
    assert rules.robust_z(hist, 100) == pytest.approx(0, abs=1e-9)
    assert rules.robust_z(hist, 110) > 5
    assert rules.robust_z(hist[:5], 110) is None
    assert rules.gravite_from_score(6.0, 2.5) == 5
    assert rules.gravite_from_score(0.5, 2.5) == 0


def test_brouillard_estimation():
    est = rules.estimation_cabinet([("2026-09", 103.07), ("2026-10", 103.46)], "mensuelle", dt.date(2026, 11, 14))
    assert est["methode"] == "persistance_amortie" and est["periodes_ecoulees"] == 0
    assert est["bas"] < est["valeur"] < est["haut"]
    lib = rules.libelle_brouillard("2026-Q3", dt.date(2027, 2, 15), True)
    assert lib == "Donnée 2026-T3 — prochaine publication estimée en février 2027"
