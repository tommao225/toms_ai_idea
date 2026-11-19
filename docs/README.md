# 公共文档

> 这里记录一次改动是怎么发生的、为什么这么选。
> 项目现在是什么样（怎么用、有哪些字段、遵循什么规范），写在项目自己的文档目录里，这里不重复。

## 1. 三类内容分开写

| 写什么 | 放哪里 | 例子 |
|---|---|---|
| 项目现在的事实 | 项目自己的文档目录 | 字段说明、视觉规范、使用方式 |
| 一次改动和为什么 | 本目录 | 排查过程、实施方案、决策记录 |
| 多个项目都适用的规矩 | `.dsh/` | 分层、验证、提交前检查 |

判断方法：如果代码明天重构，这份文档会过时吗？会，放项目文档；不会，放这里。

## 2. 目录

```text
docs/
├─ README.md
├─ _templates/
│  ├─ plan.md
│  ├─ issue.md
│  ├─ adr.md
│  └─ review.md
├─ ADR-0001-docs-layout.md
├─ PLAN-2026-11-12-generic-rules-library.md
├─ ISSUE-YYYY-MM-DD-<英文短名>.md          # 仓库级，按需
└─ films/                                 # 项目级：目录名和顶层项目目录一致
   ├─ README.md
   ├─ adr/
   ├─ issues/
   ├─ plans/
   │  ├─ feature/
   │  └─ refactor/
   └─ reviews/
```

- 根目录放仓库级文档，文件名前加类型；项目文档放 `docs/<项目>/`，里面再按类型分目录。
- 根目录同一类超过 5 份，再建子目录。
- 不建 `archive/`；用状态表示结束。移动文件会让原来的链接失效。
- 新项目要建 `docs/<项目>/README.md`，并在第 8 节登记。

## 3. 写哪种文档

| 类型 | 项目里的目录 | 根目录文件名 |
|---|---|---|
| 决策记录（ADR） | `adr/` | `ADR-0001-<英文短名>.md` |
| 排查记录（Issue） | `issues/` | `ISSUE-YYYY-MM-DD-<英文短名>.md` |
| 方案（Plan） | `plans/feature/` 或 `plans/refactor/` | `PLAN-YYYY-MM-DD-<英文短名>.md` |
| 评审记录（Review，可选） | `reviews/` | `REVIEW-YYYY-MM-DD-<英文短名>.md` |

四种文档分别写什么、什么时候写，见 [变更文档约定](../.dsh/conventions/change-docs.md) 第 3 节。这里只规定它们放在哪、怎么命名。

调研、事故复盘、变更日志、会议记录不单独建文档：调研并进方案，事故复盘并进排查记录，变更日志看 git，会议记录不写。

## 4. 文件名和文档开头

- 文件名用英文和短横线，不用空格、中文或 `_v2` 这样的版本号；日期用创建当天，之后不改名。
- 文档开头写一段元信息，供人和检查脚本读取。字段名固定如下：

```yaml
---
id: films/PLAN-2026-11-19-prototype-to-production
type: plan
status: draft
scope: films
kind: refactor
created: 2026-11-19
updated: 2026-11-19
related: [ADR-0001]
---
```

- `id` 是编号；根目录文档直接写 `ADR-0001`，项目文档写 `films/ADR-0001`。
- `type` 只能是 `adr`、`issue`、`plan`、`review`。
- `status` 见下表。
- `scope` 写 `repo` 或项目名。
- `kind` 只用于方案：`feature`（新功能）、`refactor`（重构）、`migration`（迁移）、`fix`（修复）。
- `created` 和 `updated` 用 `YYYY-MM-DD`。
- 不写作者、版本号和修改记录；谁改的看 git。

状态用词：

| 状态 | 意思 |
|---|---|
| `draft` | 草稿，还没定，不能开工 |
| `accepted` | 已经确认，还没开始 |
| `active` | 正在做 |
| `done` | 做完并检查过 |
| `superseded` | 被新文档替代 |
| `wontfix` | 决定不修，只用于排查记录 |

决策记录确认后不改正文。要改就新写一份，旧的标 `superseded`，并注明被哪一份替代。

## 5. 目录索引

- `docs/README.md` 是仓库级索引；`docs/<项目>/README.md` 是项目索引。
- 每份文档只登记在一个索引里。新增、移动、删除文档时，同一次提交里更新索引。
- 索引只写编号、标题、状态和日期，不复制正文。
- 状态以文档开头为准，索引里的是给人看的视图，不是第二个来源。
- 没有登记的文档会被 `scripts/check-docs.sh` 报出来。

## 6. 什么时候写方案、怎么写

达到需要先写方案的条件时，先写一份方案再动手。哪些算需要、方案分哪八节、开工和完成的条件、写作要求，统一写在 [变更文档约定](../.dsh/conventions/change-docs.md)，这里不重复。

方案模板在 [`_templates/plan.md`](_templates/plan.md)。问题清单是方案里的一节，不单独写“问题文档”；长期有效的选择另写决策记录。

## 7. 文档要让人看懂

- 读者是项目所有者：懂需求和取舍，不一定读过实现。
- 专业词第一次出现时用一句话解释；能用日常中文说清，就不用术语。
- 不写口号、排比和空泛总结；一段只讲一件事，先结论后理由。
- 同一件事只写一处；表格只用来比较，叙述用段落。
- 有证据再下结论；没验证的写“待验证”。

更细的写作要求见 [变更文档约定](../.dsh/conventions/change-docs.md) 第 7 节。

## 8. 现有文档

### 仓库级

| 编号 | 状态 | 日期 | 文档 |
|---|---|---|---|
| `ADR-0001` | 已确认 | 2026-11-19 | [公共文档布局](ADR-0001-docs-layout.md) |
| `PLAN-2026-11-12-generic-rules-library` | 完成 | 2026-11-12 | [通用规则库设计](PLAN-2026-11-12-generic-rules-library.md) |

### 项目

| 项目 | 索引 | 当前方案 |
|---|---|---|
| films | [docs/films](films/README.md) | 原型转生产（草稿） |
