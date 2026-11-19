# pipeline/

构建期管线。只在这里做脏活：抓取、归一、取色、生成。站点运行时不允许联网。

## 脚本

| 文件 | 作用 | 幂等 |
|---|---|---|
| `common.py` | 路径、TOML/CSV/JSONL、榜单和条目读取 | — |
| `fetch.py` | 按 `curated/` 里的 `movie_key` 抓 TMDb，写 `data/raw/tmdb/<tmdb_id>.json` | 有缓存不重抓；只抓新增 |
| `fetch_wikidata.py` | 没有 TMDb 密钥时，按 IMDb 编号从 Wikidata 取元数据 | 有缓存不重抓；`--force` 重抓 |
| `fetch_wikidata_api.py` | SPARQL 限流时改用 MediaWiki API 取 Wikidata 元数据 | 有缓存不重抓 |
| `manual_seed.py` | Wikidata 不可用时的人工元数据，保留 IMDb 编号待复核 | 固定表 |
| `quotes_seed.py` | 补能确认的短摘句，写 `curated/movies/<id>/quote.md` | 已有不覆盖 |
| `merge.py` | 归一化、去重、补 `missing`，写 `data/movies/movies.jsonl` | 重跑无 diff |
| `colorize.py` | 海报和剧照转 webp、取主色，写 `data/media/movies/<movie_id>/` | 同图同色 |
| `placeholders.py` | 没有真实图时生成带标记的占位海报和剧照 | 同片同图 |
| `fetch_posters_douban.py` | 豆瓣逐条慢请求取海报，下载转 webp；`--delay` 控制间隔 | 已有真实海报不覆盖 |
| `fetch_stills_douban.py` | 从海报的豆瓣照片页找对应条目，逐条取 3 张剧照 | 已有真实剧照不覆盖 |
| `fetch_images_sogou.py` | 豆瓣缺失时用搜狗图片按“片名 海报 / 片名 剧照”补图 | 已有真实图不覆盖 |
| `build.py` | 汇总榜单，写 `data/lists/<list_id>.json`、`web/data/site.js` 和按需加载的 `web/data/lists/`、`web/data/movies/` | 重跑无 diff |
| `check_content.py` | 内容体检：手记、入选理由、台词、名次、来源、条数 | — |
| `make_page.py` | 把正式 `index.html` 复制成 fixture 测试页，路径指回 `web/` 和 `out/data` | — |
| `subset_fonts.py` | 从本机 Noto 可变字体裁常用字，生成 `web/assets/fonts/*.woff2` | 同源同字同结果 |

## 约定

- 只用 Python 标准库 + Pillow（取色/转码）；不引入大型依赖。
- 抓取、取色、生成可 `--dry-run`，只打印将要做的事。
- 缺数据不猜：写进 `missing` 并在末尾汇总。
- 失败即非零退出；名次不连续、电影不在主档、`decision=pending` 都算失败。
- 不在脚本里写死任何具体片名或年份——一切来自 `curated/`。
- 图片按电影存：`data/media/movies/<movie_id>/`；板块头图按榜单存：`data/media/lists/<list_id>/`。同一张图不复制到多个榜单。

## 跑法

正式构建（TMDb 有密钥时）：

```bash
export TMDB_API_KEY=...
python3 pipeline/fetch.py
python3 pipeline/merge.py
python3 pipeline/colorize.py
python3 pipeline/build.py
python3 pipeline/check_content.py
```

当前首批没有 TMDb 密钥，用 Wikidata 元数据 + 占位图：

```bash
python3 pipeline/fetch_wikidata.py
python3 pipeline/merge.py
python3 pipeline/placeholders.py
python3 pipeline/build.py
python3 pipeline/check_content.py
```

Wikidata 也限流时，用人工元数据补缺：

```bash
python3 pipeline/manual_seed.py
python3 pipeline/quotes_seed.py
python3 pipeline/fetch_posters_douban.py
python3 pipeline/fetch_stills_douban.py
python3 pipeline/fetch_images_sogou.py
python3 pipeline/merge.py
python3 pipeline/placeholders.py
python3 pipeline/build.py
```

`build.py` 写出 `web/data/site.js`；`index.html` 优先用它，没有正式数据时自动回退 `data/fixture.js`。

离线 fixture（不联网，验证四步能跑通）：

```bash
python3 tests/pipeline/run.py
```

也可以分步跑：

```bash
python3 pipeline/fetch.py --fixture tests/pipeline/fixture/raw \
  --curated tests/pipeline/fixture/curated --data-root tests/pipeline/out/data
python3 pipeline/merge.py --curated tests/pipeline/fixture/curated \
  --data-root tests/pipeline/out/data
python3 pipeline/colorize.py --data-root tests/pipeline/out/data
python3 pipeline/build.py --curated tests/pipeline/fixture/curated \
  --data-root tests/pipeline/out/data --web-root tests/pipeline/out/web
```

首次构建后在 `../../` 根目录跑一遍通用检查：`scripts/check.sh .`。
