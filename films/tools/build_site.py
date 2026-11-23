#!/usr/bin/env python3
"""构建整站数据。

示例：
  python films/tools/build_site.py
  python films/tools/build_site.py --data-root films/tests/pipeline/out/data \
      --web-root films/tests/pipeline/out/web --curated films/tests/pipeline/fixture/curated
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "pipeline" / "build.py"


def main() -> int:
    parser = argparse.ArgumentParser(description="Build films site data")
    parser.add_argument("--data-root", type=Path, default=ROOT / "data")
    parser.add_argument("--web-root", type=Path, default=ROOT / "web")
    parser.add_argument("--curated", type=Path, default=ROOT / "data" / "curated")
    args = parser.parse_args()
    command = [
        sys.executable, str(SCRIPT),
        "--data-root", str(args.data_root),
        "--web-root", str(args.web_root),
        "--curated", str(args.curated),
    ]
    return subprocess.call(command)


if __name__ == "__main__":
    raise SystemExit(main())
