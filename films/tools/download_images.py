#!/usr/bin/env python3
"""按 URL 下载图片并统一转 webp。

示例：
  python films/tools/download_images.py --url "https://example.com/a.jpg" \
      --out films/data/media/movies/m119488 --prefix still
  python films/tools/download_images.py --urls-file urls.txt \
      --out films/web/assets/img/genres --prefix action --max-size 1400

每个 URL 一行，输出 <prefix>-01.webp、<prefix>-02.webp……
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))

from image_io import download_image  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Download images and convert to webp")
    parser.add_argument("--url", action="append", default=[], help="图片 URL，可重复")
    parser.add_argument("--urls-file", type=Path, help="每行一个 URL")
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--prefix", default="image")
    parser.add_argument("--max-size", type=int, default=1200)
    parser.add_argument("--referer", default="")
    args = parser.parse_args()
    urls = list(args.url)
    if args.urls_file:
        urls += [line.strip() for line in args.urls_file.read_text(encoding="utf-8").splitlines() if line.strip()]
    if not urls:
        parser.error("至少给一个 --url 或 --urls-file")
    args.out.mkdir(parents=True, exist_ok=True)

    rows = []
    for index, url in enumerate(urls, 1):
        dest = args.out / f"{args.prefix}-{index:02d}.webp"
        try:
            download_image(url, dest, max_size=args.max_size, referer=args.referer)
        except Exception as exc:
            rows.append({"url": url, "error": str(exc)})
            continue
        rows.append({"url": url, "path": str(dest.as_posix())})
    print(json.dumps(rows, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
