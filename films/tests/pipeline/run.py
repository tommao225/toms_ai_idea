#!/usr/bin/env python3
"""跑一遍管线 fixture，并检查生成结果。用当前 Python 解释器执行，跨平台。"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

FILMS = Path(__file__).resolve().parents[2]
OUT = FILMS / "tests" / "pipeline" / "out"
FIXTURE = FILMS / "tests" / "pipeline" / "fixture"
PY = sys.executable


def run(*args: str) -> None:
    result = subprocess.run([PY, *args], text=True, capture_output=True)
    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr)
        raise SystemExit(f"失败：{' '.join(args)}")
    print(result.stdout.strip().splitlines()[-1] if result.stdout.strip() else "ok")


def main() -> int:
    shutil.rmtree(OUT, ignore_errors=True)
    curated = FIXTURE / "curated"
    data = OUT / "data"
    web = OUT / "web"
    raw = data / "raw" / "tmdb"
    raw.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(FIXTURE / "raw" / "tmdb", raw)
    run(str(FILMS / "pipeline" / "merge.py"), "--curated", str(curated), "--data-root", str(data))
    run(str(FILMS / "pipeline" / "build.py"), "--curated", str(curated),
        "--data-root", str(data), "--web-root", str(web))
    run(str(FILMS / "pipeline" / "check_content.py"), "--curated", str(curated),
        "--data-root", str(data), "--min-count", "0")
    run(str(FILMS / "pipeline" / "make_page.py"), "--web-root", str(web))

    site = json.loads((web / "data" / "site.json").read_text(encoding="utf-8"))
    assert len(site["films"]) == 3, "电影数不对"
    assert len(site["lists"]) == 1, "榜单数不对"
    entries = site["lists"]["test-list"]["entries"]
    assert [e["rank"] for e in entries] == [1, 2, 3], "名次不连续"
    assert (web / "index.html").exists(), "测试页没生成"
    print("管线 fixture 通过：3 部电影，1 个榜单")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
