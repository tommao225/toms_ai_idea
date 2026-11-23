#!/usr/bin/env python3
"""逐片从英文 Wikiquote 取一条台词，翻译成中文并记录来源。

用法：python films/pipeline/fetch_quotes_wikiquote.py --limit 20
不覆盖已有 quote.md；没有可靠条目的电影保持原样。
"""
from __future__ import annotations

import argparse
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UA = "Mozilla/5.0 (compatible; films-quote/1.0; +https://en.wikiquote.org)"
API = "https://en.wikiquote.org/w/api.php"


def api(params: dict):
    query = urllib.parse.urlencode({**params, "format": "json"})
    req = urllib.request.Request(f"{API}?{query}", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.loads(response.read())


def strip_wiki(value: str) -> str:
    value = re.sub(r"<ref[^>]*>.*?</ref>", "", value, flags=re.S)
    value = re.sub(r"\[\[File:[^\]]+\]\]", "", value, flags=re.I)
    value = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]+)\]\]", r"\1", value)
    value = re.sub(r"\{\{[^{}]*\}\}", "", value)
    value = re.sub(r"''+", "", value)
    value = re.sub(r"<[^>]+>", "", value)
    value = re.sub(r"^[*#:;]+\s*", "", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip(" \t\"'“”")


def pick_quote(wikitext: str, title: str, page_title: str):
    # 人物页/演员页不能当作电影台词页。
    page = page_title.lower()
    movie = title.lower()
    if page != movie and not page.startswith(movie + " ("):
        return None
    # 截掉页面头部的图片说明和元信息，从第一个人物/章节开始找。
    start = 0
    for marker in ("== ", "==Quotes==", "== Quotes =="):
        pos = wikitext.find(marker)
        if pos >= 0:
            start = pos
            break
    body = wikitext[start:]
    bad = (
        "opening line", "last word", "directed by", "written by", "starring",
        "produced by", "cinematography", "music by", "distributed by",
        "running time", "box office", "budget", "based on", "category:",
        "wikipedia", "external links", "see also",
    )
    candidates = []
    for line in body.splitlines():
        if not line.startswith("*") or line.startswith("*#"):
            continue
        text = strip_wiki(line)
        if 8 <= len(text) <= 160 and re.search(r"[A-Za-z]", text) and title.lower() not in text.lower():
            if any(x in text.lower() for x in bad):
                continue
            if re.search(r"\(\d{4}\)$", text):
                continue
            if re.match(r"^[A-Z][\w'’.-]+ [A-Z][\w'’.-]+ [–-] ", text):
                continue
            if re.match(r"^[A-Z][a-z]+(?: [A-Z][a-z]+)+$", text):
                continue
            candidates.append(text)
    return candidates[0] if candidates else None


def translate(text: str) -> str:
    params = urllib.parse.urlencode({"q": text[:450], "langpair": "en|zh-CN"})
    req = urllib.request.Request(
        "https://api.mymemory.translated.net/get?" + params,
        headers={"User-Agent": UA},
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            data = json.loads(response.read())
    except Exception:
        return ""
    value = (data.get("responseData") or {}).get("translatedText") or ""
    if not value or "MYMEMORY WARNING" in value:
        return ""
    return value.strip()


def load_pages(titles: list[str]):
    mapping = {}
    for start in range(0, len(titles), 20):
        chunk = titles[start:start + 20]
        data = api({
            "action": "query",
            "prop": "revisions",
            "rvprop": "content",
            "rvslots": "main",
            "redirects": "1",
            "titles": "|".join(chunk),
        })
        pages = data.get("query", {}).get("pages", {})
        redirects = {x["from"]: x["to"] for x in data.get("query", {}).get("redirects", [])}
        normalized = {x["from"]: x["to"] for x in data.get("query", {}).get("normalized", [])}
        by_title = {page.get("title"): page for page in pages.values()}
        for title in chunk:
            key = normalized.get(title, title)
            key = redirects.get(key, key)
            page = by_title.get(key)
            if page and not page.get("missing"):
                mapping[title] = page
        time.sleep(0.4)
    return mapping


def search_page(title: str):
    data = api({
        "action": "query",
        "list": "search",
        "srsearch": title,
        "srnamespace": "0",
        "srlimit": "5",
    })
    for hit in data.get("query", {}).get("search", []):
        page_title = hit.get("title", "")
        low = page_title.lower()
        if low == title.lower() or low.startswith(title.lower() + " ("):
            page = api({"action": "query", "prop": "revisions", "rvprop": "content",
                        "rvslots": "main", "redirects": "1", "titles": page_title})
            for item in page.get("query", {}).get("pages", {}).values():
                if not item.get("missing"):
                    return item
    return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--source-root", type=Path, default=ROOT / "data")
    args = parser.parse_args()

    movies = [json.loads(line) for line in (args.source_root / "movies/movies.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]
    missing = [m for m in movies if not m.get("quote")]
    if args.limit:
        missing = missing[:args.limit]
    pages = load_pages([m["en"] for m in missing])
    made = 0
    for movie in missing:
        page = pages.get(movie["en"])
        if not page:
            page = search_page(movie["en"])
            time.sleep(0.3)
        if not page:
            continue
        wikitext = page.get("revisions", [{}])[0].get("slots", {}).get("main", {}).get("*", "")
        original = pick_quote(wikitext, movie["en"], page.get("title", ""))
        if not original:
            continue
        chinese = translate(original)
        path = args.source_root / "curated/movies" / movie["id"] / "quote.md"
        if path.exists():
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text((chinese or original) + "\n", encoding="utf-8")
        meta = {
            "source": "wikiquote",
            "page": page.get("title", ""),
            "url": "https://en.wikiquote.org/wiki/" + urllib.parse.quote(page.get("title", "").replace(" ", "_")),
            "original": original,
            "translated": bool(chinese),
        }
        (path.parent / "quote.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        made += 1
        print(f"  {movie['id']} {movie['zh']}")
        time.sleep(0.7)
    print(f"写入 {made} 条")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
