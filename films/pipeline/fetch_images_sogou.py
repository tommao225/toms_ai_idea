#!/usr/bin/env python3
"""用搜狗图片补海报和剧照。只存本地，不热链。"""
from __future__ import annotations

import argparse
import json
import re
import time
import urllib.parse
from pathlib import Path

from common import FILMS_ROOT, read_jsonl
from image_io import fetch_bytes, load_image, save_webp

SEARCH = "https://pic.sogou.com/pics?query={query}"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"


def image_urls(query: str) -> list[str]:
    html = fetch_bytes(SEARCH.format(query=urllib.parse.quote(query)), "https://pic.sogou.com/", UA).decode("utf-8", "ignore")
    out = []
    for raw in re.findall(r'"oriPicUrl":"([^"]+)"', html):
        try:
            url = json.loads(f'"{raw}"')
        except Exception:
            continue
        if url and url not in out:
            out.append(url)
    return out


def load(url: str):
    return load_image(url, "https://pic.sogou.com/", UA)


def fetch_poster(movie: dict, out: Path, credits: dict, colors: dict) -> bool:
    title = movie.get("zh") or movie.get("en") or ""
    images = []
    for url in image_urls(f"{title} 海报")[:8]:
        try:
            images.append((url, load(url)))
        except Exception:
            continue
    if not images:
        return False
    portrait = next(((u, im) for u, im in images if im.height > im.width * 1.05 and im.width >= 300), None)
    url, image = portrait or images[0]
    save_webp(image, out / "poster.webp")
    credits["poster"] = {"source": "sogou", "url": url, "kind": "real"}
    colors[movie["id"]] = "#{:02x}{:02x}{:02x}".format(*image.resize((1, 1)).getpixel((0, 0)))
    print(f"  海报 {movie['id']} {title}")
    return True


def fetch_stills(movie: dict, out: Path, credits: dict) -> bool:
    title = movie.get("zh") or movie.get("en") or ""
    stills = []
    for url in image_urls(f"{title} 剧照")[:12]:
        if len(stills) >= 3:
            break
        try:
            image = load(url)
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
    if not stills:
        return False
    credits["stills"] = stills
    print(f"  剧照 {movie['id']} {title} {len(stills)} 张")
    return True


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
        if need_poster and fetch_poster(movie, out, credits, colors):
            got_poster += 1
        if need_stills and fetch_stills(movie, out, credits):
            got_stills += 1
        credits_path.write_text(json.dumps(credits, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        time.sleep(args.delay)

    colors_path.write_text(json.dumps(colors, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"完成：海报 {got_poster}，剧照 {got_stills}，尝试 {tried}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
