#!/usr/bin/env python3
"""把 40 部海报拼成一张检查图，方便人工看有没有匹配错。"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
import sys  # noqa: E402
sys.path.insert(0, str(ROOT / "pipeline"))
from common import FILMS_ROOT, read_jsonl  # noqa: E402

OUT = FILMS_ROOT / "tests" / "out" / "posters-contact.jpg"


def main() -> int:
    movies = read_jsonl(FILMS_ROOT / "data" / "movies" / "movies.jsonl")
    font = ImageFont.truetype(r"C:\Windows\Fonts\NotoSerifSC-VF.ttf", 18)
    cols, rows = 5, 8
    cw, ch = 200, 240
    sheet = Image.new("RGB", (cols * cw, rows * ch), "#0B0B0C")
    draw = ImageDraw.Draw(sheet)
    for i, movie in enumerate(movies):
        x = (i % cols) * cw
        y = (i // cols) * ch
        path = FILMS_ROOT / "data" / "media" / "movies" / movie["id"] / "poster.webp"
        try:
            image = Image.open(path).convert("RGB")
            image.thumbnail((160, 200))
            sheet.paste(image, (x + 20, y + 10))
        except Exception:
            pass
        draw.text((x + 10, y + 212), movie["zh"][:10], font=font, fill="#E8E4DA")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT, "JPEG", quality=88)
    print(OUT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
