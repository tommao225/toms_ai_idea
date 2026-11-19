#!/usr/bin/env python3
"""用 Wikidata 的 MediaWiki API 取元数据，避开 SPARQL 的 429 限流。

先按 IMDb 编号搜 QID，再批量取 claims 和标签，最后写成 data/raw/wikidata/<imdb>.json。
"""
from __future__ import annotations

import argparse
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

from common import FILMS_ROOT, read_toml, write_json

API = "https://www.wikidata.org/w/api.php"
UA = "films-pipeline/0.1 (personal film index; local)"

COUNTRY = {
    "美国": "US", "美國": "US", "英国": "GB", "英國": "GB",
    "法国": "FR", "法國": "FR", "意大利": "IT", "義大利": "IT",
    "日本": "JP", "韩国": "KR", "韓國": "KR", "大韩民国": "KR", "大韓民國": "KR",
    "德国": "DE", "德國": "DE", "西班牙": "ES", "瑞典": "SE",
    "印度": "IN", "香港": "HK", "台湾": "TW", "臺灣": "TW",
    "加拿大": "CA", "澳大利亚": "AU", "澳洲": "AU", "墨西哥": "MX",
    "荷兰": "NL", "荷蘭": "NL", "比利时": "BE", "比利時": "BE",
    "奥地利": "AT", "奧地利": "AT", "瑞士": "CH", "波兰": "PL", "波蘭": "PL",
    "俄罗斯": "RU", "俄羅斯": "RU", "中国": "CN", "中國": "CN",
    "阿根廷": "AR", "巴西": "BR", "丹麦": "DK", "丹麥": "DK",
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


def api(params: dict) -> dict:
    params = {**params, "format": "json"}
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                return json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            if exc.code != 429 or attempt == 2:
                raise
            time.sleep(5 + attempt * 5)
    raise RuntimeError("unreachable")


def search_qid(imdb: str) -> str:
    data = api({
        "action": "query", "list": "search",
        "srsearch": f"haswbstatement:P345={imdb}", "srlimit": 1,
    })
    hits = data.get("query", {}).get("search", [])
    return hits[0]["title"] if hits else ""


def label_of(entity: dict, lang: str) -> str:
    labels = entity.get("labels", {})
    return labels.get(lang, {}).get("value", "")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", type=Path, default=FILMS_ROOT / "data")
    parser.add_argument("--seed", type=Path, default=FILMS_ROOT / "data" / "curated" / "movies.toml")
    args = parser.parse_args()

    seed = read_toml(args.seed).get("movies", [])
    by_imdb = {x["key"].split(":", 1)[1]: x for x in seed}
    raw_dir = args.data_root / "raw" / "wikidata"
    raw_dir.mkdir(parents=True, exist_ok=True)
    pending = [x for x in by_imdb if not (raw_dir / f"{x}.json").exists()]
    if not pending:
        print("没有要抓的；已有缓存。")
        return 0

    qids: dict[str, str] = {}
    for imdb in pending:
        qid = search_qid(imdb)
        if qid:
            qids[imdb] = qid
        time.sleep(1.0)

    if not qids:
        print("Wikidata 没搜到任何电影")
        return 1

    entities: dict[str, dict] = {}
    ids = list(qids.values())
    for i in range(0, len(ids), 40):
        data = api({
            "action": "wbgetentities", "ids": "|".join(ids[i:i + 40]),
            "props": "claims", "languages": "zh|en",
        })
        entities.update(data.get("entities", {}))

    related: set[str] = set()
    for entity in entities.values():
        claims = entity.get("claims", {})
        for prop in ("P57", "P495", "P136"):
            for claim in claims.get(prop, []):
                value = claim.get("mainsnak", {}).get("datavalue", {}).get("value", {})
                if isinstance(value, dict) and value.get("id"):
                    related.add(value["id"])

    labels: dict[str, str] = {}
    related_ids = list(related)
    for i in range(0, len(related_ids), 40):
        data = api({
            "action": "wbgetentities", "ids": "|".join(related_ids[i:i + 40]),
            "props": "labels", "languages": "zh|en",
        })
        for qid, entity in data.get("entities", {}).items():
            labels[qid] = label_of(entity, "zh") or label_of(entity, "en")

    missing = []
    for imdb, qid in qids.items():
        entity = entities.get(qid)
        if not entity:
            missing.append(imdb)
            continue
        claims = entity.get("claims", {})
        dates = []
        for claim in claims.get("P577", []):
            value = claim.get("mainsnak", {}).get("datavalue", {}).get("value", {})
            if value.get("time"):
                dates.append(value["time"].lstrip("+")[:10])
        runtime = 0
        for claim in claims.get("P2047", []):
            value = claim.get("mainsnak", {}).get("datavalue", {}).get("value", {})
            if value.get("amount"):
                runtime = int(float(value["amount"]))
                break
        country_labels = []
        for claim in claims.get("P495", []):
            value = claim.get("mainsnak", {}).get("datavalue", {}).get("value", {})
            label = labels.get(value.get("id", ""), "")
            if label and label not in country_labels:
                country_labels.append(label)
        genre_labels = []
        for claim in claims.get("P136", []):
            value = claim.get("mainsnak", {}).get("datavalue", {}).get("value", {})
            label = labels.get(value.get("id", ""), "")
            if label and label not in genre_labels:
                genre_labels.append(label)
        directors = []
        for claim in claims.get("P57", []):
            value = claim.get("mainsnak", {}).get("datavalue", {}).get("value", {})
            label = labels.get(value.get("id", ""), "")
            if label and label not in directors:
                directors.append(label)

        item = by_imdb[imdb]
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
            "wikidata": f"http://www.wikidata.org/entity/{qid}",
            "title": item["title_zh"],
            "original_title": item["title_en"],
            "release_date": sorted(dates)[0] if dates else "",
            "runtime": runtime,
            "production_countries": [{"iso_3166_1": x} for x in countries],
            "country_labels": country_labels,
            "site_genres": site_genres,
            "genre_labels": genre_labels,
            "director_names": [item["director_zh"]] if item.get("director_zh") else directors,
            "poster_src": "",
            "stills_src": [],
        }
        write_json(raw_dir / f"{imdb}.json", raw)
        print(f"  {imdb} {item['title_zh']}")
        time.sleep(0.1)

    if missing:
        print("没取到：" + ", ".join(missing))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
