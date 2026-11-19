"""站点类型：唯一手写的标签、顺序和中文提示表。"""
from __future__ import annotations

GENRE_LABELS = {
    "mystery": "悬疑",
    "scifi": "科幻",
    "action": "动作",
    "drama": "剧情",
    "comedy": "喜剧",
    "romance": "爱情",
    "crime": "犯罪",
    "animation": "动画",
    "horror": "恐怖",
    "other": "其他",
}

GENRE_ORDER = {
    "mystery": 0,
    "scifi": 1,
    "action": 2,
    "drama": 3,
    "comedy": 4,
    "romance": 5,
    "crime": 6,
    "animation": 7,
    "horror": 8,
    "other": 99,
}

FALLBACK_COLOR = "#3A4653"

GENRE_HINTS = [
    ("悬疑", "mystery"), ("懸疑", "mystery"),
    ("惊悚", "mystery"), ("驚悚", "mystery"),
    ("推理", "mystery"), ("神秘", "mystery"), ("黑色", "mystery"),
    ("科幻", "scifi"),
    ("动作", "action"), ("動作", "action"),
    ("冒险", "action"), ("冒險", "action"),
    ("战争", "action"), ("戰爭", "action"), ("西部", "action"),
    ("剧情", "drama"), ("劇情", "drama"), ("传记", "drama"), ("傳記", "drama"),
    ("喜剧", "comedy"), ("喜劇", "comedy"),
    ("爱情", "romance"), ("愛情", "romance"),
    ("犯罪", "crime"),
    ("动画", "animation"), ("動畫", "animation"),
    ("恐怖", "horror"), ("惊悚片", "horror"), ("驚悚片", "horror"),
]


def label_for(genre: str) -> str:
    return GENRE_LABELS.get(genre, GENRE_LABELS["other"])


def order_for(genre: str) -> int:
    return GENRE_ORDER.get(genre, GENRE_ORDER["other"])


def genres_for_labels(labels: list[str]) -> list[str]:
    out: list[str] = []
    for label in labels:
        for needle, genre in GENRE_HINTS:
            if needle in label and genre not in out:
                out.append(genre)
    return out or ["other"]
