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

LABELS = {
    "mystery": "悬疑", "scifi": "科幻", "action": "动作",
    "drama": "剧情", "comedy": "喜剧", "romance": "爱情",
    "crime": "犯罪", "animation": "动画", "horror": "恐怖",
    "other": "其他",
}


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

    lists: dict[str, dict] = {}
    memberships: dict[str, list[dict]] = {}
    problems: list[str] = []

    for item in load_lists(args.curated):
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

        genres = item.get("genres") or []
        genre = next((LABELS[g] for g in genres if g in LABELS), "其他")
        hero = args.data_root / "media" / "lists" / item["id"] / "hero.webp"
        lists[item["id"]] = {
            "id": item["id"],
            "title": item["title"],
            "genre": genre,
            "criterion": item.get("criterion", ""),
            "decision": item.get("decision", ""),
            "status": item.get("status", "draft"),
            "max": int(item.get("max_entries") or 100),
            "count": len(entries),
            "scope": item.get("scope", {}),
            "canon": item.get("canon", {}),
            "chapters": item.get("chapters", []),
            "hero": f"media/lists/{item['id']}/hero.webp" if hero.exists() else "",
            "entries": entries,
        }
        print(f"{item['id']}: {len(entries)} 部")

    for movie in movies:
        movie["dominant"] = colors.get(movie["id"], "")
        movie["film"] = colors.get(movie["id"], "#3A4653")
        movie["lists"] = sorted(memberships.get(movie["id"], []), key=lambda x: x["list_id"])
        credits_path = args.data_root / "media" / "movies" / movie["id"] / "credits.json"
        try:
            credits = json.loads(credits_path.read_text(encoding="utf-8"))
            real_stills = [
                still for still in credits.get("stills", [])
                if still.get("kind") == "real" and still.get("path")
            ]
            if real_stills:
                movie["stills"] = real_stills
        except Exception:
            pass
        if not movie.get("stills"):
            still = args.data_root / "media" / "movies" / movie["id"] / "still-01.webp"
            poster = args.data_root / "media" / "movies" / movie["id"] / "poster.webp"
            if still.exists() and not poster.exists():
                movie["stills"] = [{
                    "path": f"media/movies/{movie['id']}/still-01.webp",
                    "source": "generated",
                    "credit": "generated",
                    "kind": "placeholder",
                }]

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
        slim_keys = ("id", "zh", "en", "year", "director", "runtime", "country", "film", "poster", "stills", "wm")
        list_index = {}
        for list_id, data in lists.items():
            first = data["entries"][0]["movie_id"] if data["entries"] else ""
            color = movie_by_id.get(first, {}).get("film", "#3A4653")
            list_index[list_id] = {k: v for k, v in data.items() if k != "entries"}
            list_index[list_id]["color"] = color
            payload = {
                "list": data,
                "films": {
                    e["movie_id"]: {k: movie_by_id[e["movie_id"]].get(k) for k in slim_keys}
                    for e in data["entries"] if e["movie_id"] in movie_by_id
                },
            }
            (args.web_root / "data" / "lists").mkdir(parents=True, exist_ok=True)
            (args.web_root / "data" / "lists" / f"{list_id}.js").write_text(
                "window.FILM_LIST_DATA = " + json.dumps(payload, ensure_ascii=False) + ";\n",
                encoding="utf-8",
            )
        for movie in movies:
            (args.web_root / "data" / "movies").mkdir(parents=True, exist_ok=True)
            (args.web_root / "data" / "movies" / f"{movie['id']}.js").write_text(
                "window.FILM_MOVIE_DATA = " + json.dumps(movie, ensure_ascii=False) + ";\n",
                encoding="utf-8",
            )

        for list_id, data in lists.items():
            write_json(args.data_root / "lists" / f"{list_id}.json", data)
        write_jsonl(args.data_root / "movies" / "movies.jsonl", movies)
        data_dir = args.web_root / "data"
        data_dir.mkdir(parents=True, exist_ok=True)
        search_index = []
        for movie in movies:
            first_list = (movie.get("lists") or [{}])[0]
            search_index.append({
                "id": movie["id"],
                "zh": movie.get("zh", ""),
                "en": movie.get("en", ""),
                "year": movie.get("year"),
                "director": movie.get("director", ""),
                "genre": movie.get("genreLabel", ""),
                "poster": movie.get("poster", ""),
                "list": first_list.get("list_id", ""),
            })
        (data_dir / "site.js").write_text(
            "window.FILMS_DATA = " + json.dumps({"films": {}, "lists": list_index, "search": search_index}, ensure_ascii=False) + ";\n",
            encoding="utf-8",
        )
        write_json(data_dir / "site.json", {"films": {m["id"]: m for m in movies}, "lists": lists})

    print(f"完成：{len(movies)} 部电影，{len(lists)} 个榜单")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
