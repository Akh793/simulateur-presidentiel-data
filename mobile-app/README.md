# Étape 4 — Application mobile (`mobile-app/`)

Application React Native / Expo (TypeScript strict), jouable hors ligne sur iOS et Android. Elle s'appuie sur :

- `engine/` : le moteur de simulation pur ;
- `mobile-core/` : SQLite, sauvegardes, narration hors ligne, Archives de Crise ;
- `shared/schema.ts` : le schéma de la graine.

Tous les visuels sont des **composants SVG** livrés par défaut. La charte graphique et les prompts des illustrations peintes sont dans `assets-bible/STYLE_BIBLE.md`.

## Lancer

```bash
cd mobile-app
npm install          # .npmrc : legacy-peer-deps (conflit de pair react-dom 19.3.1 / react 19.3.0 dans l'arbre Expo)
npx expo start       # puis scanner le QR code avec Expo Go (SDK 58)
```

- **Expo Go** : toutes les dépendances natives sont incluses dans Expo Go (`expo-sqlite`, `expo-haptics`, `react-native-svg`, `expo-router`). Il n'y a ni module natif personnalisé ni `expo-dev-client`.
- **Version du SDK** : Expo Go installé depuis les stores ne charge que le SDK courant. Au passage à un SDK supérieur, lancer `npx expo install expo@latest && npx expo install --fix`, puis `npm run ci`.
- **EAS Build** : depuis `mobile-app/`, lancer `npx eas-cli build -p android --profile preview` (APK interne) ou `--profile production`. EAS envoie tout le dépôt Git, ce qui est indispensable ici puisque l'app importe `../engine`, `../mobile-core` et `../shared` ; il faut lancer la commande depuis le dossier de l'app. Avant le premier build, changer `ios.bundleIdentifier` et `android.package` (`fr.simpres.app`) dans `app.json`.

## Configurer la graine du jour

Dans `app.json`, renseigner les URL `extra.graine.urls` (ordre de priorité) :

```json
"urls": [
  "https://raw.githubusercontent.com/<compte>/<dépôt>/data/public/graine_du_jour.json",
  "https://<compte>.github.io/<dépôt>/graine_du_jour.json"
]
```

- **URL raw** : le workflow `daily_seed.yml` copie `graine_du_jour.json` et `graine_du_jour.json.sha256` dans `public/` sur la branche `data`.
- **URL Pages** : servie par le même workflow.
- **Tant que `OWNER/REPO` n'est pas remplacé**, l'app ne tente aucun réseau et démarre sur les archives embarquées. L'accueil affiche « Hors ligne : archives embarquées », et le détail de la synchronisation l'explique.

### Démarrage, étape par étape (`src/core/sync.ts`)

1. Installation du pack embarqué : graine de référence et Archives de Crise, toujours jouables hors ligne.
2. Pour chaque URL, téléchargement de la graine **et** de son empreinte `.sha256`, avec un délai de 8 s.
3. Import seulement si l'empreinte correspond. `StorageService` vérifie le SHA-256 et le schéma zod.
4. En cas d'échec (hors ligne, délai, HTTP, empreinte, schéma), bascule sur la dernière graine quotidienne déjà importée, sinon sur l'archive embarquée.
5. Une graine de plus de 36 h reste jouable, mais l'accueil le signale.

## Écrans

| Écran (spécification) | Fichier | Contenu |
|---|---|---|
| Accueil | `src/app/index.tsx` | État de la synchronisation, Nouveau mandat, Reprendre, Archives de Crise sourcées |
| Bureau doré et Parapheur | `src/app/(jeu)/bureau.tsx` | Horloge 08h30 / 10h00 / 16h00 / 20h00, Capital politique, trésorerie Acoss et État, Situations Émergentes, au plus 3 chemises avec badge de source, Note de Bercy / Cabinet social, options, tampons haptiques Décret · Projet de loi · 49.3 · Ajourner, Semaine suivante avec défilement des jours et arrêt automatique |
| Hémicycle | `src/app/(jeu)/hemicycle.tsx` | 577 sièges SVG par groupe ou par vote prévu, barre du seuil, textes en navette, tiroir des promesses (glisser à droite pour adopter, à gauche pour renoncer) |
| Cockpit | `src/app/(jeu)/cockpit/` | Thermomètre France / zone euro, grille des 12 ministères, courbes duales (référence en pointillés gris, mandat en trait plein), pastilles d'attribution cliquables, brouillard statistique hachuré |
| Calendrier des murs de trésorerie | `src/app/(jeu)/tresorerie.tsx` | Jauge liquide sur 30 jours, jalons des 5 (CAF), 9 (retraites), 15 (prélèvement à la source, Urssaf) et 28 (paie de l'État), alertes de tension, détail des flux du jour |
| Une du 20h et Acteurs | `src/app/(jeu)/une.tsx` | 3 lignes éditoriales, bandeau défilant, 12 ministres (usure, Remaniement), 8 corps (radicalisation pulsée au-delà de 75) |

## Arborescence

```
app.json · eas.json · metro.config.js · tsconfig.json · vitest.config.ts · package.json · .npmrc
assets/                     icônes et écran de démarrage (palette de la Style Bible)
assets-bible/
  STYLE_BIBLE.md            charte « ligne claire éditoriale » + 44 jeux de prompts (FLUX.2, Midjourney, SDXL)
  build_prompts.py          source unique des prompts → prompts.json et sections générées de la Bible
  prompts.json              prompts dépliés, prêts pour une génération par lot
  generer_icones.py         régénère assets/ (python3 generer_icones.py ../assets, Pillow requis)
src/app/                    routes Expo Router (accueil, onglets du jeu)
src/core/
  expo-driver.ts            ExpoSqliteDriver : adaptateur expo-sqlite → interface SqlDatabase de mobile-core
  sync.ts                   synchronisation de la graine (logique pure, fetch injecté, testée)
  regles.ts                 horloge, tampons, Situations Émergentes, badges, jalons, panoramas (pur, testé)
  jeu.tsx                   contexte React : stockage, session de jeu, actions
  libelles.ts               libellés et formats d'axe
src/components/             primitives, chemise, tampon, en-tête, défilement de semaine, presse
src/components/svg/         hémicycle, courbes duales, instruments, portraits modulaires, décors, panoramas de crise
src/theme/                  palette et teintes des groupes
tests/                      vitest : hémicycle, échelles, règles, portraits, synchronisation (node:sqlite)
```

## Vérifications

```bash
npm run typecheck      # tsc strict, y compris engine/src, mobile-core/src, shared/schema.ts
npm test               # 26 tests de logique pure
npm run ci             # + bundles Hermes Android et iOS (expo export)
python3 assets-bible/build_prompts.py   # régénère les prompts (la CI vérifie qu'ils sont à jour)
```

La CI (`.github/workflows/ci.yml`, job `mobile-app`) exécute ces quatre étapes à chaque modification de `mobile-app/`, `engine/`, `mobile-core/` ou `shared/`.

## Choix et limites

- **Monorepo sans workspaces** : Metro surveille la racine du dépôt (`watchFolders`) et résout les modules depuis `mobile-app/node_modules` seulement, ce qui donne un seul React et un seul zod. Les tests et `node_modules` des autres paquets sont exclus du bundle.
- **Un tour = un jour.** La pastille d'attribution affiche « décision « X » du <date> (jour n) » au lieu d'un « Tour 12 » ambigu.
- **Brouillard statistique** : il couvre les 36 indicateurs lents (14 de bilan publiés + 22 modélisés), pas 40.
- **Thermomètre zone euro** : agrégat Eurostat EA (composition évolutive). La série EA20 est vide à la source.
- **Paie du 28** : seulement la fonction publique d'État (≈ 5,7 M agents tous versants confondus, mais l'État ne paie que les siens). Les hôpitaux et les collectivités paient sur leur propre trésorerie.
- **49.3** : le tampon n'apparaît que sur une chemise « Parlement » liée à un texte. Le moteur applique ensuite ses règles (une fois par session hors lois de finances).
- **Seuil de 289 voix** : fixé sur 577 sièges, comme demandé à l'étape 2. La pratique de l'Assemblée le calcule sur les sièges pourvus (voir `engine/src/parlement.ts`).
- **Web** : `react-dom` et `react-native-web` ne servent qu'aux tests de fumée (`expo export --platform web` + Playwright). Le web n'est pas une cible.
- **Images peintes** : non intégrées. Le manifeste `require()` à créer est décrit dans la Style Bible, § 12.
