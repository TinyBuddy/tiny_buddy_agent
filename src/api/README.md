# TinyBuddy API 文档

TinyBuddy 提供了一套 RESTful API，允许外部系统通过 HTTP 请求与儿童智能陪伴助手进行交互。以下是所有可用 API 端点的详细说明。

## 基础 URL

当服务器启动后，API 的基础 URL 为：`http://localhost:3141/api`

## API 端点列表

### 1. 健康检查

**GET** `/api/health`

用于检查服务器是否正常运行的简单端点。

**响应示例：**
```json
{
  "status": "ok",
  "version": "0.1.0",
  "timestamp": "2024-10-18T12:34:56.789Z"
}
```

### 2. 发送聊天消息

**POST** `/api/chat`

向指定儿童发送聊天消息并获取回复。

**请求参数：**
- `childId` (可选): 儿童 ID，默认为 `default_child`
- `message`: 聊天消息内容

**请求示例：**
```json
{
  "childId": "default_child",
  "message": "你好，TinyBuddy！"
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "message": "你好呀！我是TinyBuddy，很高兴和你聊天！",
    "childId": "default_child",
    "timestamp": "2024-10-18T12:34:56.789Z"
  }
}
```

### 3. 获取对话历史

**GET** `/api/history/:childId?`

获取指定儿童的对话历史记录。

**参数：**
- `childId` (可选): 儿童 ID，默认为 `default_child`

**响应示例：**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "msg_1234567890",
        "type": "user",
        "content": "你好，TinyBuddy！",
        "sender": "user",
        "timestamp": "2024-10-18T12:34:56.789Z"
      },
      {
        "id": "msg_1234567891",
        "type": "system",
        "content": "你好呀！我是TinyBuddy，很高兴和你聊天！",
        "sender": "tiny_buddy",
        "timestamp": "2024-10-18T12:34:57.123Z"
      }
    ],
    "childId": "default_child",
    "totalMessages": 2
  }
}
```

### 4. 清空对话历史

**POST** `/api/clear-history/:childId?`

清空指定儿童的对话历史记录。

**参数：**
- `childId` (可选): 儿童 ID，默认为 `default_child`

**响应示例：**
```json
{
  "success": true,
  "message": "对话历史已清空",
  "childId": "default_child"
}
```

### 5. 获取儿童档案

**GET** `/api/profile/:childId?`

获取指定儿童的档案信息。

**参数：**
- `childId` (可选): 儿童 ID，默认为 `default_child`

**响应示例：**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "default_child",
      "name": "小朋友",
      "age": 4,
      "interests": [],
      "learningProgress": {},
      "createdAt": "2024-10-18T12:34:56.789Z",
      "updatedAt": "2024-10-18T12:34:56.789Z"
    },
    "childId": "default_child"
  }
}
```

### 6. 更新儿童档案

**POST** `/api/profile/:childId?`

更新指定儿童的档案信息。

**参数：**
- `childId` (可选): 儿童 ID，默认为 `default_child`

**请求示例：**
```json
{
  "name": "小明",
  "age": 5,
  "interests": ["画画", "讲故事"]
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "default_child",
      "name": "小明",
      "age": 5,
      "interests": ["画画", "讲故事"],
      "learningProgress": {},
      "createdAt": "2024-10-18T12:34:56.789Z",
      "updatedAt": "2024-10-18T12:35:56.789Z"
    },
    "childId": "default_child"
  }
}
```

### 7. 分析儿童兴趣

**GET** `/api/interests/:childId?`

分析并获取指定儿童的兴趣爱好。

**参数：**
- `childId` (可选): 儿童 ID，默认为 `default_child`

**响应示例：**
```json
{
  "success": true,
  "data": {
    "interests": ["画画", "讲故事", "科学"],
    "childId": "default_child"
  }
}
```

## 错误处理

API 使用标准的 HTTP 状态码来表示请求的结果：
- `200 OK`: 请求成功
- `400 Bad Request`: 请求参数错误
- `500 Internal Server Error`: 服务器内部错误

错误响应格式：
```json
{
  "success": false,
  "error": "错误描述"
}
```

## 开发模式

当 `DEVELOPMENT_MODE=true` 环境变量设置时，API 将使用模拟响应，无需连接 OpenAI API。这对于开发和测试非常有用。

## 部署

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 生产部署

```bash
# 构建项目
npm run build

# 运行生产版本
npm start
```

### Docker 部署

```bash
# 构建 Docker 镜像
docker build -t tiny_buddy_agent .

# 运行 Docker 容器
docker run -p 3141:3141 --env-file .env tiny_buddy_agent
```

## 环境变量

- `PORT`: API 服务器端口，默认 3141
- `NODE_ENV`: 运行环境，开发环境设为 `development`
- `DEVELOPMENT_MODE`: 是否启用开发模式，启用设为 `true`