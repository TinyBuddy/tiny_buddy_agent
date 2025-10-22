# TinyBuddy Agent 重构计划

## 目标

- 支持3141端口console可视化UI测试
- 支持WebSocket流式调用第三方系统
- 确保agent真实调用DeepSeek LLM模型进行决策和规划

## 架构设计

### 1. 核心组件

- 保留现有的PlanningAgent和ExecutionAgent
- 重构服务器实现，添加WebSocket支持
- 加强知识库/记忆管理系统
- 实现流式响应机制

### 2. 数据流

- 用户输入 -> WebSocket -> PlanningAgent -> ExecutionAgent -> WebSocket -> 流式输出

### 3. 端口分配

- 3141: Console UI测试端口
- 3142: HTTP API端口
- 3143: WebSocket端口

## 实现步骤

1. 创建WebSocket服务器
2. 重构Agent调用流程
3. 实现流式响应
4. 增强Console UI
5. 整合所有组件
