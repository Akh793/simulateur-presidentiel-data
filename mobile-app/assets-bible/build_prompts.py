"""Source unique des prompts de la Style Bible.

Usage : python3 build_prompts.py
  - écrit prompts.json (tous les prompts dépliés, par moteur) ;
  - régénère dans STYLE_BIBLE.md les sections entre <!-- GROUPES:… --> et <!-- PROMPTS:… -->.

Bibliothèque standard uniquement. Les personnages sont fictifs ; aucun nom de personne réelle ni d'artiste vivant.
"""
from __future__ import annotations

import json
import pathlib
import re

ICI = pathlib.Path(__file__).resolve().parent

# ------------------------------------------------------------------ palette (miroir de src/theme/palette.ts)
P = {"nuit": "#0B192C", "papier": "#F7F4EB", "rouge": "#C82834", "or": "#C49A3A", "ardoise": "#5A6577", "cobalt": "#1D5B9E"}


def melange(a: str, b: str, t: float) -> str:
    """Même formule que melange() en TypeScript (arrondi JavaScript : demi vers +∞)."""
    ha, hb = int(a[1:], 16), int(b[1:], 16)
    c = lambda s: int(((ha >> s) & 255) * (1 - t) + ((hb >> s) & 255) * t + 0.5)
    return "#%02X%02X%02X" % (c(16), c(8), c(0))


GROUPES = [  # miroir de src/theme/groupes.ts, ordre de séance gauche → droite
    ("LFI-NFP", "La France insoumise – NFP", melange(P["rouge"], P["nuit"], 0.35), "Rouge 65 % + Nuit"),
    ("GDR", "Gauche démocrate et républicaine", melange(P["rouge"], P["nuit"], 0.15), "Rouge 85 % + Nuit"),
    ("ECOS", "Écologiste et social", melange(P["rouge"], P["or"], 0.45), "Rouge 55 % + Or"),
    ("SOC", "Socialistes et apparentés", P["rouge"], "Rouge"),
    ("LIOT", "Libertés, indépendants, outre-mer et territoires", melange(P["or"], P["papier"], 0.35), "Or 65 % + Papier"),
    ("DEM", "Les Démocrates", P["or"], "Or"),
    ("EPR", "Ensemble pour la République", melange(P["or"], P["cobalt"], 0.45), "Or 55 % + Cobalt"),
    ("HOR", "Horizons et indépendants", melange(P["cobalt"], P["papier"], 0.35), "Cobalt 65 % + Papier"),
    ("DR", "Droite républicaine", P["cobalt"], "Cobalt"),
    ("UDR", "Union des droites pour la République", melange(P["cobalt"], P["nuit"], 0.45), "Cobalt 55 % + Nuit"),
    ("RN", "Rassemblement national", melange(P["nuit"], P["papier"], 0.38), "Nuit 62 % + Papier"),
    ("NI", "Non-inscrits", melange(P["ardoise"], P["papier"], 0.55), "Ardoise 45 % + Papier"),
]

# ------------------------------------------------------------------ blocs de style
STYLE_CORE = (
    "contemporary editorial ligne claire illustration, clean uniform ink outlines of constant weight, flat colour fills "
    "with at most one soft shadow tone per material, restrained realistic proportions with a light editorial-cartoon "
    "touch in posture and expression, sober European political graphic-novel mood, crisp vector-like finish"
)
PALETTE_HEX = (
    "strict limited palette: deep navy #0B192C for outlines and darks, warm paper white #F7F4EB, muted gold #C49A3A, "
    "slate grey #5A6577, cobalt blue #1D5B9E and a single accent of French red #C82834"
)
PALETTE_NOMS = (
    "limited palette of deep navy outlines, warm paper white, muted gold, slate grey, cobalt blue and a single French red accent"
)
PROPRE_FLUX = (
    "every paper, screen, sign and banner is blank and unmarked, clothing is plain and unbranded, "
    "the characters are invented people with ordinary faces"
)
NEG_MJ = "text, letters, words, numbers, logo, emblem, watermark, signature, photo, 3d render, gradient, crosshatching"
NEG_SDXL = (
    "photo, photorealistic, 3d render, cgi, painterly brushwork, gradient shading, crosshatching, sketchy lines, "
    "text, letters, words, numbers, logo, emblem, flag with insignia, watermark, signature, celebrity, likeness of a real politician, "
    "deformed hands, extra fingers, blurry, jpeg artifacts"
)

CADRAGE_PORTRAIT = (
    "front-facing head-and-shoulders bust, centred, eyes on a horizontal line at 45 % of the image height, "
    "shoulders cropped by the bottom edge"
)
FOND_PORTRAIT_FLUX = "plain flat background in warm paper white #F7F4EB"
FOND_PORTRAIT = "plain flat warm paper-white background"
CADRAGE_DECOR = (
    "vertical smartphone background, eye-level wide view, the upper quarter and the lower third kept calm and low in detail "
    "to leave room for interface panels"
)
CADRAGE_PANORAMA = "wide cinematic panorama, medium-distance view, figures small to medium size, no close-up faces"

FORMATS = {
    "portrait": {"flux": (1024, 1024), "mj": "--ar 1:1", "sdxl": (1024, 1024), "final": "1024×1024 PNG transparent (après détourage)"},
    "decor": {"flux": (1152, 2496), "mj": "--ar 18:39", "sdxl": (640, 1536), "final": "1080×2340 WebP"},
    "panorama": {"flux": (1536, 640), "mj": "--ar 12:5", "sdxl": (1536, 640), "final": "1440×600 WebP"},
}

# ------------------------------------------------------------------ sujets
PORTRAITS = [
    ("secretaire_general", "Secrétaire général de la présidence",
     "a fictional secretary-general of the presidency, a man in his early sixties with light skin, close-cropped white hair and rimless glasses, "
     "charcoal three-piece suit and navy tie, a slim leather folder held against his chest, calm and unreadable expression"),
    # 12 ministres (ordre de MINISTERES dans engine/src/types.ts)
    ("ministre_economie_finances", "Ministre de l'Économie et des Finances",
     "a fictional minister of the economy and finance, a woman in her mid-fifties with light skin and a sleek silver bob, navy pinstripe trouser suit, "
     "cream silk blouse, a slim red folder under her arm, reading glasses pushed up on her head, composed and calculating"),
    ("ministre_travail_solidarites", "Ministre du Travail et des Solidarités",
     "a fictional minister of labour and solidarity, a man in his late forties with olive skin, wavy dark hair and a short salt-and-pepper beard, "
     "slate grey jacket over an open-collared white shirt, sleeves slightly pushed up, a sheaf of notes in hand, earnest look"),
    ("ministre_sante", "Ministre de la Santé",
     "a fictional minister of health, a woman in her early sixties with deep brown skin and short natural grey curls, former physician bearing, "
     "dark blue suit with a small plain gold lapel pin, folded glasses in the breast pocket, attentive and tired eyes"),
    ("ministre_ecologie_energie", "Ministre de l'Écologie et de l'Énergie",
     "a fictional minister of ecology and energy, a man in his early forties with medium brown skin and tidy short black hair, light navy suit, "
     "knitted cobalt tie, a rolled technical map under his arm, focused expression"),
    ("ministre_transports_logement", "Ministre des Transports et du Logement",
     "a fictional minister of transport and housing, a woman in her late thirties with light olive skin and straight black hair in a low ponytail, "
     "slate grey blazer over a red knit top, a white site helmet tucked under her arm, energetic posture"),
    ("ministre_interieur", "Ministre de l'Intérieur",
     "a fictional minister of the interior, a man in his mid-fifties with light skin, a shaved head and a square jaw, dark navy suit, white shirt, "
     "dark tie, stern and alert expression"),
    ("ministre_justice", "Ministre de la Justice",
     "a fictional minister of justice, a woman in her late fifties with tan skin and grey-blonde hair pinned in a tight chignon, black suit, "
     "white high-collared shirt, holding a thick bound code with a blank cover, severe and measured"),
    ("ministre_education_esr", "Ministre de l'Éducation et de l'Enseignement supérieur",
     "a fictional minister of education and higher education, a man in his early sixties with light skin, unruly white hair and tortoiseshell glasses, "
     "muted gold corduroy jacket, cobalt knitted tie, a stack of blank exercise books, professorial and slightly harried"),
    ("ministre_agriculture", "Ministre de l'Agriculture",
     "a fictional minister of agriculture, a man in his fifties with weathered sun-tanned skin and a short grey moustache, navy suit worn under "
     "a quilted slate gilet, a sprig of wheat in the breast pocket, down-to-earth smile"),
    ("ministre_armees", "Ministre des Armées",
     "a fictional minister of the armed forces, a woman in her early fifties with deep brown skin and a short dark crop, dark navy suit with a "
     "high-buttoned jacket, small plain gold pin, upright posture, steady gaze"),
    ("ministre_europe_affaires_etrangeres", "Ministre de l'Europe et des Affaires étrangères",
     "a fictional minister for Europe and foreign affairs, a man in his late forties of East Asian descent with a neatly trimmed grey beard, impeccable "
     "midnight-blue suit, muted gold silk pocket square, diplomatic composure"),
    ("ministre_culture_sports", "Ministre de la Culture et des Sports",
     "a fictional minister of culture and sport, a woman in her mid-forties with medium brown skin and voluminous natural curly hair, deep red jacket "
     "over a black turtleneck, bold geometric gold earrings, lively smile"),
    # 8 responsables de corps (ordre de CORPS_DEF dans engine/src/acteurs.ts)
    ("corps_patronat", "Présidente d'organisation patronale",
     "a fictional head of a national employers' federation, a woman in her sixties with light skin and steel-grey short hair, impeccable charcoal suit, "
     "pearl stud earrings, arms crossed, blank conference lanyard, cool confidence"),
    ("corps_syndicats_reformistes", "Secrétaire général d'un syndicat réformiste",
     "a fictional leader of a reformist trade-union confederation, a man in his fifties with medium skin, round glasses and a neat beard, navy fleece "
     "over a checked shirt, a blank round badge on the chest, conciliatory but firm"),
    ("corps_syndicats_contestataires", "Secrétaire général d'un syndicat contestataire",
     "a fictional leader of a militant trade-union confederation, a man in his late fifties with ruddy light skin and a thick grey moustache, "
     "red windbreaker jacket, a megaphone held low, determined frown"),
    ("corps_monde_agricole", "Présidente d'un syndicat agricole",
     "a fictional president of a farmers' union, a woman in her forties with sun-weathered skin and an auburn braid, waxed field jacket over a checked "
     "shirt, a work cap in her hand, frank and combative"),
    ("corps_haute_fonction_publique", "Directeur général d'administration centrale",
     "a fictional director-general of a central ministry department, a man in his forties with light skin and slicked-back dark hair, slim dark suit, "
     "thin tie, a tablet held flat with a dark screen, impassive"),
    ("corps_collectivites", "Maire, porte-parole des élus locaux",
     "a fictional mayor speaking for local authorities, a woman in her sixties with olive skin and silver hair in a bun, navy coat with a plain "
     "blue-white-red mayoral sash across the chest, warm but stubborn"),
    ("corps_associatif_ecolo", "Porte-parole d'une association écologiste",
     "a fictional spokesperson of an environmental association, a young man in his late twenties with deep brown skin and locs tied back, cobalt "
     "raincoat, canvas tote bag, a rolled blank placard under his arm, earnest and impatient"),
    ("corps_classes_moyennes", "Porte-parole des classes moyennes mobilisées",
     "a fictional citizen spokesperson of a middle-class protest movement, a woman in her forties with medium brown skin and a ponytail, gold-yellow "
     "high-visibility vest over a grey hoodie, car keys in hand, exasperated"),
    # conseillers des notes Bercy / Cabinet social
    ("conseiller_bercy", "Conseiller budgétaire (Note de Bercy)",
     "a fictional senior budget adviser at the finance ministry, a man in his thirties with light skin, short neat hair and thin metal glasses, white "
     "shirt with rolled sleeves, loosened navy tie, holding a blank printed table, precise and sceptical"),
    ("conseillere_sociale", "Conseillère sociale (Cabinet social)",
     "a fictional social-affairs adviser at the presidency, a woman in her thirties with deep brown skin and short natural hair, slate cardigan over "
     "a red blouse, notebook and pen in hand, empathetic and attentive"),
]

EXPRESSIONS = [
    ("expression_neutre", "neutral, attentive expression, relaxed brows, mouth closed"),
    ("expression_confiant", "confident expression, slight closed-mouth smile, eyes softly narrowed, chin a little raised"),
    ("expression_inquiet", "worried expression, brows raised and drawn together, mouth tight, eyes slightly widened"),
    ("expression_colere", "angry expression, brows lowered and knitted, jaw clenched, nostrils slightly flared"),
    ("fatigue_legere", "light fatigue: faint slate-grey shadows under the eyes"),
    ("fatigue_marquee", "marked fatigue: darker shadows under the eyes and heavy half-closed eyelids"),
    ("fatigue_extreme", "extreme exhaustion: deep hollow shadows under the eyes, complexion slightly greyed, a lock of hair out of place"),
]

LUMIERE_BUREAU = {
    "matin": "pale cool morning light through the window, long soft slate shadows",
    "apres_midi": "warm low golden afternoon sun, amber reflections on the gilding",
    "nuit": "night, the window deep navy blue, a single brass desk lamp casting a warm gold pool of light, everything else in deep navy shadow",
}
BUREAU = (
    "a gilded presidential study in a classical Parisian palace: carved white-and-gold wood panelling, a tall French window with sheer curtains in "
    "the centre, a flat mahogany desk with a leather blotter, a closed blank folder and a fountain pen in the lower part of the frame, an empty "
    "armchair, herringbone parquet floor, the room empty of people"
)
DECORS = [
    *[(f"bureau_dore_{k}", f"Bureau doré — {k.replace('_', '-')}", f"{BUREAU}, {v}") for k, v in LUMIERE_BUREAU.items()],
    ("hemicycle", "Hémicycle",
     "a semicircular parliamentary chamber seen from the upper public gallery: tiers of red velvet benches rising in concentric arcs, wooden desks, "
     "a raised presiding desk and speaker's rostrum at the bottom, classical columns and a glass ceiling, the chamber empty of people, soft daylight"),
    ("salle_conseil", "Salle du Conseil des ministres",
     "a formal council-of-ministers room in a classical palace: a long table covered with navy baize, high-backed red chairs, muted gold tapestries, "
     "a crystal chandelier, tall windows with heavy curtains, the room empty of people, quiet morning light"),
    ("perron", "Perron",
     "the pale stone front steps of a classical palace at dusk: a short flight of steps with a red carpet down the centre, a glass canopy above "
     "double doors, wall lanterns lit in gold, a cluster of press microphones on a stand at the foot of the steps, the courtyard empty of people"),
]

CRISES = [
    ("crise_carburant", "Pénurie de carburants",
     "a petrol station during a fuel shortage: a long queue of small cars along the road, drivers waiting beside their cars, a blank red cardboard sign "
     "taped to a pump, empty jerrycans, overcast midday light"),
    ("crise_reseau", "Réseau électrique sous tension",
     "a city district at night during a power-grid emergency: dark apartment blocks with only a few lit windows, a high-voltage pylon in the "
     "foreground with line workers in harnesses, cobalt-blue emergency lights on a utility truck"),
    ("crise_urgences", "Urgences saturées",
     "an overcrowded hospital emergency department corridor: trolleys lined along both walls, exhausted nurses in scrubs, patients waiting on chairs, "
     "a wall clock, cold fluorescent light"),
    ("crise_nappes", "Nappes phréatiques au plus bas",
     "a drought landscape in late summer: a cracked dry riverbed, an empty irrigation canal, a groundwater monitoring well with a measuring tape, "
     "a farmer looking at withered maize, harsh pale sunlight"),
    ("crise_blocage", "Blocage routier",
     "a road blockade at a roundabout on a grey winter morning: tractors and lorries parked across the lanes, straw bales, protesters in gold-yellow "
     "high-visibility vests around a brazier, a plume of smoke"),
    ("crise_marches", "Salle des marchés en alerte",
     "a bond trading room in turmoil: rows of traders at desks with multiple monitors showing falling red line charts without readable figures, "
     "phones pressed to ears, tense postures, cool blue light"),
    ("crise_universite", "Université occupée",
     "an occupied university lecture hall: tiered wooden seats, students sitting on the desks, blank hand-painted banners hanging from the balcony, "
     "stacked chairs blocking a side door, afternoon light from high windows"),
    ("crise_prison", "Surpopulation carcérale",
     "an overcrowded prison wing: three tiers of cell doors around a central atrium with safety netting, mattresses on the floor of an open cell, "
     "guards walking the gangway, cold daylight from skylights"),
]


# ------------------------------------------------------------------ assemblage
def prompt(categorie: str, sujet: str) -> dict:
    f = FORMATS[categorie]
    if categorie == "portrait":
        flux = f"{sujet}. {CADRAGE_PORTRAIT}, {FOND_PORTRAIT_FLUX}. {STYLE_CORE}. {PALETTE_HEX}. {PROPRE_FLUX}."
        commun = f"{sujet}, {CADRAGE_PORTRAIT}, {FOND_PORTRAIT}, {STYLE_CORE}, {PALETTE_NOMS}"
        neg_mj = NEG_MJ
    else:
        cadre = CADRAGE_DECOR if categorie == "decor" else CADRAGE_PANORAMA
        flux = f"{sujet}. {cadre}. {STYLE_CORE}. {PALETTE_HEX}. {PROPRE_FLUX}."
        commun = f"{sujet}, {cadre}, {STYLE_CORE}, {PALETTE_NOMS}"
        neg_mj = NEG_MJ + (", people, person" if categorie == "decor" else "")
    return {
        "flux": {"prompt": flux, "width": f["flux"][0], "height": f["flux"][1]},
        "midjourney": f"{commun} {f['mj']} --raw --s 60 --no {neg_mj}",
        "sdxl": {"prompt": commun, "negative_prompt": NEG_SDXL + (", people, person" if categorie == "decor" else ""),
                 "width": f["sdxl"][0], "height": f["sdxl"][1]},
        "format_final": f["final"],
    }


def edition(effet: str) -> dict:
    texte = (f"Edit the reference portrait: keep exactly the same fictional person, outfit, framing, line weight and palette; "
             f"change only the face to show {effet}.")
    return {
        "flux": {"prompt": texte, "reference": "buste.png du personnage"},
        "midjourney": f"{texte} --raw --oref <URL du buste> --ar 1:1 --no {NEG_MJ}",
        "sdxl": {"mode": "inpainting du visage, débruitage 0.35 à 0.5", "prompt": f"{effet}, {STYLE_CORE}", "negative_prompt": NEG_SDXL},
        "format_final": "calque 1024×1024 PNG transparent, détouré sur le gabarit",
    }


def construire() -> dict:
    items = []
    for i, (cle, role, sujet) in enumerate(PORTRAITS):
        cat = "secretaire_general" if i == 0 else "ministre" if cle.startswith("ministre_") else "corps" if cle.startswith("corps_") else "conseiller"
        items.append({"id": cle, "categorie": cat, "titre": role, "fichier": f"assets/art/portraits/{cle}/buste.png", "sujet": sujet, **prompt("portrait", sujet)})
    for cle, effet in EXPRESSIONS:
        items.append({"id": cle, "categorie": "calque", "titre": cle.replace("_", " "), "fichier": f"assets/art/portraits/<id>/{cle}.png", "sujet": effet, **edition(effet)})
    for cle, titre, sujet in DECORS:
        items.append({"id": cle, "categorie": "decor", "titre": titre, "fichier": f"assets/art/decors/{cle}.webp", "sujet": sujet, **prompt("decor", sujet)})
    for cle, titre, sujet in CRISES:
        items.append({"id": cle, "categorie": "crise", "titre": titre, "fichier": f"assets/art/crises/{cle}.webp", "sujet": sujet, **prompt("panorama", sujet)})
    return {
        "version": 1,
        "palette": P,
        "style": {"core": STYLE_CORE, "palette_hex": PALETTE_HEX, "palette_noms": PALETTE_NOMS, "flux_proprete": PROPRE_FLUX,
                  "midjourney_no": NEG_MJ, "sdxl_negatif": NEG_SDXL},
        "formats": {k: {"flux": list(v["flux"]), "midjourney": v["mj"], "sdxl": list(v["sdxl"]), "final": v["final"]} for k, v in FORMATS.items()},
        "items": items,
    }


SECTIONS = [
    ("secretaire_general", "10.1 Planche étalon : Secrétaire général"),
    ("ministre", "10.2 a — Les 12 ministres"),
    ("corps", "10.2 b — Les 8 responsables de corps intermédiaires"),
    ("conseiller", "10.2 c — Conseillers Bercy et Cabinet social"),
    ("calque", "10.3 Calques d'expression et de fatigue (édition du buste de référence)"),
    ("decor", "10.4 Décors 9:19.5"),
    ("crise", "10.5 Panoramas de crise 12:5"),
]


def markdown(doc: dict) -> str:
    out = ["Section générée par `build_prompts.py` : ne pas éditer à la main. Le même contenu, en JSON, est dans `prompts.json`.", ""]
    for cat, titre in SECTIONS:
        out += [f"### {titre}", ""]
        for it in (x for x in doc["items"] if x["categorie"] == cat):
            out += [f"<details><summary><b>{it['titre']}</b> · <code>{it['fichier']}</code></summary>", ""]
            f, s = it["flux"], it["sdxl"]
            taille = f" ({f['width']}×{f['height']})" if "width" in f else f" (référence : {f['reference']})"
            out += [f"**FLUX.2**{taille}", "", "```text", f["prompt"], "```", "", "**Midjourney**", "", "```text", it["midjourney"], "```", ""]
            taille_s = f" ({s['width']}×{s['height']})" if "width" in s else f" ({s['mode']})"
            out += [f"**SDXL**{taille_s}", "", "```text", s["prompt"], "```", "", "Négatif :", "", "```text", s["negative_prompt"], "```", "",
                    f"Format final : {it['format_final']}", "", "</details>", ""]
    return "\n".join(out)


def tableau_groupes() -> str:
    lignes = ["| Groupe | Libellé | Hex | Construction |", "|---|---|---|---|"]
    lignes += [f"| {c} | {l} | `{h}` | {k} |" for c, l, h, k in GROUPES]
    lignes += ["", "Aucune teinte ne reprend la couleur de marque d'un parti. Les groupes voisins en séance reçoivent des teintes voisines, pour que le dégradé gauche → droite se lise d'un coup d'œil. Toute nouvelle teinte de groupe doit être un mélange de la palette."]
    return "\n".join(lignes)


def remplacer(texte: str, marque: str, contenu: str) -> str:
    motif = re.compile(rf"(<!-- {marque}:DEBUT -->)(.*?)(<!-- {marque}:FIN -->)", re.S)
    assert motif.search(texte), f"marqueurs {marque} absents"
    return motif.sub(lambda m: f"{m.group(1)}\n{contenu}\n{m.group(3)}", texte)


if __name__ == "__main__":
    doc = construire()
    (ICI / "prompts.json").write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    bible = ICI / "STYLE_BIBLE.md"
    texte = bible.read_text(encoding="utf-8")
    texte = remplacer(texte, "GROUPES", tableau_groupes())
    texte = remplacer(texte, "PROMPTS", markdown(doc))
    bible.write_text(texte, encoding="utf-8")
    n = {c: sum(1 for x in doc["items"] if x["categorie"] == c) for c, _ in SECTIONS}
    print(f"{len(doc['items'])} entrées ({n}) → prompts.json et STYLE_BIBLE.md")
