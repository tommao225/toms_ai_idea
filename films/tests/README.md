# tests/

本地自检工具，不是正式测试。

## 截图与节点计数

`shoot.mjs` 用 Chrome 调试协议在 1440、1024、700、390 四个宽度截图，并打印节点数。它跑两类页面：`virtual-100.html` 用正式模块和 100 条测试数据看虚拟滚动；`web/index.html` 看当前 30 部正式页。还会检查方向键、点“看过”、导入导出、空榜、搜索和 404。需要本机有 Chrome；默认路径是 Windows 的 Chrome，其他系统用 `CHROME` 环境变量指定。

管线 fixture 见 `pipeline/README.md`，一条命令是 `python3 tests/pipeline/run.py`。

`poster_sheet.py` 会把当前九类片库的海报拼成检查图，方便人工检查有没有匹配错片。

```bash
node films/tests/shoot.mjs
```

输出在 `films/tests/out/`，不进版本库。脚本只用于本地检查，不参与站点运行。
