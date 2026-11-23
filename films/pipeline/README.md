# pipeline/

管线内部脚本，默认从 `films/` 运行。日常直接调用 `films/tools/` 下的入口；工具只是参数封装，抓取和图片处理仍在这里，避免两套实现。

构建期管线。抓取、归一、取色、生成都在这里；站点运行时不联网。

## 脚本

| 文件 | 作用 |
|---|---|
| `common.py` | 路径、TOML/CSV/JSONL、榜单和条目读取 |
| `taxonomy.py` | 九类标签、顺序、中文提示的唯一手写源 |
| `image_io.py` | 图片下载、解码、转 webp 的唯一实现 |
| `manual_seed.py` | 缺失 Wikidata 时的人工元数据，保留 IMDb 编号待复核 |
| `quotes_seed.py` | 补能确认的短摘句，写 `curated/movies/<id>/quote.md` |
| `merge.py` | 归一化、去重、补 `missing`，写 `data/movies/movies.jsonl` |
| `placeholders.py` | 没有真实图时生成带标记的占位海报和剧照 |
| `fetch_posters_douban.py` | 豆瓣逐条慢请求取海报 |
| `fetch_stills_douban.py` | 从海报的豆瓣照片页逐条取剧照 |
| `fetch_images_sogou.py` | 豆瓣缺图时按“片名 海报 / 片名 剧照”用搜狗补 |
| `fetch_genre_images.py` | 按九类氛围词从搜狗取分类背景图，不绑定具体电影 |
| `build.py` | 汇总榜单，写 `data/lists/`、`web/data/site.js` 和按需加载数据 |
| `check_content.py` | 内容体检：手记、入选理由、台词、名次、来源、条数 |
| `make_page.py` | 仅测试用：把正式 `index.html` 复制成 fixture 页 |
| `subset_fonts.py` | 从本机 Noto 可变字体裁常用字，生成 `web/assets/fonts/*.woff2` |

## 约定

- 只用 Python 标准库 + Pillow；不引入大型依赖。
- 缺数据不猜：写进 `missing` 并在末尾汇总。
- 失败即非零退出；名次不连续、电影不在主档、`decision=pending` 都算失败。
- 图片按电影存：`data/media/movies/<movie_id>/`；板块头图按榜单存：`data/media/lists/<list_id>/`。
- 类型标签只在 `taxonomy.py` 写一次；`build.py`、`merge.py`、Wikidata 脚本都从它读。

## 跑法

当前正式数据：

```bash
python3 pipeline/manual_seed.py
python3 pipeline/quotes_seed.py
python3 pipeline/merge.py
python3 pipeline/placeholders.py
python3 pipeline/fetch_posters_douban.py
python3 pipeline/fetch_stills_douban.py
python3 pipeline/fetch_images_sogou.py
python3 pipeline/build.py
python3 pipeline/check_content.py
```

图片脚本都是慢请求、可重跑；已有真实图不会覆盖。

离线 fixture：

```bash
python3 tests/pipeline/run.py
```

fixture 会从 `tests/pipeline/fixture/raw/tmdb` 复制原始响应，跑 merge → build → make_page → check，不联网。

首次构建后在根目录跑通用检查：`scripts/check.sh .`。
