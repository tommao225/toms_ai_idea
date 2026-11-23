#!/usr/bin/env python3
"""查一部电影的 Wikiquote 台词，可选翻译。

示例：
  python films/tools/search_quotes.py --title "L.A. Confidential"
  python films/tools/search_quotes.py --title "Casablanca" --translate
  python films/tools/search_quotes.py --page "The Godfather" --translate

输出 JSON：page、url、original、zh；--translate 失败时 zh 为空。
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))

from fetch_quotes_wikiquote import load_pages, pick_quote, search_page, translate  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Find one film quote on Wikiquote")
    parser.add_argument("--title", help="电影英文名，如 L.A. Confidential")
    parser.add_argument("--page", help="直接指定 Wikiquote 页面名")
    parser.add_argument("--translate", action="store_true", help="调用翻译接口生成中文")
    args = parser.parse_args()
    if not args.title and not args.page:
        parser.error("--title 或 --page 必填")

    page = None
    if args.page:
        pages = load_pages([args.page])
        page = pages.get(args.page)
    elif args.title:
        page = load_pages([args.title]).get(args.title) or search_page(args.title)
    if not page:
        print(json.dumps({"error": "page not found"}, ensure_ascii=False))
        return 1

    title = args.title or page.get("title", "")
    wikitext = page.get("revisions", [{}])[0].get("slots", {}).get("main", {}).get("*", "")
    original = pick_quote(wikitext, title, page.get("title", ""))
    if not original:
        print(json.dumps({"page": page.get("title", ""), "error": "no quote"}, ensure_ascii=False))
        return 1
    result = {
        "page": page.get("title", ""),
        "url": "https://en.wikiquote.org/wiki/" + urllib.parse.quote(page.get("title", "").replace(" ", "_")),
        "original": original,
        "zh": translate(original) if args.translate else "",
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
