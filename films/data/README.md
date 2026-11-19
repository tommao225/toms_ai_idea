# data/

数据分两层：人工维护的源，和管线生成的文件。素材按「板块（榜单）」和「电影」分开，不堆在一个目录里。

| 子目录 | 谁写 | 内容 | 进版本库 |
|---|---|---|---|
| `curated/lists/<list_id>/` | **只有人** | `list.toml`（榜单定义、口径、章节数据）、`entries.csv`（名次、movie_key、这一榜的手记） | 是 |
| `curated/movies.toml` | **只有人** | 首批电影的中文名、英文名、导演中文名 | 是 |
| `curated/movies/<movie_id>/` | **只有人** | `quote.md`（台词或摘句，带出处）、`note.md`（跨榜通用说明，可选） | 是 |
| `media/movies/<movie_id>/` | 管线 / 人 | 海报、剧照、`credits.json`（来源、授权、是否占位） | 图片否，`credits.json` 是 |
| `media/lists/<list_id>/` | 人 / 管线 | 板块头图、`credits.json` | 图片否，`credits.json` 是 |
| `media/colors.json` | `pipeline/fetch_*.py` / `image_io.py` | 每部电影的主色 | 是 |
| `raw/tmdb/<tmdb_id>.json` | 历史缓存 / 手工 | TMDb 原始响应缓存 | 是（离线可重跑） |
| `raw/wikidata/<imdb_id>.json` | 历史缓存 / 手工 | Wikidata 元数据缓存 | 是（离线可重跑） |
| `raw/manual/<imdb_id>.json` | `pipeline/manual_seed.py` | Wikidata 限流时的人工元数据，带 IMDb 编号待复核 | 是 |
| `movies/movies.jsonl` | `pipeline/merge.py` / `build.py` | 电影主档，一行一部；build 会补 `lists` 和主色 | 是 |
| `lists/<list_id>.json` | `pipeline/build.py` | 每个榜单一个文件 | 是 |
| `awards/awards.jsonl` | `pipeline/build.py`（尚未实现） | 奖项记录，一行一条 | 是 |

规则：

- `curated/` 之外的目录都是生成物，改它们会在下次构建时被覆盖。
- 同一张图、同一句台词只存一份。板块页通过 `movie_id` 引用电影素材，不按榜单复制。
- 构建产物 `movies.jsonl`、`lists/*.json`、`media/colors.json` 保持按文件输出，不按板块或电影拆。
- 缺字段用 `missing` 数组显式记录，禁止用 0、空串、`null` 冒充已知值。
- 数据文件不适用「单文件 ≤ 300 行」预算：一个榜单一个文件，按行 diff。

字段与格式定义见 `../docs/01-implementation-path.md` §5，口径与来源见 `../docs/02-data-and-canon.md`。
