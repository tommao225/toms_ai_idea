# crucible 文档索引

> 本目录放 crucible 的改动过程和决定。项目现在是什么样，写在 `../../crucible/docs/`，这里不重复。

## 1. 项目现有文档

| 内容 | 入口 |
|---|---|
| 项目总览、边界、目录 | [crucible/README.md](../../crucible/README.md) |
| 玩法：循环、物质、装置、设计红线 | [01-design.md](../../crucible/docs/01-design.md) |
| 美术：观感、渲染架构、资产清单与来源 | [02-art.md](../../crucible/docs/02-art.md) |
| 代码与目录：分层、依赖方向、命名、加东西改哪里 | [03-architecture.md](../../crucible/docs/03-architecture.md) |
| 运行时：时间、命令、确定性、撤销、存档、测试 | [04-foundations.md](../../crucible/docs/04-foundations.md) |
| 物质反应：每种物质遇到别的物质会怎么变 | [05-material-reactions.md](../../crucible/docs/05-material-reactions.md) |
| 装置：每种装置做什么、对哪些物质起作用 | [06-device-effects.md](../../crucible/docs/06-device-effects.md) |
| 物理偏差：已知不符合常识的地方与修复顺序 | [07-physics-gaps.md](../../crucible/docs/07-physics-gaps.md) |
| 交叉审查：四个子 agent 独立查出的问题清单 | [08-physics-review.md](../../crucible/docs/08-physics-review.md) |

这些文档描述项目现在的样子，改代码时要一起更新。

## 2. 改动文档

| 类型 | 文档 | 状态 | 日期 |
|---|---|---|---|
| 方案 | [立项与首个可玩版本](plans/feature/2026-11-25-立项与首个可玩版本.md) | 完成 | 2026-11-25 |

W0 到 W6 全部落地，构建产物与 itch 上线清单在 `crucible/README.md`；实际上传由项目所有者完成。

## 3. 决策记录

| ID | 决策 | 状态 | 日期 |
|---|---|---|---|
| `crucible/ADR-0001` | [技术与渲染架构](adr/0001-技术与渲染架构.md) | 已确认 | 2026-11-25 |
| `crucible/ADR-0002` | [代码与目录架构](adr/0002-代码与目录架构.md) | 已确认 | 2026-11-25 |
| `crucible/ADR-0003` | [运行时骨架：固定步长、命令通道与确定性](adr/0003-运行时骨架.md) | 已确认 | 2026-11-25 |
| `crucible/ADR-0004` | [移除委托与操作员](adr/0004-移除委托与操作员.md) | 已确认 | 2026-11-26 |

## 4. 新增文档

1. 在 [`docs/README.md`](../README.md) 第 3 节选类型，在第 4 节选文件名。
2. 复制 `../_templates/` 里对应的模板，按规则改名。
3. 填好文档开头的元信息，状态先写 `draft`，再更新本页的表格。
