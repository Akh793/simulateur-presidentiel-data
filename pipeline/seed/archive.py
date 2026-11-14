"""Archivage continu des fenêtres glissantes volatiles (branche `data`).

- eCO2mix national temps réel : la source ne garde qu'environ 75 jours ; chaque passage ajoute les
  quarts d'heure manquants dans data/archive/eco2mix/AAAA-MM.csv.gz (dédoublonnage par date_heure).
- SNCF GTFS-RT : un instantané par passage dans data/archive/sncf/AAAA-MM.csv.
- Graines : copie datée de chaque graine quotidienne (data/graines/AAAA-MM-JJ.json), base du mode Archives de Crise.
"""
from __future__ import annotations

import csv
import datetime as dt
import gzip
import io
import json
from pathlib import Path

from .connectors import temps_reel

ECO_COLS = temps_reel.ECO2MIX_COLS


def _month_files(root: Path) -> list[Path]:
    return sorted(root.glob("*.csv*"))


def _read_eco(path: Path) -> dict[str, dict]:
    with gzip.open(path, "rt", encoding="utf-8", newline="") as f:
        return {r["date_heure"]: r for r in csv.DictReader(f, delimiter=";")}


def _write_eco(path: Path, rows: dict[str, dict]) -> None:
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=ECO_COLS, delimiter=";", extrasaction="ignore", lineterminator="\n")
    w.writeheader()
    for k in sorted(rows):
        w.writerow(rows[k])
    path.parent.mkdir(parents=True, exist_ok=True)
    # mtime=0 : fichier gzip identique octet pour octet si le contenu ne change pas (pas de commit inutile)
    with open(path, "wb") as raw, gzip.GzipFile(fileobj=raw, mode="wb", mtime=0) as gz:
        gz.write(buf.getvalue().encode("utf-8"))


def eco2mix_update(data_dir: Path, retention_days: int = 80) -> tuple[list[dict], int]:
    """Ajoute à l'archive les quarts d'heure publiés depuis la dernière ligne archivée.
    Renvoie (lignes des `retention_days` derniers jours, nombre de lignes nouvelles)."""
    root = data_dir / "archive" / "eco2mix"
    files = _month_files(root)
    since = None
    if files:
        last = _read_eco(files[-1])
        if last:
            since = max(last)
    if since is None:
        since = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=retention_days)).strftime("%Y-%m-%dT00:00:00+00:00")
    fresh = temps_reel.eco2mix_export(since)
    by_month: dict[str, list[dict]] = {}
    for r in fresh:
        by_month.setdefault(r["date_heure"][:7], []).append(r)
    added = 0
    for month, rows in by_month.items():
        path = root / f"{month}.csv.gz"
        cur = _read_eco(path) if path.exists() else {}
        n0 = len(cur)
        cur.update({r["date_heure"]: r for r in rows})
        added += len(cur) - n0
        _write_eco(path, cur)
    lim = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=retention_days)).strftime("%Y-%m")
    out: dict[str, dict] = {}
    for p in _month_files(root):
        if p.stem.split(".")[0] >= lim:
            out.update(_read_eco(p))
    return [out[k] for k in sorted(out)], added


SNCF_COLS = ["ts", "trajets", "supprimes", "retard_5min"]


def sncf_append(data_dir: Path, sample: dict) -> None:
    path = data_dir / "archive" / "sncf" / f"{sample['ts'][:7]}.csv"
    path.parent.mkdir(parents=True, exist_ok=True)
    new = not path.exists()
    with open(path, "a", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=SNCF_COLS, lineterminator="\n")
        if new:
            w.writeheader()
        w.writerow({k: sample[k] for k in SNCF_COLS})


def sncf_samples(data_dir: Path, days: int = 120) -> list[dict]:
    root = data_dir / "archive" / "sncf"
    lim = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")
    out = []
    for p in _month_files(root):
        with open(p, encoding="utf-8", newline="") as f:
            out.extend(r for r in csv.DictReader(f) if r["ts"] >= lim)
    uniq = {r["ts"]: r for r in out}  # un instantané dont l'horodatage n'a pas bougé n'est compté qu'une fois
    return [uniq[k] for k in sorted(uniq)]


def save_seed(data_dir: Path, seed: dict) -> Path:
    path = data_dir / "graines" / f"{seed['meta']['date_jeu']}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(seed, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return path


def load_seed(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
