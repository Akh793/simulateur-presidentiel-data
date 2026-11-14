"""Registre des indicateurs câblés. Un indicateur n'entre ici qu'après vérification réelle de sa source.

Pilotage : quotidien/hebdomadaire, seul éligible au détecteur d'anomalies et au Slot 1.
Bilan    : mensuel/trimestriel/annuel, affiché sous « brouillard statistique ».
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Optional

LO = "Licence Ouverte / Open Licence 2.0 (Etalab)"
EUROSTAT_LIC = "Réutilisation libre avec mention de la source (décision 2011/833/UE)"


@dataclass
class Spec:
    id: str
    famille: str                  # famille d'anomalie (quota de diversité du Slot 1)
    ministere: str
    sous_categorie: str
    libelle: str
    unite: str
    cadence: str
    producteur: str
    jeu: str
    url: str
    tolerance_jours: int
    licence: str = LO
    officiel: bool = True
    anomalie: str = "mad"         # mad | direct | aucune
    seuil: float = 2.5
    horaire: bool = False         # rafraîchi par la tâche horaire légère
    n_obs: int = 2                # observations lues (BDM : lastNObservations, règle n° 1)
    fenetre: int = 28             # observations de référence du z robuste (court : limite les faux positifs saisonniers)
    notes: list[str] = field(default_factory=list)


PILOTAGE: list[Spec] = [
    Spec("ENE1", "energie", "ecologie_energie", "Électricité", "Consommation électrique moyenne journalière", "MW",
         "quotidienne", "RTE (ODRÉ)", "eco2mix-national-tr", "https://odre.opendatasoft.com/explore/dataset/eco2mix-national-tr/",
         2, horaire=True, notes=["Fenêtre glissante d'environ 75 jours côté source : archivage continu sur la branche data."]),
    Spec("ENE4", "energie", "ecologie_energie", "Carburants", "Prix moyen du gazole à la pompe", "€/L", "quotidienne",
         "Ministère de l'Économie", "prix-des-carburants-en-france-flux-instantane-v2",
         "https://data.economie.gouv.fr/explore/dataset/prix-des-carburants-en-france-flux-instantane-v2/", 2, horaire=True),
    Spec("MET1", "meteo", "interieur", "Sécurité civile", "Indice de vigilance météorologique (jaune 1, orange 3, rouge 9)",
         "points", "quotidienne", "Météo-France (data.gouv.fr)", "vigilance-meteorologique-archivee",
         "https://www.data.gouv.fr/datasets/vigilance-meteorologique-archivee", 1, anomalie="direct", seuil=9.0, horaire=True),
    Spec("MET2", "meteo", "ecologie_energie", "Climat", "Température maximale moyenne (panel de 12 départements)", "°C",
         "quotidienne", "Météo-France (data.gouv.fr)", "donnees-climatologiques-de-base-quotidiennes",
         "https://www.data.gouv.fr/datasets/donnees-climatologiques-de-base-quotidiennes", 4,
         notes=["Écart comparé au même jour un an plus tôt, faute de normale 1991-2020 dans le flux."]),
    Spec("EAU1", "eau", "agriculture", "Ressource en eau", "Variation sur 7 jours du niveau des nappes (panel de piézomètres)", "m",
         "quotidienne", "BRGM (Hub'Eau)", "niveaux_nappes/chroniques_tr", "https://hubeau.eaufrance.fr/page/api-piezometrie", 3),
    Spec("EAU2", "eau", "ecologie_energie", "Ressource en eau", "Débit cumulé Seine, Rhône, Loire, Garonne", "m³/s",
         "quotidienne", "Hub'Eau hydrométrie v2", "hydrometrie/obs_elab QmnJ", "https://hubeau.eaufrance.fr/page/api-hydrometrie", 4),
    Spec("JUS1", "normes", "justice", "Production normative", "Textes normatifs publiés au Journal officiel", "textes",
         "quotidienne", "DILA", "OPENDATA/JORF", "https://echanges.dila.gouv.fr/OPENDATA/JORF/", 4, horaire=True,
         notes=["Pas de JO le lundi et certains jours fériés : tolérance de 4 jours."]),
    Spec("JUS3", "normes", "justice", "Application des lois", "Taux d'application des mesures réglementaires (législature en cours)",
         "%", "quotidienne", "Assemblée nationale (baromètre)", "barometre_application_lois_assemblee.csv",
         "https://www.data.gouv.fr/datasets/donnees-du-barometre-de-lapplication-des-lois", 3, seuil=3.0),
    Spec("SAN1", "sante", "sante", "Urgences", "Passages hebdomadaires estimés aux urgences (grippe, covid-19, gastro-entérite)",
         "passages", "hebdomadaire", "Santé publique France (Odissé) x DREES (SAE)", "odisse *-passages-aux-urgences-*-france",
         "https://odisse.santepubliquefrance.fr/", 21, fenetre=12,
         notes=["Volume = taux pour 100 000 passages x passages annuels SAE / 52,18 : estimation, pas un comptage.",
                "Semaine retenue = dernière semaine publiée pour les trois pathologies (la gastro-entérite paraît une semaine plus tard)."]),
    Spec("SAN3", "sante", "sante", "Médicaments", "Spécialités en rupture ou en tension d'approvisionnement", "spécialités",
         "quotidienne", "ANSM (Base de données publique des médicaments)", "CIS_CIP_Dispo_Spec.txt",
         "https://base-donnees-publique.medicaments.gouv.fr/", 21,
         notes=["Le fichier ne date que les changements de statut : tolérance de 21 jours."]),
    Spec("TRA2", "emploi", "travail_solidarites", "Emploi", "Indice des offres d'emploi en ligne (CVS, base 100 = 1er février 2020)",
         "indice", "quotidienne", "Indeed Hiring Lab", "job_postings_tracker/FR",
         "https://github.com/hiring-lab/job_postings_tracker", 10, licence="CC BY 4.0", officiel=False,
         notes=["Source non officielle, repli tant que la clé France Travail n'est pas configurée."]),
    Spec("TRA3", "emploi", "travail_solidarites", "Emploi", "Offres d'emploi créées la veille (France Travail)", "offres",
         "quotidienne", "France Travail", "offresdemploi/v2", "https://francetravail.io/", 3, anomalie="mad"),
    Spec("MOB1", "mobilite", "transports_logement", "Ferroviaire", "Trains SNCF supprimés ou en retard de 5 min ou plus", "%",
         "quotidienne", "SNCF (transport.data.gouv.fr)", "horaires-sncf GTFS-RT trip-updates",
         "https://transport.data.gouv.fr/datasets/horaires-sncf", 2, horaire=True,
         notes=["Moyenne des instantanés horaires du flux temps réel ; le premier jour ne compte qu'un instantané."]),
]

# Tolérance des bilans = 2 x durée de la période + délai de publication habituel + 10 jours de marge,
# l'âge étant compté depuis le DÉBUT de la période (un trimestre publié à T+45 jours peut avoir 230 jours).
BILAN: list[Spec] = [
    Spec("MAC1", "", "economie_finances", "Prix", "Indice des prix à la consommation, base 2025", "indice", "mensuelle",
         "INSEE", "011814630", "https://bdm.insee.fr/series/sdmx/data/SERIES_BDM/011814630", 95),
    Spec("MAC2", "", "travail_solidarites", "Chômage", "Taux de chômage au sens du BIT, France entière", "%", "trimestrielle",
         "INSEE", "011818543", "https://bdm.insee.fr/series/sdmx/data/SERIES_BDM/011818543", 235),
    Spec("MAC3", "", "economie_finances", "Conjoncture", "Indicateur du climat des affaires", "indice", "mensuelle",
         "INSEE", "001565530", "https://bdm.insee.fr/series/sdmx/data/SERIES_BDM/001565530", 95),
    Spec("MAC4", "", "travail_solidarites", "Ménages", "Indicateur synthétique de confiance des ménages", "indice", "mensuelle",
         "INSEE", "001587668", "https://bdm.insee.fr/series/sdmx/data/SERIES_BDM/001587668", 95),
    Spec("MAC5", "", "economie_finances", "Industrie", "Production industrielle, base 100 en 2021 (CVS-CJO)", "indice", "mensuelle",
         "INSEE", "010768261", "https://bdm.insee.fr/series/sdmx/data/SERIES_BDM/010768261", 110),
    Spec("MAC6", "", "sante", "Démographie", "Naissances vivantes par mois, France métropolitaine", "naissances", "mensuelle",
         "INSEE", "000436391", "https://bdm.insee.fr/series/sdmx/data/SERIES_BDM/000436391", 105),
    Spec("FIN1", "", "economie_finances", "Taux", "Taux à long terme de l'État, France", "%", "mensuelle",
         "Eurostat", "irt_lt_mcby_m geo=FR", "https://ec.europa.eu/eurostat/databrowser/view/irt_lt_mcby_m/default/table", 85,
         licence=EUROSTAT_LIC, horaire=True),
    Spec("FIN4", "", "europe_affaires_etrangeres", "Taux", "Taux à long terme, zone euro (composition évolutive)", "%", "mensuelle",
         "Eurostat", "irt_lt_mcby_m geo=EA", "https://ec.europa.eu/eurostat/databrowser/view/irt_lt_mcby_m/default/table", 85,
         licence=EUROSTAT_LIC, horaire=True, notes=["Le code EA20 renvoie une série vide : le code EA (composition évolutive) est utilisé."]),
    Spec("FIN2", "", "economie_finances", "Dette", "Dette publique au sens de Maastricht", "% du PIB", "trimestrielle",
         "Eurostat", "gov_10q_ggdebt", "https://ec.europa.eu/eurostat/databrowser/view/gov_10q_ggdebt/default/table", 300,
         licence=EUROSTAT_LIC, horaire=True),
    Spec("FIN3", "", "europe_affaires_etrangeres", "Échanges", "Solde des échanges de services", "M€", "mensuelle",
         "Eurostat", "bop_c6_m bop_item=S", "https://ec.europa.eu/eurostat/databrowser/view/bop_c6_m/default/table", 120,
         licence=EUROSTAT_LIC, horaire=True, notes=["Le poste « voyages » n'est pas publié en mensuel pour la France."]),
    Spec("BUD1", "", "economie_finances", "Budget de l'État", "Solde budgétaire de l'État, cumulé depuis janvier", "€", "mensuelle",
         "DGFiP", "situations-mensuelles-budgetaires-series-longues",
         "https://data.economie.gouv.fr/explore/dataset/situations-mensuelles-budgetaires-series-longues/", 110),
    Spec("JUS2", "", "justice", "Prisons", "Personnes détenues", "détenus", "mensuelle",
         "Ministère de la Justice", "statistique-mensuelle-de-la-population-ecrouee-et-detenue-en-france",
         "https://www.data.gouv.fr/datasets/statistique-mensuelle-de-la-population-ecrouee-et-detenue-en-france", 110),
    Spec("URS1", "", "travail_solidarites", "Cotisations", "Masse salariale trimestrielle du secteur privé (CVS)", "€", "trimestrielle",
         "Urssaf", "masse-salariale-du-secteur-prive-france-entiere",
         "https://open.urssaf.fr/explore/dataset/masse-salariale-du-secteur-prive-france-entiere/", 250),
    Spec("ENE2", "", "ecologie_energie", "Gaz", "Stock de gaz en fin de journée, Teréga seul", "GWh", "mensuelle",
         "Teréga (ODRÉ)", "stock-quotidien-stockages-gaz", "https://odre.opendatasoft.com/explore/dataset/stock-quotidien-stockages-gaz/", 110),
]

# Sous-catégories prévues sans source câblée à ce jour (raison constatée lors des audits).
MANQUANTES: list[str] = [
    "Éducation, ESR : effectifs et postes non pourvus (data.education, annuel) — non câblé",
    "Agriculture : stocks céréaliers (Agreste, annuel) — non câblé",
    "Armées : stocks d'équipements classifiés — à modéliser de façon abstraite",
    "Transports, logement : permis et mises en chantier Sit@del2 — non câblé",
    "Transports, logement : demande de logement social (annuelle, 2024) — non câblé",
    "Intérieur : délinquance enregistrée SSMSI (base annuelle data.gouv.fr, 09/07/2026) — non câblé",
    "Intérieur : demandes d'asile OFPRA (annuel) — non câblé",
    "Santé : lits et soignants (SAE annuelle) — non câblé",
    "Énergie : stock hydraulique hebdomadaire — clé API RTE requise",
    "Énergie : stocks Storengy et GNL — clé GIE AGSI+/ALSI requise",
    "Finances : TEC 10 ans quotidien — clé Webstat requise ; licence Euronext pour un usage commercial",
    "Finances : encours de la dette négociable AFT — dépôt manuel mensuel (site protégé contre les robots)",
    "Culture, sports : fréquentation (annuelle) — non câblé",
    "Europe : balance des voyages — clé Webstat requise",
]
