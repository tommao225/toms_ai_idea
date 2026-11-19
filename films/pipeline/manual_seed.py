#!/usr/bin/env python3
"""科幻、动作两榜的人工元数据。IMDb 编号保留，方便逐条复核。"""
from __future__ import annotations

import argparse
from pathlib import Path

from common import FILMS_ROOT, read_toml, write_json

# imdb: (year, runtime, countries, site_genres)
MANUAL = {
    "tt0062622": (1968, 149, ["US", "GB"], ["scifi"]),
    "tt0083658": (1982, 117, ["US"], ["scifi"]),
    "tt0078748": (1979, 117, ["US", "GB"], ["scifi"]),
    "tt0133093": (1999, 136, ["US", "AU"], ["scifi", "action"]),
    "tt0079944": (1979, 162, ["SU"], ["scifi"]),
    "tt0069293": (1972, 167, ["SU"], ["scifi"]),
    "tt2543164": (2016, 116, ["US"], ["scifi"]),
    "tt0816692": (2014, 169, ["US", "GB"], ["scifi"]),
    "tt0206634": (2006, 109, ["US", "GB"], ["scifi"]),
    "tt0113568": (1995, 83, ["JP"], ["scifi"]),
    "tt1392190": (2015, 120, ["AU", "US"], ["action"]),
    "tt0095016": (1988, 132, ["US"], ["action"]),
    "tt1602613": (2011, 101, ["ID"], ["action"]),
    "tt0047478": (1954, 207, ["JP"], ["action"]),
    "tt0060196": (1966, 178, ["IT", "ES", "DE"], ["action"]),
    "tt0082971": (1981, 115, ["US"], ["action"]),
    "tt0103064": (1991, 137, ["US"], ["action"]),
    "tt2911666": (2014, 101, ["US"], ["action"]),
    "tt0190332": (2000, 120, ["TW", "HK", "US", "CN"], ["action"]),
    "tt0067116": (1971, 104, ["US"], ["action"]),
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", type=Path, default=FILMS_ROOT / "data")
    parser.add_argument("--seed", type=Path, default=FILMS_ROOT / "data" / "curated" / "movies.toml")
    args = parser.parse_args()

    seed = {x["key"].split(":", 1)[1]: x for x in read_toml(args.seed).get("movies", [])}
    out = args.data_root / "raw" / "manual"
    out.mkdir(parents=True, exist_ok=True)
    for imdb, (year, runtime, countries, genres) in MANUAL.items():
        item = seed.get(imdb)
        if not item:
            print(f"seed 里没有 {imdb}")
            continue
        raw = {
            "source": "manual",
            "key": f"imdb:{imdb}",
            "wikidata": "",
            "title": item["title_zh"],
            "original_title": item["title_en"],
            "release_date": f"{year}-01-01",
            "runtime": runtime,
            "production_countries": [{"iso_3166_1": c} for c in countries],
            "country_labels": countries,
            "site_genres": genres,
            "genre_labels": genres,
            "director_names": [item["director_zh"]],
            "poster_src": "",
            "stills_src": [],
        }
        write_json(out / f"{imdb}.json", raw)
        print(f"  {imdb} {item['title_zh']}")
    print(f"写入 {len(MANUAL)} 部人工元数据")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
