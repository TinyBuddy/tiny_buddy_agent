# TinyBuddy WebSocket 通信文档

## 1. WebSocket 服务器信息

- **服务器地址**: `ws://47.250.116.113:3143`（开发环境）
- **默认端口**: 3143
- **支持的消息格式**: JSON

## 2. 连接建立流程

### 2.1 前端连接初始化

前端需要在创建 WebSocket 连接时提供必要的配置参数，主要通过 URL 查询参数传递：

```javascript
const wsUrl = new URL('ws://47.250.116.113:3143');
wsUrl.searchParams.append('childID', childID);
if (childAge) {
  wsUrl.searchParams.append('childAge', childAge);
}
if (childInterests) {
  wsUrl.searchParams.append('childInterests', childInterests);
}
if (languageLevel) {
  wsUrl.searchParams.append('languageLevel', languageLevel);
}
if (gender) {
  wsUrl.searchParams.append('gender', gender);
}

const ws = new WebSocket(wsUrl.toString());
```

### 2.2 连接成功确认

连接成功后，服务器会立即返回 `connected` 类型的消息：

```json
{
  "type": "connected",
  "message": "WebSocket连接成功",
  "connectionId": "conn_1"  // 连接唯一标识
}
```

### 2.3 发送初始化消息

前端在连接建立后，需要发送 `initialize` 类型的初始化消息，提供儿童档案信息：

```javascript
const initMessage = {
  type: "initialize",
  childProfileId: childID,
  // 可选字段
  childAge: childAge,           // 儿童年龄
  childInterests: childInterests, // 儿童兴趣爱好，可为字符串或数组
  languageLevel: languageLevel,  // 语言水平，如 "L1"-"L5"
  gender: gender                 // 性别，可选值: "male", "female", "other"
};

ws.send(JSON.stringify(initMessage));
```

服务器收到初始化消息后，会返回 `initialized` 类型的确认消息，包含完整的儿童档案信息：

```json
{
  "type": "initialized",
  "childProfile": {"id": "...", "name": "...", "age": 8, ... },
  "message": "初始化成功"
}
```

## 3. 消息类型及格式

### 3.1 前端发送的消息类型

#### 3.1.1 用户输入消息 (`user_input`)

用于发送用户的对话内容：

```javascript
const wsMessage = {
  type: "user_input",
  userInput: "你好，TinyBuddy!",  // 用户输入内容
  childProfileId: "child1"       // 儿童档案ID
};

ws.send(JSON.stringify(wsMessage));
```

#### 3.1.2 心跳消息 (`ping`)

用于维护连接状态，前端会定期发送：

```javascript
ws.send(JSON.stringify({ type: "ping" }));
```


#### 3.1.3 连接检查消息 (`check_connection`)

用于检查服务器连接状态：

```javascript
ws.send(JSON.stringify({ type: "check_connection" }));
```

### 3.2 服务器返回的消息类型

#### 3.2.1 心跳响应 (`pong`)

服务器对前端 `ping` 消息的响应：

```json
{ "type": "pong" }
```

#### 3.2.2 处理中消息 (`processing`)

表示服务器正在处理用户请求：

```json
{ "type": "processing", "message": "正在处理您的请求..." }
```

#### 3.2.3 进度消息 (`progress`)

流式响应过程中的状态更新：

```json
{
  "type": "progress",
  "content": "状态信息...",
  "isFinal": false,
  "timestamp": "2024-05-20T12:34:56.789Z"
}
```

#### 3.2.4 字符级流式消息 (`stream_chunk`)

字符级流式输出的内容块，用于实现AI回复逐字显示的效果：

```json
{
  "type": "stream_chunk",
  "content": "AI回复的单个字符或字符片段",
  "isFinal": false,
  "timestamp": "2024-05-20T12:34:56.789Z"
}
```

#### 3.2.5 最终响应消息 (`final_response`)

用户请求处理完成后的最终结果：

```json
{
  "type": "final_response",
  "content": "完整的响应内容...",
  "isFinal": true,
  "timestamp": "2024-05-20T12:34:56.789Z"
}
```


#### 3.2.5 连接状态消息 (`connection_status`)

服务器连接状态信息：

```json
{
  "type": "connection_status",
  "status": "connected",
  "details": { /* 详细连接信息 */ },
  "timestamp": "2024-05-20T12:34:56.789Z"
}
```

#### 3.2.6 错误消息 (`error`)

操作失败时的错误信息：

```json
{
  "type": "error",
  "message": "错误描述信息...",
  "timestamp": "2024-05-20T12:34:56.789Z"  // 可选字段
}
```

## 4. 心跳机制

系统实现了心跳机制以保持连接活跃并检测断开情况：

1. **心跳发送**: 前端每 30 秒发送一次 `ping` 消息
2. **心跳响应**: 服务器收到 `ping` 后立即返回 `pong` 消息
3. **超时检测**: 如果 15 秒内未收到 `pong` 响应，则认为连接超时
4. **重连机制**: 连接断开后会尝试自动重连，采用指数退避策略，最多重连 10 次

## 5. 重连机制

当连接意外断开时，前端会自动尝试重连：

- **重连条件**: 非主动关闭连接（code !== 1000）且未超过最大重连次数
- **重连次数**: 最多 10 次
- **重连间隔**: 基础间隔 3 秒，采用指数退避策略，每次重连间隔翻倍，并添加随机抖动
- **最大间隔**: 30 秒


## 6. 典型交互流程

### 6.1 完整对话流程
1. 前端建立 WebSocket 连接
2. 服务器返回 `connected` 消息
3. 前端发送 `initialize` 初始化消息
4. 服务器返回 `initialized` 确认消息
5. 前端发送 `user_input` 用户输入消息
6. 服务器返回 `processing` 处理中消息
7. 服务器返回 `progress` 中间进度消息（可选，流式响应时使用）
8. 服务器返回多个 `stream_chunk` 字符级流式消息（可选，字符级流式响应时使用）
9. 服务器返回 `final_response` 最终响应消息

### 6.2 代码示例：基本通信实现

```javascript
// 创建WebSocket连接
const ws = new WebSocket('ws://47.250.116.113:3143?childID=test_child');

// 连接打开处理
ws.onopen = () => {
  console.log('连接已建立');
  // 发送初始化消息
  ws.send(JSON.stringify({
    type: 'initialize',
    childProfileId: 'test_child',
    childAge: '8',
    childInterests: '编程,科学,音乐',
    languageLevel: 'L3',
    gender: 'male'  // 可选值: "male", "female", "other"
  }));
};

// 接收消息处理
ws.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case 'connected':
        console.log('连接成功:', data.connectionId);
        break;
      case 'initialized':
        console.log('初始化成功:', data.childProfile);
        break;
      case 'processing':
        console.log('处理中:', data.message);
        break;
      case 'stream_chunk':
        console.log('收到流式内容块:', data.content);
        // 在UI中追加显示这个内容块，实现逐字显示效果
        break;
      case 'final_response':
        console.log('收到最终响应:', data.content);
        break;
      case 'error':
        console.error('发生错误:', data.message);
        break;
      default:
        console.log('收到消息:', data);
    }
  } catch (error) {
    console.error('解析消息失败:', error);
  }
};

// 连接关闭处理
ws.onclose = (event) => {
  console.log('连接已关闭:', event.code, event.reason);
};

// 发送用户输入
function sendUserMessage(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'user_input',
      userInput: message,
      childProfileId: 'test_child'
    }));
  }
}
```

## 8. 错误处理

系统实现了完善的错误处理机制，包括：

1. **连接错误处理**: 详细区分不同类型的连接错误并提供友好提示
2. **消息解析错误**: 对格式不正确的JSON消息进行处理
3. **操作失败错误**: 对各种操作失败情况返回明确的错误消息
4. **超时处理**: 对长时间无响应的连接进行超时处理
