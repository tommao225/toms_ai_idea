# 实现路径

## 1. 一句话定义

按多种口径列出影史榜单（每榜上限 100 部，不足如实），用「放映单」的形态呈现，可打卡。核心资产不是功能，是**口径的透明度**和**呈现的味道**。

## 2. 三条硬约束

1. **口径先行**：任何榜单上线前必须有「口径卡」（见 `02-data-and-canon.md` §2）。没有口径卡的榜单不渲染。
2. **无后端**：所有数据在构建期生成静态 JSON；运行时只读本地文件与本机存储。不做登录、不做服务端打卡。
3. **构建期做完脏活**：抓取、去重、取色、生成摘要都在管线里跑完；站点只负责渲染。页面运行时不允许发起数据请求。

## 3. 系统结构

```
data/curated/                    人工源（真相源，可手改）
  lists/<list_id>/list.toml      榜单定义：id、标题、口径卡、卷名、作用域、排序规则
  lists/<list_id>/entries.csv    人工策展条目：rank, movie_key, note
  movies/<movie_id>/quote.md     台词或摘句，带出处
  awards.toml                    奖项分级与映射
        │
        ▼
pipeline/                        构建期，Python 标准库优先
  taxonomy.py                    九类标签、顺序、中文提示的唯一来源
  image_io.py                    图片下载、转 webp、取色的唯一实现
  merge.py                       movie_key 归一、去重、合拍归属、缺失标注
  placeholders.py                没有真实图时生成带标记的占位图
  fetch_posters_douban.py        豆瓣海报
  fetch_stills_douban.py         豆瓣剧照
  fetch_images_sogou.py          豆瓣缺图时用搜狗补
  build.py                       输出 data/lists/、web/data/site.js、按需加载的 web/data/lists/ 和 movies/
        │
        ▼
data/movies/movies.jsonl         电影主档，一行一部
data/lists/<list_id>.json        每榜一个文件
data/awards/awards.jsonl         奖项记录，一行一条（尚未实现）
data/media/movies/<movie_id>/    海报、剧照、来源说明（gitignore，credits.json 除外）
data/media/lists/<list_id>/      板块头图、卷封面、来源说明
data/raw/tmdb/<movie_id>.json    TMDb 原始响应缓存
data/raw/wikidata/<imdb_id>.json Wikidata 元数据缓存
        │
        ▼
web/                             静态站，无构建无框架
  index.html                     单页 + hash 路由
  assets/css/tokens.css          设计 token（氛围规范落地处）
  assets/js/{app,data,store,ui,home,list,detail,watch}.js
  data/                          构建产物镜像（软链或拷贝）
```

依赖方向：`web` 只读 `data/`，`pipeline` 只写 `data/` 与 `web/data/`，`data/curated` 只由人改。三者不互相 import。

## 4. 榜单矩阵

一个榜单 = **口径 × 作用域 × 类型 × 奖项**四个维度的组合，但只生成有意义的组合，不搞笛卡尔积。

| 维度 | 取值 | 首期 |
|---|---|---|
| 口径 | 最伟大、最早、最长、评分最高、票房最高、获奖 | 全部 6 个（先各做一个作用域） |
| 作用域 | 全球、洲（亚/欧/美/非）、国 | 全球 + 亚洲 |
| 类型 | 悬疑、科幻、动作 | 三个都做 |
| 奖项 | 综合大奖、类型专项奖 | 见 `02` §5 |

命名规则：`{scope}-{genre}-{criterion}`，例如 `global-all-greatest`、`asia-scifi-earliest`、`awards-all-palme`。榜单 id 一旦发布不再改，避免打卡进度错位。

## 5. 数据模型

### 5.1 电影主档 `data/movies/movies.jsonl`

一行一部，按 `id` 升序。字段少而稳，派生值不落库。

```json
{"id":"m000123","key":"tmdb:238","titles":{"zh":"教父","en":"The Godfather"},"year":1972,
 "runtime":175,"countries":["US"],"coproduction":false,"languages":["en"],"directors":["p:coppola"],
 "genres":["crime","drama"],"silent":false,"color":"color","aspect":"1.85:1",
 "scores":{"imdb":9.2,"douban":9.3,"letterboxd":4.5},"poster":"media/movies/m000123/poster.webp",
 "dominant":"#2b1d16","credits_note":"","missing":["boxoffice"]}
```

v2 增补的 `primary_country`、`sound`、`quote`、`stills`、`lists` 见 §5.4；上面只保留核心字段。

规则：

- `id` 由管线生成、终身不变；`key` 是外部来源标识（`tmdb:` / `imdb:`），用于重跑去重。
- `missing` 显式记录缺字段。**缺就是缺**，不填 0、不猜。
- 评分三源并存，不合成一个数（见 `02` §4）。
- `dominant` 是海报主色，取色失败时留空并进 `missing`。

### 5.2 榜单 `data/lists/{list_id}.json`

```json
{"id":"global-all-greatest","title":"悬疑电影","scope":{"kind":"global"},
 "genres":[],"criterion":"greatest","max_entries":100,"count":97,"status":"final","canon":{...口径卡...},
 "hero":"media/lists/global-all-greatest/hero.webp",
 "chapters":[{"index":1,"title":"第一卷：证词"}],
 "entries":[{"rank":1,"movie_id":"m000123","note":"策展手记，一到两句","why_included":"替换理由（混合口径时必填）"}]}
```

- `max_entries` 固定 100，`count` 必填且等于 `entries` 长度；`count ≤ max_entries`，**不要求等于**。
- 不足 100 是正常结果，不是缺陷：页面标题旁如实显示"收录 N 部"。
- 禁止为凑数添加条目。判定标准：这一部放进去，你能用一句话说清它为什么够格；说不清就删。
- `status` 只有 `final` / `draft`；`final` 表示已逐条人工确认，不以条数是否满 100 为条件。
- `note` 是产品灵魂：每部片一句，写"为什么它在这一榜"，不写剧情简介。
- `chapters` 只作为数据保留，不再在列表里显示卷标；列表改用分页。
- `hero` 是板块头图，没有就不显示；图片放在 `data/media/lists/<list_id>/`。
- 打卡进度按 `list_id + movie_id` 存，所以榜单 id 与 movie_id 都必须稳定。

### 5.3 奖项 `data/awards/awards.jsonl`

```json
{"award":"oscar","tier":"A","year":1972,"category":"best_picture","result":"won",
 "movie_id":"m000123","person":null,"source":"academy"}
```

一个奖项一次获奖/提名一行；`result` 只取 `won` / `nominated`。奖项定义见 `02` §5。

### 5.4 v2 增补字段

| 字段 | 在哪 | 来源 | 说明 |
|---|---|---|---|
| `primary_country` | 电影 | TMDb / Wikidata / 人工 | ISO alpha-2；`countries` 保留全部，洲榜用主国 |
| `sound` | 电影 | 人工 / 发行信息 | 声音制式；不清楚就进 `missing`，不猜 |
| `quote` | 电影 | 人工 | `{text, source, kind}`；`kind` 取 `line`（台词）、`critic`（影评摘句）、`curation`（没有出处的策展短句） |
| `stills` | 电影 | 管线 / 人工 | `[{path, source, credit, kind}]`，1–2 张；`kind` 取 `real` / `placeholder`；路径在 `data/media/movies/<movie_id>/` |
| `lists` | 电影 | 构建反查 | `[{list_id, rank}]`；详情页判断来自哪个榜；构建生成，不手写 |
| `chapters` | 榜单 | 人工 | `[{index, title}]`；作为数据保留，列表不再显示卷标 |
| `hero` | 榜单 | 人工 / 管线 | 板块头图路径；没有就不显示；图片在 `data/media/lists/<list_id>/` |

目录布局见 `../data/README.md` 与 ADR-0003；详情页的榜单上下文见 ADR-0004。

## 6. 管线四步

| 步 | 输入 | 输出 | 幂等要求 |
|---|---|---|---|
| fetch | curated 里的 `key` 列表 | `data/raw/tmdb/<movie_id>.json`（原始响应缓存） | 有缓存不重抓；新增 key 只抓新增 |
| merge | raw + curated | `movies.jsonl` | 重跑无 diff |
| image_io | 海报、剧照 | `data/media/movies/<movie_id>/` 与主色 | 同图同色 |
| build | movies + lists + awards | `data/lists/<list_id>.json`、`data/awards/awards.jsonl`、`web/data/site.js` 与按需加载的 `web/data/lists/`、`movies/` | 重跑无 diff；有 diff 必须能解释 |

退出码约定：抓取有失败项仍可继续，但在末尾打印缺失清单并非零退出；`--strict` 时任一缺字段即失败。

## 7. 站点结构

单页 + hash 路由，四个视图：

| 路由 | 视图 | 关键点 |
|---|---|---|
| `#/` | 榜单索引（放映目录） | 按口径分组，卡片只写标题、作用域、一句口径摘录 |
| `#/list/{list_id}` | 放映单（≤100 行） | 正式榜全部动态分页（默认 10 / 可切 20）；100 行测试仍走虚拟滚动 |
| `#/movie/{movie_id}?list={list_id}` | 单场放映 | 显示类型和所属榜单上下文；榜单页按中文拼音 / EN / 时间排序，不显示名次 |
| `#/watch` | 我的观影册 | 已看数量、按类型/年代分布、导出导入 |
| `#/search` | 站内搜索 | 只查 `site.js` 的索引，支持片名、导演、年份 |

`list` 视图是核心。正式榜全部动态分页，默认每页 10 部，可切 20 部；满 100 行的测试仍走虚拟滚动，只保留屏幕附近约 20 行，总页面节点不超过 800（见 ADR-0002）。

## 8. 打卡

- 存储：`localStorage["films.watched.v1"] = {"m000123": {"at":"2026-11-12"}}`。
- 写入点只有一个：`watch.js` 的 `mark(id)` / `unmark(id)`；其他模块只读。
- 导出/导入：JSON 文件，导入按 `movie_id` 合并（不覆盖较新的时间戳）。
- 不做服务端同步。跨设备是靠导出文件，这是刻意的取舍。

## 9. 性能与离线

- 海报和剧照：构建期转 `webp`（海报长边 400px），列表用 LQIP 占位，`loading="lazy"`；按电影存 `data/media/movies/<movie_id>/`。
- 字体：自托管，GB2312 一级常用字 3755 个，加标点和拉丁共 3889 个字符；变量字体单文件，第一屏加载一次；不用 CDN。
- 首屏预算：HTML + CSS + 首屏数据 ≤ 150KB（不含海报和字体）；字体单独设上限，第一屏只加载用到的分片。无 JS 时列表仍可读（`<noscript>` 走构建期生成的纯静态兜底，可选）。
- 离线：不做 PWA 首期；但所有资源同源，`file://` 打开也要能跑（便于本地预览）。

## 10. 已知风险

| 风险 | 应对 |
|---|---|
| 榜单口径被质疑 | 口径卡 + 来源链接 + `why_included` 写明替换 |
| 海报和剧照版权 | 本地缓存 + 来源标注 + 不做热链；质量不够用生成的占位；商用前需重新评估 |
| 台词和摘句版权 | 只引短句，标出处；没有出处的用策展短句并标「策展」 |
| 「最早」榜数据混乱 | 单独标注存世/残缺/片段，且放到最后做 |
| 合拍片归洲打架 | 按主出品国，`coproduction:true` 显式标出，不进洲榜 |
| 打卡进度因改榜丢失 | 榜单 id 冻结；改榜只能新增榜单，不重排已有 id |
| 数据源不可用 | raw 缓存进仓库（gzip），管线可离线重跑 |
