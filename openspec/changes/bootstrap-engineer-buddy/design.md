# Design: 工程师搭子（在线版）

## C1. 架构总览

```
[ 浏览器 React 应用 ]
   │  对话历史 + 当前状态
   ▼
[ 薄代理 /api/chat ]  ── 注入 DeepSeek Key、按 scope 选 flash/pro ──►  [ DeepSeek V4 ]
   ▲                                                                      │
   └──────────────── 结构化 JSON（一轮一个对象）◄────────────────────────┘
```

- 对话逻辑的"大脑"全在**系统提示词 + JSON 协议**里，不在代码里。换底座 = 改代理里两个 model 名。
- 前端是纯渲染层：收到 JSON → 画气泡、交互控件、阶段脊柱、交付台。
- 代理无状态；会话状态由前端持有并每轮回传。

## C2. JSON 协议（核心契约）

模型**每一轮只返回一个 JSON 对象**，不带任何解释或代码围栏：

```jsonc
{
  "stage": "discovery | scope | approach | plan | deliver",
  "stage_progress": 0,            // 本阶段聊清程度 0–100
  "gaps": ["最多3条：本阶段还没问清的关键点；都清了给 []"],
  "slots_update": {               // 本轮新收集到的结构化信息，累积进会话状态
    "key": "value"
  },
  "message": "对用户说的话，大白话，可用简单 markdown",
  "interaction": {
    "type": "single_select | multi_select | slider | text | none",
    "key": "slot 标识，回答会写进对应 slot",
    "label": "问题文字",
    "options": ["选项A", "选项B"],          // select 用
    "slider": { "min":1,"max":5,"minLabel":"","maxLabel":"","default":3 }, // slider 用
    "placeholder": ""                        // text 用
  },
  "deliverables": {               // 平时全 null；聊透对应阶段才给，一轮最多给一项
    "prompt": null,               // 阶段指令（string，markdown）
    "openspec_pack": null,        // 提案包（见 C5 结构对象）
    "showcase": null              // 展示书（见 C6 结构对象）
  }
}
```

前端处理：按 `interaction.type` 渲染控件；用户作答 → 把答案写进 `slots`、追加为一条 user 消息 → 回传全量 `messages` 调模型下一轮。`slots` 是贯穿全程的"需求账本"，最终由它驱动产出物生成。

**slots 写入优先级**：同一个 slot 可能被两处写入——模型的 `slots_update` 与前端按 `interaction.key` 落的用户答案。规则：**用户答案（前端）为权威，覆盖模型的 `slots_update`**；模型只能补充用户未填的 slot，不能改写用户已答的值。

**容错**：解析失败时，先剥 ```` ```json ```` 围栏，再抽取最外层 `{...}`；仍失败则把原文当作一条普通 `message` 显示，并追加一个 `text` 交互让用户继续，绝不白屏。

## C3. 五阶段模型（人话版 + 内部映射）

| 阶段 | 给用户看的名 | 要榨出的关键 slot | 映射 prompthub 卡类 |
|---|---|---|---|
| discovery | 摸清想法 | 做什么、给谁用、解决什么烦恼、现在怎么凑合的 | 需求规划 |
| scope | 划定范围 | 第一版必须有的、可以先砍的、明确不做的 | 需求规划 / 迭代决策 |
| approach | 挑选做法 | 形态（网页/小程序/工具）、关键取舍、预算/时间盘子 | 架构设计 |
| plan | 拆成步骤 | 分几块、先后顺序、每块"做完算合格"的标准 | 开发实现 / 测试审查 |
| deliver | 打包交付 | —（产出三样东西） | 全部模板汇总 |

gaps 逻辑：每个阶段预设一组"必填 slot"，未填满的就进 `gaps` 显示在阶段脊柱下方；填满则 `stage_progress→100`，提示可推进。

**gaps 权威源（消歧）**：以**前端按 slot schema 确定性计算**为准（可测、可控）；模型 JSON 里返回的 `gaps` 仅作"措辞参考"，不作推进判定依据。推进闸门 = 前端算出的必填 slot 是否收齐。

## C4. 系统提示词骨架

放在 `prompts/`，两套（产品开发 / 直播代运营）共享同一骨架，仅"领域语料/示例/默认形态"不同。骨架段落：

1. **角色**：资深产品团队（PM+全栈+测试），陪不懂代码的人把想法聊成可执行方案。
2. **服务对象**：两类用户描述（按路由注入其一为主）。
3. **五条铁律**：①大白话；②一轮一问 + 最省力交互；③讲清"每个选择能做到什么、花多少"；④边聊边判断阶段与 gaps；⑤同事语气，简短具体。
4. **五阶段定义 + 推进规则**。
5. **三种产出物的触发时机与格式**。
6. **JSON 输出契约**（C2 原样嵌入，强调"只返回 JSON"）。

> 提示词正文随产品迭代，是真正的产品 IP；本计划只锁定结构与契约。

## C5. 产出物①②：阶段指令 + OpenSpec 提案包

**阶段指令（`deliverables.prompt`）**：从 prompthub 对应卡片模板填充而来（见 C7），结构沿用卡片现有格式（角色/目标/范围/任务/输出要求/验收清单）。用于用户想单独解决某一环时，复制即粘给 coding 工具。

**OpenSpec 提案包（`deliverables.openspec_pack`）**：deliver 阶段由 `v4-pro` 依据全量 `slots` 生成，对象结构：

```jsonc
{
  "change_id": "kebab-case-名称",
  "proposal_md": "# Proposal: ...\n## Why ...\n## What Changes ...\n## Impact ...\n## In Scope ...\n## Out of Scope ...",
  "tasks_md": "# Implementation Tasks\n## 1. 阶段\n- [ ] 1.1 ...",
  "design_md": null,             // 可选：仅当技术方案非平凡时才产（架构取舍）；否则 null
  "specs": [
    {
      "capability": "kebab-case-能力名",
      "spec_md": "## ADDED Requirements\n### Requirement: ...\nThe system SHALL ...\n#### Scenario: ...\n- **WHEN** ...\n- **THEN** ..."
    }
  ]
}
```

前端可把它打成一个 zip（`changes/<change_id>/proposal.md`、`tasks.md`、`design.md`[可选]、`specs/<capability>/spec.md`），或直接在交付台展示并提供「复制各文件」。因为用户是**新建项目居多**，spec delta 基本只用 `## ADDED Requirements`。

> ✅ **格式已锁定（Fission-AI OpenSpec 官方结构）**，导出文件树：
>
> ```
> changes/<change_id>/
> ├── proposal.md          # ## Why / ## What Changes / ## Impact / ## In Scope / ## Out of Scope
> ├── tasks.md             # 编号清单：## 1. 阶段 → - [ ] 1.1 任务
> ├── design.md            # 仅当技术方案非平凡时才产（架构取舍）
> └── specs/<capability>/spec.md   # delta：## ADDED Requirements → ### Requirement → #### Scenario
> ```
>
> **校验硬规则（违反会被 `openspec validate` 拒或静默失败）**：
> 1. 每个 `### Requirement:` **必须至少有一个 `#### Scenario:`**。
> 2. Scenario **必须用且仅用 4 个井号**（`####`）；用 3 个井号或纯 bullet 会**静默失败**。
> 3. 场景体用**加粗**关键词：`- **WHEN** …` / `- **THEN** …`（可选 `- **GIVEN** …` 作前置）；**不要写不加粗的裸 WHEN/THEN**。
> 4. 需求强度用 RFC2119 关键词：SHALL / MUST / SHOULD / MAY。
> 5. 段落标题固定：`## ADDED Requirements` / `## MODIFIED Requirements` / `## REMOVED Requirements` / `## RENAMED Requirements`。
>
> 这就是 `/opsx:propose` 的标准产物，导出后可直接 `/opsx:apply`。

## C6. 产出物③：展示书（给人看）

`deliverables.showcase` 结构：

```jsonc
{
  "summary": "一句话总结这个项目要做成什么样",
  "mermaid": "flowchart TD; 节点用中文 ...",
  "milestones": [ { "when": "第1周", "what": "..." } ],
  "risks": [ "一句话风险" ]
}
```

前端用 mermaid 渲染流程图，里程碑/风险渲染成卡片。这是给用户/老板/客户看的，不进 coding 工具。

**mermaid 容错**：LLM 产出的 mermaid 常有语法错误（中文节点名尤需用引号包裹，如 `A["净化看板"]`）。渲染必须 try/catch：解析失败→显示一段友好提示 + 原始 mermaid 文本 + 「重新生成」按钮，绝不让展示书白屏。

## C7. prompthub 模板库接入（决策 5）

把 50 张卡结构化为 `templates/*.json`：

```jsonc
{
  "id": "P01",
  "title": "竞品分析",
  "stage": "discovery",
  "domains": ["product", "livestream"],
  "required_slots": ["product_definition", "target_segment"],
  "body_template": "…卡片正文，用 {{slot_key}} 占位…"
}
```

用法：对话引擎按当前阶段拉出候选卡 → 把卡的 `required_slots` 并入本阶段必填项（驱动追问与 gaps）→ slot 收齐后填充 `body_template` 生成阶段指令。这样产出质量**直接继承已打磨好的卡片**，开发量集中在"结构化 + 填充"而非"重写指令"。

> 注意（审计 B13）：prompthub 50 卡本质是**软件工程的提示词技巧**，对 product 域复用度高；**livestream 域请按 Part H 真写**，不要假设能从这批卡继承多少打磨度。`required_slots` 必须引用 C11 的 slot 词典里已定义的 key。

## C8. 模型分层与缓存（决策 3）

- 聊天每轮 → `deepseek-v4-flash`，请求参数：`response_format: { type: "json_object" }`，`thinking: { type: "disabled" }`（V4 的 thinking 是**对象**参数，不是布尔；关思考用 `{type:"disabled"}` 或省略，**不要写 `thinking: false`**）。
- 生成提案包/展示书 → `deepseek-v4-pro`，`thinking: { type: "enabled" }`，`reasoning_effort: "high"`。
- **请求结构**：`system`（稳定提示词，放最前）→ 历史 messages → 本轮内容。稳定前缀命中缓存，按缓存价计费（V4 Flash 约 1/50）。
- **缓存命中前提**：system 前缀须**逐字节稳定**。路由（产品/直播）选定后把 system **一次性拼好并冻结**，整场不再重拼，否则缓存前缀失配、永远命不中。
- 代理按请求体里的 `scope: "chat" | "deliver"` 字段决定用哪个 model，前端不碰 Key、不选 model。
- **`json_object` 兜底**：施工前实测 V4 是否仍支持 `response_format: json_object`；无论支持与否，**可靠性以 C2 的容错解析为准**，不假设接口有 JSON-schema 级强约束。

## C9. 薄代理设计（决策 1）

单文件服务，仅一个路由：

```
POST /api/chat
body: { scope: "chat"|"deliver", system, messages }
→ 注入 DEEPSEEK_API_KEY，map scope→model，转发 DeepSeek，透传返回
```

要求：CORS 限本站；**花费熔断 + 滥用防护**（见 backend-proxy spec 新增需求）；超时与错误规范化返回 `{error}`；不落任何日志含用户内容（合规）。不引数据库、不引 ORM。

**deliver 长任务**：`v4-pro` + `reasoning_effort:high` 生成提案包可能 30–90s。`scope=deliver` 的转发超时须单独放宽（建议 ≥120s），或开启流式；前端对 deliver 给明确的长进度态，别让用户以为卡死。

## C10. 存储与 v2 预留（决策 1）

```ts
interface StorageAdapter {
  saveSession(s: Session): Promise<void>;
  loadSession(id: string): Promise<Session | null>;
  listSessions(): Promise<SessionMeta[]>;
  saveDeliverable(sessionId: string, d: Deliverable): Promise<void>;
}
```

v1：`LocalStorageAdapter`（浏览器）。v2：`PgStorageAdapter`（接现有 Postgres）+ 账号。业务代码只依赖接口，换实现不改调用方。

---

## C11. 审计补强（建议·待你拍板）

> 以下为审计追加的待定决策，**不在原计划里**，单列出来供取舍；除非另行确认，施工方应把它们当作"应处理但尚未拍板"的开放项。已经直接落进 spec/参数的修正（B1 合法 delta、B2 thinking 参数、B3 花费熔断、B10 design_md、缓存冻结、mermaid 容错、deliver 超时、slots 优先级、gaps 权威）见上文对应小节。

- **B4. slot 词典（强烈建议先做）**：新增 `engine/slots.ts`，按 `domain × stage` 定义所有 slot 的 `key / 类型(text|number|string[]) / 是否必填 / 归属阶段`。它是 gaps 判定（C3）、模板 required_slots（C7）、deliver 依据"全量 slots"（C5）三者的**唯一权威词典**。不先定，模型会每轮自创 key、前端对不上号。对应 tasks 第 9 组。
- **B9. 交接资产自包含**：本计划引用但未内嵌两份原始资产——prompthub 50 卡**正文**、《从运营到经营者的思维转变》PPT。移交施工方前必须把这两份一起打包，否则 tasks 第 3 组（结构化卡片）与 Part H（直播剧本）无法忠实执行。
- **B11. 关键单测**：JSON 容错解析器（C2 剥围栏/抽 `{}`/降级）、scope→model 映射（C8）、slots 账本 reducer（C2 优先级）三处必须有单测——它们是高风险且最易测的件。
- **次要**：change_id 撞名需做碰撞检查或加后缀；Nginx 落地"只增不改"（已写入 project.md）。
