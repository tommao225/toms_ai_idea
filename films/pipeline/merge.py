#!/usr/bin/env python3
"""把原始 TMDb 响应归一成电影主档 data/movies/movies.jsonl。"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from common import (
    FILMS_ROOT,
    genre_map,
    load_lists,
    movie_id_for,
    movie_key_for,
    parse_key,
    read_toml,
    write_jsonl,
)
from taxonomy import FALLBACK_COLOR, GENRE_LABELS, genres_for_labels

IMAGE = "https://image.tmdb.org/t/p/w780"

COUNTRY_NAMES = {
    "US": "美国", "GB": "英国", "FR": "法国", "IT": "意大利", "JP": "日本",
    "KR": "韩国", "DE": "德国", "ES": "西班牙", "SE": "瑞典", "IN": "印度",
    "HK": "中国香港", "TW": "中国台湾", "CA": "加拿大", "AU": "澳大利亚",
    "SU": "苏联", "ID": "印度尼西亚",
    "MX": "墨西哥", "BR": "巴西", "DK": "丹麦", "NO": "挪威", "NL": "荷兰",
    "BE": "比利时", "AT": "奥地利", "CH": "瑞士", "PL": "波兰", "RU": "俄罗斯",
    "CN": "中国",
}

COUNTRY_CODES = {
    "美国": "US", "美國": "US", "英国": "GB", "英國": "GB",
    "法国": "FR", "法國": "FR", "意大利": "IT", "義大利": "IT",
    "日本": "JP", "韩国": "KR", "韓國": "KR", "大韩民国": "KR", "大韓民國": "KR",
    "德国": "DE", "德國": "DE", "西班牙": "ES", "瑞典": "SE",
    "印度": "IN", "香港": "HK", "台湾": "TW", "臺灣": "TW",
    "加拿大": "CA", "澳大利亚": "AU", "澳洲": "AU", "墨西哥": "MX",
}


def load_memberships(curated_root: Path) -> dict[str, list[dict]]:
    members: dict[str, list[dict]] = {}
    for item in load_lists(curated_root):
        for row in item["_entries"]:
            source, value = parse_key(row["movie_key"])
            if source not in ("tmdb", "imdb"):
                continue
            movie_id = movie_id_for(value)
            rank = int(row.get("rank") or 0)
            members.setdefault(movie_id, []).append({"list_id": item["id"], "rank": rank})
    return members


def quote_for(movie_id: str, curated_root: Path) -> tuple[str, str]:
    base = curated_root / "movies" / movie_id
    original_path = base / "quote.original.md"
    text_path = base / "quote.md"
    zh_path = base / "quote.zh.md"
    meta_path = base / "quote.json"
    if original_path.exists():
        text = original_path.read_text(encoding="utf-8").strip()
        zh = text_path.read_text(encoding="utf-8").strip() if text_path.exists() else ""
    elif meta_path.exists():
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except Exception:
            meta = {}
        text = str(meta.get("original", "")).strip()
        raw = text_path.read_text(encoding="utf-8").strip() if text_path.exists() else ""
        zh = raw if raw and raw != text else ""
        if not text:
            text = raw
    elif text_path.exists():
        text = text_path.read_text(encoding="utf-8").strip()
        zh = zh_path.read_text(encoding="utf-8").strip() if zh_path.exists() else ""
    else:
        return "", ""
    return (
        text.splitlines()[0].strip() if text else "",
        zh.splitlines()[0].strip() if zh else "",
    )


def map_genres(raw: dict, mapping: dict[str, list[str]]) -> list[str]:
    out: list[str] = []
    for item in raw.get("genres") or []:
        for value in mapping.get(item.get("name", ""), []):
            if value not in out:
                out.append(value)
    return out or ["other"]


def map_labels(labels: list[str]) -> list[str]:
    return genres_for_labels(labels)


def load_movie_meta(curated_root: Path) -> dict[str, dict]:
    path = curated_root / "movies.toml"
    if not path.exists():
        return {}
    return {item["key"]: item for item in read_toml(path).get("movies", [])}


def base_fields(raw: dict, key: str, meta: dict):
    movie_id = movie_id_for(key.split(":", 1)[1])
    seed = meta.get(key, {})
    missing: list[str] = []
    date = raw.get("release_date") or ""
    year = int(date[:4]) if date[:4].isdigit() else 0
    if not year:
        missing.append("year")
    runtime = int(raw.get("runtime") or 0)
    if not runtime:
        missing.append("runtime")
    countries = [c.get("iso_3166_1") for c in raw.get("production_countries") or [] if c.get("iso_3166_1")]
    countries = [COUNTRY_CODES.get(c, c) for c in countries]
    primary = countries[0] if countries else ""
    if not primary:
        missing.append("primary_country")
    languages = [x.get("iso_639_1") for x in raw.get("spoken_languages") or [] if x.get("iso_639_1")]
    directors = []
    names = list(raw.get("director_names") or [])
    for person in (raw.get("credits") or {}).get("crew") or []:
        if person.get("job") == "Director":
            directors.append(f"p:{person.get('id')}")
            names.append(person.get("name", ""))
    if seed.get("director_zh"):
        names = [seed["director_zh"]]
    names = [n for n in names if n]
    if not names:
        missing.append("directors")
    directors = directors or [f"p:{n}" for n in names]
    return movie_id, seed, missing, year, runtime, countries, primary, languages, directors, names


def media_fields(raw: dict, movie_id: str, curated_root: Path, missing: list[str]):
    poster_src = raw.get("poster_src") or ""
    if not poster_src and raw.get("poster_path"):
        poster_src = IMAGE + raw["poster_path"]
    if not poster_src:
        missing.append("poster")
    stills_src = list(raw.get("stills_src") or [])
    if not stills_src:
        for image in (raw.get("images") or {}).get("backdrops") or []:
            if image.get("file_path"):
                stills_src.append(IMAGE + image["file_path"])
            if len(stills_src) >= 2:
                break
    stills = [{"path": f"media/movies/{movie_id}/still-{i + 1:02d}.webp",
               "source": "tmdb", "credit": "TMDb", "kind": "real"}
              for i in range(len(stills_src))]
    quote = quote_for(movie_id, curated_root)
    if not quote[0]:
        missing.append("quote")
    return poster_src, stills_src, stills, quote


def genre_fields(raw: dict, mapping: dict):
    genres = raw.get("site_genres") or []
    if not genres or genres == ["other"]:
        genres = map_labels(raw.get("genre_labels") or [])
    if not genres:
        genres = map_genres(raw, mapping)
    genres = [g for g in genres if g] or ["other"]
    label = next((GENRE_LABELS[g] for g in genres if g in GENRE_LABELS), GENRE_LABELS["other"])
    return genres, label


def merge_one(raw: dict, key: str, curated_root: Path, mapping: dict, memberships: dict, meta: dict) -> dict:
    movie_id, seed, missing, year, runtime, countries, primary, languages, directors, names = base_fields(raw, key, meta)
    poster_src, stills_src, stills, quote = media_fields(raw, movie_id, curated_root, missing)
    genres, genre_label = genre_fields(raw, mapping)
    country_labels = raw.get("country_labels") or countries
    country_display = " / ".join(COUNTRY_NAMES.get(c, c) for c in countries) or " / ".join(country_labels)
    title_zh = raw.get("title") or raw.get("original_title") or ""
    title_en = raw.get("original_title") or ""
    return {
        "id": movie_id,
        "key": key,
        "source": raw.get("source", "tmdb"),
        "wikidata": raw.get("wikidata", ""),
        "titles": {"zh": title_zh, "en": title_en},
        "zh": title_zh,
        "en": title_en,
        "year": year,
        "runtime": runtime,
        "countries": countries,
        "primary_country": primary,
        "country": country_display,
        "coproduction": len(countries) > 1,
        "languages": languages,
        "directors": directors,
        "director": " / ".join(names),
        "genres": genres,
        "genreLabel": genre_label,
        "silent": False,
        "color": "color",
        "aspect": "",
        "sound": "",
        "scores": {},
        "poster": f"media/movies/{movie_id}/poster.webp",
        "poster_src": poster_src,
        "stills": stills,
        "stills_src": stills_src,
        "quote": {"text": quote[0], "zh": quote[1], "source": "", "kind": "line"} if quote[0] else None,
        "dominant": "",
        "film": FALLBACK_COLOR,
        "credits_note": "",
        "lists": sorted(memberships.get(movie_id, []), key=lambda x: x["list_id"]),
        "missing": sorted(set(missing)),
    }



def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--curated", type=Path, default=FILMS_ROOT / "data" / "curated")
    parser.add_argument("--data-root", type=Path, default=FILMS_ROOT / "data")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    mapping = genre_map(args.curated)
    memberships = load_memberships(args.curated)
    meta = load_movie_meta(args.curated)
    raw_dirs = [
        args.data_root / "raw" / "tmdb",
        args.data_root / "raw" / "wikidata",
        args.data_root / "raw" / "manual",
    ]
    paths = []
    for raw_dir in raw_dirs:
        if raw_dir.exists():
            paths.extend(sorted(raw_dir.glob("*.json")))
    if not paths:
        print(f"缺原始数据：{raw_dirs[0]} 或 {raw_dirs[1]}")
        return 2

    movies = []
    for path in paths:
        raw = json.loads(path.read_text(encoding="utf-8"))
        key = raw.get("key")
        if not key:
            key = movie_key_for(path.stem) if path.parent.name == "tmdb" else f"imdb:{path.stem}"
        movies.append(merge_one(raw, key, args.curated, mapping, memberships, meta))

    movies.sort(key=lambda m: m["id"])
    if not args.dry_run:
        write_jsonl(args.data_root / "movies" / "movies.jsonl", movies)
    missing = sum(len(m["missing"]) for m in movies)
    print(f"合并 {len(movies)} 部；缺字段 {missing} 项")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
