"""图片下载、解码、转 webp 的唯一实现。"""
from __future__ import annotations

import urllib.request
from pathlib import Path

from PIL import Image

UA = "Mozilla/5.0 (compatible; films-index/0.1)"


def fetch_bytes(url: str, referer: str = "", user_agent: str = UA) -> bytes:
    headers = {"User-Agent": user_agent}
    if referer:
        headers["Referer"] = referer
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as res:
        return res.read()


def load_image(url: str, referer: str = "", user_agent: str = UA) -> Image.Image:
    from io import BytesIO

    return Image.open(BytesIO(fetch_bytes(url, referer, user_agent))).convert("RGB")


def save_webp(image: Image.Image, dest: Path, max_size: int = 1200) -> str:
    image.thumbnail((max_size, max_size))
    dest.parent.mkdir(parents=True, exist_ok=True)
    image.save(dest, "WEBP", quality=84, method=6)
    return "#{:02x}{:02x}{:02x}".format(*image.resize((1, 1)).getpixel((0, 0)))


def download_image(url: str, dest: Path, max_size: int = 1200, referer: str = "", user_agent: str = UA) -> str:
    return save_webp(load_image(url, referer, user_agent), dest, max_size)
