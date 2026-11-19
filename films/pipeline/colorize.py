#!/usr/bin/env python3
"""把海报和剧照转成站点用的 webp，并取主色。"""
from __future__ import annotations

import argparse
import json
import tempfile
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps

from common import FILMS_ROOT, read_jsonl, write_json


def load_image(src: str, films_root: Path) -> Image.Image:
    tmp_path = None
    if src.startswith(("http://", "https://")):
        with urllib.request.urlopen(src, timeout=20) as res:
            data = res.read()
        with tempfile.NamedTemporaryFile(suffix=".img", delete=False) as tmp:
            tmp.write(data)
            tmp_path = Path(tmp.name)
        path = tmp_path
    else:
        path = Path(src)
        if not path.is_absolute():
            path = films_root / path
    image = Image.open(path)
    image = ImageOps.exif_transpose(image).convert("RGB")
    if tmp_path:
        tmp_path.unlink(missing_ok=True)
    return image


def dominant(image: Image.Image) -> str:
    pixel = image.resize((1, 1)).getpixel((0, 0))
    return "#{:02x}{:02x}{:02x}".format(*pixel)


def save_webp(image: Image.Image, path: Path, long_edge: int) -> None:
    image.thumbnail((long_edge, long_edge))
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "WEBP", quality=82, method=6)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", type=Path, default=FILMS_ROOT / "data")
    parser.add_argument("--films-root", type=Path, default=FILMS_ROOT)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    movies = read_jsonl(args.data_root / "movies" / "movies.jsonl")
    colors: dict[str, str] = {}
    for movie in movies:
        poster_src = movie.get("poster_src") or ""
        stills_src = movie.get("stills_src") or []
        if not poster_src and not stills_src:
            continue
        if args.dry_run:
            print(f"  {movie['id']} <- {poster_src or '-'} / {len(stills_src)} stills")
            continue
        out_dir = args.data_root / "media" / "movies" / movie["id"]
        credits = {"poster": None, "stills": []}
        try:
            if poster_src:
                image = load_image(poster_src, args.films_root)
                save_webp(image, out_dir / "poster.webp", 400)
                colors[movie["id"]] = dominant(image)
                credits["poster"] = {"source": poster_src, "kind": "real"}
        except Exception as exc:  # noqa: BLE001
            print(f"  海报失败 {movie['id']}: {exc}")
        for i, src in enumerate(stills_src[:2], start=1):
            try:
                image = load_image(src, args.films_root)
                save_webp(image, out_dir / f"still-{i:02d}.webp", 1280)
                credits["stills"].append({"source": src, "kind": "real"})
            except Exception as exc:  # noqa: BLE001
                print(f"  剧照失败 {movie['id']} #{i}: {exc}")
        write_json(out_dir / "credits.json", credits)
        print(f"  {movie['id']} 完成")

    write_json(args.data_root / "media" / "colors.json", colors)
    print(f"处理 {len(movies)} 部，取色 {len(colors)} 部")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
