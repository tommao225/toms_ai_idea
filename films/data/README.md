# data/

数据分三层，各自归属明确，不要互相写。

| 子目录 | 谁写 | 内容 | 进版本库 |
|---|---|---|---|
| `curated/` | **只有人** | 榜单定义、策展条目、奖项定义、类型映射——真相源 | 是 |
| `raw/`（首次构建生成） | `pipeline/fetch.py` | TMDb 原始响应缓存（gzip） | 是（离线可重跑） |
| `movies/` | `pipeline/merge.py` | `movies.jsonl`，一行一部 | 是 |
| `lists/` | `pipeline/build.py` | 每榜一个 JSON | 是 |
| `awards/` | `pipeline/build.py` | `awards.jsonl`，一行一条获奖/提名 | 是 |
| `posters/` | `pipeline/colorize.py` | 本地海报缓存 webp | 否（gitignore） |

规则：

- `curated/` 之外的目录都是**构建产物**，改它们会在下次构建时被覆盖。
- 构建产物要可复现：同一份 `curated/` 重跑必须无 diff。
- 缺字段用 `missing` 数组显式记录，禁止用 0、空串、`null` 冒充已知值。
- 数据文件不适用「单文件 ≤ 300 行」预算：一个榜单一个文件，按行 diff。

字段与格式定义见 `../docs/01-implementation-path.md` §5，口径与来源见 `../docs/02-data-and-canon.md`。
