# 儿童重要记忆信息 API 对接文档

## 1. API 概述

本接口用于获取和存储儿童的重要记忆信息，适用于第三方系统与 TinyBuddy 平台进行集成，实现儿童重要信息的自动提取、存储和检索功能。

### 主要功能
- 从对话历史中自动提取儿童的重要信息（兴趣爱好、重要事件、家庭成员等）
- 将提取的重要信息存储到 mem0 记忆服务中
- 支持信息去重和合并
- 提供统一的错误处理和参数验证

## 2. API 端点

### 2.1 更新儿童重要记忆信息

```
POST /api/important-memories
```

**功能说明**：接收儿童ID和对话历史，提取重要信息并存储到mem0服务中。如果该儿童已有重要记忆，则进行更新和合并；否则创建新的记忆记录。

## 3. 请求参数

| 参数名 | 类型 | 必填 | 描述 |
|-------|------|-----|------|
| `child_id` | String | 是 | 儿童唯一标识符 |
| `chat_history` | Array<String> | 是 | 对话历史数组，包含需要分析的文本内容 |

### 请求示例

```json
{
  "child_id": "test_child_001",
  "chat_history": [
    "I like playing soccer and reading books",
    "My birthday is on June 15th",
    "I have a brother named Tommy and a sister named Lily",
    "My best friend is Sarah from school",
    "When I grow up, I want to be an astronaut and explore space"
  ]
}
```

## 4. 响应格式

### 4.1 成功响应

```json
{
  "success": true,
  "message": "Important memories updated successfully",
  "data": {
    "important_info": {
      "interests": ["playing soccer", "reading books"],
      "important_events": ["birthday on June 15th"],
      "family": ["brother named Tommy", "sister named Lily"],
      "friends": ["best friend Sarah"],
      "dreams": ["want to be an astronaut", "explore space"]
    },
    "stored_memory": {
      "id": "mem_123456",
      "content": "... 生成的记忆内容 ...",
      "metadata": {
        "child_id": "test_child_001",
        "created_at": "2023-06-20T10:30:00Z"
      }
    },
    "status": "updated" // 可能的值: "created", "updated", "merged"
  },
  "timestamp": "2023-06-20T10:30:00Z"
}
```

### 4.2 失败响应

```json
{
  "success": false,
  "message": "Failed to update important memories",
  "error": "Parameter validation failed",
  "details": [
    { "message": "child_id and chat_history are required parameters" }
  ],
  "timestamp": "2023-06-20T10:30:00Z"
}
```

## 5. 错误码说明

| 错误码 | 描述 | 可能原因 |
|-------|------|--------|
| 400 | 请求参数错误 | 缺少必填参数、参数类型错误 |
| 401 | 认证失败 | mem0 API Key无效或过期 |
| 404 | 资源不存在 | 服务器地址错误、端点不存在 |
| 500 | 服务器内部错误 | 服务器配置问题、mem0服务连接失败 |

## 6. 对接示例代码

### 6.1 Node.js 对接示例

```javascript
const axios = require('axios');

async function updateChildImportantMemories(childId, chatHistory) {
  try {
    const response = await axios.post('http://localhost:3142/api/important-memories', {
      child_id: childId,
      chat_history: chatHistory
    });
    
    if (response.data.success) {
      console.log('重要记忆更新成功:', response.data.data.important_info);
      return response.data.data;
    } else {
      console.error('更新失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('API调用错误:', error.message);
    if (error.response) {
      console.error('服务器响应:', error.response.status, error.response.data);
    }
    return null;
  }
}

// 使用示例
const childId = 'test_child_001';
const chatHistory = [
  "I like playing soccer and reading books",
  "My favorite food is pizza",
  "I have two pets: a dog named Max and a cat named Whiskers"
];

updateChildImportantMemories(childId, chatHistory)
  .then(result => {
    if (result) {
      console.log('操作状态:', result.status);
    }
  });
```

### 6.2 Python 对接示例

```python
import requests
import json

def update_child_important_memories(child_id, chat_history):
    url = "http://localhost:3142/api/important-memories"
    headers = {"Content-Type": "application/json"}
    data = {
        "child_id": child_id,
        "chat_history": chat_history
    }
    
    try:
        response = requests.post(url, headers=headers, data=json.dumps(data))
        response_data = response.json()
        
        if response_data.get("success"):
            print("重要记忆更新成功:", response_data.get("data", {}).get("important_info"))
            return response_data.get("data")
        else:
            print("更新失败:", response_data.get("message"))
            return None
    except Exception as e:
        print(f"API调用错误: {str(e)}")
        return None

# 使用示例
if __name__ == "__main__":
    child_id = "test_child_001"
    chat_history = [
        "I like playing soccer and reading books",
        "My favorite food is pizza",
        "I have two pets: a dog named Max and a cat named Whiskers"
    ]
    
    result = update_child_important_memories(child_id, chat_history)
    if result:
        print(f"操作状态: {result.get('status')}")
```

## 7. 故障排除指南

### 7.1 常见错误及解决方案

#### 7.1.1 mem0 API Key 认证失败 (401 错误)

**症状**：
- 服务器日志显示 `Given token not valid for any token type` 错误
- 响应状态码为 401

**解决方案**：
1. 确认 `.env` 文件中的 `MEM0_API_KEY` 值正确无误
2. 检查 API Key 是否过期，必要时从 mem0 控制台重新获取
3. 确保 API Key 格式正确，没有多余的空格或换行符

#### 7.1.2 环境变量配置问题

**症状**：
- mem0 服务状态显示 "未配置MEM0_API_URL"
- 系统无法连接到 mem0 服务

**解决方案**：
1. 确保 `.env` 文件中包含以下必要配置：
   ```
   MEM0_ENABLED=true
   MEM0_API_KEY=your_api_key_here
   MEM0_API_URL=https://api.mem0.ai
   ```
2. 重启服务器以应用环境变量更改

#### 7.1.3 服务器连接问题

**症状**：
- 测试脚本显示 "无法连接到服务器"
- 网络超时错误

**解决方案**：
1. 确认服务器正在运行 (`npm run dev`)
2. 验证服务器端口是否正确（通常为 3142）
3. 检查防火墙设置是否阻止了连接

### 7.2 测试和验证

使用项目中的测试脚本可以快速验证 API 功能：

```bash
# 运行测试脚本
node --loader ts-node/esm test_important_memories_api.ts
```

测试脚本会：
1. 调用 API 接口更新重要记忆
2. 检查 mem0 服务状态
3. 验证环境变量配置
4. 测试错误场景
5. 保存响应结果到 `test_results/` 目录

## 8. 注意事项

1. **安全考虑**：请妥善保管 API Key，避免暴露在客户端代码中
2. **性能优化**：对于大量对话历史，建议分批处理以避免请求过大
3. **数据隐私**：确保符合相关的数据隐私法规，保护儿童个人信息
4. **错误处理**：实现完善的错误处理机制，特别是对网络超时和服务不可用的情况
5. **API Key 更新**：定期检查 API Key 的有效性，及时更新过期的密钥

## 9. 支持和联系

如有任何问题或需要技术支持，请联系：
- 技术支持邮箱：support@tinybuddy.com
- 项目文档：https://docs.tinybuddy.com
- 紧急联系方式：+1-XXX-XXX-XXXX

---

*文档版本：v1.0.0*  
*更新日期：2023-06-20*