# Proposal: 工程师搭子（在线版）

## Why

非技术用户无法把脑子里的模糊想法直接表达成可执行需求，导致 AI 编程工具无从下手。

## What Changes

新增"工程师搭子"对话式需求澄清工具：用户用大白话描述想法，系统扮演产品团队多轮追问，产出阶段指令 / OpenSpec 提案包 / 展示书三种产出物。

## Impact

覆盖两类用户：产品开发者 + 大家电直播代运营从业者。

## In Scope

- 五阶段对话引擎（discovery→scope→approach→plan→deliver）
- 两套领域剧本（product / livestream）
- 三种产出物生成与导出
- 浏览器端 LocalStorage 会话持久化

## Out of Scope

- 账号体系
- 服务端数据库（v2 预留 PgStorageAdapter）
- 移动端原生 App
