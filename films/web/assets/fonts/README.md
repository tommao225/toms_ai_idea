# 字体

- `films-serif-common.woff2`：从 Noto Serif SC 可变字体裁出。
- `films-sans-common.woff2`：从 Noto Sans SC 可变字体裁出。
- `common-chars.txt`：字符表，GB2312 一级常用字 3755 个，加标点和拉丁，共 3889 个字符。

字体是 **SIL Open Font License 1.1**，来源为 Noto CJK：
<https://github.com/notofonts/noto-cjk>

## 重新生成

```bash
# 依赖 fontTools 和 brotli，可装到 films/tests/.tools
python films/pipeline/subset_fonts.py
```

源字体默认用 Windows 安装的 `NotoSerifSC-VF.ttf` / `NotoSansSC-VF.ttf`；
其他机器用 `SERIF_SRC` / `SANS_SRC` 指定路径。

当前每个字族一个文件。如果第一屏字体体积超预算，再按字符区间拆成多片；现在先保持单文件，加载一次。
