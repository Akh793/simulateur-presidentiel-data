"""État persistant du relais (fichier SQLite versionné sur la branche `data`).

Tables :
- sources_health : dernier état connu de chaque source (règle n° 7) ;
- health_log     : historique des vérifications du lot quotidien (purgé au-delà de 120 jours) ;
- obs            : historique quotidien des indicateurs de pilotage (fenêtres d'anomalie) ;
- http_cache     : ETag / Last-Modified des gros fichiers (règle n° 6, téléchargement conditionnel).

Statuts :
- vivante   : dernière lecture réussie et âge de la donnée <= tolérance ;
- en_retard : lecture réussie mais donnée trop vieille, ou 1 à 2 échecs consécutifs ;
- morte     : 3 échecs consécutifs, série arrêtée, ou donnée plus vieille que 4 x la tolérance.
"""
from __future__ import annotations

import datetime as dt
import json
import sqlite3
import threading
from pathlib import Path
from typing import Optional

SCHEMA = """
CREATE TABLE IF NOT EXISTS sources_health(
  source_id TEXT PRIMARY KEY,
  libelle TEXT NOT NULL,
  url TEXT,
  statut TEXT NOT NULL CHECK (statut IN ('vivante','en_retard','morte')),
  http INTEGER,
  derniere_donnee TEXT,
  age_jours INTEGER,
  tolerance_jours INTEGER NOT NULL,
  echecs_consecutifs INTEGER NOT NULL DEFAULT 0,
  derniere_verification TEXT NOT NULL,
  derniere_reussite TEXT,
  info TEXT
);
CREATE TABLE IF NOT EXISTS health_log(
  ts TEXT NOT NULL, source_id TEXT NOT NULL, statut TEXT NOT NULL, http INTEGER, age_jours INTEGER, info TEXT
);
CREATE INDEX IF NOT EXISTS health_log_ts ON health_log(ts);
CREATE TABLE IF NOT EXISTS obs(
  indicateur TEXT NOT NULL, d TEXT NOT NULL, v REAL NOT NULL, PRIMARY KEY(indicateur, d)
);
CREATE TABLE IF NOT EXISTS http_cache(
  url TEXT PRIMARY KEY, etag TEXT, last_modified TEXT, payload TEXT, maj TEXT
);
"""


def statut(ok: bool, age: Optional[int], tolerance: int, echecs: int, arretee: bool = False) -> str:
    if arretee or echecs >= 3:
        return "morte"
    if not ok:
        return "en_retard"
    if age is not None and age > 4 * tolerance:
        return "morte"
    if age is not None and age > tolerance:
        return "en_retard"
    return "vivante"


class Etat:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(str(path), check_same_thread=False)
        self.db.executescript(SCHEMA)
        self.lock = threading.RLock()  # les connecteurs tournent en parallèle

    # ------------------------------------------------------------ santé des sources
    def _record(self, source_id: str, libelle: str, url: str, ok: bool, http: Optional[int],
               derniere: Optional[str], age: Optional[int], tolerance: int, info: str,
               arretee: bool = False, log: bool = True) -> dict:
        now = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        row = self.db.execute("SELECT echecs_consecutifs, derniere_reussite, derniere_donnee FROM sources_health WHERE source_id=?",
                              (source_id,)).fetchone()
        echecs = 0 if ok else (row[0] + 1 if row else 1)
        reussite = now if ok else (row[1] if row else None)
        if not ok and row and not derniere:
            derniere = row[2]  # conserver la dernière donnée connue
        st = statut(ok, age, tolerance, echecs, arretee)
        self.db.execute(
            "INSERT INTO sources_health VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(source_id) DO UPDATE SET "
            "libelle=excluded.libelle, url=excluded.url, statut=excluded.statut, http=excluded.http, "
            "derniere_donnee=excluded.derniere_donnee, age_jours=excluded.age_jours, tolerance_jours=excluded.tolerance_jours, "
            "echecs_consecutifs=excluded.echecs_consecutifs, derniere_verification=excluded.derniere_verification, "
            "derniere_reussite=excluded.derniere_reussite, info=excluded.info",
            (source_id, libelle, url, st, http, derniere, age, tolerance, echecs, now, reussite, info[:300]))
        if log:
            self.db.execute("INSERT INTO health_log VALUES(?,?,?,?,?,?)", (now, source_id, st, http, age, info[:300]))
        self.db.commit()
        return {"id": source_id, "libelle": libelle, "statut": st, "http": http, "derniere_donnee": derniere,
                "age_jours": age, "tolerance_jours": tolerance, "echecs_consecutifs": echecs, "verifie_le": now,
                "info": info[:300]}

    def _all_health(self) -> list[dict]:
        cur = self.db.execute("SELECT source_id, libelle, statut, http, derniere_donnee, age_jours, tolerance_jours, "
                              "echecs_consecutifs, derniere_verification, info FROM sources_health ORDER BY source_id")
        keys = ["id", "libelle", "statut", "http", "derniere_donnee", "age_jours", "tolerance_jours",
                "echecs_consecutifs", "verifie_le", "info"]
        return [dict(zip(keys, r)) for r in cur.fetchall()]

    def _purge(self, days: int = 120) -> None:
        lim = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")
        self.db.execute("DELETE FROM health_log WHERE ts < ?", (lim,))
        self.db.commit()

    # ------------------------------------------------------------ historique des indicateurs
    def _put_obs(self, indicateur: str, points: list[tuple[str, float]]) -> None:
        self.db.executemany("INSERT INTO obs VALUES(?,?,?) ON CONFLICT(indicateur, d) DO UPDATE SET v=excluded.v",
                            [(indicateur, d, float(v)) for d, v in points])
        self.db.commit()

    def _get_obs(self, indicateur: str, limit: int = 400) -> list[tuple[str, float]]:
        cur = self.db.execute("SELECT d, v FROM obs WHERE indicateur=? ORDER BY d DESC LIMIT ?", (indicateur, limit))
        return sorted(cur.fetchall())

    # ------------------------------------------------------------ cache HTTP conditionnel
    def _cache_get(self, url: str) -> Optional[dict]:
        r = self.db.execute("SELECT etag, last_modified, payload, maj FROM http_cache WHERE url=?", (url,)).fetchone()
        if not r:
            return None
        return {"etag": r[0], "last_modified": r[1], "payload": json.loads(r[2]) if r[2] else None, "maj": r[3]}

    def _cache_put(self, url: str, etag: Optional[str], last_modified: Optional[str], payload) -> None:
        now = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        self.db.execute("INSERT INTO http_cache VALUES(?,?,?,?,?) ON CONFLICT(url) DO UPDATE SET etag=excluded.etag, "
                        "last_modified=excluded.last_modified, payload=excluded.payload, maj=excluded.maj",
                        (url, etag, last_modified, json.dumps(payload, ensure_ascii=False), now))
        self.db.commit()

    def forget(self, source_id: str) -> None:
        """Retire une source devenue sans objet (ex. jeton optionnel retiré)."""
        with self.lock:
            self.db.execute("DELETE FROM sources_health WHERE source_id=?", (source_id,))
            self.db.commit()

    def record(self, *a, **k):
        with self.lock:
            return self._record(*a, **k)

    def all_health(self):
        with self.lock:
            return self._all_health()

    def purge(self, *a, **k):
        with self.lock:
            return self._purge(*a, **k)

    def put_obs(self, *a, **k):
        with self.lock:
            return self._put_obs(*a, **k)

    def get_obs(self, *a, **k):
        with self.lock:
            return self._get_obs(*a, **k)

    def cache_get(self, *a, **k):
        with self.lock:
            return self._cache_get(*a, **k)

    def cache_put(self, *a, **k):
        with self.lock:
            return self._cache_put(*a, **k)

    def close(self) -> None:
        self.db.commit()
        self.db.close()
