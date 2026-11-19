#!/usr/bin/env python3
"""从 Wikidata 取首批电影元数据，写成 data/raw/wikidata/<imdb>.json。

不依赖 TMDb 密钥；海报和剧照留空，由 placeholders.py 生成占位图。
"""
from __future__ import annotations

import argparse
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

from common import FILMS_ROOT, read_toml, write_json

ENDPOINT = "https://query.wikidata.org/sparql"
UA = "films-pipeline/0.1 (personal film index; contact: local)"

COUNTRY = {
    "美国": "US", "美國": "US", "United States of America": "US", "United States": "US",
    "英国": "GB", "英國": "GB", "United Kingdom": "GB",
    "法国": "FR", "法國": "FR", "France": "FR",
    "意大利": "IT", "義大利": "IT", "Italy": "IT",
    "日本": "JP", "Japan": "JP",
    "韩国": "KR", "韓國": "KR", "大韩民国": "KR", "大韓民國": "KR", "South Korea": "KR",
    "德国": "DE", "德國": "DE", "Germany": "DE",
    "西班牙": "ES", "Spain": "ES",
    "瑞典": "SE", "Sweden": "SE",
    "印度": "IN", "India": "IN",
    "香港": "HK", "Hong Kong": "HK",
    "台湾": "TW", "臺灣": "TW", "Taiwan": "TW",
    "加拿大": "CA", "Canada": "CA",
    "澳大利亚": "AU", "澳洲": "AU", "Australia": "AU",
    "墨西哥": "MX", "Mexico": "MX",
    "巴西": "BR", "Brazil": "BR",
    "丹麦": "DK", "丹麥": "DK", "Denmark": "DK",
    "挪威": "NO", "Norway": "NO",
    "荷兰": "NL", "荷蘭": "NL", "Netherlands": "NL",
    "比利时": "BE", "比利時": "BE", "Belgium": "BE",
    "奥地利": "AT", "奧地利": "AT", "Austria": "AT",
    "瑞士": "CH", "Switzerland": "CH",
    "波兰": "PL", "波蘭": "PL", "Poland": "PL",
    "俄罗斯": "RU", "俄羅斯": "RU", "Russia": "RU",
    "中国": "CN", "中國": "CN", "China": "CN",
}

GENRE_HINTS = [
    ("悬疑", "mystery"), ("懸疑", "mystery"),
    ("惊悚", "mystery"), ("驚悚", "mystery"),
    ("推理", "mystery"), ("犯罪", "mystery"),
    ("恐怖", "mystery"), ("神秘", "mystery"), ("黑色", "mystery"),
    ("科幻", "scifi"),
    ("动作", "action"), ("動作", "action"),
    ("冒险", "action"), ("冒險", "action"),
    ("战争", "action"), ("戰爭", "action"), ("西部", "action"),
]


def genres_for(labels: list[str]) -> list[str]:
    out = []
    for label in labels:
        for needle, genre in GENRE_HINTS:
            if needle in label and genre not in out:
                out.append(genre)
    return out or ["other"]


def load_seed(path: Path) -> list[dict]:
    data = read_toml(path)
    return data.get("movies", [])


def sparql(imdb_ids: list[str]) -> dict:
    values = " ".join(f'"{x}"' for x in imdb_ids)
    query = f"""
SELECT ?imdb ?film ?date ?duration ?directorLabel ?countryLabel ?genreLabel WHERE {{
  VALUES ?imdb {{ {values} }}
  ?film wdt:P345 ?imdb .
  OPTIONAL {{ ?film wdt:P577 ?date. }}
  OPTIONAL {{ ?film wdt:P2047 ?duration. }}
  OPTIONAL {{ ?film wdt:P57 ?director. }}
  OPTIONAL {{ ?film wdt:P495 ?country. }}
  OPTIONAL {{ ?film wdt:P136 ?genre. }}
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "zh,en". }}
}}
"""
    url = ENDPOINT + "?" + urllib.parse.urlencode({"format": "json", "query": query})
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/sparql-results+json"})
    with urllib.request.urlopen(request, timeout=90) as res:
        return json.loads(res.read().decode("utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", type=Path, default=FILMS_ROOT / "data")
    parser.add_argument("--seed", type=Path, default=FILMS_ROOT / "data" / "curated" / "movies.toml")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    seed = load_seed(args.seed)
    by_imdb = {item["key"].split(":", 1)[1]: item for item in seed}
    ids = list(by_imdb)
    raw_dir = args.data_root / "raw" / "wikidata"
    raw_dir.mkdir(parents=True, exist_ok=True)

    pending = [x for x in ids if args.force or not (raw_dir / f"{x}.json").exists()]
    if not pending:
        print("没有要抓的；已有缓存。")
        return 0

    print(f"从 Wikidata 查 {len(pending)} 部")
    data = sparql(pending)
    rows: dict[str, dict] = {}
    for row in data.get("results", {}).get("bindings", []):
        imdb = row.get("imdb", {}).get("value", "")
        if not imdb:
            continue
        item = rows.setdefault(imdb, {
            "film": row.get("film", {}).get("value", ""),
            "dates": [], "durations": [], "directors": [], "countries": [], "genres": [],
        })
        for field, target in (
            ("date", "dates"), ("duration", "durations"),
            ("directorLabel", "directors"), ("countryLabel", "countries"), ("genreLabel", "genres"),
        ):
            value = row.get(field, {}).get("value", "")
            if value and value not in item[target]:
                item[target].append(value)

    missing = []
    for imdb in pending:
        row = rows.get(imdb)
        if not row:
            missing.append(imdb)
            continue
        item = by_imdb[imdb]
        dates = sorted(row["dates"])
        date = dates[0][:10] if dates else ""
        runtime = int(float(row["durations"][0])) if row["durations"] else 0
        directors = [item["director_zh"]] if item.get("director_zh") else [
            x.strip() for x in row["directors"] if x.strip()
        ]
        country_labels = [x.strip() for x in row["countries"] if x.strip()]
        genre_labels = [x.strip() for x in row["genres"] if x.strip()]
        site_genres = []
        for label in genre_labels:
            for needle, genre in GENRE_HINTS:
                if needle in label and genre not in site_genres:
                    site_genres.append(genre)
        if not site_genres:
            site_genres = ["other"]
        countries = [COUNTRY.get(x, x) for x in country_labels]
        raw = {
            "source": "wikidata",
            "key": f"imdb:{imdb}",
            "wikidata": row["film"],
            "title": item["title_zh"],
            "original_title": item["title_en"],
            "release_date": date,
            "runtime": runtime,
            "production_countries": [{"iso_3166_1": x} for x in countries],
            "country_labels": country_labels,
            "site_genres": site_genres,
            "genre_labels": genre_labels,
            "director_names": directors,
            "poster_src": "",
            "stills_src": [],
        }
        write_json(raw_dir / f"{imdb}.json", raw)
        print(f"  {imdb} {item['title_zh']}")
        time.sleep(0.1)

    if missing:
        print("Wikidata 没查到：" + ", ".join(missing))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
