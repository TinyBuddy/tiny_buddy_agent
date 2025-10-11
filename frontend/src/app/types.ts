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

// 配置参数接口
export interface ChatConfig {
  childID: string;
  childAge?: string;
  childInterests?: string;
}

// WebSocket初始化消息接口
export interface WebSocketInitData {
  type: "initialize";
  childProfileId: string;
  childAge?: string;
  childInterests?: string;
  languageLevel?: string;
  gender?: string;
}
