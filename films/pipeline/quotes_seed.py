#!/usr/bin/env python3
"""补一批能确认的短摘句；没有可靠来源的不硬编。"""
from __future__ import annotations

import argparse
from pathlib import Path

from common import FILMS_ROOT, read_jsonl

QUOTES = {
    "tt0052357": "你相信我爱你吗？",
    "tt0054215": "我们每个人都会有点疯。",
    "tt0114369": "盒子里是什么？",
    "tt0102926": "我吃了他的肝，配蚕豆和基安蒂酒。",
    "tt0209144": "我必须相信，在我的意识之外还有一个世界。",
    "tt0482571": "你在仔细看吗？",
    "tt0047396": "我们都成了偷窥者。",
    "tt2267998": "我们太可爱了，我想给我们一拳。",
    "tt1130884": "是像怪物一样活着，还是像好人一样死去？",
    "tt0364569": "即使我不比禽兽好，难道我没有活下去的权利吗？",
    "tt0114814": "魔鬼最伟大的把戏，是让世界相信他不存在。",
    "tt0062622": "对不起，戴夫，恐怕我不能这么做。",
    "tt0083658": "所有这些时刻，终将消失在时间里，就像雨中的泪水。",
    "tt0078748": "在太空，没人能听见你的尖叫。",
    "tt0133093": "勺子不存在。",
    "tt0816692": "不要温和地走进那个良夜。",
    "tt1392190": "多么美好的一天！",
    "tt0095016": "现在我有机关枪了，呵呵呵。",
    "tt0082971": "蛇。为什么非得是蛇？",
    "tt0103064": "后会有期，宝贝。",
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", type=Path, default=FILMS_ROOT / "data")
    args = parser.parse_args()
    movies = read_jsonl(args.data_root / "movies" / "movies.jsonl")
    by_key = {m["key"].split(":", 1)[1]: m for m in movies}
    made = 0
    for key, quote in QUOTES.items():
        movie = by_key.get(key)
        if not movie:
            continue
        path = args.data_root / "curated" / "movies" / movie["id"] / "quote.md"
        if path.exists():
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(quote + "\n", encoding="utf-8")
        made += 1
        print(f"  {movie['id']} {movie['zh']}")
    print(f"写入 {made} 条摘句")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
