#!/usr/bin/env python3
"""把当前片库的海报拼成检查图，方便人工看有没有匹配错。"""
from __future__ import annotations

import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "pipeline"))
from common import FILMS_ROOT, read_jsonl  # noqa: E402

OUT = FILMS_ROOT / "tests" / "out" / "posters-contact.jpg"


def main() -> int:
    movies = read_jsonl(FILMS_ROOT / "data" / "movies" / "movies.jsonl")
    font = ImageFont.truetype(r"C:\Windows\Fonts\NotoSerifSC-VF.ttf", 11)
    cols = 12
    rows = max(1, math.ceil(len(movies) / cols))
    cw, ch = 100, 150
    sheet = Image.new("RGB", (cols * cw, rows * ch), "#0B0B0C")
    draw = ImageDraw.Draw(sheet)
    for i, movie in enumerate(movies):
        x = (i % cols) * cw
        y = (i // cols) * ch
        path = FILMS_ROOT / "data" / "media" / "movies" / movie["id"] / "poster.webp"
        try:
            image = Image.open(path).convert("RGB")
            image.thumbnail((82, 110))
            sheet.paste(image, (x + 9, y + 8))
        except Exception:
            pass
        draw.text((x + 6, y + 124), movie["zh"][:7], font=font, fill="#E8E4DA")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT, "JPEG", quality=86)
    print(f"{OUT} ({len(movies)} 部)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
