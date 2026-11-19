#!/usr/bin/env python3
"""把电影、榜单、颜色合成站点数据。"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from common import (
    FILMS_ROOT,
    load_lists,
    parse_key,
    read_jsonl,
    write_json,
    write_jsonl,
)
from taxonomy import FALLBACK_COLOR, label_for, order_for


def build_lists(curated: Path, by_key: dict[str, dict]):
    lists: dict[str, dict] = {}
    memberships: dict[str, list[dict]] = {}
    problems: list[str] = []
    for item in load_lists(curated):
        if item.get("decision") == "pending":
            problems.append(f"{item['id']} 口径未定（decision=pending），禁止上线")
            continue
        entries = []
        for row in item["_entries"]:
            source, value = parse_key(row["movie_key"])
            movie = by_key.get(f"{source}:{value}")
            if not movie:
                problems.append(f"{item['id']} 的 {row['movie_key']} 不在电影主档")
                continue
            rank = int(row.get("rank") or 0)
            entries.append({
                "rank": rank,
                "movie_id": movie["id"],
                "note": row.get("note", ""),
                "why_included": row.get("why_included", ""),
            })
            memberships.setdefault(movie["id"], []).append({"list_id": item["id"], "rank": rank})
        entries.sort(key=lambda e: e["rank"])
        if [e["rank"] for e in entries] != list(range(1, len(entries) + 1)):
            problems.append(f"{item['id']} 的名次不连续")
        genre_key = next((g for g in item.get("genres") or [] if g), "other")
        lists[item["id"]] = {
            "id": item["id"],
            "title": item["title"],
            "genre": label_for(genre_key),
            "order": order_for(genre_key),
            "criterion": item.get("criterion", ""),
            "decision": item.get("decision", ""),
            "status": item.get("status", "draft"),
            "max": int(item.get("max_entries") or 100),
            "count": len(entries),
            "scope": item.get("scope", {}),
            "canon": item.get("canon", {}),
            "chapters": item.get("chapters", []),
            "hero": "",
            "entries": entries,
        }
        print(f"{item['id']}: {len(entries)} 部")
    return lists, memberships, problems


def attach_media(movies: list[dict], data_root: Path, colors: dict, problems: list[str]) -> None:
    for movie in movies:
        movie["dominant"] = colors.get(movie["id"], "")
        movie["film"] = colors.get(movie["id"], FALLBACK_COLOR)
        credits_path = data_root / "media" / "movies" / movie["id"] / "credits.json"
        if credits_path.exists():
            try:
                credits = json.loads(credits_path.read_text(encoding="utf-8"))
                real_stills = [
                    still for still in credits.get("stills", [])
                    if still.get("kind") == "real" and still.get("path")
                ]
                if real_stills:
                    movie["stills"] = real_stills
            except Exception as exc:
                problems.append(f"{movie['id']} 读取 credits 失败：{exc}")
        if not movie.get("stills"):
            still = data_root / "media" / "movies" / movie["id"] / "still-01.webp"
            poster = data_root / "media" / "movies" / movie["id"] / "poster.webp"
            if still.exists() and not poster.exists():
                movie["stills"] = [{
                    "path": f"media/movies/{movie['id']}/still-01.webp",
                    "source": "generated",
                    "credit": "generated",
                    "kind": "placeholder",
                }]


def attach_memberships(movies: list[dict], memberships: dict[str, list[dict]]) -> None:
    for movie in movies:
        movie["lists"] = sorted(memberships.get(movie["id"], []), key=lambda x: x["list_id"])


def make_list_index(lists: dict[str, dict], movie_by_id: dict[str, dict]) -> dict:
    index = {}
    for list_id, data in lists.items():
        first = data["entries"][0]["movie_id"] if data["entries"] else ""
        index[list_id] = {k: v for k, v in data.items() if k != "entries"}
        index[list_id]["color"] = movie_by_id.get(first, {}).get("film", FALLBACK_COLOR)
    return index


def write_list_payloads(web_root: Path, lists: dict[str, dict], movie_by_id: dict[str, dict]) -> None:
    slim_keys = ("id", "zh", "en", "year", "director", "runtime", "country", "film", "poster", "stills", "wm")
    out = web_root / "data" / "lists"
    out.mkdir(parents=True, exist_ok=True)
    for list_id, data in lists.items():
        payload = {
            "list": data,
            "films": {
                e["movie_id"]: {k: movie_by_id[e["movie_id"]].get(k) for k in slim_keys}
                for e in data["entries"] if e["movie_id"] in movie_by_id
            },
        }
        (out / f"{list_id}.js").write_text(
            "window.FILM_LIST_DATA = " + json.dumps(payload, ensure_ascii=False) + ";\n",
            encoding="utf-8",
        )


def write_movie_payloads(web_root: Path, movies: list[dict]) -> None:
    out = web_root / "data" / "movies"
    out.mkdir(parents=True, exist_ok=True)
    for movie in movies:
        (out / f"{movie['id']}.js").write_text(
            "window.FILM_MOVIE_DATA = " + json.dumps(movie, ensure_ascii=False) + ";\n",
            encoding="utf-8",
        )


def search_index(movies: list[dict]) -> list[dict]:
    rows = []
    for movie in movies:
        first_list = (movie.get("lists") or [{}])[0]
        rows.append({
            "id": movie["id"],
            "zh": movie.get("zh", ""),
            "en": movie.get("en", ""),
            "year": movie.get("year"),
            "director": movie.get("director", ""),
            "genre": movie.get("genreLabel", ""),
            "poster": movie.get("poster", ""),
            "list": first_list.get("list_id", ""),
        })
    return rows


def write_site(web_root: Path, list_index: dict, search: list[dict]) -> None:
    data_dir = web_root / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "site.js").write_text(
        "window.FILMS_DATA = " + json.dumps(
            {"films": {}, "lists": list_index, "search": search}, ensure_ascii=False,
        ) + ";\n",
        encoding="utf-8",
    )


def write_data(data_root: Path, movies: list[dict], lists: dict[str, dict]) -> None:
    for list_id, data in lists.items():
        write_json(data_root / "lists" / f"{list_id}.json", data)
    write_jsonl(data_root / "movies" / "movies.jsonl", movies)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--curated", type=Path, default=FILMS_ROOT / "data" / "curated")
    parser.add_argument("--data-root", type=Path, default=FILMS_ROOT / "data")
    parser.add_argument("--web-root", type=Path, default=FILMS_ROOT / "web")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    movies = read_jsonl(args.data_root / "movies" / "movies.jsonl")
    by_key = {m["key"]: m for m in movies}
    colors_path = args.data_root / "media" / "colors.json"
    colors = json.loads(colors_path.read_text(encoding="utf-8")) if colors_path.exists() else {}

    lists, memberships, problems = build_lists(args.curated, by_key)
    for list_id, data in lists.items():
        hero = args.data_root / "media" / "lists" / list_id / "hero.webp"
        data["hero"] = f"media/lists/{list_id}/hero.webp" if hero.exists() else ""
    attach_media(movies, args.data_root, colors, problems)
    attach_memberships(movies, memberships)

    if problems:
        print("问题：")
        for problem in problems:
            print("  " + problem)
        return 1
    if not movies or not lists:
        print("没有可构建的电影或榜单；不写 site.js，避免覆盖现有数据。")
        return 1

    if not args.dry_run:
        movie_by_id = {m["id"]: m for m in movies}
        list_index = make_list_index(lists, movie_by_id)
        write_list_payloads(args.web_root, lists, movie_by_id)
        write_movie_payloads(args.web_root, movies)
        write_data(args.data_root, movies, lists)
        write_site(args.web_root, list_index, search_index(movies))
        write_json(args.web_root / "data" / "site.json", {"films": movie_by_id, "lists": lists})

    print(f"完成：{len(movies)} 部电影，{len(lists)} 个榜单")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
