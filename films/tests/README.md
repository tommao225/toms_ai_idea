# tests/

原型阶段的自检工具，不是正式测试。

## 100 行版式

`list-100.html` 加载 `../web/data/fixture.js`，生成 100 条测试数据（长短片名、10 个卷），用原型 CSS 渲染。只用于检查四个宽度下的换行、按钮位置和节点数，不接真实数据。

打开：

```text
films/tests/list-100.html
```

页面底部会显示 `nodes / width / rows`。

## 截图与节点计数

`shoot.mjs` 用 Chrome 调试协议在 1440、1024、700、390 四个宽度截图，并打印节点数。它跑三类页面：原型页看 100 行基线；`virtual-100.html` 用正式模块和 100 条测试数据看虚拟滚动；`web/index.html` 看当前 20 部正式页。还会检查方向键、点“看过”、导入导出、空榜和 404。需要本机有 Chrome；默认路径是 Windows 的 Chrome，其他系统用 `CHROME` 环境变量指定。

管线 fixture 见 `pipeline/README.md`，一条命令是 `python3 tests/pipeline/run.py`。

`poster_sheet.py` 会把 40 部海报拼成 `tests/out/posters-contact.jpg`，方便人工检查有没有匹配错片。

```bash
node films/tests/shoot.mjs
```

输出在 `films/tests/out/`，不进版本库。脚本只用于本地检查，不参与站点运行。
