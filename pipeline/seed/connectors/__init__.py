"""Connecteurs de sources. Chaque connecteur renvoie une `Lecture`, sans écrire dans l'état :
c'est l'orchestrateur (build_seed.py) qui persiste, ce qui garde les connecteurs testables."""
from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from typing import Optional

PARIS_OFFSET_HINT = "Europe/Paris"


@dataclass
class Lecture:
    ok: bool
    http: Optional[int] = None
    derniere: Optional[str] = None          # date ISO de la dernière donnée (début de période)
    info: str = ""
    points: list[tuple[str, float]] = field(default_factory=list)   # (date ISO, valeur), ordre chronologique
    composantes: dict[str, float] = field(default_factory=dict)
    meta: dict = field(default_factory=dict)  # periode, publiee_le, titre, labels de période...
    arretee: bool = False
    notes: list[str] = field(default_factory=list)


def echec(exc: Exception) -> Lecture:
    status = getattr(exc, "status", None)
    return Lecture(ok=False, http=status, info=f"{type(exc).__name__}: {exc}"[:300],
                   arretee=type(exc).__name__ == "SerieArretee")


def today_paris() -> dt.date:
    try:
        from zoneinfo import ZoneInfo
        return dt.datetime.now(ZoneInfo("Europe/Paris")).date()
    except Exception:  # pragma: no cover
        return dt.date.today()
