# `.dsh/` 索引 — {{PROJECT_NAME}}

> 根 `AGENTS.md` 是唯一自动加载入口；本目录按需读取，不要求一次读完。
> 这里只放「不依赖具体页面的纪律」和「本项目已落地的约定」，不放一次性任务记录。
> 用法：只取库的部分文件时，用本模板生成项目索引，删掉未安装的行。

## 目录

| 路径 | 级别 | 内容 | 何时读 |
|---|---|---|---|
| `rules/engineering-principles.md` | 核心 | 单一事实源、解耦、原子化、先复用、重构纪律 | 任何实现/修改前 |
| `rules/agent-discipline.md` | 核心 | 诚实、独立判断、范围控制、汇报结构 | 任何任务 |
| `rules/completion-verification.md` | 核心 | 「完成」的四层判定与证据 | 声称完成前 |
| `rules/silent-failure.md` | 核心 | 静默失败的形态与排查清单 | 结果不对/不报错时 |
| `conventions/layered-architecture.md` | 场景 | 分层、依赖方向、适配层 | 加模块、跨层改动 |
| `conventions/module-layout.md` | 场景 | 目录、文件边界、命名、导出 | 新建文件/拆文件 |
| `conventions/ui-system.md` | 场景 | 组件复用、设计 token、交互一致性 | 改 UI |
| `conventions/local-server.md` | 场景 | 回环监听、鉴权、白名单、上传校验 | 改本地服务/接口 |
| `conventions/data-and-assets.md` | 场景 | 字段消费链、空值语义、资源可复现 | 改数据/资源 |
| `conventions/verification.md` | 场景 | 本项目的验证范围与命令 | 改完/提交前 |
| `conventions/change-docs.md` | 场景 | 何时先写方案、方案/排查/决策的分工与准入 | 开工前、写方案/排查时 |
| `checklists/change.md` | 清单 | 单次改动自检 | 提交前 |
| `checklists/new-feature.md` | 清单 | 本项目扩展点清单 | 开工前 |
| `agents/subagent-playbook.md` | 手册 | 子 agent 分工、边界、验收 | 派子 agent 时 |
| `lessons/cross-project-pitfalls.md` | 教训 | 反复踩过的坑 | 设计/排查时 |

## 术语

| 词 | 含义 |
|---|---|
| 派生值 | 由主数据算出、不手写的值：统计、标签、排序结果、格式化输出 |
| 成对字段 | 同一实体上必须同时存在或同时为空的字段 |
| 静默失败 | 程序不报错、流程照走，但结果已经错了 |
| 完成四层 | 代码存在 → 被调用 → 被消费 → 持久化/可见 |

## 本项目补充

<!-- 项目专属约定写在这里，不要改动上面通用文件的判据 -->

- {{PROJECT_SPECIFIC_CONVENTION}}

## 规则怎么用

1. 硬约束在根 `AGENTS.md` 与 `rules/`；`conventions/` 是本项目取值，改项目事实时同步改这里。
2. 规则之间按主题互引，不复制同一段话；两处冲突时以根 `AGENTS.md` 为准并修掉另一处。
3. 只写「现在是什么」和「为什么」；不写日期、作者、版本、改动过程。
4. 新增规则的门槛：同类问题至少出现两次，或一次事故代价足够高。
5. 规则修改后要能被验证：能落成命令/检查的写成命令；不能机检的写清评审判据。
