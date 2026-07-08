# Proposal: 工程师搭子（在线版）· bootstrap

## Why

OpenSpec 的 `/opsx:explore → propose` 能把想法变成规格，但它假设使用者会读代码、看得懂英文 spec。我们的两类用户不会——他们**知道自己难受，但说不清要做什么**。市面上的"prompt 速查站"（如内部 prompthub）是静态卡片，用户得自己判断该用哪张、自己填空。缺的是一个**会主动追问、帮你把模糊想法问成具体需求**的前门。

## What Changes

新建一个独立 Web 应用，实现：

- 一个**对话引擎**：扮演资深产品团队，按五阶段（摸清想法→划定范围→挑选做法→拆成步骤→打包交付）逐步澄清需求，每轮只问一件事，配最省力的交互（单选/多选/滑块/填空）。
- 一个**阶段追踪器**：实时显示用户在哪一步、本阶段还差哪些关键信息（gaps），全聊清才允许推进。
- 一个**领域路由**：开场单选区分"产品开发 / 直播代运营"，加载对应追问剧本与产出模板。
- 一个**交付引擎**，产出三样东西：阶段指令（粘给 coding 工具）、OpenSpec 提案包（proposal/tasks/spec delta，丢进 `changes/` 即可 apply）、展示书（给人看，含流程图/里程碑/风险）。
- 一个**薄代理**：藏 Key、转发 DeepSeek 请求、按场景选 flash / pro、做花费熔断与限流。

## Impact

- 受影响能力（全为新增）：`conversation-engine`、`deliverable-engine`、`backend-proxy`、`session-store`。
- 对接：产出物可直接进入既有 OpenSpec + Superpowers 流程，无需改动那条流水线。
- 风险面：模型返回非法 JSON、DeepSeek 额度/网络波动、提案包格式与本地 `/opsx:propose` 不一致、薄代理被滥用刷费——均在 design.md 给了对策。

## In Scope（v1 做）

- 两类用户的对话澄清全流程；五阶段 + gaps 展示。
- 三种产出物，其中 OpenSpec 提案包按官方标准结构产出。
- prompthub 50 卡转为可填充模板库并接入。
- 浏览器内保存当前会话与产出，可重开继续。
- 薄代理 + flash/pro 分层 + 花费熔断。

## Out of Scope（v1 先不做，留给 v2）

- 账号体系、登录、云端"我的项目库"、多设备同步。
- 数据库与服务端持久化（仅留接口）。
- 团队协作、权限、评审流转。
- 直接调用 Claude Code / opencode 自动执行（v1 只产出，由用户手动喂给 coding 工具）。
- 多语言、移动端原生 App。
