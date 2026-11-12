# web/

静态站。单页、无构建、无框架、无 CDN。

## 结构（M2 落地后生效）

```
index.html
assets/css/tokens.css      设计 token（对应 docs/03-atmosphere-spec.md）
assets/css/app.css         布局与组件
assets/js/app.js           路由与启动
assets/js/list.js          放映单渲染（分批）
assets/js/detail.js        详情页
assets/js/watch.js         打卡唯一写入口
assets/fonts/              自托管字体子集
data/                      构建产物镜像（由 pipeline/build.py 生成）
```

## 硬约束

- 运行时只读本地 JSON，不发网络请求。
- 字体、图标、脚本全部自托管；不引 CDN。
- 列表是 `<ol>`/`<li>`，不是 `<div>` 列表；键盘可达。
- `prefers-reduced-motion` 必须退化。
- 首屏 HTML + CSS + 数据 ≤ 150KB（不含海报）。
- 打卡写入只经 `watch.js`，其他模块只读。

## 本地预览

直接 `open index.html` 也要能跑（便于离线检查）；若浏览器限制 `file://` 读 JSON，退而用 `python3 -m http.server`。
