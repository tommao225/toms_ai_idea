#!/usr/bin/env python3
"""把正式 index.html 复制成 fixture 站点的测试页，路径指回 films/web 和 out/data。"""
from __future__ import annotations

import argparse
import os
import re
from pathlib import Path

from common import FILMS_ROOT


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--web-root", type=Path, default=FILMS_ROOT / "tests" / "pipeline" / "out" / "web")
    args = parser.parse_args()
    src = FILMS_ROOT / "web" / "index.html"
    dst = args.web_root / "index.html"
    rel = Path(os.path.relpath(FILMS_ROOT / "web", args.web_root)).as_posix()
    html = src.read_text(encoding="utf-8")
    html = re.sub(r"\s*<!-- fallback:start -->.*?<!-- fallback:end -->", "", html, flags=re.S)
    html = html.replace('href="assets/css/', f'href="{rel}/assets/css/')
    html = html.replace('src="assets/js/', f'src="{rel}/assets/js/')
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(html, encoding="utf-8")
    print(f"写入 {dst}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
