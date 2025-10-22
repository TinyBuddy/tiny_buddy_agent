# TinyBuddy E2E 测试

本目录包含 TinyBuddy 项目的端到端（E2E）测试，特别是用于测试服务器聊天的流式输出功能。

## 测试文件说明

### chat_streaming_test.ts

这是一个测试服务器聊天流式输出功能的TypeScript脚本。它会：

1. 建立与TinyBuddy服务器的WebSocket连接
2. 发送初始化配置信息
3. 发送测试消息
4. 接收并记录流式输出数据
5. 计算测试结果（包括响应时间、流数据块数量等）
6. 输出详细的测试报告

### run_test.sh

这是一个便捷的shell脚本，用于快速运行测试。它会：

1. 检查TinyBuddy服务器是否已在运行
2. 如果服务器未运行，提示用户先启动服务器
3. 使用tsx运行chat_streaming_test.ts测试文件

## 如何运行测试

### 前提条件

1. 确保TinyBuddy服务器已经启动（可以使用 `npm run dev` 命令启动开发服务器）
2. 确保服务器监听在默认端口 3143 上

### 运行方法

在项目根目录下执行以下命令：

```bash
./e2e/run_test.sh
```

或者，也可以直接使用tsx运行测试文件：

```bash
npx tsx e2e/chat_streaming_test.ts
```

## 测试结果说明

测试完成后，你将看到以下信息：

- 连接状态和初始化信息
- 发送的测试消息
- 收到的每一块流数据
- 测试结果摘要，包括：
  - 流式响应总长度
  - 流数据块数量
  - 总耗时（毫秒）
  - 完整的流式响应内容
- 测试通过/失败状态

## 自定义测试

如果你想修改测试消息或其他参数，可以编辑 `chat_streaming_test.ts` 文件中的以下常量：

```typescript
const SERVER_URL = 'ws://localhost:3143'; // 服务器URL
const CHILD_ID = 'e2e_test_streaming'; // 儿童ID
const TEST_MESSAGE = '你好，TinyBuddy！我想测试一下你的流式输出功能。'; // 测试消息
```