"""Schéma de `graine_du_jour.json` — source de vérité unique.

Les types TypeScript/zod de l'application (`shared/schema.ts`) et le JSON Schema
(`schema/graine.schema.json`) sont GÉNÉRÉS depuis ce fichier par `gen_ts.py`.
Ne jamais les modifier à la main : la CI échoue si la génération diffère.

Conventions :
- dates au format ISO `AAAA-MM-JJ`, horodatages en UTC avec suffixe `Z` ;
- montants en euros entiers, taux en pourcentage (4.89 = 4,89 %) ;
- `Point.d` = premier jour de la période observée (mois, trimestre, semaine ISO) ;
- intégrité : le relais publie `graine_du_jour.json.sha256` (SHA-256 des octets exacts du fichier),
  que l'application compare avant de parser.
"""
from __future__ import annotations

from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

SCHEMA_VERSION: Literal["1.0.0"] = "1.0.0"
CIBLE_SOUS_CATEGORIES = 48  # 12 ministères x 4 sous-catégories (spécification)


class Strict(BaseModel):
    """Base commune : champs inconnus refusés, tous les champs émis à la sérialisation."""

    model_config = ConfigDict(extra="forbid", json_schema_serialization_defaults_required=True)


class Ministere(str, Enum):
    economie_finances = "economie_finances"
    travail_solidarites = "travail_solidarites"
    sante = "sante"
    ecologie_energie = "ecologie_energie"
    transports_logement = "transports_logement"
    interieur = "interieur"
    justice = "justice"
    education_esr = "education_esr"
    agriculture = "agriculture"
    armees = "armees"
    europe_affaires_etrangeres = "europe_affaires_etrangeres"
    culture_sports = "culture_sports"
    transversal = "transversal"


class Cadence(str, Enum):
    quotidienne = "quotidienne"
    hebdomadaire = "hebdomadaire"
    mensuelle = "mensuelle"
    trimestrielle = "trimestrielle"
    annuelle = "annuelle"


class StatutSource(str, Enum):
    vivante = "vivante"
    en_retard = "en_retard"
    morte = "morte"


class Source(Strict):
    producteur: str
    jeu: str = Field(description="Identifiant du jeu : dataset ODS, IDBANK, slug data.gouv, URL de fichier")
    url: str
    licence: str
    officiel: bool = Field(description="False pour les sources tierces (Indeed, Lampions) : afficher « non officiel »")


class Point(Strict):
    d: str = Field(description="Premier jour de la période, AAAA-MM-JJ")
    v: float


class Anomalie(Strict):
    methode: Literal["mad_robuste", "seuil_direct", "historique_insuffisant"]
    score: Optional[float] = Field(description="z robuste (médiane/MAD) ou niveau direct normalisé")
    seuil: float
    depasse: bool
    sens: Literal["hausse", "baisse", "neutre"]
    fenetre: int = Field(description="Nombre d'observations de la fenêtre de référence")
    gravite: int = Field(ge=0, le=5)


class IndicateurPilotage(Strict):
    id: str
    famille_anomalie: str = Field(description="Famille pour le quota de diversité du Slot 1 (ex. energie, meteo, eau)")
    ministere: Ministere
    sous_categorie: str
    libelle: str
    unite: str
    cadence: Literal["quotidienne", "hebdomadaire"]
    source: Source
    statut_source: StatutSource
    derniere_date: Optional[str]
    derniere_valeur: Optional[float]
    serie: list[Point] = Field(max_length=120)
    anomalie: Anomalie
    composantes: dict[str, float] = Field(description="Détail chiffré du dernier point (ex. ruptures, tensions)")
    notes: list[str]


class Publication(Strict):
    periode: str = Field(description="Libellé de période : 2026-10, 2026-T3, 2026")
    d: str
    valeur: float
    publiee_le: Optional[str] = Field(description="Date de mise à jour déclarée par le producteur")


class ProchainePublication(Strict):
    date: Optional[str]
    estimee: bool = Field(description="True si déduite de la cadence, faute de calendrier officiel lu")


class EstimationCabinet(Strict):
    valeur: float
    bas: float
    haut: float
    methode: Literal["persistance_amortie", "persistance"]
    periodes_ecoulees: int


class IndicateurBilan(Strict):
    id: str
    ministere: Ministere
    sous_categorie: str
    libelle: str
    unite: str
    cadence: Literal["mensuelle", "trimestrielle", "annuelle"]
    source: Source
    statut_source: StatutSource
    derniere: Optional[Publication]
    precedente: Optional[Publication]
    prochaine: ProchainePublication
    estimation_cabinet: Optional[EstimationCabinet]
    libelle_brouillard: str = Field(description="Ex. « Donnée T3 2026 — prochaine publication estimée en février 2027 »")
    serie: list[Point] = Field(max_length=60)


class Groupe(Strict):
    code: str
    libelle: str
    sieges: int = Field(ge=0)
    cohesion_30j: Optional[float] = Field(description="Part moyenne des votants du groupe alignés sur sa position majoritaire, 0-1")
    scrutins_30j: int = Field(ge=0)


class Chambre(Strict):
    code: Literal["AN", "SENAT"]
    legislature: Optional[int]
    sieges_total: int
    sieges_pourvus: int
    majorite_absolue: int = Field(description="floor(sièges pourvus / 2) + 1")
    seuil_censure: Optional[int] = Field(description="AN seulement : majorité des membres composant l'Assemblée")
    groupes: list[Groupe]
    scrutins_7j: int
    maj_source: Optional[str] = Field(description="Last-Modified du fichier source")


class Parlement(Strict):
    an: Optional[Chambre]
    senat: Optional[Chambre]


class SanteSource(Strict):
    id: str
    libelle: str
    statut: StatutSource
    http: Optional[int]
    derniere_donnee: Optional[str]
    age_jours: Optional[int]
    tolerance_jours: int
    echecs_consecutifs: int
    verifie_le: str
    info: str


class Jeton(Strict):
    nom: str
    usage: str
    configure: bool
    expire_le: Optional[str]
    jours_restants: Optional[int]
    alerte_j30: bool


class Substitution(Strict):
    id: str
    libelle: str
    valeur: float
    unite: str
    reference: str = Field(description="Date ou période de la valeur de référence")
    source_libelle: str
    source_url: str
    statut: Literal["verifie", "a_confirmer"]
    note: str


class Dossier(Strict):
    id: str
    slot: Literal[1, 2, 3]
    type: Literal["urgence_data", "institutionnel", "ministeriel"]
    famille_anomalie: str
    ministere: Ministere
    titre: str
    resume: str
    gravite: int = Field(ge=1, le=5)
    indicateurs: list[str]
    faits: dict[str, float] = Field(description="Seuls nombres autorisés dans la narration")
    hausse_gravite_inaction: float = Field(description="+0,15 = +15 % de gravité par tour d'inaction")


class Note(Strict):
    auteur: Literal["bercy", "social"]
    titre: str
    texte: str
    mode: Literal["llm", "gabarit"]
    modele: Optional[str]
    rejets: list[str] = Field(description="Motifs de rejet des sorties LLM écartées")


class Une(Strict):
    titre: str
    sous_titre: str
    bandeau_20h: list[str] = Field(max_length=6)


class Tour1(Strict):
    date_jeu: str
    jour_calme: bool
    dossiers: list[Dossier] = Field(max_length=3)
    notes: list[Note] = Field(max_length=2)
    une: Une


class Couverture(Strict):
    pilotage_cablees: int
    bilan_cablees: int
    cible_sous_categories: int
    manquantes: list[str] = Field(description="Indicateurs prévus mais non câblés, avec la raison")


class Meta(Strict):
    generated_at: str = Field(description="Horodatage UTC ISO 8601")
    date_jeu: str = Field(description="Date du jour à Paris")
    mode: Literal["quotidien", "horaire"]
    revision: int = Field(ge=0, description="0 au lot de 09h15, +1 à chaque révision horaire du même jour")
    pipeline_version: str
    duree_s: float
    couverture: Couverture
    alertes: list[str]


class Graine(Strict):
    schema_version: Literal["1.0.0"]
    meta: Meta
    sources_health: list[SanteSource]
    jetons: list[Jeton]
    pilotage: list[IndicateurPilotage]
    bilan: list[IndicateurBilan]
    parlement: Parlement
    substitutions: list[Substitution]
    tour1: Tour1
