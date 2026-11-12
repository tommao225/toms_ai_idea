# 实现路径

## 1. 一句话定义

按多种口径列出影史前 100 部，用「放映单」的形态呈现，可打卡。核心资产不是功能，是**口径的透明度**和**呈现的味道**。

## 2. 三条硬约束

1. **口径先行**：任何榜单上线前必须有「口径卡」（见 `02-data-and-canon.md` §2）。没有口径卡的榜单不渲染。
2. **无后端**：所有数据在构建期生成静态 JSON；运行时只读本地文件与本机存储。不做登录、不做服务端打卡。
3. **构建期做完脏活**：抓取、去重、取色、生成摘要都在管线里跑完；站点只负责渲染。页面运行时不允许发起数据请求。

## 3. 系统结构

```
data/curated/            人工源（真相源，可手改）
  lists.toml             榜单定义：id、标题、口径卡、作用域、排序规则
  entries/*.csv          人工策展条目：rank, movie_key, note
  awards.toml            奖项分级与映射
        │
        ▼
pipeline/                构建期，Python 标准库优先
  fetch.py               TMDb 抓客观字段（年份/片长/国别/导演/评分/海报）
  merge.py               movie_key 归一、去重、合拍归属、缺失标注
  colorize.py            海报取主色 + 生成 LQIP 占位
  build.py               输出 data/*.json 与 web/data/*
        │
        ▼
data/movies/movies.jsonl  电影主档，一行一部
data/lists/*.json         每榜一个文件
data/awards/awards.jsonl  奖项记录，一行一条
data/posters/*.webp       本地海报（gitignore）
        │
        ▼
web/                     静态站，无构建无框架
  index.html             单页 + hash 路由
  assets/css/tokens.css  设计 token（氛围规范落地处）
  assets/js/{app,list,detail,watch}.js
  data/                  构建产物镜像（软链或拷贝）
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
 "scores":{"imdb":9.2,"douban":9.3,"letterboxd":4.5},"poster":"posters/m000123.webp",
 "dominant":"#2b1d16","credits_note":"","missing":["boxoffice"]}
```

规则：

- `id` 由管线生成、终身不变；`key` 是外部来源标识（`tmdb:` / `imdb:`），用于重跑去重。
- `missing` 显式记录缺字段。**缺就是缺**，不填 0、不猜。
- 评分三源并存，不合成一个数（见 `02` §4）。
- `dominant` 是海报主色，取色失败时留空并进 `missing`。

### 5.2 榜单 `data/lists/{list_id}.json`

```json
{"id":"global-all-greatest","title":"影史最伟大的 100 部","scope":{"kind":"global"},
 "genres":[],"criterion":"greatest","canon":{...口径卡...},
 "entries":[{"rank":1,"movie_id":"m000123","note":"策展手记，一到两句","why_included":"替换理由（混合口径时必填）"}]}
```

- `entries` 长度必须为 100；不足 100 时 `status:"draft"`，前端只在草稿模式显示。
- `note` 是产品灵魂：每部片一句，写"为什么它在这一榜"，不写剧情简介。
- 打卡进度按 `list_id + movie_id` 存，所以榜单 id 与 movie_id 都必须稳定。

### 5.3 奖项 `data/awards/awards.jsonl`

```json
{"award":"oscar","tier":"A","year":1972,"category":"best_picture","result":"won",
 "movie_id":"m000123","person":null,"source":"academy"}
```

一个奖项一次获奖/提名一行；`result` 只取 `won` / `nominated`。奖项定义见 `02` §5。

## 6. 管线四步

| 步 | 输入 | 输出 | 幂等要求 |
|---|---|---|---|
| fetch | curated 里的 `key` 列表 | `data/raw/*.json`（原始响应缓存） | 有缓存不重抓；新增 key 只抓新增 |
| merge | raw + curated | `movies.jsonl` | 重跑无 diff |
| colorize | 海报 | `dominant` + LQIP | 同图同色 |
| build | movies + lists + awards | `data/lists/*.json`、`web/data/*` | 重跑无 diff；有 diff 必须能解释 |

退出码约定：抓取有失败项仍可继续，但在末尾打印缺失清单并非零退出；`--strict` 时任一缺字段即失败。

## 7. 站点结构

单页 + hash 路由，四个视图：

| 路由 | 视图 | 关键点 |
|---|---|---|
| `#/` | 榜单索引（放映目录） | 按口径分组，卡片只写标题、作用域、一句口径摘录 |
| `#/list/{list_id}` | 放映单（100 行） | 编号列固定；每 10 部一卷；滚动到卷首时卷标吸入 |
| `#/movie/{movie_id}` | 单场放映 | 全屏静帧、关键台词、技术栏、手记、打卡 |
| `#/watch` | 我的观影册 | 已看数量、按类型/年代分布、导出导入 |

`list` 视图是核心，性能预算：首屏只渲染前 20 行，其余交给 `IntersectionObserver` 分批；100 行总 DOM 上限 ≤ 1200 节点。

## 8. 打卡

- 存储：`localStorage["films.watched.v1"] = {"m000123": {"at":"2026-11-12"}}`。
- 写入点只有一个：`watch.js` 的 `mark(id)` / `unmark(id)`；其他模块只读。
- 导出/导入：JSON 文件，导入按 `movie_id` 合并（不覆盖较新的时间戳）。
- 不做服务端同步。跨设备是靠导出文件，这是刻意的取舍。

## 9. 性能与离线

- 海报：构建期转 `webp`（长边 400px），列表用 LQIP 占位，`loading="lazy"`。
- 字体：自托管，仅子集化用到的字重与字符集；不用 CDN。
- 首屏预算：HTML + CSS + 首屏数据 ≤ 150KB（不含海报）；无 JS 时列表仍可读（`<noscript>` 走服务端无关的静态兜底：构建期生成 `list/{id}.html` 纯静态版，可选）。
- 离线：不做 PWA 首期；但所有资源同源，`file://` 打开也要能跑（便于本地预览）。

## 10. 已知风险

| 风险 | 应对 |
|---|---|
| 榜单口径被质疑 | 口径卡 + 来源链接 + `why_included` 写明替换 |
| 海报版权 | 本地缓存 + 来源标注 + 不做热链；商用前需重新评估 |
| 「最早 100」数据混乱 | 单独标注存世/残缺/片段，且放到最后做 |
| 合拍片归洲打架 | 按主出品国，`coproduction:true` 显式标出，不进洲榜 |
| 打卡进度因改榜丢失 | 榜单 id 冻结；改榜只能新增榜单，不重排已有 id |
| 数据源不可用 | raw 缓存进仓库（gzip），管线可离线重跑 |
