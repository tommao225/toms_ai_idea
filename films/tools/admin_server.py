#!/usr/bin/env python3
"""本地 admin 服务：页面新增/编辑/删除电影，写 data/movies/<id>/ 单目录。

启动：
  python films/tools/admin_server.py --port 8765
  http://127.0.0.1:8765/web/index.html

白名单：
  films/data/admin.json
  {"token": "换掉", "auto_localhost": true, "whitelist": ["local"]}

只绑定 127.0.0.1；自动管理员仅本机生效。远程请求必须带 X-Admin-Token。
"""
from __future__ import annotations

import argparse
import json
import logging
import shutil
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
MOVIES = DATA / "movies"
WEB = ROOT / "web"
PIPELINE = ROOT / "pipeline"
sys.path.insert(0, str(PIPELINE))

from common import movie_id_for  # noqa: E402
from image_io import download_image  # noqa: E402
from fetch_images_sogou import image_urls, load  # noqa: E402
from fetch_quotes_wikiquote import load_pages, pick_quote, search_page, translate  # noqa: E402

CONFIG_PATH = DATA / "admin.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"
LOG_DIR = ROOT / "logs"
LOG_DIR.mkdir(exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_DIR / "admin.log", encoding="utf-8"),
    ],
)
log = logging.getLogger("admin")


def config() -> dict:
    try:
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {"token": "local-dev", "auto_localhost": True, "whitelist": ["local"]}


def is_admin(handler) -> bool:
    cfg = config()
    host = handler.client_address[0]
    if cfg.get("auto_localhost", True) and host in ("127.0.0.1", "::1"):
        return True
    token = handler.headers.get("X-Admin-Token", "")
    return bool(cfg.get("token")) and token == cfg.get("token")


def find_entity(title: str):
    params = urllib.parse.urlencode({
        "action": "wbsearchentities", "search": title, "language": "en",
        "uselang": "zh", "format": "json", "limit": "5",
    })
    req = urllib.request.Request("https://www.wikidata.org/w/api.php?" + params, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        data = json.loads(r.read())
    hits = data.get("search", [])
    return hits[0].get("id") if hits else None


def lookup(title: str) -> dict:
    qid = find_entity(title)
    if not qid:
        return {"title": title, "error": "no wikidata entity"}
    params = urllib.parse.urlencode({
        "action": "wbgetentities", "ids": qid, "props": "labels|claims",
        "languages": "zh|en", "format": "json",
    })
    req = urllib.request.Request("https://www.wikidata.org/w/api.php?" + params, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        entity = json.loads(r.read()).get("entities", {}).get(qid, {})
    labels = entity.get("labels", {})
    claims = entity.get("claims", {})

    def values(prop):
        out = []
        for claim in claims.get(prop, []):
            value = claim.get("mainsnak", {}).get("datavalue", {}).get("value")
            if isinstance(value, dict) and value.get("id"):
                out.append(value["id"])
        return out

    def labels_for(ids):
        if not ids:
            return []
        params = urllib.parse.urlencode({
            "action": "wbgetentities", "ids": "|".join(ids), "props": "labels",
            "languages": "zh|en", "format": "json",
        })
        req = urllib.request.Request("https://www.wikidata.org/w/api.php?" + params, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.loads(r.read())
        out = []
        for item in data.get("entities", {}).values():
            text = (item.get("labels", {}).get("zh") or item.get("labels", {}).get("en") or {}).get("value", "")
            if text:
                out.append(text)
        return out

    year = ""
    for claim in claims.get("P577", []):
        value = claim.get("mainsnak", {}).get("datavalue", {}).get("value", {})
        if value.get("time"):
            year = value["time"].lstrip("+")[:4]
            break
    runtime = 0
    for claim in claims.get("P2047", []):
        value = claim.get("mainsnak", {}).get("datavalue", {}).get("value", {})
        if value.get("amount"):
            runtime = int(float(value["amount"]))
            break
    quote = ""
    quote_zh = ""
    try:
        en = (labels.get("en") or {}).get("value", title)
        page = load_pages([en]).get(en) or search_page(en)
        if page:
            wikitext = page.get("revisions", [{}])[0].get("slots", {}).get("main", {}).get("*", "")
            quote = pick_quote(wikitext, en, page.get("title", "")) or ""
            quote_zh = translate(quote) if quote else ""
    except Exception:
        pass
    return {
        "qid": qid,
        "zh": (labels.get("zh") or {}).get("value", ""),
        "en": (labels.get("en") or {}).get("value", title),
        "year": year,
        "runtime": runtime,
        "director": " / ".join(labels_for(values("P57"))),
        "country": " / ".join(labels_for(values("P495"))),
        "genres": labels_for(values("P136")),
        "quote": quote,
        "quote_zh": quote_zh,
        "poster_url": first_image(f"{title} 海报", "portrait"),
        "still_url": first_image(f"{title} 剧照", "landscape"),
    }


def first_image(query: str, orientation: str) -> str:
    for url in image_urls(query)[:12]:
        try:
            image = load(url)
        except Exception:
            continue
        if orientation == "portrait" and image.height <= image.width:
            continue
        if orientation == "landscape" and image.width <= image.height:
            continue
        return url
    return ""


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        log.info("%s - %s", self.client_address[0], fmt % args)

    def json_body(self):
        length = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(length).decode("utf-8")) if length else {}

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/":
            self.send_response(302)
            self.send_header("Location", "/web/index.html")
            self.end_headers()
            return
        if parsed.path == "/api/admin/session":
            self.send_json({"admin": is_admin(self), "name": "local" if is_admin(self) else ""})
            return
        if parsed.path == "/api/admin/lookup":
            if not is_admin(self):
                self.send_json({"error": "forbidden"}, 403)
                return
            title = urllib.parse.parse_qs(parsed.query).get("title", [""])[0]
            try:
                self.send_json(lookup(title))
            except Exception as exc:
                self.send_json({"error": str(exc)}, 502)
            return
        super().do_GET()

    def do_POST(self):
        if not is_admin(self):
            self.send_json({"error": "forbidden"}, 403)
            return
        if self.path != "/api/admin/movies":
            self.send_json({"error": "not found"}, 404)
            return
        try:
            body = self.json_body()
            result = save_movie(body)
            self.send_json(result)
        except Exception as exc:
            self.send_json({"error": str(exc)}, 400)

    def do_PUT(self):
        if not is_admin(self):
            self.send_json({"error": "forbidden"}, 403)
            return
        try:
            body = self.json_body()
            result = save_movie(body)
            self.send_json(result)
        except Exception as exc:
            self.send_json({"error": str(exc)}, 400)

    def do_DELETE(self):
        if not is_admin(self):
            self.send_json({"error": "forbidden"}, 403)
            return
        parsed = urllib.parse.urlparse(self.path)
        movie_id = parsed.path.rsplit("/", 1)[-1]
        try:
            delete_movie(movie_id)
            self.send_json({"ok": True})
        except Exception as exc:
            self.send_json({"error": str(exc)}, 400)


def save_movie(body: dict) -> dict:
    title = str(body.get("en") or body.get("zh") or "untitled").strip()
    key = str(body.get("key") or "").strip()
    movie_id = str(body.get("id") or "").strip()
    if not movie_id:
        movie_id = movie_id_for(key.split(":", 1)[-1]) if key else f"m{int(time.time() * 1000)}"
    target = MOVIES / movie_id
    target.mkdir(parents=True, exist_ok=True)
    poster_rel = f"movies/{movie_id}/poster.webp"
    if not body.get("poster_url") and not (target / "poster.webp").exists() and (DATA / "media/movies" / movie_id / "poster.webp").exists():
        poster_rel = f"media/movies/{movie_id}/poster.webp"
    quote = str(body.get("quote") or "").strip()
    quote_zh = str(body.get("quote_zh") or "").strip()
    payload = {
        "id": movie_id,
        "key": key or f"admin:{movie_id}",
        "source": "admin",
        "zh": str(body.get("zh") or "").strip(),
        "en": str(body.get("en") or "").strip(),
        "year": int(body.get("year") or 0),
        "runtime": int(body.get("runtime") or 0),
        "director": str(body.get("director") or "").strip(),
        "country": str(body.get("country") or "").strip(),
        "genres": body.get("genres") or [],
        "genreLabel": body.get("genreLabel") or "其他",
        "list_id": str(body.get("list_id") or "").strip(),
        "rank": int(body.get("rank") or 0),
        "note": str(body.get("note") or body.get("why_included") or "").strip(),
        "why_included": str(body.get("why_included") or "").strip(),
        "quote": {"text": quote, "zh": quote_zh} if quote else None,
        "poster": poster_rel,
        "stills": [],
    }
    (target / "movie.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if body.get("poster_url"):
        download_image(body["poster_url"], target / "poster.webp", max_size=600)
    if body.get("still_url"):
        download_image(body["still_url"], target / "still.webp", max_size=1200)
        payload["stills"] = [{"path": f"movies/{movie_id}/still.webp", "source": "admin", "kind": "real"}]
    if quote:
        (target / "quote.md").write_text(quote + "\n", encoding="utf-8")
    else:
        (target / "quote.md").unlink(missing_ok=True)
    if quote_zh:
        (target / "quote.zh.md").write_text(quote_zh + "\n", encoding="utf-8")
    else:
        (target / "quote.zh.md").unlink(missing_ok=True)
    (target / "movie.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    log.info("save movie %s %s", movie_id, payload.get("zh") or payload.get("en"))
    build()
    return {"ok": True, "id": movie_id}


def delete_movie(movie_id: str) -> None:
    if not movie_id:
        raise ValueError("empty id")
    target = MOVIES / movie_id
    target.mkdir(parents=True, exist_ok=True)
    key = ""
    meta_path = target / "movie.json"
    if meta_path.exists():
        try:
            key = str(json.loads(meta_path.read_text(encoding="utf-8")).get("key", ""))
        except Exception:
            key = ""
    payload = {"id": movie_id, "deleted": True}
    (target / "movie.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    log.info("delete movie %s", movie_id)
    build()
    if key.startswith("admin:"):
        shutil.rmtree(target, ignore_errors=True)


def build() -> None:
    subprocess.run([sys.executable, str(PIPELINE / "build.py")], check=True, cwd=str(ROOT))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    log.info("admin server listening http://127.0.0.1:%s/web/index.html", args.port)
    print(f"http://127.0.0.1:{args.port}/web/index.html")
    server.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
