"""管线共用：路径、TOML/CSV/JSONL 读写、榜单和条目的加载。"""
from __future__ import annotations

import csv
import json
import tomllib
from pathlib import Path

FILMS_ROOT = Path(__file__).resolve().parent.parent


def read_toml(path: Path) -> dict:
    with path.open("rb") as fh:
        return tomllib.load(fh)


def load_lists(curated_root: Path) -> list[dict]:
    lists = []
    for path in sorted((curated_root / "lists").glob("*/list.toml")):
        data = read_toml(path)
        data["_dir"] = path.parent
        data["_entries"] = read_entries(path.parent / "entries.csv")
        lists.append(data)
    return lists


def read_entries(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as fh:
        return [row for row in csv.DictReader(fh) if row.get("movie_key")]


def parse_key(key: str) -> tuple[str, str]:
    source, _, value = key.partition(":")
    return source, value


def movie_id_for(value: str) -> str:
    digits = "".join(ch for ch in str(value) if ch.isdigit())
    if not digits:
        raise ValueError(f"无法从 {value!r} 生成电影编号")
    return f"m{int(digits):06d}"


def movie_key_for(tmdb_id: str) -> str:
    return f"tmdb:{tmdb_id}"


def read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8")


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def genre_map(curated_root: Path) -> dict[str, list[str]]:
    path = curated_root / "genre-map.toml"
    return read_toml(path).get("map", {}) if path.exists() else {}
