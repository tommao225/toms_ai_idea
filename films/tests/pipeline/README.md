# 管线 fixture

三部门电影和一张榜单，只用来验证抓取缓存、归一、取色、生成四步能跑通，不是正式数据。

- `fixture/curated/`：榜单和条目。
- `fixture/raw/tmdb/`：手写的 TMDb 响应，海报和剧照指向 `web/assets/img/`。
- `out/`：跑出来的数据，已在 `.gitignore` 里。

## 跑

一条命令：

```bash
python3 tests/pipeline/run.py
```

它会清掉 `out/`，依次跑 fetch、merge、colorize、build、make_page，并检查 3 部电影、1 个榜单、名次连续。

也可以分步跑：

```bash
cd films
python3 pipeline/fetch.py --fixture tests/pipeline/fixture/raw \
  --curated tests/pipeline/fixture/curated --data-root tests/pipeline/out/data
python3 pipeline/merge.py --curated tests/pipeline/fixture/curated \
  --data-root tests/pipeline/out/data
python3 pipeline/colorize.py --data-root tests/pipeline/out/data
python3 pipeline/build.py --curated tests/pipeline/fixture/curated \
  --data-root tests/pipeline/out/data --web-root tests/pipeline/out/web
python3 pipeline/make_page.py
```

`make_page.py` 生成 `out/web/index.html`，把资源路径指回 `films/web`，数据用生成的 `out/web/data/site.js`。直接打开这个页面就能看到三条测试影片。

`tests/shoot.mjs` 发现 `out/web/index.html` 存在时，会顺手截图榜单页和详情页。
