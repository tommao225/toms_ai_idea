#!/usr/bin/env python3
"""给没有真实图片的电影生成占位海报和剧照，不联网。"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from common import FILMS_ROOT, read_jsonl, write_json

FONT = Path(r"C:\Windows\Fonts\NotoSerifSC-VF.ttf")
PALETTE = ["#3A4653", "#6B4A32", "#4A5A4E", "#5A4A6B", "#8A5A32", "#2F3E4E", "#5C3A3A", "#3E4A3A"]


def font(size: int) -> ImageFont.FreeTypeFont:
    if FONT.exists():
        return ImageFont.truetype(str(FONT), size=size)
    return ImageFont.load_default()


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines = []
    current = ""
    for ch in text:
        test = current + ch
        if draw.textlength(test, font=fnt) > width and current:
            lines.append(current)
            current = ch
        else:
            current = test
    if current:
        lines.append(current)
    return lines


def palette_for(movie: dict) -> str:
    digest = hashlib.sha1(movie["id"].encode()).hexdigest()
    return PALETTE[int(digest[:2], 16) % len(PALETTE)]


def gradient(size: tuple[int, int], color: str) -> Image.Image:
    width, height = size
    base = tuple(int(color[i:i + 2], 16) for i in (1, 3, 5))
    image = Image.new("RGB", size, "#0B0B0C")
    draw = ImageDraw.Draw(image)
    for y in range(height):
        t = y / max(1, height - 1)
        shade = tuple(max(6, int(c * (0.34 + t * 0.26))) for c in base)
        draw.line([(0, y), (width, y)], fill=shade)
    return image


def poster(movie: dict, path: Path, color: str) -> None:
    image = gradient((800, 1200), color)
    draw = ImageDraw.Draw(image)
    draw.rectangle([36, 36, 764, 1164], outline="#5A5044", width=2)
    draw.rectangle([64, 150, 300, 158], fill=color)
    draw.text((64, 176), "THE REEL · PLACEHOLDER", font=font(18), fill="#B8B0A2")
    zh = wrap(draw, movie["zh"], font(64), 650)
    y = 340
    for line in zh:
        draw.text((64, y), line, font=font(64), fill="#F0ECE2")
        y += 86
    draw.text((64, 700), movie["en"], font=font(30), fill="#CFC7B8")
    draw.text((64, 748), str(movie["year"]), font=font(24), fill=color)
    draw.text((64, 1080), "占位图 / 无授权主视觉", font=font(20), fill="#8A8276")
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "WEBP", quality=84, method=6)


def still(movie: dict, path: Path, color: str) -> None:
    image = gradient((1280, 720), color)
    draw = ImageDraw.Draw(image)
    draw.rectangle([32, 32, 1248, 688], outline="#5A5044", width=2)
    draw.text((880, 70), str(movie["year"]), font=font(180), fill=color)
    lines = wrap(draw, movie["en"], font(64), 760)
    y = 250
    for line in lines[:2]:
        draw.text((64, y), line, font=font(64), fill="#F0ECE2")
        y += 82
    draw.text((64, y + 12), movie["zh"], font=font(40), fill="#CFC7B8")
    draw.line([(64, y + 92), (460, y + 92)], fill=color, width=3)
    draw.text((64, 610), "STILL PLACEHOLDER · 占位图", font=font(20), fill="#8A8276")
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "WEBP", quality=82, method=6)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", type=Path, default=FILMS_ROOT / "data")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    movies = read_jsonl(args.data_root / "movies" / "movies.jsonl")
    colors_path = args.data_root / "media" / "colors.json"
    colors = json.loads(colors_path.read_text(encoding="utf-8")) if colors_path.exists() else {}
    made = 0
    for movie in movies:
        out = args.data_root / "media" / "movies" / movie["id"]
        poster_path = out / "poster.webp"
        if poster_path.exists() and not args.force:
            colors.setdefault(movie["id"], palette_for(movie))
            continue
        color = palette_for(movie)
        poster(movie, poster_path, color)
        still(movie, out / "still-01.webp", color)
        write_json(out / "credits.json", {
            "poster": {"source": "generated", "kind": "placeholder", "license": "generated"},
            "stills": [{"source": "generated", "kind": "placeholder", "license": "generated"}],
        })
        colors[movie["id"]] = color
        made += 1
        print(f"  {movie['id']} {movie['zh']}")

    write_json(colors_path, colors)
    print(f"生成 {made} 部占位图")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
