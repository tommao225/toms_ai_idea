#!/usr/bin/env python3
"""批量补台词：逐片查 Wikiquote，写 quote.md 和来源 quote.json。

示例：
  python films/tools/fetch_quotes.py --limit 20
  python films/tools/fetch_quotes.py --source-root films/data

不覆盖已有 quote.md；没有可靠页面的电影会跳过。
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "pipeline" / "fetch_quotes_wikiquote.py"


def main() -> int:
    parser = argparse.ArgumentParser(description="Batch fill quotes from Wikiquote")
    parser.add_argument("--limit", type=int, default=0, help="0 表示全部")
    parser.add_argument("--source-root", type=Path, default=ROOT / "data")
    args = parser.parse_args()
    command = [sys.executable, str(SCRIPT), "--limit", str(args.limit), "--source-root", str(args.source_root)]
    return subprocess.call(command)


if __name__ == "__main__":
    raise SystemExit(main())
