#!/usr/bin/env python3
"""逐条从豆瓣取 2–3 张剧照，慢请求，不批量。"""
from __future__ import annotations

import argparse
import json
import re
import time
from pathlib import Path

from common import FILMS_ROOT, read_jsonl
from image_io import download_image, fetch_bytes

UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)"
PHOTOS = "https://m.douban.com/rexxar/api/v2/movie/{sid}/photos?type=S&start=0&count=10"
PHOTO = "https://m.douban.com/rexxar/api/v2/photo/{pid}"


def photo_subject(pid: str) -> str:
    data = json.loads(fetch(PHOTO.format(pid=pid)))
    owner = data.get("owner_uri", "")
    match = re.search(r"/movie/(\d+)", owner)
    return match.group(1) if match else ""


def fetch(url: str, referer: str = "https://m.douban.com/") -> bytes:
    return fetch_bytes(url, referer, UA)



def photo_urls(sid: str, count: int = 3) -> list[str]:
    data = json.loads(fetch(PHOTOS.format(sid=sid), f"https://m.douban.com/movie/subject/{sid}/"))
    urls = []
    for photo in data.get("photos", [])[:count]:
        image = photo.get("image") or {}
        url = (image.get("large") or {}).get("url") or (image.get("small") or {}).get("url") or ""
        if url:
            urls.append(url)
    return urls


def save(url: str, dest: Path) -> None:
    download_image(url, dest, max_size=1200, user_agent=UA)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", type=Path, default=FILMS_ROOT / "data")
    parser.add_argument("--delay", type=float, default=12.0)
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    movies = read_jsonl(args.data_root / "movies" / "movies.jsonl")
    got = 0
    tried = 0
    for movie in movies:
        out = args.data_root / "media" / "movies" / movie["id"]
        credits_path = out / "credits.json"
        try:
            credits = json.loads(credits_path.read_text(encoding="utf-8"))
        except Exception:
            credits = {}
        if credits.get("stills"):
            continue
        if credits.get("poster", {}).get("kind") != "real":
            continue
        poster_url = credits.get("poster", {}).get("url", "")
        match = re.search(r"p(\d+)\.jpg", poster_url)
        if not match:
            print(f"  缺海报编号 {movie['id']} {movie.get('zh')}")
            continue
        if args.limit and tried >= args.limit:
            break
        tried += 1
        sid = photo_subject(match.group(1))
        urls = photo_urls(sid) if sid else []
        if not urls:
            print(f"  缺剧照 {movie['id']} {movie.get('zh')}")
            time.sleep(args.delay)
            continue
        stills = []
        for i, url in enumerate(urls[:3], start=1):
            path = f"media/movies/{movie['id']}/still-{i:02d}.webp"
            try:
                save(url, out / f"still-{i:02d}.webp")
                stills.append({"path": path, "source": "douban", "kind": "real", "url": url})
            except Exception as exc:  # noqa: BLE001
                print(f"  失败 {movie['id']} #{i}: {exc}")
        if stills:
            credits.setdefault("poster", {})
            credits["stills"] = stills
            credits_path.write_text(json.dumps(credits, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            got += 1
            print(f"  {movie['id']} {movie.get('zh')} {len(stills)} 张")
        time.sleep(args.delay)

    print(f"完成 {got} 部，尝试 {tried} 部")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
