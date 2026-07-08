## ADDED Requirements

### Requirement: 阶段指令产出

The system SHALL 在某阶段聊透后，基于该阶段 prompthub 模板与已收集 slot，产出可复制的阶段指令（含角色/目标/范围/任务/输出要求/验收清单）。

#### Scenario: 生成并可复制阶段指令

- **GIVEN** 当前阶段必填 slot 已收齐
- **WHEN** 触发产出
- **THEN** deliverables.prompt 为非空 markdown，交付台「阶段指令」页可一键复制

### Requirement: OpenSpec 提案包产出

The system SHALL 在 deliver 阶段用 v4-pro 依据全量 slot 产出 openspec_pack，包含 change_id、proposal_md、tasks_md 及至少一个 specs 项，可选 design_md；spec delta SHALL 使用 `## ADDED / MODIFIED / REMOVED / RENAMED Requirements` 段，每个 `### Requirement:` MUST 至少含一个 `#### Scenario:`，场景体 MUST 用加粗的 WHEN/THEN，需求强度用 SHALL/MUST/SHOULD/MAY。

#### Scenario: 产出可落盘且能通过校验的提案包

- **GIVEN** 五阶段均已聊透
- **WHEN** 用户触发"打包交付"
- **THEN** 系统产出 openspec_pack，可导出为 changes/<change_id>/ 下的 proposal.md、tasks.md、specs/<cap>/spec.md（design.md 视情况），且导出结果能通过 openspec validate

#### Scenario: 每个需求都带场景

- **GIVEN** v4-pro 正在生成 spec delta
- **WHEN** 写出任意一个 `### Requirement:`
- **THEN** 该需求下 MUST 至少有一个 `#### Scenario:`（4 个井号），场景用加粗 `- **WHEN**` / `- **THEN**`

### Requirement: 展示书产出

The system SHALL 产出面向人类的 showcase，含一句话总结、一段可渲染的 mermaid 流程图、里程碑与风险；mermaid 渲染失败时 SHALL 降级而非白屏。

#### Scenario: 渲染展示书

- **GIVEN** openspec_pack 已生成
- **WHEN** 打开「展示书」页
- **THEN** summary、mermaid 流程图、milestones、risks 正确渲染

#### Scenario: mermaid 语法错误时降级

- **GIVEN** 模型产出的 mermaid 含语法错误（如中文节点未加引号）
- **WHEN** 前端尝试渲染
- **THEN** 显示友好提示 + 原始 mermaid 文本 + 「重新生成」按钮，页面不白屏

### Requirement: 模板库驱动

The system SHALL 将 prompthub 50 卡作为可填充模板，按 stage 与 domain 匹配候选卡，并以卡的 required_slots 扩充当前阶段必填项；required_slots 引用的 key MUST 存在于 slot 词典中。

#### Scenario: 按阶段匹配候选卡并扩充必填项

- **GIVEN** 进入某一阶段且已知当前 domain
- **WHEN** 对话引擎拉取候选模板
- **THEN** 系统选出该 stage+domain 的候选卡，并把其 required_slots 并入本阶段必填项，驱动后续追问与 gaps
