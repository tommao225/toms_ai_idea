#!/usr/bin/env python3
"""从搜狗图片取分类氛围图；不绑定任何具体电影。"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

from common import FILMS_ROOT
from fetch_images_sogou import image_urls, load
from image_io import save_webp

QUERIES = {
    "mystery": "悬疑 氛围 插画 雨夜 街道 剪影",
    "scifi": "科幻 场景 插画 宇宙 行星 剪影",
    "action": "动作 电影 追车 爆炸 插画 剪影",
    "drama": "戏剧 舞台 追光 剪影 插画",
    "comedy": "喜剧 舞台 聚光灯 插画 剪影",
    "romance": "爱情 雨夜 路灯 情侣 剪影 插画",
    "crime": "犯罪 小巷 警戒线 夜景 插画",
    "animation": "动画 透写台 彩色 插画",
    "horror": "恐怖 老宅 满月 枯树 插画 剪影",
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=FILMS_ROOT / "web" / "assets" / "img" / "genres")
    parser.add_argument("--delay", type=float, default=1.5)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    credits = {}

    for genre, query in QUERIES.items():
        picked = None
        for url in image_urls(query)[:16]:
            try:
                image = load(url)
            except Exception:
                continue
            if image.width >= 600:
                picked = (url, image)
                if image.width > image.height:
                    break
        if not picked:
            print(f"  缺图 {genre}")
            continue
        url, image = picked
        save_webp(image, args.out / f"{genre}.webp", max_size=1400)
        credits[genre] = {"source": "sogou", "query": query, "url": url}
        print(f"  {genre} {image.width}x{image.height}")
        time.sleep(args.delay)

    (args.out / "credits.json").write_text(
        json.dumps(credits, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
    )
    print(f"完成 {len(credits)} 张")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
