"""Icônes de l'application (palette de la Style Bible) : chemise dorée + tampon rouge, ligne claire."""
import sys
from PIL import Image, ImageDraw

NUIT, PAPIER, ROUGE, OR = (11, 25, 44), (247, 244, 235), (200, 40, 52), (196, 154, 58)
dest = sys.argv[1]

def embleme(taille, fond, mono=False):
    S = 4 * taille
    im = Image.new("RGBA", (S, S), fond)
    d = ImageDraw.Draw(im)
    k = S / 1024
    trait = round(22 * k)
    encre = (255, 255, 255, 255) if mono else NUIT + (255,)
    remp = lambda c: (255, 255, 255, 255) if mono else c + (255,)
    # onglet puis chemise
    d.rounded_rectangle([250 * k, 300 * k, 470 * k, 380 * k], radius=24 * k, fill=remp(OR), outline=encre, width=trait)
    d.rounded_rectangle([250 * k, 340 * k, 774 * k, 724 * k], radius=30 * k, fill=remp(OR), outline=encre, width=trait)
    if not mono:
        d.rectangle([300 * k, 420 * k, 600 * k, 444 * k], fill=NUIT + (255,))
        d.rectangle([300 * k, 480 * k, 540 * k, 500 * k], fill=NUIT + (200,))
    # tampon
    cx, cy, r = 650 * k, 640 * k, 150 * k
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(0, 0, 0, 0) if mono else ROUGE + (255,), outline=encre, width=trait)
    r2 = 104 * k
    d.ellipse([cx - r2, cy - r2, cx + r2, cy + r2], outline=(255, 255, 255, 255) if mono else PAPIER + (255,), width=round(14 * k))
    d.line([cx - 52 * k, cy + 4 * k, cx - 10 * k, cy + 46 * k, cx + 62 * k, cy - 40 * k], fill=(255, 255, 255, 255) if mono else PAPIER + (255,), width=round(26 * k), joint="curve")
    return im.resize((taille, taille), Image.LANCZOS)

embleme(1400, NUIT + (255,)).crop((188, 188, 1212, 1212)).convert("RGB").save(f"{dest}/icon.png")
# Android adaptatif : premier plan dans la zone sûre (66 %), fond uni, monochrome
fg = Image.new("RGBA", (512, 512), (0, 0, 0, 0)); fg.alpha_composite(embleme(340, (0, 0, 0, 0)), (86, 86)); fg.save(f"{dest}/android-icon-foreground.png")
Image.new("RGB", (512, 512), NUIT).save(f"{dest}/android-icon-background.png")
mo = Image.new("RGBA", (432, 432), (0, 0, 0, 0)); mo.alpha_composite(embleme(288, (0, 0, 0, 0), mono=True), (72, 72)); mo.save(f"{dest}/android-icon-monochrome.png")
embleme(1024, (0, 0, 0, 0)).save(f"{dest}/splash-icon.png")
embleme(48, NUIT + (255,)).convert("RGB").save(f"{dest}/favicon.png")
print("ok")
