## ADDED Requirements

### Requirement: 本地会话持久化

The system SHALL 通过 StorageAdapter 接口保存与恢复会话及产出；v1 实现为浏览器本地存储。

#### Scenario: 刷新后恢复

- **GIVEN** 用户进行到 plan 阶段
- **WHEN** 刷新页面
- **THEN** 对话历史、当前阶段与已生成产出被恢复

### Requirement: 存储实现可替换

The system SHALL 仅通过 StorageAdapter 访问持久化；切换为 Postgres 实现 SHALL NOT 需要修改业务代码。

#### Scenario: 切换存储实现不动业务代码

- **GIVEN** 业务代码仅依赖 StorageAdapter 接口、未直接调用 localStorage
- **WHEN** 把 LocalStorageAdapter 替换为 PgStorageAdapter
- **THEN** 业务调用方无需改动即可编译并运行，仅注入的实现不同
