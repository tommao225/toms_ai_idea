# pipeline/

构建期管线。只在这里做脏活：抓取、归一、取色、生成。站点运行时不允许联网。

## 脚本

| 文件 | 作用 | 幂等 |
|---|---|---|
| `fetch.py` | 按 `curated/` 里的 `movie_key` 抓 TMDb，写 `data/raw/` | 有缓存不重抓；只抓新增 |
| `merge.py` | 归一化、去重、补 `missing`，写 `data/movies/movies.jsonl` | 重跑无 diff |
| `colorize.py` | 海报转 webp、取主色、生成 LQIP | 同图同色 |
| `build.py` | 汇总输出 `data/lists/`、`data/awards/`、`web/data/` | 重跑无 diff |

## 约定

- 只用 Python 标准库 + Pillow（取色/转码）；不引入大型依赖。
- 所有脚本 `--dry-run` 可跑，只打印将要做的事。
- 缺数据不猜：写进 `missing` 并在末尾汇总。
- 失败即非零退出；`--strict` 下任一缺字段即失败。
- 不在脚本里写死任何具体片名或年份——一切来自 `curated/`。

## 跑法（M1 落地后生效）

```bash
python3 pipeline/fetch.py        # 抓新增
python3 pipeline/merge.py
python3 pipeline/colorize.py
python3 pipeline/build.py
```

首次构建后在 `../../` 根目录跑一遍通用检查：`scripts/check.sh .`。
