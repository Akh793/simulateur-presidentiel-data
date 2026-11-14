"""Couche réseau du pipeline : étend `hc.fetch` (relances, bascule curl HTTP/1.1) avec
- le contrôle d'intégrité (corps tronqué => nouvelle tentative) ;
- le décodage JSON relancé (les coupures de relais renvoient parfois un 200 vide) ;
- la journalisation des en-têtes Opendatasoft `X-RateLimit-dataset-Remaining` et
  `ODS-Explore-API-Deprecation` (règle d'ingestion n° 2).
Ne désactive jamais la vérification TLS et ne contourne aucun pare-feu.
"""
from __future__ import annotations

import json
import sys
import threading
import time
from pathlib import Path
from typing import Any, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import hc  # noqa: E402  (harnais existant, inchangé)

_lock = threading.Lock()
HEADER_LOG: list[dict] = []  # en-têtes de quota/dépréciation vus pendant le lot


class FetchError(RuntimeError):
    def __init__(self, url: str, status: Optional[int], detail: str):
        super().__init__(f"{url} -> HTTP {status} : {detail}")
        self.url, self.status, self.detail = url, status, detail


def _hdr(res, name: str) -> Optional[str]:
    for k, v in (res.headers or {}).items():
        if k.lower() == name.lower():
            return v
    return None


def _log_headers(url: str, res) -> None:
    rem = _hdr(res, "X-RateLimit-dataset-Remaining")
    dep = _hdr(res, "ODS-Explore-API-Deprecation")
    if rem is not None or dep is not None:
        with _lock:
            HEADER_LOG.append({"url": url.split("?")[0], "dataset_remaining": rem, "deprecation": dep})


def get(url: str, params: dict | None = None, *, method: str = "GET", headers: dict | None = None,
        data: Any = None, tries: int = 4, timeout: int = 60, ok=(200, 206), passes: int = 3) -> "hc.Res":
    """GET robuste : jusqu'à `passes` séries de `tries` tentatives, corps vérifié contre Content-Length."""
    last = None
    for p in range(passes):
        res = hc.fetch(url, params=params, method=method, data=data, headers=headers, tries=tries, timeout=timeout)
        last = res
        if res.status in ok:
            cl = _hdr(res, "Content-Length")
            body = res.body or b""
            if method == "HEAD" or not cl or not cl.isdigit() or len(body) >= int(cl) or _hdr(res, "Content-Encoding"):
                _log_headers(url, res)
                return res
        elif res.status is not None and res.status not in (429, 500, 502, 503, 504):
            break  # erreur définitive (401, 403, 404...) : inutile d'insister
        time.sleep(min(10, 2 * (p + 1)))
    raise FetchError(url, getattr(last, "status", None), (last.text(160) if last and last.body else "réponse vide"))


def get_json(url: str, params: dict | None = None, **kw) -> Any:
    """Comme `get`, mais relance si le corps n'est pas un JSON valide (coupure en cours de transfert)."""
    err = None
    for _ in range(3):
        res = get(url, params, **kw)
        try:
            return json.loads(res.body.decode("utf-8"))
        except (ValueError, UnicodeDecodeError, AttributeError) as e:
            err = e
            time.sleep(2)
    raise FetchError(url, 200, f"JSON invalide : {err}")


def get_text(url: str, params: dict | None = None, encoding: str = "utf-8", **kw) -> str:
    return get(url, params, **kw).body.decode(encoding, "replace")
