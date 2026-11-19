# 管线 fixture

三部门电影和一张榜单，只用来验证归一、生成、页面和内容检查能跑通，不是正式数据。

- `fixture/curated/`：榜单和条目。
- `fixture/raw/tmdb/`：手写的 TMDb 响应，海报和剧照指向 `web/assets/img/`。
- `out/`：跑出来的数据，已在 `.gitignore` 里。

## 跑

一条命令：

```bash
python3 tests/pipeline/run.py
```

它会清掉 `out/`，把 `fixture/raw/tmdb` 复制进去，依次跑 merge、build、make_page、check，并检查 3 部电影、1 个榜单、名次连续。

也可以分步跑：

```bash
cd films
mkdir -p tests/pipeline/out/data/raw
cp -r tests/pipeline/fixture/raw/tmdb tests/pipeline/out/data/raw/
python3 pipeline/merge.py --curated tests/pipeline/fixture/curated \
  --data-root tests/pipeline/out/data
python3 pipeline/build.py --curated tests/pipeline/fixture/curated \
  --data-root tests/pipeline/out/data --web-root tests/pipeline/out/web
python3 pipeline/make_page.py --web-root tests/pipeline/out/web
```

`make_page.py` 生成 `out/web/index.html`，把资源路径指回 `films/web`，数据用生成的 `out/web/data/site.js`。直接打开这个页面就能看到三条测试影片。

`tests/shoot.mjs` 发现 `out/web/index.html` 存在时，会顺手截图榜单页和详情页。
