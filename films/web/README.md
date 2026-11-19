# web/

静态站。单页、无构建、无框架、无 CDN。唯一入口是 `index.html`。

## 结构

```
index.html                 正式入口，hash 路由
assets/css/tokens.css      设计 token、自托管字体
assets/css/site.css        列表与首页版式
assets/css/detail.css      详情、观影册、分页与响应式
assets/fonts/              中文字体子集
assets/js/data.js          读取 window.FILMS_DATA
assets/js/store.js         打卡存储，唯一写入口
assets/js/ui.js            转义、列宽测量、片名格子
assets/js/home.js          首页
assets/js/list.js          放映单，正式榜动态分页（10/20），100 行测试用虚拟滚动
assets/js/detail.js        详情
assets/js/search.js        站内搜索
assets/js/watch.js         观影册、导入导出
assets/js/app.js           路由与启动
data/site.js               榜单索引，首屏只读这个
data/lists/<id>.js         单个榜单的条目和电影摘要，按需加载
data/movies/<id>.js        单部电影完整数据，详情和观影册按需加载
data/fixture.js            100 条测试数据，site.js 为空时回退
```

`data/` 由 `pipeline/build.py` 写出：`site.js` 只放榜单索引和搜索索引，榜单页再加载 `data/lists/<id>.js`，详情和观影册加载 `data/movies/<id>.js`。当前九类、每类 30 部，共 240 部。

## 硬约束

- 运行时只读本地数据，不发网络请求。
- 字体、图标、脚本全部自托管；不引 CDN。
- 正式榜全部用分页：默认每页 10 部，可切 20 部；页数按条目总数动态计算。`virtual-100.html` 的 100 行测试仍用虚拟滚动，节点不超过 800。
- 打卡写入只经 `store.js`，其他模块只读。
- 收藏、直接打开和从榜单进入详情都要能用；从榜单进入时带 `?list=`。
- `prefers-reduced-motion` 必须退化。

## 本地预览

直接打开 `index.html` 能跑；如果浏览器限制 `file://` 读取，用 `python -m http.server` 在 `films/` 下起本地服务。
