# @simpres/mobile-core — Persistance locale et moteur narratif hors ligne (étape 3)

Ce paquet est du TypeScript pur, prêt à être importé par l'application Expo (étape 4). Il couvre :

- la base locale SQLite, avec un schéma compatible `expo-sqlite` ;
- les sauvegardes et l'historique jour par jour ;
- le pack de graines embarqué et les scénarios « Archives de Crise » ;
- la narration déterministe des dossiers, des notes de conseillers, de l'Une du soir et des brèves ;
- le validateur anti-hallucination.

Il ne fait **aucun appel réseau** et n'importe aucun module natif.

```bash
npm ci
npm run typecheck   # tsc --noEmit (strict)
npm test            # vitest : 139 tests, ~30 s (dont 3 mandats complets narrés et 1 mandat persisté en SQLite)
```

## Arborescence

```
src/
  index.ts                 API publique
  types.ts                 TurnRecord, SaveRecord, pastilles d'attribution
  db/
    driver.ts              contrat SqlDatabase (sous-ensemble de SQLiteDatabase d'expo-sqlite) et ouvrirBaseExpo()
    schema.ts              DDL et migrations (PRAGMA user_version)
    storage.ts             StorageService : graines, parties, historique, courbe duale, Unes
    sha256.ts              SHA-256 pur TypeScript (empreinte publiée par le relais)
  archives/
    graine-2026-11-14.json graine réelle du relais (étape 1), jouable sans réseau
    pack.ts                pack embarqué et installation idempotente
    scenarios.ts           4 scénarios « Archives de Crise », faits sourcés
  narrative/
    etat.ts                état narratif (instantané sérialisable du moteur)
    templates.ts           bibliothèque de gabarits paramétrés
    generator.ts           buildTurnNarrative(state, dossiers, lastDecision)
    validator.ts           validateur anti-hallucination
    personnalites.ts       liste de blocage (personnalités et formations politiques réelles)
    enrich.ts              enrichissement LLM optionnel, avec repli instantané
    format.ts              formatage français déterministe (sans Intl)
    lettres.ts             classes de caractères latines (compatibilité Hermes)
  session/
    game-session.ts        partie en cours : moteur + narration + sauvegarde automatique
    snapshot.ts            extraction de l'état du moteur, pastilles d'attribution
tests/                     vitest, avec node:sqlite derrière la même interface qu'expo-sqlite
```

## Base locale (`db/`)

| Table | Contenu |
|---|---|
| `seeds` | Graines quotidiennes téléchargées, graine embarquée et archives. Le JSON est validé par `parseGraine` (shared/schema.ts) et identifié par son SHA-256 (dédoublonnage). |
| `saves` | Une ligne par partie : `session_id`, `seed_date`, `current_day`, état du moteur (`Simulation.serialiser()`, ~150 Ko à 5 ans), mémoire narrative, ordre du catalogue, progression. |
| `turn_history` | Une ligne par jour simulé : les 48 indicateurs Jeu et Référence (courbe duale), la synthèse, les décisions du jour, les interruptions, les pastilles d'attribution, l'Une et les brèves du tour. |

Le comportement du stockage :

- **Sérialisation.** Toutes les opérations passent par une file séquentielle, car `withTransactionAsync` d'expo-sqlite n'est pas exclusive.
- **Sauvegarde atomique.** L'état, les jours simulés et la décision du jour sont écrits dans la même transaction.
- **Troncature.** Les jours postérieurs au jour sauvegardé sont supprimés.
- **Courbe duale.** `courbe(sessionId, "ENE4")` lit l'historique en SQL (`json_extract`) sans le charger en entier.

## Narration (`narrative/`)

`buildTurnNarrative(state, dossiers, lastDecision, { memoire })` est **déterministe** : la même entrée donne toujours le même texte. La mémoire anti-répétition évite les trois dernières variantes utilisées pour chaque bloc.

| Familles (source du moteur) | Ce qui est couvert |
|---|---|
| `energie`, `meteo`, `eau`, `normes`, `sante`, `emploi`, `mobilite` (Slot 1, sources `donnees`, `graine`, `divergence`) | Titre et constat par niveau ; repère = normale récente (médiane sur 30 jours) ou seuil d'alerte du relais ; divergences avec la mesure responsable |
| `institutions` (graine), `parlement`, `budget` (Slot 2) | Seuil de censure du moteur (289), échéance du texte, plafond de l'Acoss |
| `publication`, `dialogue` (corps intermédiaires, blocages), `ministre` (Slot 3) | Valeur publiée et précédente, radicalisation et blocage, archétype du ministre fictif |

Pour chaque famille et chacun des niveaux 1 à 3, la bibliothèque fournit :

- **variantes** : au moins deux de titre et de constat ;
- **enjeux** : une phrase d'enjeu propre à la famille ;
- **conseillers** : la Note de Bercy et la Note du Cabinet social ;
- **Une** : trois lignes éditoriales (économique, généraliste, populaire).

Les notes des conseillers s'adaptent à l'état du jeu :

- **Bercy** choisit son registre « marge », « vigilance » ou « alerte » selon le plafond de l'Acoss, le solde et la crédibilité.
- **Le Cabinet social** choisit « apaisé », « tendu » ou « rupture » selon la radicalisation des 8 corps intermédiaires et les blocages.
- **Recommandations** : chacun ne recommande qu'une mesure du dossier, de la même famille s'il en existe une. L'effet budgétaire est calculé sur les flux calibrés du moteur.

**Niveau et intensité.** `niveau` est l'urgence actuelle, aggravée de 15 % par jour d'inaction. `intensite` est l'ampleur initiale des faits et règle le vocabulaire. Un dossier ignoré monte donc en urgence (phrase « attend votre arbitrage depuis N jours ») sans que son titre exagère les faits.

**Validateur** (`valider`). Un bloc qui échoue est remplacé par sa version neutre et consigné dans `rejets`. Le validateur rejette :

- tout nombre absent du payload, comparé exactement, sans arrondi toléré ;
- toute date absente du payload ;
- les nombres écrits en lettres ;
- les noms propres hors liste blanche (institutions, mots des gabarits, chaînes du payload, ministres fictifs) ;
- les civilités ;
- les personnalités et formations politiques réelles ;
- les variables `{…}` restantes et les textes trop longs.

**Enrichissement LLM** (`enrichirNarration`). Il est facultatif et ne s'active qu'en ligne. Chaque bloc réécrit repasse par le même validateur. En cas de délai dépassé (2,5 s par défaut), d'erreur ou de rejet, le gabarit est conservé. Aucune clé d'API ne doit être embarquée : l'enrichisseur distant passe par un serveur relais.

## Archives de Crise

Chaque scénario rejoue un choc **de même nature** qu'une crise passée sur la situation **réelle** de la graine du 14/11/2026. Seule l'accroche historique contient des chiffres, et chacun d'eux est sourcé. Le choc injecté dans le moteur est un paramètre de conception.

| Scénario | Faits | Source |
|---|---|---|
| Confinement sanitaire | 17 mars 2020 à 12 h → 11 mai 2020 | vie-publique.fr ✅ |
| Flambée des prix de l'énergie | hausse des TRVE limitée à 4 % TTC au 1er février 2022 | CRE, délibération 2022-198 ✅ |
| Pénurie de carburants | 31,3 % des stations en difficulté le 11 octobre 2022 au soir | ministère de la Transition énergétique, via l'AFP ⚠️ source secondaire |
| Tempêtes de fin d'année | 92 morts ; 3 450 000 foyers privés d'électricité le 28 décembre 1999 ; 7 Md€ de sinistres assurés | EDF via Maire-info ⚠️ secondaire ; FFSA (Annales des Mines) ✅ |

## Intégration Expo (étape 4)

```ts
import * as SQLite from "expo-sqlite";
import { GameSession, StorageService, installerPackEmbarque, ouvrirBaseExpo, SEED_EMBARQUEE } from "@simpres/mobile-core";

const storage = await StorageService.ouvrir(await ouvrirBaseExpo(SQLite.openDatabaseAsync));
await installerPackEmbarque(storage);                                         // jouable hors ligne dès le premier lancement
// en ligne : storage.importerGraine(texte, { kind: "quotidienne", sha256Attendu })  (texte brut téléchargé + fichier .sha256)
const partie = await GameSession.nouvelle(storage, { seedId: SEED_EMBARQUEE, scenarioId: "penurie-carburants-2022" });
const { narration } = await partie.avancer(7);                                // journalise chaque jour, narre, sauvegarde
await partie.decider(narration.dossiers[0]!.options[0]!.gabaritId, narration.dossiers[0]!.id);  // sauvegarde automatique
```

⚠️ Le code importe `../engine/src` et `../shared` par chemins relatifs (monorepo). Metro doit donc surveiller la racine du dépôt (`watchFolders`) et résoudre `zod` depuis `node_modules`. C'est à valider à l'étape 4 avec la configuration Metro d'Expo.

✅ **Compatibilité Hermes.** Le code embarqué n'utilise ni `\p{…}`, ni `normalize()`, ni `Intl`, ni `structuredClone`, ni module Node. Le test `compat.test.ts` le vérifie aussi sur `engine/` et `shared/`.
