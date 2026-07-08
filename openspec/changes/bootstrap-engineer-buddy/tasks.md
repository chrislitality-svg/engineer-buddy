# Implementation Tasks

> 编号沿用 OpenSpec 清单格式（`## N. 阶段` + `- [ ] N.M`）。括号内 `Txxx` 为原计划任务号，便于追溯。

## 1. 脚手架

- [ ] 1.1 (T001) 初始化 monorepo：apps/web（Vite+React+TS+Tailwind）、apps/proxy
- [ ] 1.2 (T002) 搭薄代理：POST /api/chat，env 读 DEEPSEEK_API_KEY，CORS 限本站
- [ ] 1.3 (T003) 打通一条端到端假调用（前端→代理→DeepSeek→回显）

## 2. 对话引擎

- [ ] 2.1 (T010) 定义 protocol 类型（Turn / Interaction / Deliverables / Slots / Session）
- [ ] 2.2 (T011) 写系统提示词骨架 prompts/base + 产品开发语料
- [ ] 2.3 (T012) 实现 turn 循环：拼 messages、调代理(scope=chat)、收 JSON
- [ ] 2.4 (T013) JSON 解析与修复（剥围栏→抽 {}→降级为 message）
- [ ] 2.5 (T014) slots 账本：按 interaction.key 写入、累积、贯穿全程；落实"用户答案覆盖模型 slots_update"的优先级
- [ ] 2.6 (T015) 阶段/gaps 逻辑：前端按 slot 词典确定性算必填项、收齐判定、推进控制（gaps 以前端为权威）

## 3. 界面外壳（可复用原型）

- [ ] 3.1 (T020) StageSpine：五阶段脊柱 + gaps 便签 + 进度条
- [ ] 3.2 (T021) ChatThread：气泡、打字指示、markdown 渲染
- [ ] 3.3 (T022) Dock：single/multi/slider/text 四种交互控件
- [ ] 3.4 (T023) DeckPanel：三 tab 交付台、复制按钮、空态
- [ ] 3.5 (T024) 响应式与可达性（移动端切栏、键盘焦点、reduce-motion）

## 4. 交付引擎

- [ ] 4.1 (T030) 模板库：把 prompthub 50 卡结构化为 templates/*.json（id/stage/domains/required_slots/body_template）
- [ ] 4.2 (T031) 阶段指令生成器：按卡填充 → deliverables.prompt
- [ ] 4.3 (T032) 提案包生成：deliver 阶段调代理(scope=deliver, v4-pro) 产 openspec_pack
- [ ] 4.4 (T033) 提案包导出：打包为 changes/<id>/ 文件结构（zip / 分文件复制）；含 change_id 撞名检查
- [ ] 4.5 (T034) 展示书：showcase 结构渲染 + mermaid（含解析失败兜底）

## 5. 存储

- [ ] 5.1 (T040) StorageAdapter 接口 + LocalStorageAdapter 实现
- [ ] 5.2 (T041) 会话保存/恢复/列表；产出物保存
- [ ] 5.3 (T042) 预留 PgStorageAdapter 空实现 + 注释 v2 接法

## 6. 双剧本

- [ ] 6.1 (T050) 直播代运营提示词剧本：按 Part H 写 prompts/livestream（含行话词典 H5、二级路由 H3）
- [ ] 6.2 (T051) 直播专属模板：按 Part H4 建 templates/livestream/① -⑦ + 默认形态偏好接入

## 7. 收尾

- [ ] 7.1 (T060) 跑通验收用例（v1 验收标准全部）
- [ ] 7.2 (T061) 接生产配置，前端静态 + 代理挂 Nginx（**只新增 location/server 块，不改共享配置**）
- [ ] 7.3 (T062) README：如何把产出的提案包丢进 openspec/changes 并 /opsx:apply

## 8. 审计补强（建议·见 design.md C11）

- [ ] 8.1 (B4) 先建 slot 词典 `engine/slots.ts`：按 domain×stage 定义全部 slot 的 key/类型/必填/归属阶段，作为 gaps、模板、deliver 的唯一权威；**应在 2.6 与 4.1 之前完成**
- [ ] 8.2 (B11) 关键单测：JSON 容错解析器、scope→model 映射、slots 账本 reducer
- [ ] 8.3 (B3) 代理花费熔断：日花费上限 + 触顶告警 + 滥用防护（见 backend-proxy spec）
- [ ] 8.4 (B9) 移交前置：把 prompthub 50 卡正文与《从运营到经营者的思维转变》PPT 一并打包给施工方，否则 4.1 / 6.x 无法忠实执行
- [ ] 8.5 (B6) 校验缓存命中：路由后 system 冻结，用相同前缀连发两轮，确认第二轮按缓存价计费
