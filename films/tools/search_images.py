#!/usr/bin/env python3
"""搜图片并可选下载。

示例：
  python films/tools/search_images.py --query "洛城机密 剧照" --orientation landscape --limit 5
  python films/tools/search_images.py --query "科幻 场景 插画" --orientation landscape \
      --download-to films/data/media/movies/m119488 --prefix still --limit 3

只做搜索时输出 JSON；加 --download-to 才写文件，文件名是 <prefix>-01.webp。
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))

from fetch_images_sogou import image_urls, load  # noqa: E402
from image_io import save_webp  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Sogou image search with optional download")
    parser.add_argument("--query", required=True, help="搜索词，如 '片名 海报'")
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--orientation", choices=["any", "portrait", "landscape"], default="any")
    parser.add_argument("--min-width", type=int, default=300)
    parser.add_argument("--download-to", type=Path, help="下载目录；不传只输出 URL")
    parser.add_argument("--prefix", default="image")
    parser.add_argument("--max-size", type=int, default=1200)
    args = parser.parse_args()
    args.download_to and args.download_to.mkdir(parents=True, exist_ok=True)

    rows = []
    for url in image_urls(args.query)[: args.limit * 4]:
        try:
            image = load(url)
        except Exception:
            continue
        if image.width < args.min_width:
            continue
        if args.orientation == "portrait" and image.height <= image.width:
            continue
        if args.orientation == "landscape" and image.width <= image.height:
            continue
        rows.append({"url": url, "width": image.width, "height": image.height})
        if args.download_to:
            name = f"{args.prefix}-{len(rows):02d}.webp"
            save_webp(image, args.download_to / name, max_size=args.max_size)
            rows[-1]["path"] = str((args.download_to / name).as_posix())
        if len(rows) >= args.limit:
            break

    print(json.dumps(rows, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
