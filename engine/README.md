# @simpres/engine — Cœur mathématique et moteur de simulation

Le moteur est écrit en TypeScript pur (strict, `noUncheckedIndexedAccess`). Il ne fait aucune entrée-sortie ni appel réseau. Il consomme la graine validée par `shared/schema.ts` (`parseGraine`) et produit un état sérialisable que l'application persiste en local (SQLite). Un tick vaut une journée et un mandat dure 1 825 jours.

```bash
npm ci
npm run typecheck   # tsc --noEmit
npm test            # vitest : 32 tests, ~5 s
```

## Arborescence

| Fichier | Rôle |
|---|---|
| `src/index.ts` | API publique |
| `src/simulation.ts` | Orchestration du jour, avance rapide de 7 jours avec interruptions, décisions, score, sauvegarde et restauration |
| `src/macro.ts` | Calibration de E (48×48), M = (I − E)⁻¹ inversée une seule fois, inertie sigmoïde, saturation, attribution causale exacte |
| `src/linalg.ts` | Matrice dense, inversion de Gauss-Jordan avec pivot partiel, majorant de Collatz-Wielandt de ρ(\|E\|) |
| `src/indicateurs.ts` | Catalogue des 48 indicateurs : 26 issus de la graine et 22 modélisés, 12 ministères |
| `src/baseline.ts` | Trajectoire de référence (le Réel prolongé) : tendance amortie, bruit AR(1), chocs rares, graine RNG déterministe |
| `src/flux.ts` | Grand livre quotidien S(t+1) = S(t) + Σ entrées − Σ sorties (État, Acoss, Unédic, stocks physiques), cohortes de dette, murs de trésorerie |
| `src/calibration.ts` | Montants sourcés (DGFiP 2025, LFSS, AFT, AIE, DIHAL), chacun avec son statut `verifie`, `a_confirmer` ou `infere` |
| `src/calendrier.ts` | Jours fériés, jours ouvrés, n-ième jour de semaine, sessions parlementaires, dépôts PLF et PLFSS |
| `src/parlement.ts` | Votes pondérés par `cohesion_30j`, seuil de censure, 49.3, coût des décrets, promesses, dissolution, plafond Matignon |
| `src/acteurs.ts` | 6 segments, 8 corps intermédiaires avec blocage physique au-delà de 75, 12 ministres-fusibles fictifs |
| `src/dossiers.ts` | File et Parapheur : quota de diversité, bascule vers les divergences au tour 20, aggravation ×1,15 par jour |
| `src/decisions.ts` | 31 gabarits de décision : 12 décrets, 6 mesures exécutives, 4 lois, 6 PLFR, 3 PLFSSR |
| `tests/` | `macro`, `flux`, `parlement` et `simulation` (mandat complet), sur la graine réelle `pipeline/tests/graine_exemple.json` |

## Contraintes de la spécification et preuve dans les tests

| Contrainte | Implémentation | Mesure | Test |
|---|---|---|---|
| \|e_ij\| ≤ 0,15 | Écrêtage après cumul des doublons | 0,12 | `macro.test.ts` (bloquant) |
| Somme absolue par ligne ≤ 0,6 | Normalisation de la ligne | 0,47 | idem |
| Au plus 6 liens sortants par indicateur | Élagage des liens les plus faibles | 6 | idem |
| ρ(E) < 0,5 | Majorant de Collatz-Wielandt de ρ(\|E\|), recoupé par Gelfand ‖E⁶⁴‖^(1/64) | majorant 0,163 | idem |
| Gain max de M < 3 | ‖M‖∞ | 1,54 | idem |
| M·(I − E) = I | Inversion unique au chargement | erreur < 1e-10 | idem |
| Attribution causale exacte | Prorata après saturation : Σ contributions = écart | erreur < 1e-9 | `macro` et `simulation` |
| Seuil de censure 289 | `Math.floor(siegesTotal / 2) + 1`, sièges vacants ignorés | 289 (graine : 574 sièges pourvus) | `parlement.test.ts` |
| 49.3 | AN seulement ; illimité sur PLF, PLFSS et textes rectificatifs ; sinon un par session ordinaire ; motion à J+2 | — | idem |
| Dissolution | Délai d'un an après l'élection ; élections à J+30 ; résultat selon l'opinion moyenne sur 90 jours | — | idem |
| Démission de Matignon | Plafond de capital politique × 0,9, définitif | 100 → 90 → 81 | idem |
| Mandat sans divergence ni soft-lock | 1 825 tours, 200 décisions aléatoires : valeurs finies et bornées, avance toujours ≥ 1 jour, déterminisme, sauvegarde et restauration | 0,4 à 0,7 ms par jour | `simulation.test.ts` |

## Pas quotidien (`Simulation.etapeJour`)

Chaque jour s'exécute dans cet ordre :

1. **Calendrier institutionnel.** Le PLF est déposé le 1er mardi d'octobre. Le PLFSS est déposé au plus tard le 15 octobre.
2. **Macro.** L'état se calcule en forme fermée : V_jeu(i,t) = V_ref(i,t) + s_i · sat(Σ_k (M u_k)_i · σ_k(t − t_k)), où s_i est l'unité d'écart et sat = 4·tanh(x/4).
3. **Flux.** Le grand livre du jeu et celui de la référence (l'uchronie comptable) avancent. Les multiplicateurs macro → flux s'appliquent (TVA, IR, IS, Urssaf, chômage, ONDAM). Les blocages de corps réduisent la TVA et les apports pétroliers.
4. **Indicateurs comptables.**
   - BUD1 est le solde de l'État depuis le 1er janvier.
   - FIN2 est la dette indexée sur l'encours négociable.
   - LOG_M3 mesure la tension d'hébergement : demande modulée par MET1 face à la capacité.
5. **Acteurs.** L'approbation, la radicalisation et les blocages évoluent. La régénération du capital politique dépend de l'opinion.
6. **Parlement.**
   - Les jalons de la navette avancent, les promesses sont vérifiées, des motions spontanées peuvent survenir.
   - Chaque LFSS fixe le plafond d'emprunt de l'Acoss de l'année suivante.
   - Une loi spéciale ne fait que le reconduire.
7. **Murs de trésorerie.** Le moteur contrôle les murs du jour et projette ceux du lendemain. Un même motif ne coupe l'avance rapide qu'une fois tous les 30 jours.
8. **Annulations.** Le Conseil d'État peut annuler un décret au-delà de 5 décrets par trimestre.
9. **Dossiers.** Ils vieillissent, expirent après 60 jours et sont générés à partir des anomalies, des divergences, des ministres et des corps. L'interruption « urgence » se déclenche quand un dossier franchit la gravité 4.
10. **Révélations.** Les publications des indicateurs de bilan tombent à leur date de la graine, et le moteur vérifie les engagements publics.

`avancer(7)` enchaîne au plus 7 jours et s'arrête au premier événement critique : urgence, mur critique, échéance parlementaire, promesse, crise d'un corps ou fin de mandat. L'avance progresse toujours d'au moins un jour, si bien qu'aucun soft-lock n'est possible.

## Utilisation

```ts
import { parseGraine } from "../shared/schema";
import { Simulation } from "@simpres/engine";

const sim = new Simulation(parseGraine(json));             // seed dérivée de date_jeu + révision
const { interruptions, parapheur } = sim.avancer(7);
sim.decider(parapheur[0]!.options[0]!, parapheur[0]!.id);  // décret, exécutif, ou dépôt de loi / PLFR / PLFSSR
sim.engager493("T1"); sim.signerPromesse("GRP", "plan_hopital", "adopter", 60);
sim.attribution("MAC1");                                    // part de chaque décision dans l'écart au Réel
const sauvegarde = sim.serialiser();                        // ~150 Ko après 5 ans
const reprise = Simulation.restaurer(graine, sauvegarde);
```

## Écarts assumés par rapport à la spécification

Légende : ✅ vérifié · ⚠️ inféré ou paramètre de conception.

- ⚠️ **Seuil de censure à 289.** C'est la règle demandée, appliquée par défaut. La pratique de l'Assemblée compte les sièges pourvus : avec 574 sièges pourvus, le seuil serait de 288. La bascule se fait avec `parlement: { baseMajorite: "sieges_pourvus" }`.
- ✅ **Adjudications d'OAT.** Elles ont lieu le 1er jeudi (long terme) et le 3e jeudi (moyen terme), sans séance au 3e jeudi de décembre, avec règlement à J+2. Les BTF sont émis le lundi.
- ✅ **DGF.** Elle est versée par douzièmes mensuels. Les acomptes trimestriels ne concernent que l'IS (15 mars, juin, septembre et décembre).
- ⚠️ **Paie le 28.** Seul l'État verse la paie des agents de la fonction publique d'État (156,2 Md€ en 2025). La fonction publique territoriale et l'hospitalière sont payées par leurs employeurs. La règle `paie: "audit"` reste disponible.
- ✅/⚠️ **Urssaf le 15.** L'échéance du 15 est conservée comme le demande la spécification. Les employeurs d'au moins 50 salariés déclarent et paient toutefois le 5 (service-public.fr).
- ⚠️ **Encours Acoss 2026 de 82,3 Md€.** Il est lu comme le point haut d'emprunt de l'année. Le lire comme la position au 31 décembre ferait violer le plafond légal de 83 Md€ dès le jour 0 du fait du profil infra-mensuel.
- ⚠️ **Solde budgétaire du jour 0.** Il part de la dernière situation mensuelle publiée, à laquelle s'ajoutent les flux modélisés. Les comptes spéciaux ne sont pas modélisés : la taxe foncière et la CFE, encaissées en fin d'année par le compte d'avances aux collectivités, manquent. Le niveau de fin 2026 est donc trop déficitaire. L'écart entre jeu et référence, seul utilisé pour le score et les dossiers, n'est pas affecté.
- ⚠️ **Paramètres de conception.** Les élasticités de E, les impulsions des gabarits, les poids des acteurs, la prime de risque et la régénération du capital politique sont des paramètres de conception. Aucune donnée publique ne les fixe.
- ✅ **Aucune personnalité réelle.** Les noms de ministres sont générés. Les groupes parlementaires ne portent que leur code et leurs effectifs issus de la graine, sans position idéologique codée.

## Modifications apportées pendant l'étape 3 (mobile-core)

Elles ont été mises au jour par la narration et ont chacune un test de non-régression :

- **Divergences.** Un dossier de divergence ne compte plus que la part de l'écart due aux **décisions** du joueur (`partDecisions`). Les événements et les blocages en sont exclus. Les divergences favorables comptent aussi : auparavant, aucune divergence n'apparaissait sur 4 695 tours de jeu, si bien que la règle du tour 20 restait sans effet.
- **Quota de diversité.** Le tour en cours ne compte plus. Avant, un dossier présenté en Slot 1 disparaissait dès la première décision de la journée.
- **Nouveaux gabarits.** `plan_intemperies`, `moratoire_normes` et `plan_ferroviaire` comblent l'absence de mesure pour les familles météo, normes et mobilité. `optionsPour` propose désormais d'abord les mesures de la famille du dossier, puis celles du ministère.
- **Nouveaux accesseurs.** `normaleRecente(id)` (médiane sur 30 jours) et `ecartUnites(id)` servent à la narration. `publiees[id].precedente` conserve la valeur publiée précédente.

## Limite connue (à traiter)

⚠️ La trajectoire de référence n'a **pas de saisonnalité**. Elle prolonge la tendance récente de la graine : par exemple, la consommation électrique monte de novembre à mai, et la température maximale atteint 24,9 °C en février. Correctif proposé : un profil saisonnier calé sur les archives eCO2mix et sur les normales de Météo-France, déjà archivées par le relais.
