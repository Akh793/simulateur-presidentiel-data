"""Narration du Tour 1 : deux notes de conseillers (Bercy / Social) en deux appels isolés et symétriques,
garde-fous anti-hallucination, repli sur gabarits déterministes.

Garde-fous (identiques côté application, étape 3) :
1. aucun nombre absent des `faits` du dossier (filtre regex) ;
2. aucun nom propre de personne (civilités, suites de mots capitalisés hors liste institutionnelle) ;
3. JSON strict {"titre", "texte"} et longueur bornée.
Le LLM ne calcule rien : il reformule des faits déjà chiffrés par le pipeline.
"""
from __future__ import annotations

import json
import os
import re
from typing import Optional

from . import net

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
MODELE_DEFAUT = os.environ.get("SEED_LLM_MODEL", "claude-sonnet-5-5")
MAX_CHARS = 900

# ------------------------------------------------------------------ validateur
RE_NOMBRE = re.compile(r"(?<![\w.])-?\d{1,3}(?:[\s \xa0]\d{3})+(?:[.,]\d+)?|(?<![\w.])-?\d+(?:[.,]\d+)?")
RE_DATE = re.compile(r"\b\d{4}-\d{2}-\d{2}\b|\b\d{2}/\d{2}/\d{4}\b")
RE_CIVILITE = re.compile(r"\b(M\.|Mme|Mmes|MM\.|Monsieur|Madame|Mademoiselle|Me|Dr)\s+[A-ZÉÈÀÂÎÔÛÇ]")
RE_MAJ_SUITE = re.compile(r"\b([A-ZÉÈÀÂÎÔÛÇ][\w'’-]+)(?:\s+(?:de|du|des|d'|la|le|et)?\s*([A-ZÉÈÀÂÎÔÛÇ][\w'’-]+))+")
INSTITUTIONS = {
    "Bercy", "Matignon", "Élysée", "Elysée", "Assemblée", "Sénat", "Conseil", "État", "Etat", "France", "Météo-France",
    "Banque", "Europe", "Union", "Insee", "INSEE", "Eurostat", "SNCF", "RTE", "ANSM", "Urssaf", "URSSAF", "Acoss", "ACOSS",
    "AFT", "DGFiP", "DGFIP", "Journal", "Officiel", "Premier", "Président", "Présidente", "République", "Gouvernement",
    "Parlement", "Hub'Eau", "Indeed", "Odissé", "Santé", "Seine", "Rhône", "Loire", "Garonne", "Constitution", "Cour",
    "Comptes", "Trésor", "Agence", "Sécurité", "Sociale", "Zone", "Euro", "BCE", "Ministère", "Ministre", "Cabinet",
    "Note", "Social", "Bilan", "Dossier", "Urgence", "Le", "La", "Les", "Un", "Une", "En", "Au", "Aux", "Ce", "Cette",
    "Il", "Elle", "Nous", "Vous", "Si", "Sans", "Avec", "Pour", "Dans", "Par", "Sur", "Depuis", "Selon", "Côté",
}


def _norm(s: str) -> str:
    s = re.sub(r"[\s \xa0]", "", s).replace(",", ".")
    if "." in s:
        s = s.rstrip("0").rstrip(".")
    return s.lstrip("+") or "0"


def nombres_autorises(faits: dict[str, float], extra: tuple = (), textes_source: tuple = ()) -> set[str]:
    """Nombres admis : valeurs des faits (arrondies à 0, 1 ou 2 décimales) et nombres déjà présents
    dans les textes du payload d'entrée (titres et résumés construits par le pipeline)."""
    ok = {_norm(n) for t in textes_source for n in RE_NOMBRE.findall(t)}
    for v in list(faits.values()) + list(extra):
        if not isinstance(v, (int, float)):
            continue
        for nd in (0, 1, 2):
            ok.add(_norm(f"{round(float(v), nd):.{nd}f}"))
            ok.add(_norm(f"{abs(round(float(v), nd)):.{nd}f}"))
        ok.add(_norm(repr(float(v))))
    return ok


def valider(texte: str, faits: dict[str, float], extra: tuple = (), textes_source: tuple = (),
            dates_autorisees: frozenset = frozenset()) -> list[str]:
    """Liste des motifs de rejet (vide = texte acceptable). Les dates sont des jetons entiers : une date
    n'est admise que si elle figure telle quelle dans les textes sources ou parmi `dates_autorisees`."""
    motifs = []
    dates_ok = set(dates_autorisees) | {d for t in textes_source for d in RE_DATE.findall(t)}
    for d in RE_DATE.findall(texte):
        if d not in dates_ok:
            motifs.append(f"date absente du payload : {d}")
    texte_sans_dates = RE_DATE.sub(" ", texte)
    ok = nombres_autorises(faits, extra, tuple(RE_DATE.sub(" ", t) for t in textes_source))
    for n in RE_NOMBRE.findall(texte_sans_dates):
        if _norm(n) not in ok:
            motifs.append(f"nombre absent du payload : {n.strip()}")
    if RE_CIVILITE.search(texte):
        motifs.append("civilité suivie d'un nom propre")
    for m in RE_MAJ_SUITE.finditer(texte):
        mots = re.findall(r"[A-ZÉÈÀÂÎÔÛÇ][\w'’-]+", m.group(0))
        if any(w not in INSTITUTIONS for w in mots):
            motifs.append(f"suite de noms propres non institutionnels : {m.group(0)}")
    if len(texte) > MAX_CHARS:
        motifs.append(f"texte trop long ({len(texte)} caractères)")
    return motifs


# ------------------------------------------------------------------ appels LLM
ROLES = {
    "bercy": ("Bercy", "le conseiller budgétaire du ministère de l'Économie et des Finances, attentif aux coûts, au déficit et à la crédibilité financière"),
    "social": ("Cabinet social", "la conseillère sociale du cabinet présidentiel, attentive aux ménages, à l'emploi et aux services publics"),
}

SYSTEM = """Tu rédiges une note de deux à quatre phrases pour le Président dans un jeu de simulation.
Tu es {role}.
Règles absolues :
- n'utilise QUE les nombres présents dans FAITS, recopiés tels quels ; n'en calcule aucun autre ;
- ne cite aucune personne réelle, aucun parti, aucun élu, aucun fait divers individuel ;
- ton institutionnel, neutre, en français ; une recommandation de prudence ou d'action, sans chiffre inventé ;
- réponds uniquement par un objet JSON : {{"titre": "...", "texte": "..."}}."""


def _appel(role_key: str, dossiers: list[dict], modele: str, cle: str) -> dict:
    payload = {"dossiers": [{"titre": d["titre"], "resume": d["resume"], "faits": d["faits"]} for d in dossiers]}
    body = {"model": modele, "max_tokens": 500, "temperature": 0.3,
            "system": SYSTEM.format(role=ROLES[role_key][1]),
            "messages": [{"role": "user", "content": "FAITS :\n" + json.dumps(payload, ensure_ascii=False)}]}
    res = net.get(ANTHROPIC_URL, method="POST", data=json.dumps(body),
                  headers={"x-api-key": cle, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                  tries=2, passes=1, timeout=60)
    out = json.loads(res.body.decode("utf-8"))
    txt = "".join(b.get("text", "") for b in out.get("content", []) if b.get("type") == "text").strip()
    txt = re.sub(r"^```(?:json)?|```$", "", txt).strip()
    return json.loads(txt)


def gabarit(role_key: str, dossiers: list[dict]) -> dict:
    """Note déterministe : ne réemploie que les phrases-résumés déjà validées des dossiers."""
    d = dossiers[0] if dossiers else None
    if not d:
        return {"titre": "Journée sans alerte", "texte": "Aucun indicateur ne s'écarte de sa trajectoire habituelle."}
    if role_key == "bercy":
        titre = f"Coût d'une réponse : {d['titre'].lower()}"
        texte = f"{d['resume']} Toute mesure doit être financée ou gagée avant d'être annoncée ; une réponse réversible est préférable."
    else:
        titre = f"Effets sur les ménages : {d['titre'].lower()}"
        texte = f"{d['resume']} Les ménages modestes et les territoires exposés seront touchés en premier ; une réponse visible et rapide limitera la tension."
    return {"titre": titre, "texte": texte}


def notes_tour1(dossiers: list[dict], extra_nombres: tuple = (), use_llm: bool = True) -> list[dict]:
    faits = {}
    for d in dossiers:
        faits.update({f"{d['id']}.{k}": v for k, v in d["faits"].items()})
    sources = tuple(t for d in dossiers for t in (d["titre"], d["resume"]))
    cle = os.environ.get("ANTHROPIC_API_KEY")
    sorties = []
    for role_key in ("bercy", "social"):  # deux appels isolés, mêmes entrées, rôles symétriques
        rejets: list[str] = []
        if use_llm and cle and dossiers:
            for _ in range(2):
                try:
                    o = _appel(role_key, dossiers, MODELE_DEFAUT, cle)
                    titre, texte = str(o.get("titre", "")).strip(), str(o.get("texte", "")).strip()
                    motifs = valider(titre + " " + texte, faits, extra_nombres, sources)
                    if not motifs and titre and texte:
                        sorties.append({"auteur": role_key, "titre": titre, "texte": texte, "mode": "llm",
                                        "modele": MODELE_DEFAUT, "rejets": rejets})
                        break
                    rejets.extend(motifs or ["titre ou texte vide"])
                except Exception as e:  # noqa: BLE001
                    rejets.append(f"appel en échec : {type(e).__name__}")
            else:
                g = gabarit(role_key, dossiers)
                sorties.append({"auteur": role_key, **g, "mode": "gabarit", "modele": None, "rejets": rejets[:6]})
            continue
        g = gabarit(role_key, dossiers)
        sorties.append({"auteur": role_key, **g, "mode": "gabarit", "modele": None,
                        "rejets": [] if cle or not use_llm else ["ANTHROPIC_API_KEY absente : gabarit déterministe"]})
    return sorties
