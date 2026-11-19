#!/usr/bin/env python3
"""把常用汉字从 Noto 可变字体里裁出来，生成站点用的 woff2。

用法：
  python films/pipeline/subset_fonts.py

依赖 fontTools 和 brotli。本机可把它们装到 films/tests/.tools，脚本会自动加进 sys.path：
  python -m pip install --target films/tests/.tools fonttools brotli

源字体默认用 Windows 已安装的 Noto Serif SC / Noto Sans SC（SIL OFL 1.1）；
其他机器用 SERIF_SRC / SANS_SRC 指定。
"""
from __future__ import annotations

import os
import string
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOOLS = ROOT / "tests" / ".tools"
if TOOLS.exists():
    sys.path.insert(0, str(TOOLS))

try:
    from fontTools.subset import Options, Subsetter
    from fontTools.ttLib import TTFont
except ImportError:
    raise SystemExit("缺 fontTools；先按文件开头的命令安装。")

FONTS = ROOT / "web" / "assets" / "fonts"
CHARS = FONTS / "common-chars.txt"

SERIF_SRC = Path(os.environ.get("SERIF_SRC", r"C:\Windows\Fonts\NotoSerifSC-VF.ttf"))
SANS_SRC = Path(os.environ.get("SANS_SRC", r"C:\Windows\Fonts\NotoSansSC-VF.ttf"))


def common_chars() -> str:
    """GB2312 一级常用字（约 3755 个），加上 ASCII 和常用中文标点。"""
    chars: list[str] = []
    for cp in range(0x4E00, 0x9FFF + 1):
        ch = chr(cp)
        try:
            raw = ch.encode("gb2312")
        except UnicodeEncodeError:
            continue
        if len(raw) == 2 and 0xB0 <= raw[0] <= 0xD7:
            chars.append(ch)

    extras = (
        string.ascii_letters + string.digits + string.punctuation + " "
        + "，。、；：？！“”‘’（）《》〈〉【】…—·～「」『』"
        + "©®™°′″×÷±≈≤≥"
    )
    for ch in extras:
        if ch not in chars:
            chars.append(ch)
    return "".join(chars)


def subset(src: Path, dst: Path, text: str) -> None:
    if not src.exists():
        raise SystemExit(f"源字体不存在：{src}")
    font = TTFont(src)
    options = Options()
    options.flavor = "woff2"
    options.desubroutinize = True
    options.drop_tables += ["DSIG"]
    subsetter = Subsetter(options=options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    font.flavor = "woff2"
    font.save(dst)
    print(f"{dst.name}: {dst.stat().st_size / 1024:.0f} KB")


def main() -> None:
    FONTS.mkdir(parents=True, exist_ok=True)
    text = common_chars()
    CHARS.write_text(text, encoding="utf-8")
    print(f"常用字：{len(text)} 个，写入 {CHARS.relative_to(ROOT)}")
    subset(SERIF_SRC, FONTS / "films-serif-common.woff2", text)
    subset(SANS_SRC, FONTS / "films-sans-common.woff2", text)


if __name__ == "__main__":
    main()
