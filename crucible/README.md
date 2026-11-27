# 坩埚（crucible）

一个 2D 侧视剖面的物质沙盘：在一张网格世界上，用简短的装置控制物质的物理与化学变化，搭出能自动运转的生产链。

物质层给意外，装置层给秩序。玩家搭出来的东西会自己跑，然后可能自己炸。

观感参考《缺氧》的剖面工业感，比它重一点、《辐射：避难所》一点。先在 itch 出网页 demo 验证玩法，之后才考虑 Steam。游戏名是工作名。

## 边界

- 单人开发。先做网页 demo，不做 Steam 上架、联机、剧情、云存档、成就。
- 世界是一张网格，物质与温度都在格子上。装置只读写网格，装置之间只有信号。
- 物质不超过 10 种，装置不超过 6 种。超过就删。
- 中文优先，不做多语言。

## 目录

| 路径 | 内容 |
|---|---|
| `docs/` | 项目文档：玩法设计、美术方向、代码与目录架构、运行时契约 |
| `data/materials/` | 物质数据表：编号、名称、颜色、形态、初始温度、导热系数 |
| `data/reactions/` | 反应表：温度反应与接触反应 |
| `data/devices/` | 装置数据表：喷口、加热器、管道、泵、阀门、传感器 |
| `src/` | 代码：`world/` 模拟、`app/` 装配、`render/` 渲染、`ui/` 界面 |
| `scripts/` | 工具：依赖方向检查 |
| `tests/` | 模拟规则与确定性测试 |
| `web/` | 构建产物，直接传 itch |
| `assets/` | 计划：材质贴图、角色与装置精灵、界面 |

标「计划」的路径尚未创建。

## 先读哪份

| 你想知道 | 读 |
|---|---|
| 玩法规则、物质与装置表、设计红线 | `docs/01-design.md` |
| 画风怎么落地、渲染架构、资产从哪来 | `docs/02-art.md` |
| 代码怎么分层、目录怎么建、加东西改哪里 | `docs/03-architecture.md` |
| 时间怎么走、状态怎么改、撤销与存档怎么设计 | `docs/04-foundations.md` |
| 每种物质遇到别的物质会怎么变 | `docs/05-material-reactions.md` |
| 每种装置做什么、对哪些物质起作用 | `docs/06-device-effects.md` |
| 哪些地方还不符合常识物理、按什么顺序修 | `docs/07-physics-gaps.md` |
| 四个子 agent 交叉审查出的物理与实现问题 | `docs/08-physics-review.md` |
| 为什么这么立项、分几步、怎么算做完 | `../docs/crucible/README.md` |

## 怎么跑

不想开命令行就双击 `start-demo.cmd`：第一次运行会自动装依赖，然后起服务器并打开浏览器，关掉窗口就是关服务器。

直接双击 `index.html` 是打不开的，浏览器不允许 `file://` 加载模块脚本，页面会提示去用服务器。

命令行：

```bash
pnpm install
pnpm dev      # 本地开发，默认 http://127.0.0.1:5273
pnpm build    # 产出到 web/，可直接上传 itch
pnpm preview  # 用静态服务看构建产物
pnpm test     # 模拟规则与确定性
pnpm typecheck
pnpm check:layers
```

## 上线 itch

双击 `package.cmd`，它会构建并把 `web/` 打成 `dist/crucible-demo.zip`。

上传时：

1. 项目类型选 HTML，勾选 **This file will be played in the browser**。
2. 上传 `crucible-demo.zip`，勾选 **This file will be embedded in an iframe**。
3. 视图尺寸建议 1280×800，或直接用 Fullscreen。
4. 需要 WebGL 和桌面浏览器；手机端没测过，别在页面上承诺。

## 本仓库通用规则同样生效

根 `AGENTS.md` 与 `.dsh/` 的纪律对本专题同样适用。唯一的例外是资产文件允许大：一张材质图集一个文件，按需加载，不为行数或体积预算拆图。

## 文档约定

- 文档里出现的路径一律相对 `crucible/` 根，不相对文档所在目录。
- 标「计划」的路径是尚未存在的产物。

## 状态

W0 到 W6 已完成：确定性网格模拟（十种物质）、温度场与反应表、六种装置、广播式信号、程序化视觉、开场说明页，以及可上传 itch 的构建产物。见 `docs/prototype-w6.png`。

委托与操作员已移除：它们没有带来可玩的决策，只增加了规则和界面。

构建产物与上线清单见上一节；实际上传需要项目所有者用自己的 itch 账号完成。
