#!/usr/bin/env python3
"""用搜狗图片补海报和剧照。只存本地，不热链。"""
from __future__ import annotations

import argparse
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

from common import FILMS_ROOT, read_jsonl

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"
SEARCH = "https://pic.sogou.com/pics?query={query}"


def get(url: str, referer: str = "https://pic.sogou.com/") -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": referer})
    with urllib.request.urlopen(req, timeout=30) as res:
        return res.read()


def image_urls(query: str) -> list[str]:
    html = get(SEARCH.format(query=urllib.parse.quote(query))).decode("utf-8", "ignore")
    out = []
    for raw in re.findall(r'"oriPicUrl":"([^"]+)"', html):
        try:
            url = json.loads(f'"{raw}"')
        except Exception:
            continue
        if url and url not in out:
            out.append(url)
    return out


def load_image(url: str):
    raw = get(url)
    tmp = FILMS_ROOT / "tests" / "out" / ".sogou.download"
    tmp.parent.mkdir(parents=True, exist_ok=True)
    tmp.write_bytes(raw)
    try:
        with Image.open(tmp) as image:
            return image.convert("RGB")
    finally:
        tmp.unlink(missing_ok=True)


def save_webp(image: Image.Image, dest: Path) -> None:
    image.thumbnail((1200, 1200))
    dest.parent.mkdir(parents=True, exist_ok=True)
    image.save(dest, "WEBP", quality=84, method=6)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", type=Path, default=FILMS_ROOT / "data")
    parser.add_argument("--delay", type=float, default=1.5)
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    movies = read_jsonl(args.data_root / "movies" / "movies.jsonl")
    colors_path = args.data_root / "media" / "colors.json"
    colors = json.loads(colors_path.read_text(encoding="utf-8"))
    got_poster = got_stills = tried = 0

    for movie in movies:
        out = args.data_root / "media" / "movies" / movie["id"]
        credits_path = out / "credits.json"
        try:
            credits = json.loads(credits_path.read_text(encoding="utf-8"))
        except Exception:
            credits = {}
        need_poster = credits.get("poster", {}).get("kind") != "real"
        need_stills = not any(s.get("kind") == "real" for s in credits.get("stills", []))
        if not need_poster and not need_stills:
            continue
        if args.limit and tried >= args.limit:
            break
        tried += 1
        title = movie.get("zh") or movie.get("en") or ""

        if need_poster:
            images = []
            for url in image_urls(f"{title} 海报")[:8]:
                try:
                    images.append((url, load_image(url)))
                except Exception:
                    continue
            if images:
                portrait = next(((u, im) for u, im in images if im.height > im.width * 1.05 and im.width >= 300), None)
                url, image = portrait or images[0]
                save_webp(image, out / "poster.webp")
                credits["poster"] = {"source": "sogou", "url": url, "kind": "real"}
                colors[movie["id"]] = "#{:02x}{:02x}{:02x}".format(*image.resize((1, 1)).getpixel((0, 0)))
                got_poster += 1
                print(f"  海报 {movie['id']} {title}")

        if need_stills:
            stills = []
            for url in image_urls(f"{title} 剧照")[:12]:
                if len(stills) >= 3:
                    break
                try:
                    image = load_image(url)
                except Exception:
                    continue
                if image.width < 300:
                    continue
                name = f"still-{len(stills) + 1:02d}.webp"
                save_webp(image, out / name)
                stills.append({
                    "path": f"media/movies/{movie['id']}/{name}",
                    "source": "sogou", "kind": "real", "url": url,
                })
            if stills:
                credits["stills"] = stills
                got_stills += 1
                print(f"  剧照 {movie['id']} {title} {len(stills)} 张")

        credits_path.write_text(json.dumps(credits, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        time.sleep(args.delay)

    colors_path.write_text(json.dumps(colors, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"完成：海报 {got_poster}，剧照 {got_stills}，尝试 {tried}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
