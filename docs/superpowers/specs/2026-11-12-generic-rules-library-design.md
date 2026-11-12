# 通用规则库设计

## 1. 目标

把 `us_love/.dsh` 与 `reps_calculator/.dsh` 中「跨项目成立」的纪律、约定、清单、子 agent 手册、教训，去项目化后收进本仓库，形成一个**可直接铺到任意新项目**的规则库。

判定口径：一条内容能跨项目成立，当且仅当去掉项目专有名词（模块名、文件路径、端口、字段名、业务概念）后，判据仍然可执行、可验证。

## 2. 非目标

- 不收项目专属事实：字段表、接口表、端口、目录树、业务术语表。
- 不做规则引擎、不接自动化门禁。可机检的部分落成 `scripts/check.sh`，其余写成人工评审判据。
- 不复制 `ui-color-system` skill 本体：`~/.dsh/skills/ui-color-system` 已有全局副本，库内只登记来源与触发词，避免两份漂移。

## 3. 结构

```
AGENTS.md                     本库入口
README.md                     人读：分类索引、来源、外部经验引入判据
.dsh/
  README.md                   索引：路径 / 内容 / 何时读 / 核心或场景
  rules/                      核心，任何项目任何任务成立
    engineering-principles.md
    agent-discipline.md
    completion-verification.md
    silent-failure.md
  conventions/                场景，按技术面取用
    layered-architecture.md
    module-layout.md
    ui-system.md
    local-server.md
    data-and-assets.md
    verification.md
  checklists/
    change.md
    new-feature.md
  agents/subagent-playbook.md
  lessons/cross-project-pitfalls.md
templates/
  AGENTS.template.md          新项目入口骨架，{{PROJECT_NAME}} 等占位
  dsh-README.template.md      只取部分文件时用的项目索引骨架
scripts/
  install.sh                  铺库到目标项目
  check.sh                    禁用词、交叉引用、行数预算
docs/superpowers/specs/       设计文档
```

## 4. 内容来源与改写

底稿统一取 `us_love/.dsh` 对应文件（更完整），把 `reps_calculator/.dsh` 中可抽象的独有判据并入；两者冲突取更严格的一条。

| 目标文件 | 来源 | 改写要点 |
|---|---|---|
| rules/engineering-principles.md | us_love + reps | 保留 7 组原则与「拆分判断表」「评审快查」；共享函数举例全换成中性描述；删掉具体模块名 |
| rules/agent-discipline.md | us_love + reps | 事实先于服从、要么完成要么说做不到、汇报五段、范围控制、停止条件；几乎可整段沿用，删除项目名词 |
| rules/completion-verification.md | us_love + reps | 完成四层、虚假完成三型、声明前 7 项检查、证据格式；证据示例改中性命令 |
| rules/silent-failure.md | us_love + reps 并集 | 6 类形态 + 8 项审查清单；删「本项目已确认修复点」整节，改写成「通用排查顺序」 |
| conventions/layered-architecture.md | architecture.md | 保留分层图、依赖方向、适配层、数据流、加模块判定、禁止项；层名改成通用名（通用层/领域层/适配层/页面层/服务层） |
| conventions/module-layout.md | module-layout.md | 目录职责、文件边界、导出与命名、模块内部顺序、状态、临时文件、拆分示例；路径改占位 |
| conventions/ui-system.md | ui-system.md | 复用优先表、禁止第二套组件、token、交互一致性；删业务术语表，留「术语统一」判据 |
| conventions/local-server.md | server.md | 回环默认、token、静态白名单、上传校验、改完必重启；删端口/接口表 |
| conventions/data-and-assets.md | data-and-assets.md | 单一事实源、字段消费链、空值语义、资源可复现、离线优先；删字段表 |
| conventions/verification.md | verification.md | 按改动面选验证矩阵、基础命令模板、安全负向请求、验证边界、证据格式 |
| checklists/change.md | change.md | 范围/复用/原子化/数据/UI/验证/文档 七段，条目去项目化 |
| checklists/new-feature.md | new-feature.md | 新增页面/字段/类型/共享组件/接口/资源数据 六类扩展点，路径改占位 |
| agents/subagent-playbook.md | subagent-playbook.md | 何时派、角色边界、prompt 必含七项、主 agent 抽查断言、输出模板；删「本次审计的教训」，抽成通用条目 |
| lessons/cross-project-pitfalls.md | audit-refactor.md | 只留通用 10 条：提交漏 untracked、运行态旧代码、空值变零、半保存、派生多份实现、组件替换破坏旧数据、重构只清一半、删 id 打脸测试、子 agent 结论非事实、验证落到用户可见层 |

## 5. 改写硬规则

1. 不出现项目名词。禁用词清单见 `scripts/check.sh`，命中数必须为 0。
2. 举例必须中性：`<源码目录>`、`<数据文件>`、`某模块`、`领域层/统计模块`。
3. 命令写成模板：`for f in $(find <源码目录> -name '*.js'); do node --check "$f"; done`，并注明按项目替换。
4. 删除一切日期、版本、作者、变更叙事，以及项目事实型数量（某项目里出现了几个、有几行、端口多少）。规则阈值（300 行、60 行、连续 3 次失败）属于判据，保留。
5. 保留可执行判据：每条纪律尽量带「怎么算通过」。
6. 中文书写；单文件 ≤ 300 行；不复述代码，不注水。
7. 文件间交叉引用用相对路径，且目标必须存在。

## 6. install.sh 契约

```
scripts/install.sh <目标目录> [--dry-run] [--force]
```

- 默认只补齐不覆盖：目标已存在同名文件则跳过并列出。
- `--force` 才覆盖库文件，且先打印将被替换的完整清单再动手；`AGENTS.md` 永不参与覆盖（避免冲掉目标项目真实入口）。
- 任一写盘失败立即非零退出，不把失败计为「写入」。
- 复制 `.dsh/{rules,conventions,checklists,agents,lessons}` 与 `.dsh/README.md`；`AGENTS.md` 从模板渲染，仅当目标不存在时创建。
- 渲染时替换 `{{PROJECT_NAME}}`，其余占位符转成 `TODO(KEY)` 或 `TODO：说明`，保证装完不残留 `{{`。
- 目标目录不存在则报错退出，非零码。
- `--dry-run` 只打印动作，不写盘。
- 结束后打印：写入项、跳过项、需要人工填的位置。

## 7. 验证

1. `scripts/check.sh .`：禁用词 0 命中、交叉引用全部命中（同时认 markdown 链接与反引号里的 `.md` 路径，`templates/` 因路径按目标项目位置书写而跳过）、行数预算通过。
2. `scripts/install.sh --dry-run /tmp/<空目录>` 与真实安装各一次；校验生成结构与 `AGENTS.md` 无 `{{}}` 残留。
3. 对同一目标重复安装：第二次全部跳过（幂等）。
4. `--force` 覆盖路径单独在临时目录验证，不碰真实项目。
