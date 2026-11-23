# tools/

日常操作入口。每个脚本头部都有用法示例，参数都可以覆盖默认路径。

| 工具 | 用途 | 示例 |
|---|---|---|
| `search_images.py` | 搜图，可选下载 | `python films/tools/search_images.py --query "洛城机密 海报" --orientation portrait --limit 3` |
| `download_images.py` | 按 URL 下载并转 webp | `python films/tools/download_images.py --url "https://..." --out films/data/media/movies/m119488 --prefix still` |
| `search_quotes.py` | 查单部电影的 Wikiquote 台词 | `python films/tools/search_quotes.py --title "L.A. Confidential" --translate` |
| `fetch_quotes.py` | 批量补台词并写来源 | `python films/tools/fetch_quotes.py --limit 20` |
| `build_site.py` | 构建站点数据 | `python films/tools/build_site.py` |
| `check_site.py` | 内容体检 | `python films/tools/check_site.py --strict` |
| `admin_server.py` | 本地管理员服务：页面新增/编辑/删除电影，写单目录 | `python films/tools/admin_server.py --port 8765`，打开 `http://127.0.0.1:8765/web/index.html` |

这些是前端入口，实际抓取和图片处理仍在 `films/pipeline/`，避免两套实现。
