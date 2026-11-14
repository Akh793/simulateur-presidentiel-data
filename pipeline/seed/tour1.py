"""Composition déterministe des dossiers du Tour 1 (Parapheur) à partir des indicateurs de la graine.

Slot 1 (urgence data)   : la plus forte anomalie des indicateurs de PILOTAGE (jamais un bilan).
Slot 2 (institutionnel) : application des lois, production normative, arithmétique parlementaire.
Slot 3 (ministériel)    : la publication de bilan la plus récente (« Révélation INSEE / Eurostat »).
Le quota de diversité sur 10 tours et la règle « dès le tour 20 » relèvent du moteur (étape 2).
"""
from __future__ import annotations

from typing import Optional

HAUSSE_GRAVITE_INACTION = 0.15

TITRES = {
    ("energie", "hausse"): "Tension sur la demande d'énergie",
    ("energie", "baisse"): "Repli marqué de la consommation d'énergie",
    ("meteo", "hausse"): "Épisode météorologique dangereux",
    ("meteo", "baisse"): "Écart thermique inhabituel",
    ("eau", "hausse"): "Montée des eaux sur les grands fleuves",
    ("eau", "baisse"): "Baisse rapide de la ressource en eau",
    ("normes", "hausse"): "Afflux de textes au Journal officiel",
    ("normes", "baisse"): "Retard d'application des lois",
    ("sante", "hausse"): "Pression épidémique sur les urgences",
    ("sante", "baisse"): "Accalmie aux urgences",
    ("emploi", "hausse"): "Rebond des offres d'emploi",
    ("emploi", "baisse"): "Recul des offres d'emploi",
    ("mobilite", "hausse"): "Perturbations sur le réseau ferroviaire",
    ("mobilite", "baisse"): "Trafic ferroviaire exceptionnellement fluide",
}


def _fmt(v: float, nd: int = 1) -> str:
    """Format français (espace fine insécable des milliers) ; un entier s'affiche sans décimales."""
    if float(v).is_integer():
        nd = 0
    return f"{v:,.{nd}f}".replace(",", "\u202f").replace(".", ",")


def _u(unite: str) -> str:
    return "" if unite == "indice" else f" {unite}"


def _r(v: float) -> float:
    return round(float(v), 2) if abs(v) < 1000 else float(round(v))


def dossier_urgence(pilotage: list[dict]) -> tuple[Optional[dict], bool]:
    cands = [p for p in pilotage if p["derniere_valeur"] is not None and p["statut_source"] != "morte"]
    alertes = [p for p in cands if p["anomalie"]["depasse"]]
    calme = not alertes
    pool = alertes or [p for p in cands if p["anomalie"]["score"] is not None] or cands
    if not pool:
        return None, True
    p = max(pool, key=lambda x: (x["anomalie"]["gravite"], abs(x["anomalie"]["score"] or 0)))
    an = p["anomalie"]
    sens = an["sens"] if an["sens"] != "neutre" else "hausse"
    faits = {"valeur": _r(p["derniere_valeur"])}
    if an["score"] is not None:
        faits["score"] = round(an["score"], 1)
    for k, v in list(p["composantes"].items())[:4]:
        faits[k] = _r(v)
    titre = TITRES.get((p["famille_anomalie"], sens), p["libelle"]) if not calme else f"Point de situation : {p['libelle'].lower()}"
    resume = f"{p['libelle']} : {_fmt(faits['valeur'], 2)}{_u(p['unite'])} au {p['derniere_date']}."
    if an["methode"] == "mad_robuste" and "score" in faits:
        resume += f" L'écart à la normale récente atteint {_fmt(faits['score'])} écarts-types."
    elif an["methode"] == "seuil_direct":
        c = p["composantes"]
        resume += (f" {_fmt(c.get('departements_rouge', 0), 0)} département(s) en rouge, "
                   f"{_fmt(c.get('departements_orange', 0), 0)} en orange, {_fmt(c.get('departements_jaune', 0), 0)} en jaune.")
    return {"id": f"D1-{p['id']}", "slot": 1, "type": "urgence_data", "famille_anomalie": p["famille_anomalie"],
            "ministere": p["ministere"], "titre": titre, "resume": resume, "gravite": max(1, an["gravite"]),
            "indicateurs": [p["id"]], "faits": faits, "hausse_gravite_inaction": HAUSSE_GRAVITE_INACTION}, calme


def dossier_institutionnel(pilotage: list[dict], parlement: dict) -> Optional[dict]:
    by = {p["id"]: p for p in pilotage}
    faits, phrases, ind = {}, [], []
    j3 = by.get("JUS3")
    if j3 and j3["derniere_valeur"] is not None:
        faits["taux_application_pct"] = _r(j3["derniere_valeur"])
        att = j3["composantes"].get("lois_en_attente_de_decrets")
        if att is not None:
            faits["lois_en_attente"] = _r(att)
            phrases.append(f"{_fmt(att, 0)} lois de la législature attendent encore des décrets ; taux d'application {_fmt(faits['taux_application_pct'])} %.")
        ind.append("JUS3")
    an = (parlement or {}).get("an")
    if an:
        faits["sieges_pourvus"] = float(an["sieges_pourvus"])
        faits["seuil_censure"] = float(an["seuil_censure"])
        phrases.append(f"Avec {an['sieges_pourvus']} sièges pourvus, une motion de censure est adoptée à {an['seuil_censure']} voix.")
    j1 = by.get("JUS1")
    if j1 and j1["derniere_valeur"] is not None:
        faits["textes_jo"] = _r(j1["derniere_valeur"])
        phrases.append(f"Le Journal officiel du {j1['derniere_date']} publie {_fmt(j1['derniere_valeur'], 0)} textes normatifs.")
        ind.append("JUS1")
    if not phrases:
        return None
    grav = max(1, (j3 or {}).get("anomalie", {}).get("gravite", 0) or 2)
    return {"id": "D2-INSTIT", "slot": 2, "type": "institutionnel", "famille_anomalie": "institutions",
            "ministere": "transversal", "titre": "Calendrier parlementaire et décrets en attente", "resume": " ".join(phrases),
            "gravite": min(5, grav), "indicateurs": ind, "faits": faits, "hausse_gravite_inaction": HAUSSE_GRAVITE_INACTION}


def dossier_ministeriel(bilan: list[dict]) -> Optional[dict]:
    pubs = [b for b in bilan if b["derniere"] and b["statut_source"] != "morte"]
    if not pubs:
        return None
    b = max(pubs, key=lambda x: (x["derniere"]["publiee_le"] or "", x["derniere"]["d"]))
    v = b["derniere"]["valeur"]
    faits = {"valeur": _r(v)}
    resume = f"{b['libelle']} : {_fmt(v, 2)}{_u(b['unite'])} ({b['derniere']['periode']})."
    if b["precedente"]:
        delta = v - b["precedente"]["valeur"]
        faits["precedente"] = _r(b["precedente"]["valeur"])
        faits["variation"] = _r(delta)
        resume += f" Précédente publication : {_fmt(b['precedente']['valeur'], 2)}{_u(b['unite'])}, soit une variation de {_fmt(delta, 2)}."
    rel = abs(faits.get("variation", 0)) / (abs(faits.get("precedente", v)) or 1)
    grav = 1 + min(4, int(rel * 100))  # +1 cran par point de % de variation
    return {"id": f"D3-{b['id']}", "slot": 3, "type": "ministeriel", "famille_anomalie": "publication",
            "ministere": b["ministere"], "titre": f"Publication {b['source']['producteur']} : {b['sous_categorie'].lower()}",
            "resume": resume, "gravite": grav, "indicateurs": [b["id"]], "faits": faits,
            "hausse_gravite_inaction": HAUSSE_GRAVITE_INACTION}


def une(dossiers: list[dict], date_jeu: str) -> dict:
    d1 = dossiers[0] if dossiers else None
    titre = d1["titre"] if d1 else "Une journée sans alerte majeure"
    bandeau = [d["titre"] for d in dossiers][:6]
    return {"titre": titre, "sous_titre": f"Édition du {date_jeu}", "bandeau_20h": bandeau}


def composer(pilotage: list[dict], bilan: list[dict], parlement: dict, date_jeu: str) -> tuple[list[dict], bool]:
    dossiers, calme = [], True
    if pilotage:
        d1, calme = dossier_urgence(pilotage)
        if d1:
            dossiers.append(d1)
    for d in (dossier_institutionnel(pilotage, parlement), dossier_ministeriel(bilan)):
        if d:
            dossiers.append(d)
    return dossiers[:3], calme
