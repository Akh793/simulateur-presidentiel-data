"""Harnais persistant : relances avec backoff, bascule curl HTTP/1.1, journal des tentatives.

v1.1 (étape 1) : fichiers temporaires propres à chaque appel curl (la v1.0 écrivait dans
/tmp/hc_h et /tmp/hc_b partagés : réponses mélangées dès que deux threads appelaient curl),
HEAD via `curl -I`, redirections suivies comme avec requests.
"""
import json, os, subprocess, tempfile, time, requests
UA = {"User-Agent": "simulateur-presidentiel-healthcheck/1.0", "Accept": "application/json, text/csv, */*"}

class Res:
    def __init__(self, status, headers, body, route, attempts, elapsed):
        self.status, self.headers, self.body, self.route, self.attempts, self.elapsed = status, headers, body, route, attempts, elapsed
    def text(self, n=None):
        t = self.body.decode("utf-8", "replace") if isinstance(self.body, (bytes, bytearray)) else (self.body or "")
        return t if n is None else t[:n]
    def json(self):
        return json.loads(self.text())

def _curl(url, method="GET", data=None, headers=None, timeout=45):
    fd_h, path_h = tempfile.mkstemp(prefix="hc_h_"); fd_b, path_b = tempfile.mkstemp(prefix="hc_b_")
    os.close(fd_h); os.close(fd_b)
    try:
        cmd = ["curl", "-sS", "-L", "--http1.1", "--max-time", str(timeout), "-D", path_h, "-o", path_b, "-w", "%{http_code}"]
        cmd += ["-I"] if method == "HEAD" else ["-X", method]
        cmd.append(url)
        for k, v in {**UA, **(headers or {})}.items():
            cmd += ["-H", f"{k}: {v}"]
        if data is not None:
            cmd += ["--data", data if isinstance(data, str) else json.dumps(data)]
        p = subprocess.run(cmd, capture_output=True, text=True)
        code = int((p.stdout.strip() or "0")[-3:])
        if code == 0:
            raise ConnectionError(p.stderr.strip()[:160])
        hdr = {}
        for line in open(path_h, errors="replace").read().splitlines():
            if line.startswith("HTTP/"):
                hdr = {}  # ne garder que les en-têtes de la dernière réponse (proxy, redirections)
            elif ":" in line:
                k, v = line.split(":", 1); hdr[k.strip()] = v.strip()
        return code, hdr, open(path_b, "rb").read()
    finally:
        for f in (path_h, path_b):
            try: os.remove(f)
            except OSError: pass

def fetch(url, params=None, method="GET", data=None, headers=None, tries=5, timeout=45):
    if params:
        from urllib.parse import urlencode
        url = url + ("&" if "?" in url else "?") + urlencode(params)
    log, t0 = [], time.time()
    for i in range(tries):
        route = "requests" if i % 2 == 0 else "curl-http1.1"
        try:
            if route == "requests":
                r = requests.request(method, url, headers={**UA, **(headers or {})}, data=data, timeout=timeout)
                return Res(r.status_code, dict(r.headers), r.content, route, log + [f"{route}:ok"], time.time() - t0)
            code, hdr, body = _curl(url, method, data, headers, timeout)
            return Res(code, hdr, body, route, log + [f"{route}:ok"], time.time() - t0)
        except Exception as e:
            log.append(f"{route}:{type(e).__name__}")
            time.sleep(min(8, 2 ** i))
    return Res(None, {}, b"", "echec", log, time.time() - t0)
