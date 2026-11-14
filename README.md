# Simulateur Présidentiel Français — Étape 1 : relais de données · Étape 2 : moteur · Étape 3 : persistance et narration hors ligne · Étape 4 : application mobile

Le relais tourne gratuitement sur GitHub Actions, interroge les sources publiques de l'État avec les
8 règles d'ingestion de l'audit, et publie chaque matin un fichier statique `graine_du_jour.json`
que l'application mobile télécharge au lancement d'une partie. Aucun serveur, aucune clé côté joueur.

## Arborescence

```
.github/workflows/daily_seed.yml   lot quotidien 09h15 Paris + tâche horaire légère, publication GitHub Pages
.github/workflows/ci.yml           tests pipeline + jobs « engine », « mobile-core » et « mobile-app » bloquants
config/parametres.yml              valeurs de substitution sourcées (règle n° 8), base SAE des urgences
config/tokens.yml                  jetons optionnels et leur date d'expiration (alerte J-30)
pipeline/hc.py                     harnais réseau existant (v1.1 : fichiers temporaires propres à chaque appel)
pipeline/checks.py                 30 contrôles de non-régression existants, réutilisés par le lot quotidien
pipeline/build_seed.py             orchestrateur (modes quotidien / horaire)
pipeline/gen_ts.py                 génère schema/graine.schema.json et shared/schema.ts depuis le schéma Pydantic
pipeline/seed/schema.py            schéma de la graine : SOURCE DE VÉRITÉ
pipeline/seed/rules.py             les 8 règles d'ingestion, en fonctions pures
pipeline/seed/health.py            état SQLite : sources_health, historique, cache ETag
pipeline/seed/archive.py           archivage continu eCO2mix et SNCF, graines datées
pipeline/seed/registry.py          indicateurs câblés (13 de pilotage, 14 de bilan) et manquants
pipeline/seed/connectors/          un module par famille de sources
pipeline/seed/tour1.py             composition des 3 dossiers du Tour 1
pipeline/seed/narrative.py         notes Bercy / Social (2 appels isolés), validateur, gabarits
pipeline/tests/                    tests hors réseau (pytest)
schema/graine.schema.json          JSON Schema généré
shared/schema.ts                   types et validateur zod générés, pour l'application Expo
engine/                            Étape 2 : moteur TypeScript pur (macro, flux, Parlement, acteurs, dossiers) — voir engine/README.md
mobile-core/                       Étape 3 : SQLite (expo-sqlite), sauvegardes, narration hors ligne, Archives de Crise — voir mobile-core/README.md
mobile-app/                        Étape 4 : application Expo (iOS, Android), écrans SVG, Style Bible et prompts — voir mobile-app/README.md
```

## Mise en service

1. Créer le dépôt **public** sur GitHub (Pages et minutes Actions illimitées sont gratuits en public ;
   en privé, le plan gratuit plafonne à 2 000 minutes par mois, juste pour 744 passages horaires).
2. *Settings → Pages → Source : GitHub Actions*.
3. *Settings → Secrets and variables → Actions*, tous optionnels :
   `ANTHROPIC_API_KEY`, `FT_CLIENT_ID`, `FT_CLIENT_SECRET`, `WEBSTAT_API_KEY`, `AGSI_API_KEY`, `RTE_CLIENT_ID` ;
   variable `SEED_LLM_MODEL` (défaut `claude-sonnet-5-5`). Renseigner leur date d'expiration dans `config/tokens.yml`.
4. Lancer une première fois *Actions → Graine du jour → Run workflow* (mode quotidien). La branche `data`
   est créée au premier passage. La graine est servie à `https://<compte>.github.io/<dépôt>/graine_du_jour.json`,
   avec `graine_du_jour.json.sha256` et `sources_health.json`, et copiée avec son empreinte dans `public/` sur la
   branche `data` (`https://raw.githubusercontent.com/<compte>/<dépôt>/data/public/graine_du_jour.json`).
5. Renseigner ces deux URL dans `mobile-app/app.json` (`extra.graine.urls`), puis `cd mobile-app && npm install && npx expo start`.

Exécution locale : `pip install -r pipeline/requirements.txt` puis
`python3 -I -u pipeline/build_seed.py --mode quotidien --data data --out site`.

## Modes

| Mode | Déclencheur | Sources | Révision |
| --- | --- | --- | --- |
| quotidien | cron 07:15 et 08:15 UTC, garde « 09h Paris, une fois par jour » | toutes, Parlement, checks.py, Tour 1 | 0 |
| horaire | cron minute 7 | eCO2mix, carburants, vigilance, JORF, SNCF, Eurostat | +1 |

Sans graine du jour, le mode horaire bascule en quotidien. Les notes LLM ne sont régénérées que si la
composition des dossiers change.

## Codes de sortie de build_seed.py

`0` graine valide (même dégradée) · `1` graine invalide, rien n'est publié · `2` graine publiée mais plus de la
moitié des indicateurs de pilotage sont morts (le job échoue pour alerter).

## Limites connues

- GitHub peut retarder ou sauter un passage planifié en période de charge, et désactive les planifications
  d'un dépôt public sans activité pendant 60 jours ; les commits quotidiens sur `data` devraient compter comme
  activité (à surveiller).
- Les dates de prochaine publication sont estimées depuis la cadence : aucun calendrier officiel n'est encore lu.
- Le seuil de censure est calculé sur les sièges pourvus (`floor(pourvus/2)+1`), pas figé à 289.
