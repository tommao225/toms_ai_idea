#!/usr/bin/env python3
"""抓 TMDb 原始响应，缓存到 data/raw/tmdb/<tmdb_id>.json。

用法：
  python pipeline/fetch.py --dry-run
  python pipeline/fetch.py
  python pipeline/fetch.py --fixture tests/pipeline/fixture/raw --curated tests/pipeline/fixture/curated --data-root tests/pipeline/out/data
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import time
import urllib.parse
import urllib.request
from pathlib import Path

from common import FILMS_ROOT, load_lists, parse_key

API = "https://api.themoviedb.org/3/movie/{id}"
FIELDS = "credits,images,release_dates"


def wanted_keys(curated_root: Path) -> list[str]:
    keys: list[str] = []
    for item in load_lists(curated_root):
        for row in item["_entries"]:
            source, value = parse_key(row["movie_key"])
            if source == "tmdb" and value and value not in keys:
                keys.append(value)
    return keys


def fetch_one(tmdb_id: str, api_key: str) -> dict:
    params = urllib.parse.urlencode({
        "api_key": api_key,
        "language": "zh-CN",
        "append_to_response": FIELDS,
    })
    with urllib.request.urlopen(f"{API.format(id=tmdb_id)}?{params}", timeout=20) as res:
        return json.loads(res.read().decode("utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--curated", type=Path, default=FILMS_ROOT / "data" / "curated")
    parser.add_argument("--data-root", type=Path, default=FILMS_ROOT / "data")
    parser.add_argument("--fixture", type=Path, help="本地原始响应目录，内含 tmdb/<id>.json")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    keys = wanted_keys(args.curated)
    raw_dir = args.data_root / "raw" / "tmdb"
    print(f"待抓 {len(keys)} 部；模式：{'fixture' if args.fixture else 'TMDb'}")
    if args.dry_run:
        for key in keys:
            print(f"  tmdb:{key}")
        return 0

    raw_dir.mkdir(parents=True, exist_ok=True)
    missing: list[str] = []

    if args.fixture:
        for tmdb_id in keys:
            src = args.fixture / "tmdb" / f"{tmdb_id}.json"
            dst = raw_dir / f"{tmdb_id}.json"
            if not src.exists():
                missing.append(tmdb_id)
                continue
            if not dst.exists():
                shutil.copyfile(src, dst)
                print(f"  复制 {tmdb_id}")
        if missing:
            print("缺 fixture：" + ", ".join(missing))
            return 1
        return 0

    api_key = os.environ.get("TMDB_API_KEY", "").strip()
    if not api_key:
        print("缺 TMDB_API_KEY；先设置环境变量，或用 --fixture 跑离线数据。")
        return 2

    for tmdb_id in keys:
        dst = raw_dir / f"{tmdb_id}.json"
        if dst.exists():
            continue
        try:
            data = fetch_one(tmdb_id, api_key)
            dst.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"  抓取 {tmdb_id}")
        except Exception as exc:  # noqa: BLE001 - 失败要保留原始信息
            print(f"  失败 {tmdb_id}: {exc}")
            missing.append(tmdb_id)
        time.sleep(0.26)

    if missing:
        print("失败：" + ", ".join(missing))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
