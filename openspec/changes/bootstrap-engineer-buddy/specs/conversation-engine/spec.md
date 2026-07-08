## ADDED Requirements

### Requirement: 大白话作答

The system SHALL 在所有面向用户的文案中使用通俗语言；当必须引入专业词时，SHALL 紧随一句通俗解释及其对用户的实际价值。

#### Scenario: 出现专业词时自动翻译

- **GIVEN** 模型需要提及一个技术概念（如"接口"）
- **WHEN** 该词出现在 message 中
- **THEN** message 同时包含一句"也就是…"的人话解释，且不出现未解释的黑话

### Requirement: 单步推进

The system SHALL 每一轮只问一个问题，并配一个交互控件（single_select / multi_select / slider / text）。

#### Scenario: 一轮一问

- **GIVEN** 用户提交了上一轮回答
- **WHEN** 模型返回下一轮
- **THEN** interaction 恰好对应一个待答问题，message 不堆叠多个提问

### Requirement: 阶段与缺口追踪

The system SHALL 维护当前 stage、stage_progress 与 gaps，并在每轮更新；gaps 非空时 SHALL NOT 提示推进到下一阶段。gaps 的推进判定 SHALL 以前端按 slot 词典确定性计算为权威，模型返回的 gaps 仅作措辞参考。

#### Scenario: 关键信息缺失时不推进

- **GIVEN** 当前阶段必填 slot 未收齐
- **WHEN** 模型返回该轮
- **THEN** gaps 列出缺失项，stage 不前进

#### Scenario: 信息收齐后允许推进

- **GIVEN** 当前阶段必填 slot 已收齐
- **WHEN** 模型返回该轮
- **THEN** gaps 为空，stage_progress 为 100，并自然过渡到下一阶段

### Requirement: 领域路由

The system SHALL 在开场以单选区分"产品开发 / 直播代运营"，并据此加载对应追问剧本与候选模板；路由选定后系统提示词 SHALL 一次性冻结，整场会话不再变更。

#### Scenario: 选择直播代运营

- **GIVEN** 用户在开场单选中选"直播带货 / 代运营"
- **WHEN** 进入后续对话
- **THEN** 系统使用直播剧本，示例与默认形态贴合该行业，且后续每轮的 system 前缀与首轮逐字节一致

### Requirement: 非法输出容错

The system SHALL 在模型返回非合法 JSON 时降级处理而非中断会话。

#### Scenario: 模型返回被围栏或夹带文字的 JSON

- **GIVEN** 模型返回包含 ```json 围栏或前后缀文字
- **WHEN** 前端解析
- **THEN** 先剥围栏、再抽取最外层 {…} 解析；若仍失败则将原文作为 message 展示并提供继续输入框

### Requirement: slot 写入优先级

The system SHALL 以用户在交互控件中提交的答案为 slot 的权威值，模型返回的 slots_update MUST NOT 覆盖用户已经回答过的同名 slot，仅可补充用户尚未填写的 slot。

#### Scenario: 模型试图改写用户已答的 slot

- **GIVEN** 用户已为某 slot 选定取值
- **WHEN** 后续某轮模型在 slots_update 里给同一 slot 返回了不同的值
- **THEN** 系统保留用户的取值，忽略模型对该 slot 的改写
