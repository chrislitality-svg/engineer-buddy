# 工程师搭子（在线版）· 施工计划书（自包含 · 可直接施工）

> **执行者：Claude Sonnet 4.6**。这是一份自包含施工文档——你不需要任何额外对话上下文，读完即可从 Phase 0 开干。
>
> **怎么用本文档**：先读「§0 施工铁律」与「§2 必须采信的外部事实」（这两节专门防止你用过时知识翻车），再按「§7 分阶段任务」从 Phase 0 顺序实现。每做完一个 Phase 自测通过再进下一个。遇到标【需决策】的点，先停下来问用户。
>
> **同目录下 `openspec/changes/bootstrap-engineer-buddy/` 已有一份正式 OpenSpec 提案包**（proposal / design / tasks / specs），与本文档一致；**各能力的验收场景以那里的 `specs/*.md` 为准**。本文档是给你看的施工说明，那套 specs 是机器可校验的契约，两者不冲突。

---

## §0 施工铁律 / 防翻车清单（务必先读）

1. **大白话铁律**：所有面向用户的文案必须通俗。非用专业词不可时，紧跟一句"也就是…"的人话解释。这是产品的命根子。
2. **模型只返回 JSON**：对话的"大脑"在系统提示词 + JSON 协议里，**不在前端代码里**。前端只渲染。但**必须**实现 JSON 容错（见 §4.1），模型偶尔会吐脏数据。
3. **DeepSeek V4 模型名是真的**：`deepseek-v4-flash` / `deepseek-v4-pro` 是 2026-04 上线的**当前正式模型**。**别因为你没见过就换成 `deepseek-chat` / `deepseek-reasoner`**——那俩是旧名、2026-07-24 弃用。详见 §2。
4. **`thinking` 是对象参数，不是布尔**：写 `thinking: { type: "enabled" }` 或 `{ type: "disabled" }`，**绝不要写 `thinking: false`**。`reasoning_effort: "high"` 只在 deliver（v4-pro）用。
5. **OpenSpec 校验硬规则**（生成提案包时照做，违反会被 `openspec validate` 拒或静默失败）：每个 `### Requirement:` 至少一个 `#### Scenario:`；Scenario 用**且仅用 4 个井号**；场景体用**加粗**关键词 `- **WHEN**` / `- **THEN**`；需求强度用 SHALL/MUST/SHOULD/MAY。详见 §2。
6. **缓存命中靠稳定前缀**：系统提示词放请求最前、**逐字节稳定**。领域路由（产品/直播）选定后把 system **一次性拼好并冻结**，整场不再重拼，否则前缀失配、缓存永不命中（命中价约为原价 1/50，丢了很贵）。
7. **Key 只在服务端**：前端任何产物不得含 Key，一律走薄代理。代理**必须有日花费熔断**，不能只靠 CORS（CORS 仅浏览器侧生效，`curl` 直接绕过）。
8. **存储只走 `StorageAdapter`**：禁止业务代码直接 `localStorage.xxx`，否则 v2 换 Postgres 要重写。

---

## §1 产品是什么

**一句话**：给不懂技术的人一个"前门"——用大白话描述想做的东西，工具扮演资深产品团队（PM+全栈+测试）多轮追问，把模糊想法聊成可执行需求，最后产出能直接交给 AI 编程工具施工的提案包。

**两类用户**（开场单选路由）：
- **产品开发者**：做软件 / 网站 / 小工具。
- **大家电直播带货 / 代运营从业者**：做话术工具、复盘看板、活动页、内部小系统。默认不懂代码。

**三种产出物**：
1. **阶段指令**（`prompt`）——某一环聊透后产出，复制即可粘给 coding 工具。
2. **OpenSpec 提案包**（`openspec_pack`）——proposal / tasks / design / spec delta，丢进 `changes/` 即可 `/opsx:apply`。
3. **展示书**（`showcase`）——给人（老板/客户）看，含一句话总结 + mermaid 流程图 + 里程碑 + 风险。

---

## §2 必须采信的外部事实（2026-06 已核实，勿用旧知识推翻）

### DeepSeek V4 模型与参数

| 用途 | model | 关键参数 |
|---|---|---|
| 聊天每轮（便宜+缓存） | `deepseek-v4-flash` | `response_format:{type:"json_object"}`、`thinking:{type:"disabled"}`（或省略） |
| 生成提案包/展示书（质量） | `deepseek-v4-pro` | `thinking:{type:"enabled"}`、`reasoning_effort:"high"` |

- 端点：`https://api.deepseek.com/v1/chat/completions`（**OpenAI 兼容协议**；DeepSeek 不走 Anthropic 协议）。
- `deepseek-v4-flash` / `deepseek-v4-pro` 是当前正式名；旧名 `deepseek-chat`/`deepseek-reasoner` 2026-07-24 弃用，别用。
- V4 Flash 命中前缀缓存价 ≈ 未命中价的 **1/50**（约 98% 折扣）——所以 §0 铁律 6 的"冻结前缀"很值钱。
- `response_format: json_object`：施工前用一个最小请求实测 V4 是否仍支持；**无论支持与否，可靠性都以 §4.1 的容错解析兜底**，别假设接口有 JSON-schema 级强约束。

### OpenSpec（Fission-AI 官方）校验硬规则

提案包导出后要能过 `npx -y @fission-ai/openspec validate <change> --strict`。delta 文件（`specs/<capability>/spec.md`）格式：

```
## ADDED Requirements          ← 段标题固定（另有 MODIFIED / REMOVED / RENAMED Requirements）
### Requirement: <名字>
The system SHALL …             ← RFC2119：SHALL/MUST/SHOULD/MAY
#### Scenario: <名字>           ← 必须 4 个井号；每个 Requirement 至少一个 Scenario
- **GIVEN** …                  ← 可选前置，加粗
- **WHEN** …                   ← 加粗
- **THEN** …                   ← 加粗
```

> ⚠️ 三个最容易踩的：①有 Requirement 却没 Scenario → **静默失败**；②Scenario 用 3 个井号或纯 bullet → **静默失败**；③WHEN/THEN 不加粗 → 不规范。同目录 `openspec/.../specs/*.md` 已是合规范例，照着写。

来源（如需复核）：DeepSeek API 文档 `api-docs.deepseek.com`、OpenSpec 仓库 `github.com/Fission-AI/OpenSpec`。

---

## §3 技术栈与目录结构

- **前端**：Vite + React + TypeScript + Tailwind，单页应用，组件化。
- **后端**：一个极薄 Node 代理（Hono 或 Express，单文件级别），唯一职责藏 Key + 转发 + 选 model + 花费熔断。**不做数据库、不做账号、不做业务逻辑**。
- **图表/渲染**：`mermaid`、`marked`。
- **部署**：前端静态产物 + 代理，挂现有 Nginx（**只新增 location/server 块，不改共享配置**）。

```
engineer-buddy/
├── openspec/                       # 已存在：正式提案包（proposal/design/tasks/specs）
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── components/         # ChatThread / StageSpine / Dock / DeckPanel
│   │       ├── engine/             # protocol 类型、turn 循环、JSON 修复、slots.ts（slot 词典）
│   │       ├── prompts/            # base.ts / product.ts / livestream.ts
│   │       ├── templates/          # prompthub 卡 → 可填充模板（*.json）
│   │       ├── deliverables/       # prompt / openspec_pack / showcase 三个生成器
│   │       └── store/              # StorageAdapter + LocalStorageAdapter
│   └── proxy/                      # 薄代理（单文件）
└── package.json                    # monorepo（pnpm workspaces 或 npm workspaces）
```

---

## §4 核心契约（照此实现，别自由发挥）

### §4.1 每轮 JSON 协议

模型每一轮**只返回一个 JSON 对象**，无解释、无代码围栏：

```jsonc
{
  "stage": "discovery | scope | approach | plan | deliver",
  "stage_progress": 0,          // 本阶段聊清程度 0–100
  "gaps": ["最多3条：本阶段还没问清的关键点；都清了给 []"],
  "slots_update": { "key": "value" },   // 本轮新收集到的结构化信息，累积进会话状态
  "message": "对用户说的话，大白话，可用简单 markdown",
  "interaction": {
    "type": "single_select | multi_select | slider | text | none",
    "key": "slot 标识，回答写进对应 slot",
    "label": "问题文字",
    "options": ["选项A", "选项B"],
    "slider": { "min":1, "max":5, "minLabel":"", "maxLabel":"", "default":3 },
    "placeholder": ""
  },
  "deliverables": {             // 平时全 null；聊透对应阶段才给，一轮最多给一项
    "prompt": null,             // 阶段指令（markdown string）
    "openspec_pack": null,      // 见 §4.4
    "showcase": null            // 见 §4.4
  }
}
```

**前端处理**：按 `interaction.type` 渲染控件 → 用户作答写进 `slots`、追加为一条 user 消息 → 回传全量 `messages` 调下一轮。`slots` 是贯穿全程的"需求账本"，最终驱动产出物。

**slots 写入优先级**：同一 slot 可能被模型 `slots_update` 与前端 `interaction.key→答案` 双写。**用户答案为权威，覆盖模型值**；模型只能补充用户未填的 slot，不能改写用户已答的。

**JSON 容错（必须实现，可单测）**：解析失败 → 先剥代码围栏（三反引号 + 可选 `json`）→ 再抽取最外层 `{…}` → 仍失败则把原文当普通 `message` 显示并追加一个 `text` 交互让用户继续。**绝不白屏**。

### §4.2 slot 词典（初版 · 直接落到 `engine/slots.ts`）

这是 gaps 判定、模板 `required_slots`、deliver 依据"全量 slots"三者的**唯一权威词典**。先建它，再写 §4.3 的 gaps 和 §5.4 的模板（它们都引用这里的 key）。初版如下，可扩充：

```ts
// engine/slots.ts
export type SlotType = "text" | "number" | "string[]" | "single" | "multi";
export interface SlotDef {
  key: string;
  type: SlotType;
  stage: "discovery" | "scope" | "approach" | "plan" | "deliver";
  domains: ("product" | "livestream")[]; // 哪些域需要
  required: boolean;                       // 是否本阶段必填（驱动 gaps / 推进闸门）
  label: string;                           // 大白话问题
}

export const SLOTS: SlotDef[] = [
  // —— discovery ——
  { key: "product_one_liner", type: "text", stage: "discovery", domains: ["product","livestream"], required: true,  label: "一句话说说你想做个啥" },
  { key: "target_user",       type: "text", stage: "discovery", domains: ["product","livestream"], required: true,  label: "给谁用" },
  { key: "pain_point",        type: "text", stage: "discovery", domains: ["product","livestream"], required: true,  label: "解决什么烦恼" },
  { key: "current_workaround",type: "text", stage: "discovery", domains: ["product","livestream"], required: false, label: "现在没这东西时你怎么凑合的" },
  // 直播专属（开场二级路由）
  { key: "biz_pillar",  type: "single", stage: "discovery", domains: ["livestream"], required: true, label: "想给哪块经营搭工具", /* 业务流量/财务对账/主播话术/团队管理/还说不清 */ },
  { key: "buildable",   type: "single", stage: "discovery", domains: ["livestream"], required: true, label: "具体造什么", /* 见 §6 H4 七类 */ },
  { key: "data_origin", type: "single", stage: "discovery", domains: ["livestream"], required: true, label: "数据从哪来：手填 / 导出Excel / 有接口" },
  { key: "audience",    type: "single", stage: "discovery", domains: ["livestream"], required: false, label: "给谁看：自己 / 老板 / 品牌方 / 团队" },

  // —— scope ——
  { key: "must_have",         type: "string[]", stage: "scope", domains: ["product","livestream"], required: true,  label: "第一版必须有的" },
  { key: "nice_to_have",      type: "string[]", stage: "scope", domains: ["product","livestream"], required: false, label: "可以先砍的" },
  { key: "explicit_non_goals",type: "string[]", stage: "scope", domains: ["product","livestream"], required: false, label: "明确不做的" },

  // —— approach ——
  { key: "form_factor",  type: "single", stage: "approach", domains: ["product","livestream"], required: true,  label: "做成啥形态：网页 / 小程序 / 桌面工具 / 表格" },
  { key: "key_tradeoff", type: "text",   stage: "approach", domains: ["product","livestream"], required: false, label: "有没有必须保的、或愿意妥协的" },
  { key: "budget_time",  type: "single", stage: "approach", domains: ["product","livestream"], required: false, label: "时间盘子：两三天 / 一两周 / 一个月+" },

  // —— plan ——
  { key: "modules",       type: "string[]", stage: "plan", domains: ["product","livestream"], required: true,  label: "大概分几块" },
  { key: "done_criteria", type: "text",     stage: "plan", domains: ["product","livestream"], required: true,  label: "每块做到什么样算合格" },
];
// deliver 阶段不新增 slot，仅触发产出。
// 按 buildable（直播）可追加专属 slot，例：ROI看板 → key_metrics(multi)、alert_threshold(slider)。详见 §6 H4。
```

### §4.3 五阶段 + gaps 推进规则

| 阶段 | 给用户看的名 | 要榨出的关键 |
|---|---|---|
| discovery | 摸清想法 | 做什么 / 给谁 / 解决啥烦恼 / 现在怎么凑合 |
| scope | 划定范围 | 必须有的 / 可砍的 / 不做的 |
| approach | 挑选做法 | 形态 / 取舍 / 时间盘子 |
| plan | 拆成步骤 | 分几块 / 先后 / 每块合格标准 |
| deliver | 打包交付 | 产出三样东西 |

- **gaps 权威源**：由前端**确定性计算**——查 §4.2 词典里本阶段 `required:true` 且当前 domain 命中的 slot，哪些还空着就是 gaps，显示在阶段脊柱下。模型 JSON 里的 `gaps` **仅作措辞参考**，不作推进判定。
- **推进闸门**：本阶段必填 slot 收齐 → `stage_progress=100` → 提示进入下一阶段。未收齐不放行。

### §4.4 产出物结构

**OpenSpec 提案包**（deliver 阶段由 v4-pro 依据全量 slots 生成）：

```jsonc
{
  "change_id": "kebab-case-名称",
  "proposal_md": "# Proposal: …\n## Why …\n## What Changes …\n## Impact …\n## In Scope …\n## Out of Scope …",
  "tasks_md": "# Implementation Tasks\n## 1. 阶段\n- [ ] 1.1 …",
  "design_md": null,          // 可选：技术方案非平凡才产；否则 null
  "specs": [
    { "capability": "kebab-case-能力名",
      "spec_md": "## ADDED Requirements\n### Requirement: …\nThe system SHALL …\n#### Scenario: …\n- **WHEN** …\n- **THEN** …" }
  ]
}
```
导出为 `changes/<change_id>/proposal.md`、`tasks.md`、`design.md`(可选)、`specs/<capability>/spec.md`；前端提供「打 zip」或「分文件复制」。生成时严守 §2 的 OpenSpec 硬规则。`change_id` 落盘前做撞名检查（已存在则加后缀）。

**展示书**：

```jsonc
{
  "summary": "一句话总结要做成啥样",
  "mermaid": "flowchart TD; A[\"中文节点\"] --> B[\"...\"]",
  "milestones": [ { "when": "第1周", "what": "…" } ],
  "risks": [ "一句话风险" ]
}
```
> **mermaid 容错（必须）**：LLM 产的 mermaid 常有语法错（中文节点名要用引号包：`A["净化看板"]`）。渲染 try/catch，失败 → 友好提示 + 原始文本 + 「重新生成」按钮，不白屏。

---

## §5 模块设计

### §5.1 薄代理 `POST /api/chat`

```
body: { scope: "chat" | "deliver", system, messages }
→ 注入 DEEPSEEK_API_KEY → scope 映射 model（chat→flash, deliver→pro）
→ 按 model 补参数（见 §2 表）→ 转发 DeepSeek → 透传返回
```
要求：
- **CORS 限本站**，但 CORS 不算访问控制。
- **花费熔断【需决策手段】**：维护服务端日花费上限，触顶拒绝 + 告警。叠加至少一种服务端防护——部署期注入的校验令牌 / 人机校验 / 速率与并发限制。**具体选哪种问用户**（最低限度：硬性日花费上限 + 触顶告警，这条无论如何要有）。
- **deliver 超时单独放宽**（≥120s）：v4-pro + reasoning high 生成提案包可能 30–90s，别用默认短超时掐断；或开流式。
- 错误规范化返回 `{ error }`；**不落任何含用户内容的日志**（合规）。
- 不引数据库、不引 ORM。

### §5.2 模型分层与缓存

- 请求结构：`system`（稳定提示词，最前）→ 历史 messages → 本轮。稳定前缀命中缓存。
- §0 铁律 6：路由后 system 冻结。自测时用相同前缀连发两轮，确认第二轮按缓存价计费。
- 前端不碰 Key、不选 model；代理按 `scope` 决定。

### §5.3 系统提示词（`prompts/`）

两套（product / livestream）共享同一骨架，仅领域语料/示例/默认形态不同。**骨架必含段落**：①角色（资深产品团队，陪不懂代码的人把想法聊成方案）；②服务对象（按路由注入其一）；③五条铁律；④五阶段定义+推进规则；⑤三种产出物触发时机与格式；⑥JSON 输出契约（§4.1 原样嵌入，强调"只返回 JSON"）。

**五条铁律**（写进提示词正文）：①大白话；②一轮一问 + 最省力交互；③讲清"每个选择能做到什么、花多少"；④边聊边判断阶段与 gaps；⑤同事语气，简短具体。

**base 提示词初稿**（精炼版，可迭代——提示词正文是产品 IP，鼓励你打磨）：
```
你是一个资深产品团队（产品经理 + 全栈工程师 + 测试），正在陪一位【不懂代码】的用户，把他脑子里模糊的想法，聊成一份能交给程序员直接动手的方案。

铁律：
1. 全程说人话。必须用专业词时，立刻补一句"也就是…"的大白话解释，并说清它对用户有啥实际好处。
2. 每轮只问一个问题，并尽量给可点选的选项（单选/多选/滑块），能不让用户打字就不让。
3. 每给一个选择，顺带说清"选它能做到什么、大概花多少时间/钱"。
4. 你在心里把对话分成五步：摸清想法→划定范围→挑选做法→拆成步骤→打包交付。一步聊透了才往下走。
5. 像同事一样说话，简短、具体、不啰嗦。

你每一轮【只输出一个 JSON 对象】，格式见下（不要输出 JSON 以外的任何字）：
<这里嵌入 §4.1 的协议>
```

### §5.4 prompthub 模板接入 + 【需决策/降级】

模板结构 `templates/*.json`：
```jsonc
{ "id":"P01", "title":"竞品分析", "stage":"discovery",
  "domains":["product","livestream"], "required_slots":["product_one_liner","target_user"],
  "body_template":"…正文，用 {{slot_key}} 占位…" }
```
用法：对话引擎按当前 stage+domain 拉候选卡 → 把卡的 `required_slots` 并入本阶段必填项（必须是 §4.2 词典里已定义的 key）→ slot 收齐后填充 `body_template` 生成阶段指令。

> ⚠️ **【需决策 · B9】prompthub 50 卡的正文未随本文档提供**。两条路，问用户走哪条：
> - **A（理想）**：用户提供 prompthub 50 卡导出（JSON 或正文），你按上面结构化。产出质量直接继承打磨好的卡片。
> - **B（降级，不卡死）**：用户暂不提供 → 你**先定死模板 schema 与 §4.2 slot 词典，自拟一套最小可用模板**（每 stage×domain 各 1–2 张），全部标 `"_placeholder": true` + TODO 注释，端到端先跑通，待真实卡片替换。
>
> 注意：prompthub 卡本质是"软件工程的提示词技巧"，**product 域复用度高；livestream 域请按 §6 真写**，别假设能从那批卡继承多少。

### §5.5 存储

```ts
interface StorageAdapter {
  saveSession(s: Session): Promise<void>;
  loadSession(id: string): Promise<Session | null>;
  listSessions(): Promise<SessionMeta[]>;
  saveDeliverable(sessionId: string, d: Deliverable): Promise<void>;
}
```
v1 `LocalStorageAdapter`（浏览器）；预留 `PgStorageAdapter` 空实现 + 注释 v2 接法。业务代码只依赖接口（§0 铁律 8）。

---

## §6 直播代运营剧本（产品的另一半，照此写 `prompts/livestream` 与 `templates/livestream`）

**这类用户**：抖音家电直播代运营（运营/投手/场控/主播 leader），刚被要求"从运营升级到经营"，要对业务/财务/品牌/团队四块结果负责。不写代码，想做的几乎都是**轻量内部工具**（看板/表/话术卡/作战日历/打分）。

**默认形态偏好（写进 livestream 提示词）**：优先推**一个网页**；数据**先手填或贴 Excel 跑通，再谈接口**；不默认做 App、不默认接数据库。少谈技术，多问"这数你从哪拿、给谁看、多久更一次"。

**铁律补一条**（直播专属）：凡涉及"数据从哪来"必须问清——手填 / 贴表 / 导出文件 / 接口（落到 slot `data_origin`），它决定 v1 能不能两三天做出来。

**开场二级路由**（slot `biz_pillar` → `buildable`）：先单选"想给哪块经营搭工具"——业务流量 / 财务对账 / 主播话术 / 团队管理 / 还说不清；据此把对应可建造物设为候选。

**H4 · 七类可建造物**（每项：是什么 / 关键 slot / 默认形态）：
1. **大促作战日历**（业务）：平台节点拆成到点的执行动作。slot：节点(日期)、每节点动作、负责人、提醒方式。形态：网页日历/倒计时清单。
2. **目标激励 & ROI 看板**（业务/财务）：盯目标进度+偏差预警，量化千川投放产出。slot：目标口径(GSV/GMV/出库/结算)、要看指标(消耗/ROI/拍退ROI/达成率/离目标差多少)、`data_origin`、预警阈值、给谁看。形态：网页看板。
3. **财务口径对账表**（财务）：出库/GSV/GMV/结算/千川消耗/成本对齐一个口径。slot：涉及金额项、账期、对账频率、谁录入、最怕算错哪笔。形态：表格/网页对账页。
4. **产品对阵/选品表**（业务/品牌）：自家 vs 竞品(海尔/美的/容声)逐项对比，定每款角色(主推/收割/引流/质价比)。slot：自家产品线、竞品、对比维度、每款角色、谁用。形态：对比矩阵网页。
5. **主播讲解流程 & 话术工具**（主播）：讲解流程/话术关键词/展示动作结构化；营销三连(为什么买它/为什么现在买/为什么在我这买)；含退款、延迟发货、比价异议应对。slot：产品+卖点、当期活动(价/赠品/时间)、常见异议、物料、新主播还是老主播用。形态：话术卡片网页/可检索话术库。
6. **排班 + 数据化绩效/成长档案**（团队）：透明排班 + 可量化评分 + 主播成长阶段档案。slot：成员、排班规则、评分指标(必须可量化)、成长阶段、评分给谁看/是否影响收入。形态：网页表 + 打分页。
7. **（可选）短视频选题/脚本 + 行业调研**（业务）：飞瓜式快速调研、脚本/选题生成。slot：产品、目标人群、对标账号、素材类型。形态：网页生成器。

**H5 · 行话词典**（嵌进 livestream 提示词，仅供模型**听懂**，输出时**翻成人话**）：GSV/GMV=成交总额口径；出库=发货量；结算=平台实际打款；千川=抖音付费投放，千川消耗=投放花费；ROI/拍退ROI=投产比/扣退款后投产比；5A人群/A3人群=品牌人群资产分层(A3≈种草后高意向)；种草通/品专/DOU+=投放产品；公域/权重/蓝海红海=流量竞争术语；平台节点/大促节点=排期；赠品库/保价/延迟发货/拍单=履约与活动；场控/主播/leader/排班=团队角色；机皇/平嵌/双系统/净化率=家电卖点。
> 例：用户说"配个5A人群看板"，模型理解但回话说"做个能看清你这些客户处在哪个阶段、各有多少人的页面"。

**样例对话（校准体感）**：
```
用户（开场选"业务/流量"）
搭子：想先搭哪个？（单选：作战日历 / 投放ROI看板 / 人群资产看板 / 产品对阵表）
用户：投放ROI看板
搭子：好。这看板主要给谁看——你自己盯，还是给品牌方/老板看？（单选）
用户：给老板看
搭子：那得一眼看懂。最想让老板一眼看到哪个数？（多选：花了多少 / 投产比 / 离目标还差多少 / 拍退后的真实投产比）
用户：投产比 + 离目标还差多少
搭子：这些数你现在怎么拿到的？（单选：手动填 / 后台导出Excel / 有接口）
用户：导出Excel
搭子：明白，那第一版就做成"贴上Excel自动出图"，跑顺了再谈接口——两三天能用上。差多少要不要红色预警？（滑块：不用 ↔ 必须醒目）
…（聊透后产出：阶段指令 + OpenSpec提案包 + 展示书）
```

---

## §7 分阶段任务（按此顺序，地基先行）

> 每个 Phase 做完自测通过再进下一个。括号 `Txxx` 为可追溯编号。

**Phase 0 · 脚手架**
- (T001) 初始化 monorepo：apps/web（Vite+React+TS+Tailwind）、apps/proxy。
- (T002) 薄代理 `POST /api/chat`：env 读 `DEEPSEEK_API_KEY`，CORS 限本站，scope→model 映射 + 按 model 补参（§2 表）。
- (T003) 打通端到端假调用（前端→代理→DeepSeek→回显），顺便实测 `json_object` 是否支持。

**Phase 1 · 地基（务必先于对话逻辑）**
- (B4) 建 `engine/slots.ts` slot 词典（§4.2 初稿直接用）。
- (T010) protocol 类型：Turn / Interaction / Deliverables / Slots / Session。
- (T013) JSON 容错解析器（§4.1）——**配单测**。

**Phase 2 · 对话引擎**
- (T011) 系统提示词骨架 `prompts/base` + `prompts/product`（§5.3 初稿起步）。
- (T012) turn 循环：拼 messages、调代理(scope=chat)、收 JSON、冻结 system 前缀（§0 铁律 6）。
- (T014) slots 账本：写入/累积/贯穿，落实"用户答案覆盖模型"优先级——**配单测**。
- (T015) 阶段/gaps：前端按词典确定性算必填、收齐判定、推进闸门。

**Phase 3 · 界面外壳**
- (T020) StageSpine：五阶段脊柱 + gaps 便签 + 进度条。
- (T021) ChatThread：气泡、打字指示、markdown。
- (T022) Dock：single/multi/slider/text 四控件。
- (T023) DeckPanel：三 tab 交付台、复制按钮、空态。
- (T024) 响应式与可达性（移动端切栏、键盘焦点、reduce-motion）。

**Phase 4 · 交付引擎**
- (T030) 模板库：prompthub 50 卡结构化为 `templates/*.json`（**先确认 §5.4 走 A 还是 B**）。
- (T031) 阶段指令生成器：填充卡 → `deliverables.prompt`。
- (T032) 提案包生成：deliver 调代理(scope=deliver, v4-pro) 产 `openspec_pack`，严守 §2 OpenSpec 硬规则。
- (T033) 提案包导出：打 zip / 分文件复制；change_id 撞名检查。
- (T034) 展示书：showcase 渲染 + mermaid（含失败兜底）。

**Phase 5 · 存储**
- (T040) StorageAdapter 接口 + LocalStorageAdapter。
- (T041) 会话保存/恢复/列表 + 产出物保存。
- (T042) 预留 PgStorageAdapter 空实现 + v2 注释。

**Phase 6 · 直播剧本**
- (T050) `prompts/livestream`：按 §6 写（行话词典 H5、二级路由、默认形态偏好、铁律补充）。
- (T051) `templates/livestream/①–⑦`：按 §6 H4 建（含按 buildable 的专属 slot）。

**Phase 7 · 收尾**
- (T060) 跑通 §8 全部验收。
- (B11) 补关键单测：JSON 容错、scope→model 映射、slots reducer（若 Phase 1 未补）。
- (T061) 接生产：前端静态 + 代理挂 Nginx（**只增不改**）。
- (T062) README：如何把产出的提案包丢进 `openspec/changes` 并 `/opsx:apply`。

---

## §8 验收标准（做完算完）

1. 外行用户从开场到拿到提案包，全程**无需输入任何技术术语**也能走完。
2. 任意一轮，阶段脊柱准确显示"当前阶段 + 还缺什么"；缺口未清不放行。
3. 四种交互控件可用；能点选的不强迫打字。
4. deliver 产出的 `openspec_pack` 导出后能过 `npx -y @fission-ai/openspec validate <id> --strict`，并能 `/opsx:apply`。
5. 展示书 mermaid 能渲染；语法错时不白屏。
6. 前端构建产物**不含 Key**；聊天走 flash、交付走 pro，经代理验证；相同前缀第二轮命中缓存价。
7. 刷新页面后会话与产出可恢复。
8. 模型返回非法 JSON 时不白屏、能继续。
9. 两套剧本由开场单选切换；直播版按 §6 二级路由与可建造物工作，听得懂行话、用大白话回话。
10. 代理有日花费熔断；直连绕过 CORS 的请求被服务端侧防护挡下。

---

## §9 已知缺口与需决策点（开工前先和用户对一遍）

- **【需决策 B9】prompthub 50 卡正文**：未随文档提供。走 §5.4 的 A（用户给卡）还是 B（你自拟占位先跑通）？
- **【需决策 B3】花费熔断手段**：硬性日花费上限是底线（必须有）；额外防护选令牌 / 人机校验 / 限流哪种？或是否套 Cloudflare？
- **《从运营到经营者的思维转变》PPT**：§6 直播剧本已据其要点写成，无需原 PPT 即可施工；若用户手头有，可用于校正行话与 buildable 细节。
- **Nginx 落地**：现有 Nginx 红线"只增不改"——新增 location/server 块，不动共享配置。

---

## §10 与已生成 `openspec/` 树的关系

`openspec/changes/bootstrap-engineer-buddy/` 已有合规的 proposal / design / tasks / specs（4 个能力：conversation-engine / deliverable-engine / backend-proxy / session-store）。**那套 `specs/*.md` 是机器可校验的验收契约，与本文档一致**；本文档 §8 的验收点对应那里的 Scenario。你也可以把它当作"提案包长什么样"的活样例——你在 Phase 4 让模型生成的 `openspec_pack`，结构要和它一致。施工完成、自测通过后，按 OpenSpec 流程归档（`/opsx:archive`）沉淀进 `specs/`。

*——本文档自包含，可直接施工。先对齐 §9 的需决策点，再从 Phase 0 开干。*
