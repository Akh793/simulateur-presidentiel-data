# Style Bible — « Cartoon réaliste / Ligne claire éditoriale »

Charte graphique du Simulateur présidentiel. Elle fixe la palette, le trait, la lumière, le système de portraits modulaires et les formats, puis donne les prompts prêts à l'emploi (FLUX.2, Midjourney, SDXL) pour peindre les illustrations qui remplaceront un jour les vecteurs de repli.

- **État actuel de l'application** : tout est dessiné en SVG (`src/components/svg/`) et respecte déjà cette charte. Les images peintes sont **optionnelles**. Leur branchement est décrit au § 12.
- **Source unique des prompts** : `build_prompts.py`. Il régénère `prompts.json` et la section « Prompts » de ce fichier, entre les marqueurs. Pour changer le style de tous les prompts d'un coup, on modifie `STYLE_*` dans le script, puis on lance `python3 build_prompts.py`.

---

## 1. Garde-fous non négociables

1. **Personnages fictifs uniquement.** Aucun portrait, prompt ou décor ne représente une personnalité politique réelle, vivante ou non, ni ne cherche à lui ressembler. Les visages restent ordinaires et ne sont pas typés pour évoquer quelqu'un. Une image qui rappelle une personne réelle est rejetée au contrôle qualité (§ 11), même si la ressemblance est fortuite.
2. **Aucun nom d'artiste vivant dans les prompts.** Le style est *décrit* (trait, aplats, lumière), jamais *cité*. Les références du § 2 servent à l'équipe, pas aux modèles.
3. **Aucun texte lisible, logo, sigle de parti ou de syndicat, ni bloc-marque gouvernemental (« Marianne »).** Papiers, écrans, banderoles et pancartes restent vierges. Les insignes neutres sont admis : écharpe tricolore unie, drapeau sans inscription.
4. **Couleurs politiques neutralisées.** Les groupes parlementaires reçoivent des teintes *dérivées de la palette* (§ 3.2), pas les couleurs de marque des partis.
5. **Crises sans violence graphique.** Pas de blessé visible, de sang ni d'arme braquée. La tension passe par la foule, l'attente, la lumière.
6. **Diversité réaliste.** Âges, genres, carnations et morphologies varient d'un personnage à l'autre, sans caricature ethnique ni stéréotype de métier.

## 2. Intention

> Ligne claire éditoriale contemporaine : le sérieux d'un dossier ministériel, la lisibilité d'un album, la tension d'un jeu de gestion politique.

| Référence (usage interne) | Ce que l'on retient | Ce que l'on ne retient pas |
|---|---|---|
| Ligne claire franco-belge (tradition) | Trait d'épaisseur constante, aplats francs, aucune hachure, décors précis et lisibles | Archaïsmes de l'époque (couleurs criardes, stéréotypes) |
| *Quai d'Orsay* (bande dessinée) | Le **ton** : agitation des cabinets, gestuelle expressive, ironie sur le pouvoir | Le **trait** : pinceau nerveux et déformations fortes, incompatibles avec la ligne claire (voir l'avertissement ci-dessous) |
| *Suzerain* (jeu vidéo) | La **mise en scène** de l'interface : bureau, dossiers, conseillers, décisions sous contrainte | Son univers graphique propre |

⚠️ **Contradiction dans l'intitulé.** « Ligne claire × *Quai d'Orsay* » associe deux graphies opposées : la ligne claire a un trait constant et sage, *Quai d'Orsay* un trait libre et caricatural. Arbitrage retenu : **trait ligne claire** (§ 4) et **attitudes inspirées de la caricature éditoriale** (postures, expressions un peu appuyées), sans déformation anatomique.

## 3. Palette

### 3.1 Couleurs de base (imposées, `src/theme/palette.ts`)

| Nom | Hex | Rôle | Part indicative de l'image |
|---|---|---|---|
| Bleu Nuit Élysée | `#0B192C` | Fonds sombres, **trait** (jamais de noir pur), ombres profondes | 35 % |
| Papier Ministériel | `#F7F4EB` | Cartes, chemises, peaux claires éclairées, ciels pâles | 30 % |
| Or Dorure | `#C49A3A` | Dorures, accents d'interface, lumière chaude, gilets haute visibilité | 15 % |
| Gris Ardoise | `#5A6577` | Pierre, costumes, éléments secondaires, texte discret | 12 % |
| Bleu Cobalt | `#1D5B9E` | Informations, liens, lumière froide, gyrophares | 5 % |
| Rouge République | `#C82834` | Alertes, tampons, velours, **une seule tache dominante par image** | 3 % |

Règles :
- Toutes les teintes intermédiaires sont des **mélanges linéaires** de deux couleurs de base (`melange(a, b, t)`).
- **Seule exception** : les carnations (6 valeurs, `TEINTS`) et les teintes de cheveux (6 valeurs, `CHEVEUX`) de `portrait-traits.ts` sont des hex fixes hors palette. Une palette de six couleurs ne couvre pas la diversité des peaux. Leurs ombres restent des mélanges avec Nuit.
- Contraste texte / fond ≥ 4,5:1 (WCAG AA) : Nuit sur Papier ≈ 16:1, Papier sur Nuit idem. **Or sur Nuit n'est autorisé que pour les titres** de taille ≥ 18 pt.

### 3.2 Teintes dérivées des groupes parlementaires (`src/theme/groupes.ts`)

<!-- GROUPES:DEBUT -->
| Groupe | Libellé | Hex | Construction |
|---|---|---|---|
| LFI-NFP | La France insoumise – NFP | `#862331` | Rouge 65 % + Nuit |
| GDR | Gauche démocrate et républicaine | `#AC2633` | Rouge 85 % + Nuit |
| ECOS | Écologiste et social | `#C65B37` | Rouge 55 % + Or |
| SOC | Socialistes et apparentés | `#C82834` | Rouge |
| LIOT | Libertés, indépendants, outre-mer et territoires | `#D6BA78` | Or 65 % + Papier |
| DEM | Les Démocrates | `#C49A3A` | Or |
| EPR | Ensemble pour la République | `#797E67` | Or 55 % + Cobalt |
| HOR | Horizons et indépendants | `#6991B9` | Cobalt 65 % + Papier |
| DR | Droite républicaine | `#1D5B9E` | Cobalt |
| UDR | Union des droites pour la République | `#153D6B` | Cobalt 55 % + Nuit |
| RN | Rassemblement national | `#656C75` | Nuit 62 % + Papier |
| NI | Non-inscrits | `#B0B4B7` | Ardoise 45 % + Papier |

Aucune teinte ne reprend la couleur de marque d'un parti. Les groupes voisins en séance reçoivent des teintes voisines, pour que le dégradé gauche → droite se lise d'un coup d'œil. Toute nouvelle teinte de groupe doit être un mélange de la palette.
<!-- GROUPES:FIN -->

## 4. Trait et aplats

- **Trait** : Bleu Nuit `#0B192C`, épaisseur **constante** de 3 px pour un buste de 1 024 px (≈ 0,3 % de la largeur), 2 px pour les décors de 1 080 px. Extrémités et jonctions arrondies. Aucune variation de pression.
- **Aplats** : au plus **deux valeurs par matière**, l'aplat et une seule ombre portée (même teinte mélangée à 15–25 % de Nuit). Pas de dégradé dans les personnages.
- **Dégradés** : seulement dans les **lumières de décor** (fenêtre, halo de lampe, ciel), en deux ou trois paliers.
- **Interdits** : hachures, trames, grain photographique, flou de profondeur, contours colorés, effets 3D.
- **Exception d'interface** : la hachure diagonale du **brouillard statistique** (Cockpit) est un code de lecture, pas un effet d'illustration.

## 5. Typographie

- **Titres** : serif système (Georgia sur iOS, Noto Serif sur Android), en gras. Aucune police n'est téléchargée, pour rester compatible avec Expo Go et garder un démarrage hors ligne.
- **Texte et chiffres** : police système (San Francisco, Roboto). Chiffres en français, avec espace fine insécable avant les unités.
- **Tampons** : capitales grasses espacées (lettre-spacing 2), couleur de l'encre du tampon.
- Les illustrations peintes ne contiennent **jamais** de texte : tout libellé est posé par l'interface.

## 6. Lumière

| Éclairage | Usage | Clé | Ombres |
|---|---|---|---|
| Matin (08h30 – 10h00) | Bureau, phases Matin et Conseil | Lumière froide et pâle venant de la fenêtre, Papier légèrement bleui | Longues, douces, Ardoise |
| Après-midi (16h00) | Bureau, phase Parlement | Soleil bas, doré, reflets Or sur les dorures | Chaudes, Or mêlé de Nuit |
| Nuit (20h00) | Bureau, phase Soir et Une du 20h | Une lampe de bureau, flaque d'Or | Profondes, Nuit, une seule source |

L'horloge du Bureau (`core/regles.ts`, `eclairage(phase)`) choisit l'éclairage. Les trois décors peints du Bureau doré doivent donc garder un cadrage **identique**, pour qu'on passe de l'un à l'autre en fondu.

## 7. Portraits modulaires (4 calques)

Le composant `ModularPortrait.tsx` superpose quatre calques, dans cet ordre. Les PNG peints suivent la même structure, pour pouvoir remplacer le SVG calque par calque.

| # | Calque | Contenu | Variantes (SVG actuel) | Fichier PNG |
|---|---|---|---|---|
| 1 | Morphologie | Cou, visage, oreilles, carnation | 4 formes × 6 carnations | `morpho.png` |
| 2 | Tenue | Veste, col (cravate, foulard, col ouvert), insigne de la fonction | 4 vestes × 3 cols × 3 accents | `tenue.png` |
| 3 | Coiffure et accessoires | Cheveux, lunettes, barbe | 6 coiffures × 6 teintes, lunettes, barbe | `coiffure.png` |
| 4 | Expression et fatigue | Sourcils, yeux, bouche, paupières, cernes | 4 expressions × fatigue continue | `expression_<etat>.png`, `fatigue_<niveau>.png` |

**Gabarit commun** (toile de 1 024 × 1 024 px, PNG transparent) :
- axe vertical du visage : x = 512 ;
- ligne des yeux : y = 460 (45 %) ; menton : y = 700 ; épaules coupées par le bord bas ;
- largeur du visage : 300 à 360 px selon la morphologie ;
- marge latérale minimale : 96 px (le cadre de l'app recadre en carré arrondi).

**États** (calculés par `etatMinistre` / `etatCorps`) :

| Expression | Ministre | Responsable de corps |
|---|---|---|
| `neutre` | par défaut | par défaut |
| `confiant` | popularité ≥ 60 et tension < 40 | approbation > 20 |
| `inquiet` | tension ≥ 70 | radicalisation ≥ 55 |
| `colere` | loyauté < 45 | radicalisation ≥ 75 (seuil de blocage) |

| Fatigue | Usure (ministre) ou radicalisation ÷ 1,4 (corps) | Rendu |
|---|---|---|
| `legere` | 20 à 45 | Cernes fines, Ardoise à 25 % |
| `marquee` | 45 à 70 | Cernes et paupières mi-closes |
| `extreme` | > 70 | Cernes creusées, teint grisé de 10 %, mèche défaite |

⚠️ **Limite pratique.** Les modèles de diffusion ne produisent pas de calques alignés au pixel près. Processus recommandé :
1. peindre un **buste complet** de référence par personnage (prompts du § 10.2) ;
2. décliner les **expressions** et la **fatigue** par édition de l'image de référence (§ 10.3), visage seul ;
3. **détourer** à la main (ou avec un outil de suppression d'arrière-plan) en calques 1 à 4 sur le gabarit ;
4. vérifier la superposition sur la grille avant intégration.

À défaut, on peut livrer des bustes complets par état (`buste_<expression>_<fatigue>.png`), soit 12 images par personnage, au prix de la combinatoire.

## 8. Décors et panoramas

| Famille | Format final | Usage dans l'app | Zones calmes |
|---|---|---|---|
| Décors plein écran | **1 080 × 2 340 px (9:19.5)**, PNG/WebP | Fonds d'écran (Bureau, Hémicycle, Conseil, Perron) | **Quart supérieur** (en-tête) et **tiers inférieur** (tampons, barre d'onglets) peu détaillés |
| Panoramas de crise | **1 440 × 600 px (12:5)** | Bandeau des chemises de gravité ≥ 2 et de l'arrêt de semaine | Aucune : l'interface ne recouvre pas le bandeau |

- Décors **sans personnage** : seuls les bustes portent l'incarnation.
- Panoramas : figurants fictifs autorisés, de dos, de trois quarts ou à petite échelle. Aucun visage en gros plan.

## 9. Grammaire des prompts par moteur

Les prompts sont rédigés en **anglais**. ⚠️ C'est la pratique courante et le meilleur rendu observé, mais aucune documentation ne l'exige.

| | FLUX.2 (Black Forest Labs) | Midjourney (V8.x) | SDXL 1.0 |
|---|---|---|---|
| Forme | Prose descriptive, couleurs en **hex** | Sujet d'abord, paramètres à la fin | Prompt positif + **prompt négatif** |
| Exclusions | ✅ **Pas de prompt négatif** : on décrit ce que l'on veut (« blank, unmarked papers ») | `--no …` | Champ négatif |
| Portrait | 1 024 × 1 024 | `--ar 1:1` | 1 024 × 1 024 |
| Décor 9:19.5 | **1 152 × 2 496** (multiples de 16, < 4 Mpx), puis réduction à 1 080 × 2 340 | `--ar 18:39` (⚠️ ratio entier équivalent à 9:19.5) | 640 × 1 536, puis recadrage et agrandissement (⚠️ résolution d'entraînement courante) |
| Panorama 12:5 | 1 536 × 640 | `--ar 12:5` | 1 536 × 640 (⚠️ idem) |
| Cohérence de série | Références multiples (image de style + personnage) | `--sref <URL de la planche étalon>` ; ⚠️ `--oref` pour un personnage | Même graine + LoRA « flat colour / lineart » de votre choix, validée sur la planche étalon |
| Réglages conseillés | — | `--raw --s 60` | ⚠️ 30 pas, CFG 5 à 7, DPM++ 2M Karras |

Statut des sources :
- ✅ FLUX.2 n'accepte pas de prompt négatif ; ses dimensions doivent être des multiples de 16, jusqu'à 4 Mpx (aide en ligne et guide de prompt de Black Forest Labs).
- ⚠️ Midjourney : V8.2 est le modèle par défaut depuis le 24 juillet 2026, et `--ar`, `--raw`, `--no` et `--sref` sont acceptés en V8.x. Ces points viennent de guides tiers qui citent la documentation officielle, non consultée directement.
- ⚠️ SDXL : résolutions et réglages issus de la pratique courante, à valider sur votre pipeline.

**Planche étalon.** Avant toute série, peindre le buste du Secrétaire général et le Bureau doré du matin, les valider au contrôle qualité (§ 11), puis les utiliser comme référence de style pour **toutes** les autres images.

## 10. Prompts

<!-- PROMPTS:DEBUT -->
Section générée par `build_prompts.py` : ne pas éditer à la main. Le même contenu, en JSON, est dans `prompts.json`.

### 10.1 Planche étalon : Secrétaire général

<details><summary><b>Secrétaire général de la présidence</b> · <code>assets/art/portraits/secretaire_general/buste.png</code></summary>

**FLUX.2** (1024×1024)

```text
a fictional secretary-general of the presidency, a man in his early sixties with light skin, close-cropped white hair and rimless glasses, charcoal three-piece suit and navy tie, a slim leather folder held against his chest, calm and unreadable expression. front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat background in warm paper white #F7F4EB. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a fictional secretary-general of the presidency, a man in his early sixties with light skin, close-cropped white hair and rimless glasses, charcoal three-piece suit and navy tie, a slim leather folder held against his chest, calm and unreadable expression, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 1:1 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1024×1024)

```text
a fictional secretary-general of the presidency, a man in his early sixties with light skin, close-cropped white hair and rimless glasses, charcoal three-piece suit and navy tie, a slim leather folder held against his chest, calm and unreadable expression, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1024×1024 PNG transparent (après détourage)

</details>

### 10.2 a — Les 12 ministres

<details><summary><b>Ministre de l'Économie et des Finances</b> · <code>assets/art/portraits/ministre_economie_finances/buste.png</code></summary>

**FLUX.2** (1024×1024)

```text
a fictional minister of the economy and finance, a woman in her mid-fifties with light skin and a sleek silver bob, navy pinstripe trouser suit, cream silk blouse, a slim red folder under her arm, reading glasses pushed up on her head, composed and calculating. front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat background in warm paper white #F7F4EB. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a fictional minister of the economy and finance, a woman in her mid-fifties with light skin and a sleek silver bob, navy pinstripe trouser suit, cream silk blouse, a slim red folder under her arm, reading glasses pushed up on her head, composed and calculating, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 1:1 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1024×1024)

```text
a fictional minister of the economy and finance, a woman in her mid-fifties with light skin and a sleek silver bob, navy pinstripe trouser suit, cream silk blouse, a slim red folder under her arm, reading glasses pushed up on her head, composed and calculating, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1024×1024 PNG transparent (après détourage)

</details>

<details><summary><b>Ministre du Travail et des Solidarités</b> · <code>assets/art/portraits/ministre_travail_solidarites/buste.png</code></summary>

**FLUX.2** (1024×1024)

```text
a fictional minister of labour and solidarity, a man in his late forties with olive skin, wavy dark hair and a short salt-and-pepper beard, slate grey jacket over an open-collared white shirt, sleeves slightly pushed up, a sheaf of notes in hand, earnest look. front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat background in warm paper white #F7F4EB. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a fictional minister of labour and solidarity, a man in his late forties with olive skin, wavy dark hair and a short salt-and-pepper beard, slate grey jacket over an open-collared white shirt, sleeves slightly pushed up, a sheaf of notes in hand, earnest look, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 1:1 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1024×1024)

```text
a fictional minister of labour and solidarity, a man in his late forties with olive skin, wavy dark hair and a short salt-and-pepper beard, slate grey jacket over an open-collared white shirt, sleeves slightly pushed up, a sheaf of notes in hand, earnest look, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1024×1024 PNG transparent (après détourage)

</details>

<details><summary><b>Ministre de la Santé</b> · <code>assets/art/portraits/ministre_sante/buste.png</code></summary>

**FLUX.2** (1024×1024)

```text
a fictional minister of health, a woman in her early sixties with deep brown skin and short natural grey curls, former physician bearing, dark blue suit with a small plain gold lapel pin, folded glasses in the breast pocket, attentive and tired eyes. front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat background in warm paper white #F7F4EB. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a fictional minister of health, a woman in her early sixties with deep brown skin and short natural grey curls, former physician bearing, dark blue suit with a small plain gold lapel pin, folded glasses in the breast pocket, attentive and tired eyes, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 1:1 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1024×1024)

```text
a fictional minister of health, a woman in her early sixties with deep brown skin and short natural grey curls, former physician bearing, dark blue suit with a small plain gold lapel pin, folded glasses in the breast pocket, attentive and tired eyes, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1024×1024 PNG transparent (après détourage)

</details>

<details><summary><b>Ministre de l'Écologie et de l'Énergie</b> · <code>assets/art/portraits/ministre_ecologie_energie/buste.png</code></summary>

**FLUX.2** (1024×1024)

```text
a fictional minister of ecology and energy, a man in his early forties with medium brown skin and tidy short black hair, light navy suit, knitted cobalt tie, a rolled technical map under his arm, focused expression. front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat background in warm paper white #F7F4EB. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a fictional minister of ecology and energy, a man in his early forties with medium brown skin and tidy short black hair, light navy suit, knitted cobalt tie, a rolled technical map under his arm, focused expression, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 1:1 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1024×1024)

```text
a fictional minister of ecology and energy, a man in his early forties with medium brown skin and tidy short black hair, light navy suit, knitted cobalt tie, a rolled technical map under his arm, focused expression, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1024×1024 PNG transparent (après détourage)

</details>

<details><summary><b>Ministre des Transports et du Logement</b> · <code>assets/art/portraits/ministre_transports_logement/buste.png</code></summary>

**FLUX.2** (1024×1024)

```text
a fictional minister of transport and housing, a woman in her late thirties with light olive skin and straight black hair in a low ponytail, slate grey blazer over a red knit top, a white site helmet tucked under her arm, energetic posture. front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat background in warm paper white #F7F4EB. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a fictional minister of transport and housing, a woman in her late thirties with light olive skin and straight black hair in a low ponytail, slate grey blazer over a red knit top, a white site helmet tucked under her arm, energetic posture, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 1:1 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1024×1024)

```text
a fictional minister of transport and housing, a woman in her late thirties with light olive skin and straight black hair in a low ponytail, slate grey blazer over a red knit top, a white site helmet tucked under her arm, energetic posture, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1024×1024 PNG transparent (après détourage)

</details>

<details><summary><b>Ministre de l'Intérieur</b> · <code>assets/art/portraits/ministre_interieur/buste.png</code></summary>

**FLUX.2** (1024×1024)

```text
a fictional minister of the interior, a man in his mid-fifties with light skin, a shaved head and a square jaw, dark navy suit, white shirt, dark tie, stern and alert expression. front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat background in warm paper white #F7F4EB. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a fictional minister of the interior, a man in his mid-fifties with light skin, a shaved head and a square jaw, dark navy suit, white shirt, dark tie, stern and alert expression, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 1:1 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1024×1024)

```text
a fictional minister of the interior, a man in his mid-fifties with light skin, a shaved head and a square jaw, dark navy suit, white shirt, dark tie, stern and alert expression, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1024×1024 PNG transparent (après détourage)

</details>

<details><summary><b>Ministre de la Justice</b> · <code>assets/art/portraits/ministre_justice/buste.png</code></summary>

**FLUX.2** (1024×1024)

```text
a fictional minister of justice, a woman in her late fifties with tan skin and grey-blonde hair pinned in a tight chignon, black suit, white high-collared shirt, holding a thick bound code with a blank cover, severe and measured. front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat background in warm paper white #F7F4EB. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a fictional minister of justice, a woman in her late fifties with tan skin and grey-blonde hair pinned in a tight chignon, black suit, white high-collared shirt, holding a thick bound code with a blank cover, severe and measured, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 1:1 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1024×1024)

```text
a fictional minister of justice, a woman in her late fifties with tan skin and grey-blonde hair pinned in a tight chignon, black suit, white high-collared shirt, holding a thick bound code with a blank cover, severe and measured, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1024×1024 PNG transparent (après détourage)

</details>

<details><summary><b>Ministre de l'Éducation et de l'Enseignement supérieur</b> · <code>assets/art/portraits/ministre_education_esr/buste.png</code></summary>

**FLUX.2** (1024×1024)

```text
a fictional minister of education and higher education, a man in his early sixties with light skin, unruly white hair and tortoiseshell glasses, muted gold corduroy jacket, cobalt knitted tie, a stack of blank exercise books, professorial and slightly harried. front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat background in warm paper white #F7F4EB. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a fictional minister of education and higher education, a man in his early sixties with light skin, unruly white hair and tortoiseshell glasses, muted gold corduroy jacket, cobalt knitted tie, a stack of blank exercise books, professorial and slightly harried, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 1:1 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1024×1024)

```text
a fictional minister of education and higher education, a man in his early sixties with light skin, unruly white hair and tortoiseshell glasses, muted gold corduroy jacket, cobalt knitted tie, a stack of blank exercise books, professorial and slightly harried, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1024×1024 PNG transparent (après détourage)

</details>

<details><summary><b>Ministre de l'Agriculture</b> · <code>assets/art/portraits/ministre_agriculture/buste.png</code></summary>

**FLUX.2** (1024×1024)

```text
a fictional minister of agriculture, a man in his fifties with weathered sun-tanned skin and a short grey moustache, navy suit worn under a quilted slate gilet, a sprig of wheat in the breast pocket, down-to-earth smile. front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat background in warm paper white #F7F4EB. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a fictional minister of agriculture, a man in his fifties with weathered sun-tanned skin and a short grey moustache, navy suit worn under a quilted slate gilet, a sprig of wheat in the breast pocket, down-to-earth smile, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 1:1 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1024×1024)

```text
a fictional minister of agriculture, a man in his fifties with weathered sun-tanned skin and a short grey moustache, navy suit worn under a quilted slate gilet, a sprig of wheat in the breast pocket, down-to-earth smile, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1024×1024 PNG transparent (après détourage)

</details>

<details><summary><b>Ministre des Armées</b> · <code>assets/art/portraits/ministre_armees/buste.png</code></summary>

**FLUX.2** (1024×1024)

```text
a fictional minister of the armed forces, a woman in her early fifties with deep brown skin and a short dark crop, dark navy suit with a high-buttoned jacket, small plain gold pin, upright posture, steady gaze. front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat background in warm paper white #F7F4EB. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a fictional minister of the armed forces, a woman in her early fifties with deep brown skin and a short dark crop, dark navy suit with a high-buttoned jacket, small plain gold pin, upright posture, steady gaze, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 1:1 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1024×1024)

```text
a fictional minister of the armed forces, a woman in her early fifties with deep brown skin and a short dark crop, dark navy suit with a high-buttoned jacket, small plain gold pin, upright posture, steady gaze, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1024×1024 PNG transparent (après détourage)

</details>

<details><summary><b>Ministre de l'Europe et des Affaires étrangères</b> · <code>assets/art/portraits/ministre_europe_affaires_etrangeres/buste.png</code></summary>

**FLUX.2** (1024×1024)

```text
a fictional minister for Europe and foreign affairs, a man in his late forties of East Asian descent with a neatly trimmed grey beard, impeccable midnight-blue suit, muted gold silk pocket square, diplomatic composure. front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat background in warm paper white #F7F4EB. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a fictional minister for Europe and foreign affairs, a man in his late forties of East Asian descent with a neatly trimmed grey beard, impeccable midnight-blue suit, muted gold silk pocket square, diplomatic composure, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 1:1 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1024×1024)

```text
a fictional minister for Europe and foreign affairs, a man in his late forties of East Asian descent with a neatly trimmed grey beard, impeccable midnight-blue suit, muted gold silk pocket square, diplomatic composure, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1024×1024 PNG transparent (après détourage)

</details>

<details><summary><b>Ministre de la Culture et des Sports</b> · <code>assets/art/portraits/ministre_culture_sports/buste.png</code></summary>

**FLUX.2** (1024×1024)

```text
a fictional minister of culture and sport, a woman in her mid-forties with medium brown skin and voluminous natural curly hair, deep red jacket over a black turtleneck, bold geometric gold earrings, lively smile. front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat background in warm paper white #F7F4EB. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a fictional minister of culture and sport, a woman in her mid-forties with medium brown skin and voluminous natural curly hair, deep red jacket over a black turtleneck, bold geometric gold earrings, lively smile, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 1:1 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1024×1024)

```text
a fictional minister of culture and sport, a woman in her mid-forties with medium brown skin and voluminous natural curly hair, deep red jacket over a black turtleneck, bold geometric gold earrings, lively smile, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1024×1024 PNG transparent (après détourage)

</details>

### 10.2 b — Les 8 responsables de corps intermédiaires

<details><summary><b>Présidente d'organisation patronale</b> · <code>assets/art/portraits/corps_patronat/buste.png</code></summary>

**FLUX.2** (1024×1024)

```text
a fictional head of a national employers' federation, a woman in her sixties with light skin and steel-grey short hair, impeccable charcoal suit, pearl stud earrings, arms crossed, blank conference lanyard, cool confidence. front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat background in warm paper white #F7F4EB. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a fictional head of a national employers' federation, a woman in her sixties with light skin and steel-grey short hair, impeccable charcoal suit, pearl stud earrings, arms crossed, blank conference lanyard, cool confidence, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 1:1 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1024×1024)

```text
a fictional head of a national employers' federation, a woman in her sixties with light skin and steel-grey short hair, impeccable charcoal suit, pearl stud earrings, arms crossed, blank conference lanyard, cool confidence, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1024×1024 PNG transparent (après détourage)

</details>

<details><summary><b>Secrétaire général d'un syndicat réformiste</b> · <code>assets/art/portraits/corps_syndicats_reformistes/buste.png</code></summary>

**FLUX.2** (1024×1024)

```text
a fictional leader of a reformist trade-union confederation, a man in his fifties with medium skin, round glasses and a neat beard, navy fleece over a checked shirt, a blank round badge on the chest, conciliatory but firm. front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat background in warm paper white #F7F4EB. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a fictional leader of a reformist trade-union confederation, a man in his fifties with medium skin, round glasses and a neat beard, navy fleece over a checked shirt, a blank round badge on the chest, conciliatory but firm, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 1:1 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1024×1024)

```text
a fictional leader of a reformist trade-union confederation, a man in his fifties with medium skin, round glasses and a neat beard, navy fleece over a checked shirt, a blank round badge on the chest, conciliatory but firm, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1024×1024 PNG transparent (après détourage)

</details>

<details><summary><b>Secrétaire général d'un syndicat contestataire</b> · <code>assets/art/portraits/corps_syndicats_contestataires/buste.png</code></summary>

**FLUX.2** (1024×1024)

```text
a fictional leader of a militant trade-union confederation, a man in his late fifties with ruddy light skin and a thick grey moustache, red windbreaker jacket, a megaphone held low, determined frown. front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat background in warm paper white #F7F4EB. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a fictional leader of a militant trade-union confederation, a man in his late fifties with ruddy light skin and a thick grey moustache, red windbreaker jacket, a megaphone held low, determined frown, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 1:1 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1024×1024)

```text
a fictional leader of a militant trade-union confederation, a man in his late fifties with ruddy light skin and a thick grey moustache, red windbreaker jacket, a megaphone held low, determined frown, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1024×1024 PNG transparent (après détourage)

</details>

<details><summary><b>Présidente d'un syndicat agricole</b> · <code>assets/art/portraits/corps_monde_agricole/buste.png</code></summary>

**FLUX.2** (1024×1024)

```text
a fictional president of a farmers' union, a woman in her forties with sun-weathered skin and an auburn braid, waxed field jacket over a checked shirt, a work cap in her hand, frank and combative. front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat background in warm paper white #F7F4EB. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a fictional president of a farmers' union, a woman in her forties with sun-weathered skin and an auburn braid, waxed field jacket over a checked shirt, a work cap in her hand, frank and combative, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 1:1 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1024×1024)

```text
a fictional president of a farmers' union, a woman in her forties with sun-weathered skin and an auburn braid, waxed field jacket over a checked shirt, a work cap in her hand, frank and combative, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1024×1024 PNG transparent (après détourage)

</details>

<details><summary><b>Directeur général d'administration centrale</b> · <code>assets/art/portraits/corps_haute_fonction_publique/buste.png</code></summary>

**FLUX.2** (1024×1024)

```text
a fictional director-general of a central ministry department, a man in his forties with light skin and slicked-back dark hair, slim dark suit, thin tie, a tablet held flat with a dark screen, impassive. front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat background in warm paper white #F7F4EB. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a fictional director-general of a central ministry department, a man in his forties with light skin and slicked-back dark hair, slim dark suit, thin tie, a tablet held flat with a dark screen, impassive, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 1:1 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1024×1024)

```text
a fictional director-general of a central ministry department, a man in his forties with light skin and slicked-back dark hair, slim dark suit, thin tie, a tablet held flat with a dark screen, impassive, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1024×1024 PNG transparent (après détourage)

</details>

<details><summary><b>Maire, porte-parole des élus locaux</b> · <code>assets/art/portraits/corps_collectivites/buste.png</code></summary>

**FLUX.2** (1024×1024)

```text
a fictional mayor speaking for local authorities, a woman in her sixties with olive skin and silver hair in a bun, navy coat with a plain blue-white-red mayoral sash across the chest, warm but stubborn. front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat background in warm paper white #F7F4EB. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a fictional mayor speaking for local authorities, a woman in her sixties with olive skin and silver hair in a bun, navy coat with a plain blue-white-red mayoral sash across the chest, warm but stubborn, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 1:1 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1024×1024)

```text
a fictional mayor speaking for local authorities, a woman in her sixties with olive skin and silver hair in a bun, navy coat with a plain blue-white-red mayoral sash across the chest, warm but stubborn, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1024×1024 PNG transparent (après détourage)

</details>

<details><summary><b>Porte-parole d'une association écologiste</b> · <code>assets/art/portraits/corps_associatif_ecolo/buste.png</code></summary>

**FLUX.2** (1024×1024)

```text
a fictional spokesperson of an environmental association, a young man in his late twenties with deep brown skin and locs tied back, cobalt raincoat, canvas tote bag, a rolled blank placard under his arm, earnest and impatient. front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat background in warm paper white #F7F4EB. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a fictional spokesperson of an environmental association, a young man in his late twenties with deep brown skin and locs tied back, cobalt raincoat, canvas tote bag, a rolled blank placard under his arm, earnest and impatient, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 1:1 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1024×1024)

```text
a fictional spokesperson of an environmental association, a young man in his late twenties with deep brown skin and locs tied back, cobalt raincoat, canvas tote bag, a rolled blank placard under his arm, earnest and impatient, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1024×1024 PNG transparent (après détourage)

</details>

<details><summary><b>Porte-parole des classes moyennes mobilisées</b> · <code>assets/art/portraits/corps_classes_moyennes/buste.png</code></summary>

**FLUX.2** (1024×1024)

```text
a fictional citizen spokesperson of a middle-class protest movement, a woman in her forties with medium brown skin and a ponytail, gold-yellow high-visibility vest over a grey hoodie, car keys in hand, exasperated. front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat background in warm paper white #F7F4EB. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a fictional citizen spokesperson of a middle-class protest movement, a woman in her forties with medium brown skin and a ponytail, gold-yellow high-visibility vest over a grey hoodie, car keys in hand, exasperated, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 1:1 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1024×1024)

```text
a fictional citizen spokesperson of a middle-class protest movement, a woman in her forties with medium brown skin and a ponytail, gold-yellow high-visibility vest over a grey hoodie, car keys in hand, exasperated, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1024×1024 PNG transparent (après détourage)

</details>

### 10.2 c — Conseillers Bercy et Cabinet social

<details><summary><b>Conseiller budgétaire (Note de Bercy)</b> · <code>assets/art/portraits/conseiller_bercy/buste.png</code></summary>

**FLUX.2** (1024×1024)

```text
a fictional senior budget adviser at the finance ministry, a man in his thirties with light skin, short neat hair and thin metal glasses, white shirt with rolled sleeves, loosened navy tie, holding a blank printed table, precise and sceptical. front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat background in warm paper white #F7F4EB. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a fictional senior budget adviser at the finance ministry, a man in his thirties with light skin, short neat hair and thin metal glasses, white shirt with rolled sleeves, loosened navy tie, holding a blank printed table, precise and sceptical, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 1:1 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1024×1024)

```text
a fictional senior budget adviser at the finance ministry, a man in his thirties with light skin, short neat hair and thin metal glasses, white shirt with rolled sleeves, loosened navy tie, holding a blank printed table, precise and sceptical, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1024×1024 PNG transparent (après détourage)

</details>

<details><summary><b>Conseillère sociale (Cabinet social)</b> · <code>assets/art/portraits/conseillere_sociale/buste.png</code></summary>

**FLUX.2** (1024×1024)

```text
a fictional social-affairs adviser at the presidency, a woman in her thirties with deep brown skin and short natural hair, slate cardigan over a red blouse, notebook and pen in hand, empathetic and attentive. front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat background in warm paper white #F7F4EB. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a fictional social-affairs adviser at the presidency, a woman in her thirties with deep brown skin and short natural hair, slate cardigan over a red blouse, notebook and pen in hand, empathetic and attentive, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 1:1 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1024×1024)

```text
a fictional social-affairs adviser at the presidency, a woman in her thirties with deep brown skin and short natural hair, slate cardigan over a red blouse, notebook and pen in hand, empathetic and attentive, front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, shoulders cropped by the bottom edge, plain flat warm paper-white background, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1024×1024 PNG transparent (après détourage)

</details>

### 10.3 Calques d'expression et de fatigue (édition du buste de référence)

<details><summary><b>expression neutre</b> · <code>assets/art/portraits/<id>/expression_neutre.png</code></summary>

**FLUX.2** (référence : buste.png du personnage)

```text
Edit the reference portrait: keep exactly the same fictional person, outfit, framing, line weight and palette; change only the face to show neutral, attentive expression, relaxed brows, mouth closed.
```

**Midjourney**

```text
Edit the reference portrait: keep exactly the same fictional person, outfit, framing, line weight and palette; change only the face to show neutral, attentive expression, relaxed brows, mouth closed. --raw --oref <URL du buste> --ar 1:1 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (inpainting du visage, débruitage 0.35 à 0.5)

```text
neutral, attentive expression, relaxed brows, mouth closed, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : calque 1024×1024 PNG transparent, détouré sur le gabarit

</details>

<details><summary><b>expression confiant</b> · <code>assets/art/portraits/<id>/expression_confiant.png</code></summary>

**FLUX.2** (référence : buste.png du personnage)

```text
Edit the reference portrait: keep exactly the same fictional person, outfit, framing, line weight and palette; change only the face to show confident expression, slight closed-mouth smile, eyes softly narrowed, chin a little raised.
```

**Midjourney**

```text
Edit the reference portrait: keep exactly the same fictional person, outfit, framing, line weight and palette; change only the face to show confident expression, slight closed-mouth smile, eyes softly narrowed, chin a little raised. --raw --oref <URL du buste> --ar 1:1 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (inpainting du visage, débruitage 0.35 à 0.5)

```text
confident expression, slight closed-mouth smile, eyes softly narrowed, chin a little raised, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : calque 1024×1024 PNG transparent, détouré sur le gabarit

</details>

<details><summary><b>expression inquiet</b> · <code>assets/art/portraits/<id>/expression_inquiet.png</code></summary>

**FLUX.2** (référence : buste.png du personnage)

```text
Edit the reference portrait: keep exactly the same fictional person, outfit, framing, line weight and palette; change only the face to show worried expression, brows raised and drawn together, mouth tight, eyes slightly widened.
```

**Midjourney**

```text
Edit the reference portrait: keep exactly the same fictional person, outfit, framing, line weight and palette; change only the face to show worried expression, brows raised and drawn together, mouth tight, eyes slightly widened. --raw --oref <URL du buste> --ar 1:1 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (inpainting du visage, débruitage 0.35 à 0.5)

```text
worried expression, brows raised and drawn together, mouth tight, eyes slightly widened, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : calque 1024×1024 PNG transparent, détouré sur le gabarit

</details>

<details><summary><b>expression colere</b> · <code>assets/art/portraits/<id>/expression_colere.png</code></summary>

**FLUX.2** (référence : buste.png du personnage)

```text
Edit the reference portrait: keep exactly the same fictional person, outfit, framing, line weight and palette; change only the face to show angry expression, brows lowered and knitted, jaw clenched, nostrils slightly flared.
```

**Midjourney**

```text
Edit the reference portrait: keep exactly the same fictional person, outfit, framing, line weight and palette; change only the face to show angry expression, brows lowered and knitted, jaw clenched, nostrils slightly flared. --raw --oref <URL du buste> --ar 1:1 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (inpainting du visage, débruitage 0.35 à 0.5)

```text
angry expression, brows lowered and knitted, jaw clenched, nostrils slightly flared, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : calque 1024×1024 PNG transparent, détouré sur le gabarit

</details>

<details><summary><b>fatigue legere</b> · <code>assets/art/portraits/<id>/fatigue_legere.png</code></summary>

**FLUX.2** (référence : buste.png du personnage)

```text
Edit the reference portrait: keep exactly the same fictional person, outfit, framing, line weight and palette; change only the face to show light fatigue: faint slate-grey shadows under the eyes.
```

**Midjourney**

```text
Edit the reference portrait: keep exactly the same fictional person, outfit, framing, line weight and palette; change only the face to show light fatigue: faint slate-grey shadows under the eyes. --raw --oref <URL du buste> --ar 1:1 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (inpainting du visage, débruitage 0.35 à 0.5)

```text
light fatigue: faint slate-grey shadows under the eyes, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : calque 1024×1024 PNG transparent, détouré sur le gabarit

</details>

<details><summary><b>fatigue marquee</b> · <code>assets/art/portraits/<id>/fatigue_marquee.png</code></summary>

**FLUX.2** (référence : buste.png du personnage)

```text
Edit the reference portrait: keep exactly the same fictional person, outfit, framing, line weight and palette; change only the face to show marked fatigue: darker shadows under the eyes and heavy half-closed eyelids.
```

**Midjourney**

```text
Edit the reference portrait: keep exactly the same fictional person, outfit, framing, line weight and palette; change only the face to show marked fatigue: darker shadows under the eyes and heavy half-closed eyelids. --raw --oref <URL du buste> --ar 1:1 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (inpainting du visage, débruitage 0.35 à 0.5)

```text
marked fatigue: darker shadows under the eyes and heavy half-closed eyelids, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : calque 1024×1024 PNG transparent, détouré sur le gabarit

</details>

<details><summary><b>fatigue extreme</b> · <code>assets/art/portraits/<id>/fatigue_extreme.png</code></summary>

**FLUX.2** (référence : buste.png du personnage)

```text
Edit the reference portrait: keep exactly the same fictional person, outfit, framing, line weight and palette; change only the face to show extreme exhaustion: deep hollow shadows under the eyes, complexion slightly greyed, a lock of hair out of place.
```

**Midjourney**

```text
Edit the reference portrait: keep exactly the same fictional person, outfit, framing, line weight and palette; change only the face to show extreme exhaustion: deep hollow shadows under the eyes, complexion slightly greyed, a lock of hair out of place. --raw --oref <URL du buste> --ar 1:1 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (inpainting du visage, débruitage 0.35 à 0.5)

```text
extreme exhaustion: deep hollow shadows under the eyes, complexion slightly greyed, a lock of hair out of place, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : calque 1024×1024 PNG transparent, détouré sur le gabarit

</details>

### 10.4 Décors 9:19.5

<details><summary><b>Bureau doré — matin</b> · <code>assets/art/decors/bureau_dore_matin.webp</code></summary>

**FLUX.2** (1152×2496)

```text
a gilded presidential study in a classical Parisian palace: carved white-and-gold wood panelling, a tall French window with sheer curtains in the centre, a flat mahogany desk with a leather blotter, a closed blank folder and a fountain pen in the lower part of the frame, an empty armchair, herringbone parquet floor, the room empty of people, pale cool morning light through the window, long soft slate shadows. vertical smartphone background, eye-level wide view, the upper quarter and the lower third kept calm and low in detail to leave room for interface panels. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a gilded presidential study in a classical Parisian palace: carved white-and-gold wood panelling, a tall French window with sheer curtains in the centre, a flat mahogany desk with a leather blotter, a closed blank folder and a fountain pen in the lower part of the frame, an empty armchair, herringbone parquet floor, the room empty of people, pale cool morning light through the window, long soft slate shadows, vertical smartphone background, eye-level wide view, the upper quarter and the lower third kept calm and low in detail to leave room for interface panels, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 18:39 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching, people, person
```

**SDXL** (640×1536)

```text
a gilded presidential study in a classical Parisian palace: carved white-and-gold wood panelling, a tall French window with sheer curtains in the centre, a flat mahogany desk with a leather blotter, a closed blank folder and a fountain pen in the lower part of the frame, an empty armchair, herringbone parquet floor, the room empty of people, pale cool morning light through the window, long soft slate shadows, vertical smartphone background, eye-level wide view, the upper quarter and the lower third kept calm and low in detail to leave room for interface panels, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts, people, person
```

Format final : 1080×2340 WebP

</details>

<details><summary><b>Bureau doré — apres-midi</b> · <code>assets/art/decors/bureau_dore_apres_midi.webp</code></summary>

**FLUX.2** (1152×2496)

```text
a gilded presidential study in a classical Parisian palace: carved white-and-gold wood panelling, a tall French window with sheer curtains in the centre, a flat mahogany desk with a leather blotter, a closed blank folder and a fountain pen in the lower part of the frame, an empty armchair, herringbone parquet floor, the room empty of people, warm low golden afternoon sun, amber reflections on the gilding. vertical smartphone background, eye-level wide view, the upper quarter and the lower third kept calm and low in detail to leave room for interface panels. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a gilded presidential study in a classical Parisian palace: carved white-and-gold wood panelling, a tall French window with sheer curtains in the centre, a flat mahogany desk with a leather blotter, a closed blank folder and a fountain pen in the lower part of the frame, an empty armchair, herringbone parquet floor, the room empty of people, warm low golden afternoon sun, amber reflections on the gilding, vertical smartphone background, eye-level wide view, the upper quarter and the lower third kept calm and low in detail to leave room for interface panels, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 18:39 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching, people, person
```

**SDXL** (640×1536)

```text
a gilded presidential study in a classical Parisian palace: carved white-and-gold wood panelling, a tall French window with sheer curtains in the centre, a flat mahogany desk with a leather blotter, a closed blank folder and a fountain pen in the lower part of the frame, an empty armchair, herringbone parquet floor, the room empty of people, warm low golden afternoon sun, amber reflections on the gilding, vertical smartphone background, eye-level wide view, the upper quarter and the lower third kept calm and low in detail to leave room for interface panels, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts, people, person
```

Format final : 1080×2340 WebP

</details>

<details><summary><b>Bureau doré — nuit</b> · <code>assets/art/decors/bureau_dore_nuit.webp</code></summary>

**FLUX.2** (1152×2496)

```text
a gilded presidential study in a classical Parisian palace: carved white-and-gold wood panelling, a tall French window with sheer curtains in the centre, a flat mahogany desk with a leather blotter, a closed blank folder and a fountain pen in the lower part of the frame, an empty armchair, herringbone parquet floor, the room empty of people, night, the window deep navy blue, a single brass desk lamp casting a warm gold pool of light, everything else in deep navy shadow. vertical smartphone background, eye-level wide view, the upper quarter and the lower third kept calm and low in detail to leave room for interface panels. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a gilded presidential study in a classical Parisian palace: carved white-and-gold wood panelling, a tall French window with sheer curtains in the centre, a flat mahogany desk with a leather blotter, a closed blank folder and a fountain pen in the lower part of the frame, an empty armchair, herringbone parquet floor, the room empty of people, night, the window deep navy blue, a single brass desk lamp casting a warm gold pool of light, everything else in deep navy shadow, vertical smartphone background, eye-level wide view, the upper quarter and the lower third kept calm and low in detail to leave room for interface panels, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 18:39 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching, people, person
```

**SDXL** (640×1536)

```text
a gilded presidential study in a classical Parisian palace: carved white-and-gold wood panelling, a tall French window with sheer curtains in the centre, a flat mahogany desk with a leather blotter, a closed blank folder and a fountain pen in the lower part of the frame, an empty armchair, herringbone parquet floor, the room empty of people, night, the window deep navy blue, a single brass desk lamp casting a warm gold pool of light, everything else in deep navy shadow, vertical smartphone background, eye-level wide view, the upper quarter and the lower third kept calm and low in detail to leave room for interface panels, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts, people, person
```

Format final : 1080×2340 WebP

</details>

<details><summary><b>Hémicycle</b> · <code>assets/art/decors/hemicycle.webp</code></summary>

**FLUX.2** (1152×2496)

```text
a semicircular parliamentary chamber seen from the upper public gallery: tiers of red velvet benches rising in concentric arcs, wooden desks, a raised presiding desk and speaker's rostrum at the bottom, classical columns and a glass ceiling, the chamber empty of people, soft daylight. vertical smartphone background, eye-level wide view, the upper quarter and the lower third kept calm and low in detail to leave room for interface panels. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a semicircular parliamentary chamber seen from the upper public gallery: tiers of red velvet benches rising in concentric arcs, wooden desks, a raised presiding desk and speaker's rostrum at the bottom, classical columns and a glass ceiling, the chamber empty of people, soft daylight, vertical smartphone background, eye-level wide view, the upper quarter and the lower third kept calm and low in detail to leave room for interface panels, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 18:39 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching, people, person
```

**SDXL** (640×1536)

```text
a semicircular parliamentary chamber seen from the upper public gallery: tiers of red velvet benches rising in concentric arcs, wooden desks, a raised presiding desk and speaker's rostrum at the bottom, classical columns and a glass ceiling, the chamber empty of people, soft daylight, vertical smartphone background, eye-level wide view, the upper quarter and the lower third kept calm and low in detail to leave room for interface panels, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts, people, person
```

Format final : 1080×2340 WebP

</details>

<details><summary><b>Salle du Conseil des ministres</b> · <code>assets/art/decors/salle_conseil.webp</code></summary>

**FLUX.2** (1152×2496)

```text
a formal council-of-ministers room in a classical palace: a long table covered with navy baize, high-backed red chairs, muted gold tapestries, a crystal chandelier, tall windows with heavy curtains, the room empty of people, quiet morning light. vertical smartphone background, eye-level wide view, the upper quarter and the lower third kept calm and low in detail to leave room for interface panels. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a formal council-of-ministers room in a classical palace: a long table covered with navy baize, high-backed red chairs, muted gold tapestries, a crystal chandelier, tall windows with heavy curtains, the room empty of people, quiet morning light, vertical smartphone background, eye-level wide view, the upper quarter and the lower third kept calm and low in detail to leave room for interface panels, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 18:39 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching, people, person
```

**SDXL** (640×1536)

```text
a formal council-of-ministers room in a classical palace: a long table covered with navy baize, high-backed red chairs, muted gold tapestries, a crystal chandelier, tall windows with heavy curtains, the room empty of people, quiet morning light, vertical smartphone background, eye-level wide view, the upper quarter and the lower third kept calm and low in detail to leave room for interface panels, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts, people, person
```

Format final : 1080×2340 WebP

</details>

<details><summary><b>Perron</b> · <code>assets/art/decors/perron.webp</code></summary>

**FLUX.2** (1152×2496)

```text
the pale stone front steps of a classical palace at dusk: a short flight of steps with a red carpet down the centre, a glass canopy above double doors, wall lanterns lit in gold, a cluster of press microphones on a stand at the foot of the steps, the courtyard empty of people. vertical smartphone background, eye-level wide view, the upper quarter and the lower third kept calm and low in detail to leave room for interface panels. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
the pale stone front steps of a classical palace at dusk: a short flight of steps with a red carpet down the centre, a glass canopy above double doors, wall lanterns lit in gold, a cluster of press microphones on a stand at the foot of the steps, the courtyard empty of people, vertical smartphone background, eye-level wide view, the upper quarter and the lower third kept calm and low in detail to leave room for interface panels, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 18:39 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching, people, person
```

**SDXL** (640×1536)

```text
the pale stone front steps of a classical palace at dusk: a short flight of steps with a red carpet down the centre, a glass canopy above double doors, wall lanterns lit in gold, a cluster of press microphones on a stand at the foot of the steps, the courtyard empty of people, vertical smartphone background, eye-level wide view, the upper quarter and the lower third kept calm and low in detail to leave room for interface panels, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts, people, person
```

Format final : 1080×2340 WebP

</details>

### 10.5 Panoramas de crise 12:5

<details><summary><b>Pénurie de carburants</b> · <code>assets/art/crises/crise_carburant.webp</code></summary>

**FLUX.2** (1536×640)

```text
a petrol station during a fuel shortage: a long queue of small cars along the road, drivers waiting beside their cars, a blank red cardboard sign taped to a pump, empty jerrycans, overcast midday light. wide cinematic panorama, medium-distance view, figures small to medium size, no close-up faces. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a petrol station during a fuel shortage: a long queue of small cars along the road, drivers waiting beside their cars, a blank red cardboard sign taped to a pump, empty jerrycans, overcast midday light, wide cinematic panorama, medium-distance view, figures small to medium size, no close-up faces, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 12:5 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1536×640)

```text
a petrol station during a fuel shortage: a long queue of small cars along the road, drivers waiting beside their cars, a blank red cardboard sign taped to a pump, empty jerrycans, overcast midday light, wide cinematic panorama, medium-distance view, figures small to medium size, no close-up faces, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1440×600 WebP

</details>

<details><summary><b>Réseau électrique sous tension</b> · <code>assets/art/crises/crise_reseau.webp</code></summary>

**FLUX.2** (1536×640)

```text
a city district at night during a power-grid emergency: dark apartment blocks with only a few lit windows, a high-voltage pylon in the foreground with line workers in harnesses, cobalt-blue emergency lights on a utility truck. wide cinematic panorama, medium-distance view, figures small to medium size, no close-up faces. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a city district at night during a power-grid emergency: dark apartment blocks with only a few lit windows, a high-voltage pylon in the foreground with line workers in harnesses, cobalt-blue emergency lights on a utility truck, wide cinematic panorama, medium-distance view, figures small to medium size, no close-up faces, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 12:5 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1536×640)

```text
a city district at night during a power-grid emergency: dark apartment blocks with only a few lit windows, a high-voltage pylon in the foreground with line workers in harnesses, cobalt-blue emergency lights on a utility truck, wide cinematic panorama, medium-distance view, figures small to medium size, no close-up faces, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1440×600 WebP

</details>

<details><summary><b>Urgences saturées</b> · <code>assets/art/crises/crise_urgences.webp</code></summary>

**FLUX.2** (1536×640)

```text
an overcrowded hospital emergency department corridor: trolleys lined along both walls, exhausted nurses in scrubs, patients waiting on chairs, a wall clock, cold fluorescent light. wide cinematic panorama, medium-distance view, figures small to medium size, no close-up faces. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
an overcrowded hospital emergency department corridor: trolleys lined along both walls, exhausted nurses in scrubs, patients waiting on chairs, a wall clock, cold fluorescent light, wide cinematic panorama, medium-distance view, figures small to medium size, no close-up faces, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 12:5 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1536×640)

```text
an overcrowded hospital emergency department corridor: trolleys lined along both walls, exhausted nurses in scrubs, patients waiting on chairs, a wall clock, cold fluorescent light, wide cinematic panorama, medium-distance view, figures small to medium size, no close-up faces, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1440×600 WebP

</details>

<details><summary><b>Nappes phréatiques au plus bas</b> · <code>assets/art/crises/crise_nappes.webp</code></summary>

**FLUX.2** (1536×640)

```text
a drought landscape in late summer: a cracked dry riverbed, an empty irrigation canal, a groundwater monitoring well with a measuring tape, a farmer looking at withered maize, harsh pale sunlight. wide cinematic panorama, medium-distance view, figures small to medium size, no close-up faces. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a drought landscape in late summer: a cracked dry riverbed, an empty irrigation canal, a groundwater monitoring well with a measuring tape, a farmer looking at withered maize, harsh pale sunlight, wide cinematic panorama, medium-distance view, figures small to medium size, no close-up faces, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 12:5 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1536×640)

```text
a drought landscape in late summer: a cracked dry riverbed, an empty irrigation canal, a groundwater monitoring well with a measuring tape, a farmer looking at withered maize, harsh pale sunlight, wide cinematic panorama, medium-distance view, figures small to medium size, no close-up faces, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1440×600 WebP

</details>

<details><summary><b>Blocage routier</b> · <code>assets/art/crises/crise_blocage.webp</code></summary>

**FLUX.2** (1536×640)

```text
a road blockade at a roundabout on a grey winter morning: tractors and lorries parked across the lanes, straw bales, protesters in gold-yellow high-visibility vests around a brazier, a plume of smoke. wide cinematic panorama, medium-distance view, figures small to medium size, no close-up faces. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a road blockade at a roundabout on a grey winter morning: tractors and lorries parked across the lanes, straw bales, protesters in gold-yellow high-visibility vests around a brazier, a plume of smoke, wide cinematic panorama, medium-distance view, figures small to medium size, no close-up faces, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 12:5 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1536×640)

```text
a road blockade at a roundabout on a grey winter morning: tractors and lorries parked across the lanes, straw bales, protesters in gold-yellow high-visibility vests around a brazier, a plume of smoke, wide cinematic panorama, medium-distance view, figures small to medium size, no close-up faces, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1440×600 WebP

</details>

<details><summary><b>Salle des marchés en alerte</b> · <code>assets/art/crises/crise_marches.webp</code></summary>

**FLUX.2** (1536×640)

```text
a bond trading room in turmoil: rows of traders at desks with multiple monitors showing falling red line charts without readable figures, phones pressed to ears, tense postures, cool blue light. wide cinematic panorama, medium-distance view, figures small to medium size, no close-up faces. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
a bond trading room in turmoil: rows of traders at desks with multiple monitors showing falling red line charts without readable figures, phones pressed to ears, tense postures, cool blue light, wide cinematic panorama, medium-distance view, figures small to medium size, no close-up faces, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 12:5 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1536×640)

```text
a bond trading room in turmoil: rows of traders at desks with multiple monitors showing falling red line charts without readable figures, phones pressed to ears, tense postures, cool blue light, wide cinematic panorama, medium-distance view, figures small to medium size, no close-up faces, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1440×600 WebP

</details>

<details><summary><b>Université occupée</b> · <code>assets/art/crises/crise_universite.webp</code></summary>

**FLUX.2** (1536×640)

```text
an occupied university lecture hall: tiered wooden seats, students sitting on the desks, blank hand-painted banners hanging from the balcony, stacked chairs blocking a side door, afternoon light from high windows. wide cinematic panorama, medium-distance view, figures small to medium size, no close-up faces. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
an occupied university lecture hall: tiered wooden seats, students sitting on the desks, blank hand-painted banners hanging from the balcony, stacked chairs blocking a side door, afternoon light from high windows, wide cinematic panorama, medium-distance view, figures small to medium size, no close-up faces, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 12:5 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1536×640)

```text
an occupied university lecture hall: tiered wooden seats, students sitting on the desks, blank hand-painted banners hanging from the balcony, stacked chairs blocking a side door, afternoon light from high windows, wide cinematic panorama, medium-distance view, figures small to medium size, no close-up faces, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1440×600 WebP

</details>

<details><summary><b>Surpopulation carcérale</b> · <code>assets/art/crises/crise_prison.webp</code></summary>

**FLUX.2** (1536×640)

```text
an overcrowded prison wing: three tiers of cell doors around a central atrium with safety netting, mattresses on the floor of an open cell, guards walking the gangway, cold daylight from skylights. wide cinematic panorama, medium-distance view, figures small to medium size, no close-up faces. contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish. strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834. every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, the characters are invented people with ordinary faces.
```

**Midjourney**

```text
an overcrowded prison wing: three tiers of cell doors around a central atrium with safety netting, mattresses on the floor of an open cell, guards walking the gangway, cold daylight from skylights, wide cinematic panorama, medium-distance view, figures small to medium size, no close-up faces, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent --ar 12:5 --raw --s 60 --no text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching
```

**SDXL** (1536×640)

```text
an overcrowded prison wing: three tiers of cell doors around a central atrium with safety netting, mattresses on the floor of an open cell, guards walking the gangway, cold daylight from skylights, wide cinematic panorama, medium-distance view, figures small to medium size, no close-up faces, contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish, limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent
```

Négatif :

```text
photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, deformed hands, extra fingers, blurry, jpeg artifacts
```

Format final : 1440×600 WebP

</details>

<!-- PROMPTS:FIN -->

## 11. Contrôle qualité (à chaque image)

- [ ] **Ressemblance** : l'image n'évoque aucune personne réelle. En cas de doute, rejet et nouvelle graine.
- [ ] **Texte** : aucune lettre, aucun chiffre lisible, aucun logo ni sigle. Retoucher les pseudo-lettres.
- [ ] **Palette** : prélever 6 points. Chaque couleur est à ΔE ≤ 6 d'une teinte de base ou d'un mélange. Sinon, recoloriser par carte de gradient sur la palette.
- [ ] **Trait** : épaisseur constante, couleur Nuit (pas de noir pur), pas de hachure.
- [ ] **Cadrage** : gabarit du § 7 (portraits) ou zones calmes du § 8 (décors).
- [ ] **Cohérence** : côte à côte avec la planche étalon, même famille de trait et de lumière.
- [ ] **Licence** : conditions d'usage commercial du moteur utilisé vérifiées pour votre abonnement, image et prompt archivés (`prompts.json` + graine + date).

## 12. Intégration dans l'application

- **Arborescence cible** : `mobile-app/assets/art/portraits/<id>/{morpho,tenue,coiffure}.png`, `…/expression_<etat>.png`, `…/fatigue_<niveau>.png` ; `assets/art/decors/<id>.webp` ; `assets/art/crises/<id>.webp`.
- **Branchement** (non réalisé, les SVG restent la référence) : Metro n'accepte que des `require()` statiques. Il faudra donc un manifeste `src/theme/art.ts` du type `{ "bureau_dore_matin": require("../../assets/art/decors/bureau_dore_matin.webp") }`. `BureauDore`, `PanoramaCrise` et `ModularPortrait` afficheraient l'`Image` du manifeste quand l'entrée existe, et le SVG sinon. Les personnages tirés au hasard par le moteur (noms fictifs) reçoivent un buste par **rôle** (ministère ou corps), avec repli sur le SVG procédural.
- **Poids** : WebP qualité 80. Viser < 350 Ko par décor et < 120 Ko par calque, pour garder l'application sous 40 Mo.
