# films 文档索引

> 本目录放 films 的改动过程和决定。项目现在是什么样，写在 `../../films/docs/`，这里不重复。

## 1. 项目现有文档

| 内容 | 入口 |
|---|---|
| 项目总览、边界、目录 | [films/README.md](../../films/README.md) |
| 实现路径、数据结构、站点结构 | [01-implementation-path.md](../../films/docs/01-implementation-path.md) |
| 榜单口径、来源、奖项分级、质量要求 | [02-data-and-canon.md](../../films/docs/02-data-and-canon.md) |
| 氛围与视觉规范 | [03-atmosphere-spec.md](../../films/docs/03-atmosphere-spec.md) |
| 里程碑与检查标准 | [04-roadmap.md](../../films/docs/04-roadmap.md) |
| 当前原型入口 | [prototype.html](../../films/web/prototype.html) |

这些文档描述项目现在的样子，改代码时要一起更新。

## 2. 改动文档

| 类型 | 文档 | 状态 | 日期 |
|---|---|---|---|
| 方案 | [原型转生产：数据结构、列表密度与管线](plans/refactor/2026-11-19-原型转生产.md) | 草稿 | 2026-11-19 |

目前只有这一份。以后需要记录决策、排查问题或做评审时，按 [公共文档说明](../README.md) 里的类型和命名新建，并更新本页。

## 3. 新增文档

1. 在 [`docs/README.md`](../README.md) 第 3 节选类型，在第 4 节选文件名。
2. 复制 `../_templates/` 里对应的模板，按规则改名。
3. 填好文档开头的元信息，状态先写 `draft`，再更新本页的表格。
