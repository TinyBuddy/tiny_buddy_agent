// Actor基础接口
import type { ChildProfile } from '../models/childProfile';
import type { Message } from '../models/message';
import type { KnowledgeContent } from '../models/content';

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
  process(input: {input: string; context: ActorContext; plan?: any}): Promise<{output: string; metadata?: Record<string, any>}>;
  
  // 获取Actor状态
  getState(): Record<string, any>;
  
  // 设置Actor状态
  setState(state: Record<string, any>): void;
}