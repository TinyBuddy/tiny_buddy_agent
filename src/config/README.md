# 系统提示词配置指南

本项目通过全局配置文件管理系统提示词，使前端能够动态更新提示词而不需要修改代码。

## 配置文件结构

`agentConfig.ts` 文件包含以下主要内容：

- `defaultSystemPromptTemplate`: 默认系统提示词模板，定义了Sparky的角色、教学原则和对话规范等
- `currentSystemPromptTemplate`: 当前使用的系统提示词，可以通过WebSocket消息完全替换
- `updateSystemPromptTemplate`: 更新系统提示词的方法（完全替换）
- `resetSystemPromptTemplate`: 重置为默认系统提示词的方法
- `getFullSystemPrompt(childProfile)`: 获取完整的系统提示词（替换儿童信息）

## 通过WebSocket更新提示词

前端可以通过发送WebSocket消息来完全替换系统提示词。具体格式如下：

### 消息格式
```json
{
  "type": "update_prompt",
  "prompt": "你的全新系统提示词"
}
```

### 示例代码（前端）
```javascript
// 假设已有WebSocket连接实例 ws

// 发送更新提示词的消息
ws.send(JSON.stringify({
  type: "update_prompt",
  prompt: "你的全新系统提示词"
}));

// 监听服务器响应
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "prompt_updated") {
    console.log("提示词更新成功");
  } else if (data.type === "error") {
    console.error("提示词更新失败:", data.message);
  }
};
```

## 注意事项

1. 如果 `prompt` 参数为空，服务器会返回错误
2. 更新后的提示词会**完全替换**当前的系统提示词，而不是作为附加说明
3. 提示词更新后，所有新的对话都会使用更新后的提示词
4. 服务器重启后，提示词会重置为默认值
5. 如果需要恢复默认提示词，可以调用`resetSystemPromptTemplate()`方法

## 示例效果

原始提示词：
```
You are Sparky, a fuzzy dinosaur toy specifically designed as a Chinese language learning companion for 2-6 year old American children.
...
```

更新后提示词：
```
[你在前端输入的全新系统提示词]
```