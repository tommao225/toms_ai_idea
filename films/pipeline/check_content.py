#!/usr/bin/env python3
"""内容体检：榜单条目是否有手记、入选理由、台词，名次和电影是否对得上。"""
from __future__ import annotations

import argparse
from pathlib import Path

from common import FILMS_ROOT, load_lists, movie_id_for, parse_key, read_jsonl


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--curated", type=Path, default=FILMS_ROOT / "data" / "curated")
    parser.add_argument("--data-root", type=Path, default=FILMS_ROOT / "data")
    parser.add_argument("--min-count", type=int, default=60)
    parser.add_argument("--strict", action="store_true", help="警告也算失败")
    args = parser.parse_args()

    movies = read_jsonl(args.data_root / "movies" / "movies.jsonl")
    by_key = {m["key"]: m for m in movies}
    errors: list[str] = []
    warnings: list[str] = []

    for item in load_lists(args.curated):
        list_id = item.get("id", "?")
        entries = item["_entries"]
        if not entries:
            warnings.append(f"{list_id}：空榜")
            continue
        if item.get("decision") == "pending":
            errors.append(f"{list_id}：口径未定（decision=pending）")
        if item.get("status") != "final":
            warnings.append(f"{list_id}：状态是 {item.get('status', '?')}，还不能上线")
        canon = item.get("canon") or {}
        if not canon.get("sources"):
            errors.append(f"{list_id}：没有来源")
        if not canon.get("curator"):
            warnings.append(f"{list_id}：没有策展人")
        if not canon.get("version"):
            warnings.append(f"{list_id}：没有口径版本")

        if len(entries) < args.min_count:
            warnings.append(f"{list_id}：只有 {len(entries)} 部，少于 {args.min_count}")
        if len(entries) > int(item.get("max_entries") or 100):
            errors.append(f"{list_id}：超过上限")
        seeds: set[str] = set()
        ranks: set[int] = set()
        for row in entries:
            key = row.get("movie_key", "")
            source, value = parse_key(key)
            movie = by_key.get(key)
            if source not in ("tmdb", "imdb"):
                errors.append(f"{list_id}：{key} 不是 tmdb/imdb key")
            if not movie:
                errors.append(f"{list_id}：{key} 不在电影主档")
                continue
            if key in seeds:
                errors.append(f"{list_id}：{key} 重复")
            seeds.add(key)
            rank = int(row.get("rank") or 0)
            if rank in ranks:
                errors.append(f"{list_id}：名次 {rank} 重复")
            ranks.add(rank)
            if not row.get("note", "").strip():
                warnings.append(f"{list_id} / {key}：没有手记")
            if not row.get("why_included", "").strip():
                warnings.append(f"{list_id} / {key}：没有入选理由")
            quote = args.curated / "movies" / movie_id_for(value) / "quote.md"
            if not quote.exists() and not movie.get("quote"):
                warnings.append(f"{list_id} / {key}：没有台词或摘句")

    print(f"错误 {len(errors)} 条，警告 {len(warnings)} 条")
    for line in errors:
        print("  错误：" + line)
    for line in warnings:
        print("  警告：" + line)
    if errors or (args.strict and warnings):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
