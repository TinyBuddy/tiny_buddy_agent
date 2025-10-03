// Actor基础接口
import type { ChildProfile } from "../models/childProfile";
import type { KnowledgeContent } from "../models/content";
import type { Message } from "../models/message";

// Actor上下文接口
export interface ActorContext {
  childProfile: ChildProfile;
  conversationHistory: Message[];
  knowledgeBase: KnowledgeContent[];
}

// Actor基础接口
export interface BaseActor {
  id: string;
  name: string;
  description: string;
  type: string;

  // 初始化Actor
  init(context?: ActorContext): Promise<void>;

  // 处理输入并生成输出
  process(input: {
    input: string;
    context: ActorContext;
    plan?: unknown;
  }): Promise<{ output: string; metadata?: Record<string, unknown> }>;

  // 获取Actor状态
  getState(): Record<string, unknown>;

  // 设置Actor状态
  setState(state: Record<string, unknown>): void;
}
