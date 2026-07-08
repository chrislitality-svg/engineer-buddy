## ADDED Requirements

### Requirement: 密钥保护

The system SHALL 仅在服务端持有 DeepSeek API Key；前端任何产物 SHALL NOT 包含 Key。

#### Scenario: 前端不含密钥

- **GIVEN** 构建后的前端静态资源
- **WHEN** 检索其内容
- **THEN** 不存在任何 DeepSeek Key

### Requirement: 按场景选模型

The system SHALL 依据请求 scope 字段映射模型：chat→deepseek-v4-flash，deliver→deepseek-v4-pro；chat 轮 SHALL 关闭思考（thinking 设为 disabled 或省略），deliver 轮 SHALL 开启思考并设 reasoning_effort 为 high。

#### Scenario: 聊天走 flash 且不思考

- **GIVEN** 请求 scope 为 "chat"
- **WHEN** 代理转发
- **THEN** 使用 deepseek-v4-flash，且不带 `thinking: false`（用 `{type:"disabled"}` 或省略）

#### Scenario: 交付走 pro 且开思考

- **GIVEN** 请求 scope 为 "deliver"
- **WHEN** 代理转发
- **THEN** 使用 deepseek-v4-pro，并带 `thinking:{type:"enabled"}` 与 `reasoning_effort:"high"`

### Requirement: 缓存友好与限流

The system SHOULD 保持稳定系统提示词位于请求最前以命中前缀缓存；SHALL 对接口做基础限流与超时控制，并规范化错误返回。deliver 场景的转发超时 SHALL 单独放宽（建议 ≥120s）以容纳长推理。

#### Scenario: 长推理的 deliver 不被过早掐断

- **GIVEN** 一个 scope 为 "deliver" 的请求，v4-pro 推理耗时约 60s
- **WHEN** 代理转发并等待
- **THEN** 在放宽后的超时内正常返回结果，不被默认短超时中断；若确实超时则返回规范化 {error}

### Requirement: 花费熔断与滥用防护

The system SHALL 维护一个服务端日花费上限；当累计花费触顶时 SHALL 拒绝后续请求并告警。代理 SHALL NOT 仅依赖 CORS 作为访问控制（CORS 仅浏览器侧生效，可被直接请求绕过），SHALL 叠加至少一种服务端侧防护（部署期注入的校验令牌 / 人机校验 / 速率与并发限制）。

#### Scenario: 触顶后拒绝

- **GIVEN** 当日累计花费已达配置上限
- **WHEN** 新的 /api/chat 请求到达
- **THEN** 代理返回明确的"额度已满"错误并触发告警，不再转发 DeepSeek

#### Scenario: 绕过 CORS 的直连被挡

- **GIVEN** 一个不带合法校验、非浏览器来源（如直接 curl）的请求
- **WHEN** 请求到达 /api/chat
- **THEN** 服务端侧防护拒绝该请求，而不是因 CORS 在浏览器外失效就放行
