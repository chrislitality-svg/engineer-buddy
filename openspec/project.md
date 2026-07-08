# 工程师搭子（在线版）· project.md

> 这是 AI 理解整个工程的"世界观"文件，coding 工具每次都会读。

## 产品

工程师搭子是一个面向**非技术用户**的对话式需求澄清工具。用户用大白话描述想做的东西，工具扮演资深产品团队（PM + 全栈 + 测试），通过多轮问答把需求聊清，最终产出：(1) 可粘贴给 AI 编程工具的阶段指令；(2) 符合 OpenSpec 结构的项目提案包；(3) 给人看的展示书。

服务两类用户：**产品开发者**（做软件/网站/小工具）与**大家电直播带货/代运营从业者**（做话术工具、复盘看板、活动页、内部小系统）。默认用户**不懂代码**。

## 技术栈（v1）

- 前端：**Vite + React + TypeScript + Tailwind**。单页应用，组件化。
- 后端：**一个极薄的 Node 代理服务**（Hono 或 Express，单文件级别），唯一职责是藏住 DeepSeek API Key 并转发请求。**不做数据库、不做账号、不做业务逻辑**。
- 模型：DeepSeek V4，**OpenAI 兼容端点** `https://api.deepseek.com/v1/chat/completions`（DeepSeek 仅兼容 OpenAI 协议，不走 Anthropic 协议）。
  - 聊天每轮：`deepseek-v4-flash`，开启 JSON 输出模式（`response_format: { type: "json_object" }`），关闭思考（`thinking: { type: "disabled" }`）。
  - 生成提案包：`deepseek-v4-pro`，`thinking: { type: "enabled" }`、`reasoning_effort: "high"`。
- 存储：v1 用浏览器 `localStorage`，但通过 `StorageAdapter` 接口隔离，v2 换 Postgres 不改业务代码。
- 图表：`mermaid`（展示书流程图）、`marked`（markdown 渲染）。
- 部署：前端静态产物 + 代理服务，挂在现有 Nginx 后面（**只新增 location/server 块，不改共享配置**）。

> 模型事实（截至 2026-06）：`deepseek-v4-flash` / `deepseek-v4-pro` 为 DeepSeek V4 当前正式模型名（2026-04-24 上线）；旧名 `deepseek-chat` / `deepseek-reasoner` 将于 2026-07-24 弃用，不要用。V4 Flash 命中前缀缓存价约为未命中价的 1/50。

## 工程约定（给 AI 的硬规则）

1. **所有面向用户的文案必须是大白话**，禁止技术黑话；非用必要的专业词时，紧跟一句"也就是…"的人话解释。
2. **模型每轮只返回结构化 JSON**（见 design.md 的协议），前端只负责渲染，不在前端写对话逻辑。
3. **系统提示词放在请求最前面且保持稳定**，以吃满 DeepSeek 的前缀缓存（重复部分按缓存价计费，约为原价的 1/50）。**路由（产品/直播）选定后，system 一次性冻结，整场会话不再变更**，否则缓存前缀失配、命不中。
4. **不把 Key 写进前端任何地方**，一律走代理；代理须有**日花费上限熔断**与滥用防护。
5. 业务存储只能通过 `StorageAdapter` 调用，禁止直接 `localStorage.xxx`。
6. 组件、类型、提示词、模板四者分目录，互不耦合。

## 目录结构（目标）

```
engineer-buddy/
├── openspec/                      # 规格与变更（OpenSpec 管理）
├── apps/
│   ├── web/                       # 前端
│   │   ├── src/
│   │   │   ├── components/        # ChatThread / StageSpine / Dock / DeckPanel ...
│   │   │   ├── engine/            # protocol 类型、turn 处理、JSON 修复
│   │   │   ├── prompts/           # 系统提示词（产品开发 / 直播 两套）
│   │   │   ├── templates/         # prompthub 50 卡 → 可填充模板
│   │   │   ├── deliverables/      # 三种产出物的生成器
│   │   │   └── store/             # StorageAdapter + LocalStorageAdapter
│   └── proxy/                     # 薄代理（单文件）
└── package.json
```
