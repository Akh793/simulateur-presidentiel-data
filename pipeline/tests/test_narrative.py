"""Garde-fous anti-hallucination et repli déterministe (hors réseau)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from seed import narrative, tour1  # noqa: E402

FAITS = {"valeur": 2.14, "score": 3.4, "stations_rupture_gazole": 342.0}
SRC = ("Prix moyen du gazole à la pompe : 2,14 €/L au 2026-11-14.",)


def test_nombres_du_payload_acceptes():
    txt = "Le gazole atteint 2,14 €/L, à 3,4 écarts-types ; 342 stations sont en rupture depuis le 2026-11-14."
    assert narrative.valider(txt, FAITS, textes_source=SRC) == []


def test_nombre_invente_rejete():
    motifs = narrative.valider("Le gazole atteint 2,31 €/L et coûtera 1 200 000 000 €.", FAITS, textes_source=SRC)
    assert any("2,31" in m for m in motifs) and any("1 200 000 000" in m for m in motifs)


def test_personnes_reelles_rejetees():
    assert narrative.valider("M. Dupont propose une baisse.", FAITS)
    assert narrative.valider("Selon Jean Martin, la situation est grave.", FAITS)
    assert narrative.valider("La Banque de France et le Conseil d'État sont consultés.", FAITS) == []


def test_repli_gabarit_sans_cle(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    d = {"id": "D1-ENE4", "titre": "Hausse du gazole", "resume": SRC[0], "faits": FAITS}
    notes = narrative.notes_tour1([d])
    assert [n["auteur"] for n in notes] == ["bercy", "social"]
    assert all(n["mode"] == "gabarit" for n in notes)
    for n in notes:  # le gabarit lui-même passe le validateur
        assert narrative.valider(n["titre"] + " " + n["texte"], FAITS, textes_source=SRC) == []


def test_llm_rejete_puis_repli(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test")
    calls = []

    def faux_appel(role, dossiers, modele, cle):
        calls.append(role)
        return {"titre": "Alerte", "texte": "Le déficit atteindra 4,7 % du PIB."}  # nombre inventé

    monkeypatch.setattr(narrative, "_appel", faux_appel)
    d = {"id": "D1", "titre": "Hausse du gazole", "resume": SRC[0], "faits": FAITS}
    notes = narrative.notes_tour1([d])
    assert calls == ["bercy", "bercy", "social", "social"]  # deux appels isolés par rôle, mêmes entrées
    assert all(n["mode"] == "gabarit" and n["rejets"] for n in notes)


def test_llm_accepte(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test")
    monkeypatch.setattr(narrative, "_appel", lambda *a: {"titre": "Gazole sous tension",
                                                         "texte": "Le prix atteint 2,14 €/L ; une réponse ciblée est préférable."})
    d = {"id": "D1", "titre": "Hausse du gazole", "resume": SRC[0], "faits": FAITS}
    notes = narrative.notes_tour1([d])
    assert all(n["mode"] == "llm" for n in notes)


def test_resumes_de_dossiers_valides():
    pil = [{"id": "ENE4", "famille_anomalie": "energie", "ministere": "ecologie_energie", "libelle": "Prix moyen du gazole",
            "unite": "€/L", "derniere_date": "2026-11-14", "derniere_valeur": 2.1399, "statut_source": "vivante",
            "composantes": {"stations_rupture_gazole": 342.0},
            "anomalie": {"methode": "mad_robuste", "score": 3.42, "seuil": 2.5, "depasse": True, "sens": "hausse", "fenetre": 28, "gravite": 2}}]
    dossiers, calme = tour1.composer(pil, [], {"an": None}, "2026-11-14")
    assert not calme and dossiers[0]["slot"] == 1
    d = dossiers[0]
    # le résumé n'utilise que les faits du dossier et la date de la donnée
    assert narrative.valider(d["resume"], d["faits"], textes_source=(d["titre"],), dates_autorisees=frozenset({"2026-11-14"})) == []
    assert narrative.valider("Au 2026-11-15, le gazole atteint 2,14 €/L.", d["faits"], dates_autorisees=frozenset({"2026-11-14"}))
