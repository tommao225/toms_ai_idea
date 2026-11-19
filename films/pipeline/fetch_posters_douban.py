#!/usr/bin/env python3
"""从豆瓣 suggest 接口取海报，下载并转 webp。中文站优先，不依赖 TMDb。"""
from __future__ import annotations

import argparse
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

from common import FILMS_ROOT, read_jsonl, write_json
from image_io import download_image

UA = "Mozilla/5.0 (compatible; films-index/0.1)"


def get_json(url: str) -> list:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as res:
        return json.loads(res.read().decode("utf-8"))


def suggest(title: str, year: int) -> dict | None:
    url = "https://movie.douban.com/j/subject_suggest?" + urllib.parse.urlencode({"q": title})
    try:
        rows = get_json(url)
    except Exception:
        return None
    if not isinstance(rows, list):
        return None
    for row in rows:
        if str(row.get("year")) == str(year):
            return row
    return rows[0] if rows else None


def search_page(title: str) -> str:
    url = "https://search.douban.com/movie/subject_search?" + urllib.parse.urlencode({
        "search_text": title, "cat": "1002",
    })
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as res:
        html = res.read().decode("utf-8", "ignore")
    match = re.search(r"https://img\d*\.doubanio\.com/view/photo/s_ratio_poster/public/[^\"'\s]+?\.jpg", html)
    return match.group(0) if match else ""


def download(url: str, dest: Path) -> str:
    return download_image(url, dest, max_size=500, referer="https://movie.douban.com/", user_agent=UA)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", type=Path, default=FILMS_ROOT / "data")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--delay", type=float, default=12.0)
    args = parser.parse_args()

    movies = read_jsonl(args.data_root / "movies" / "movies.jsonl")
    colors_path = args.data_root / "media" / "colors.json"
    colors = json.loads(colors_path.read_text(encoding="utf-8")) if colors_path.exists() else {}
    got = 0
    tried = 0
    for movie in movies:
        out = args.data_root / "media" / "movies" / movie["id"] / "poster.webp"
        credits = args.data_root / "media" / "movies" / movie["id"] / "credits.json"
        if out.exists() and not args.force:
            try:
                existing = json.loads(credits.read_text(encoding="utf-8"))
                if existing.get("poster", {}).get("kind") == "real":
                    continue
            except Exception as exc:
                print(f"  读取已有 credits 失败 {movie['id']}: {exc}")
        if args.limit and tried >= args.limit:
            break
        tried += 1
        row = suggest(movie.get("zh") or movie.get("en"), movie.get("year") or 0)
        if not row:
            row = suggest(movie.get("en") or movie.get("zh"), movie.get("year") or 0)
        url = (row.get("img") if row else "") or ""
        if not url:
            try:
                url = search_page(movie.get("zh") or movie.get("en"))
            except Exception:
                url = ""
        if not url:
            try:
                url = search_page(movie.get("en") or movie.get("zh"))
            except Exception:
                url = ""
        if not url:
            print(f"  缺海报 {movie['id']} {movie.get('zh')}")
            time.sleep(args.delay)
            continue
        url = url.replace("/s_ratio_poster/", "/l_ratio_poster/")
        try:
            colors[movie["id"]] = download(url, out)
            write_json(credits, {
                "poster": {"source": "douban", "url": url, "kind": "real"},
                "stills": [],
            })
            got += 1
            print(f"  {movie['id']} {movie.get('zh')}")
        except Exception as exc:  # noqa: BLE001
            print(f"  失败 {movie['id']}: {exc}")
        time.sleep(args.delay)

    write_json(colors_path, colors)
    print(f"下载 {got} 张海报，尝试 {tried} 部")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
