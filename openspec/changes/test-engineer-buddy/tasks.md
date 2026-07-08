# Implementation Tasks

## 1. 脚手架与代理
- [x] 1.1 初始化 monorepo（apps/web + apps/proxy）
- [x] 1.2 薄代理 POST /api/chat，注入 API Key，scope→model 路由

## 2. 对话引擎
- [x] 2.1 SLOTS 词典（17 个 slot，覆盖 5 阶段 2 域）
- [x] 2.2 JSON 容错解析器（4 策略 + 白屏防护）
- [x] 2.3 系统提示词（product / livestream 两套）
- [x] 2.4 turn 循环 + frozenSystem 前缀

## 3. 界面
- [x] 3.1 StageSpine 五阶段脊柱
- [x] 3.2 ChatThread 气泡 + markdown
- [x] 3.3 Dock 四控件（single/multi/slider/text）
- [x] 3.4 DeckPanel 三 tab 交付台

## 4. 交付引擎
- [x] 4.1 模板库（prompthub 50 卡 + livestream 7 卡）
- [x] 4.2 阶段指令生成器
- [x] 4.3 OpenSpec 提案包生成（v4-pro）
- [x] 4.4 ZIP 导出

## 5. 存储
- [x] 5.1 StorageAdapter 接口
- [x] 5.2 LocalStorageAdapter 实现
- [x] 5.3 会话保存/恢复/列表
