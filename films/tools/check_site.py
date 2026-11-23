#!/usr/bin/env python3
"""内容体检。

示例：
  python films/tools/check_site.py
  python films/tools/check_site.py --strict --min-count 30
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "pipeline" / "check_content.py"


def main() -> int:
    parser = argparse.ArgumentParser(description="Check films content")
    parser.add_argument("--curated", type=Path, default=ROOT / "data" / "curated")
    parser.add_argument("--data-root", type=Path, default=ROOT / "data")
    parser.add_argument("--min-count", type=int, default=30)
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args()
    command = [
        sys.executable, str(SCRIPT),
        "--curated", str(args.curated),
        "--data-root", str(args.data_root),
        "--min-count", str(args.min_count),
    ]
    if args.strict:
        command.append("--strict")
    return subprocess.call(command)


if __name__ == "__main__":
    raise SystemExit(main())
