// 消息接口定义
export interface Message {
  sender: string;
  content: string;
}

// WebSocket消息数据接口
export interface WebSocketMessageData {
  type: string;
  userInput: string;
  childProfileId?: string;
}

// 更新提示词消息接口
export interface UpdatePromptMessageData {
  type: 'update_prompt';
  prompt: string;
}

// 配置参数接口
export interface ChatConfig {
  childID: string;
  prompt: string;
}