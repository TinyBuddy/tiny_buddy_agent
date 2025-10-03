// 消息模型
export interface Message {
  id: string;
  type: "user" | "agent" | "system";
  content: string;
  timestamp: Date;
  sender?: string;
  recipient?: string;
  emotions?: string[]; // 消息中包含的情感
  intent?: string; // 消息的意图
  metadata?: Record<string, unknown>;
}

// 对话历史模型
export interface ConversationHistory {
  childId: string;
  messages: Message[];
  lastUpdated: Date;
}

// 创建新消息
export const createMessage = (data: {
  type: "user" | "agent" | "system";
  content: string;
  sender?: string;
  recipient?: string;
  emotions?: string[];
  intent?: string;
  metadata?: Record<string, unknown>;
}): Message => ({
  id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  type: data.type,
  content: data.content,
  timestamp: new Date(),
  sender: data.sender,
  recipient: data.recipient,
  emotions: data.emotions,
  intent: data.intent,
  metadata: data.metadata,
});
