# TinyBuddy Agent

TinyBuddy是一个专为4-7岁儿童设计的智能助手Agent系统，可以通过多种方式进行交互：Console UI测试界面、HTTP API和WebSocket连接。

## 功能特点

- **友好的儿童交互**：专为4-7岁儿童设计，使用适合儿童的语言风格
- **多模态交互**：支持文本输入和流式响应输出
- **多接口支持**：同时提供Console UI、HTTP API和WebSocket接口
- **真实LLM模型**：基于DeepSeek的模型进行决策和规划
- **流式响应**：通过WebSocket实现流式输出，避免阻塞
- **健康检查**：提供连接状态和DeepSeek API连接测试功能

## 技术架构

- **主应用层**：`src/app.ts`实现TinyBuddy的核心功能和智能交互逻辑
- **HTTP服务器**：`src/api/server.ts`提供RESTful API接口
- **WebSocket服务器**：`src/api/webSocketServer.ts`提供实时流式通信接口
- **入口文件**：`src/index.ts`统一启动所有服务

## 安装与配置

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制`.env.example`文件并重命名为`.env`，然后填写必要的配置：

```bash
# DeepSeek API密钥
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# DeepSeek模型名称（可选，默认使用deepseek-chat）
DEEPSEEK_MODEL=deepseek-chat
```

### 3. 启动应用

```bash
npm start
```

应用启动后，会同时启动三个服务：
- **Console UI**：http://localhost:3141
- **HTTP API**：http://localhost:3142
- **WebSocket Server**：ws://localhost:3143

## 使用方式

### 1. Console UI测试

访问 http://localhost:3141 可以使用VoltAgent提供的可视化控制台测试TinyBuddy的功能。

### 2. HTTP API调用

可以通过HTTP请求与TinyBuddy交互，支持流式响应：

```bash
curl -X POST http://localhost:3142/api/chat \-H "Content-Type: application/json" \-d '{"userId":"child1","message":"你好啊"}'
```

### 3. WebSocket连接

可以通过WebSocket与TinyBuddy建立实时连接，接收流式响应：

1. **连接初始化**：
   ```javascript
   const socket = new WebSocket('ws://localhost:3143');
   socket.onopen = () => {
     socket.send(JSON.stringify({
       type: 'initialize',
       userId: 'child1'
     }));
   };
   ```

2. **发送消息**：
   ```javascript
   socket.send(JSON.stringify({
     type: 'user_input',
     userId: 'child1',
     message: '你能给我讲个故事吗？'
   }));
   ```

3. **接收流式响应**：
   ```javascript
   socket.onmessage = (event) => {
     const data = JSON.parse(event.data);
     if (data.type === 'agent_response') {
       console.log('接收到响应:', data.content);
       if (data.isFinal) {
         console.log('响应完成');
       }
     }
   };
   ```

### 4. 连接检查

可以通过WebSocket检查DeepSeek API连接状态：

```javascript
socket.send(JSON.stringify({
  type: 'check_connection',
  userId: 'child1'
}));
```

## 项目结构

```
src/
  ├── api/                # API相关文件
  │   ├── server.ts       # HTTP服务器实现
  │   ├── webSocketServer.ts # WebSocket服务器实现
  │   └── webSocketClientExample.ts # WebSocket客户端示例
  ├── app.ts              # 主应用实现
  └── index.ts            # 应用入口文件
.env.example              # 环境变量配置示例
package.json              # 项目依赖配置
README.md                 # 项目文档
```

## 开发说明

1. 修改应用逻辑：编辑`src/app.ts`文件
2. 修改API端点：编辑`src/api/server.ts`文件
3. 修改WebSocket逻辑：编辑`src/api/webSocketServer.ts`文件

## 服务端口配置

- **Console UI**: 3141
- **HTTP API**: 3142
- **WebSocket Server**: 3143

## 支持的消息类型

### WebSocket消息类型

- `initialize`: 初始化连接和用户会话
- `user_input`: 发送用户输入
- `agent_response`: 接收Agent响应（服务器发送）
- `ping`: 心跳消息
- `check_connection`: 检查DeepSeek API连接状态
- `connection_status`: 连接状态响应（服务器发送）

## 注意事项

1. 确保已正确配置DeepSeek API密钥
2. 本应用专为儿童设计，请确保使用适当的内容过滤机制
3. 在生产环境中，请确保保护好API密钥和用户数据

## License

MIT License