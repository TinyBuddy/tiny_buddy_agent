// mem0记忆库服务集成
import { config } from 'dotenv';

// 加载环境变量
config();

// mem0记忆库服务接口
export interface Mem0Service {
  // 初始化服务
  init(): Promise<void>;
  
  // 记忆存储
  storeMemory(childId: string, content: string, metadata?: Record<string, any>): Promise<string>;
  
  // 记忆检索
  retrieveMemories(childId: string, query: string, limit?: number): Promise<Array<{
    id: string;
    content: string;
    metadata: Record<string, any>;
    timestamp: Date;
    relevance: number;
  }>>;
  
  // 记忆更新
  updateMemory(memoryId: string, content: string, metadata?: Record<string, any>): Promise<void>;
  
  // 记忆删除
  deleteMemory(memoryId: string): Promise<void>;
  
  // 获取儿童的所有记忆
  getChildMemories(childId: string, limit?: number): Promise<Array<{
    id: string;
    content: string;
    metadata: Record<string, any>;
    timestamp: Date;
  }>>;
  
  // 搜索相关记忆
  searchMemories(childId: string, query: string, limit?: number): Promise<Array<{
    id: string;
    content: string;
    metadata: Record<string, any>;
    timestamp: Date;
    relevance: number;
  }>>;
}

// mem0 API客户端实现
export class Mem0ApiService implements Mem0Service {
  private apiKey: string;
  private baseUrl: string;
  private initialized = false;
  
  constructor() {
    this.apiKey = process.env.MEM0_API_KEY || '';
    this.baseUrl = process.env.MEM0_BASE_URL || 'https://api.mem0.ai';
  }
  
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    if (!this.apiKey) {
      console.warn('⚠️ MEM0_API_KEY未配置，mem0服务将使用模拟模式运行');
    } else {
      console.log('✅ mem0服务初始化完成，使用API模式');
    }
    
    this.initialized = true;
  }
  
  async storeMemory(childId: string, content: string, metadata: Record<string, any> = {}): Promise<string> {
    if (!this.apiKey) {
      // 模拟模式
      const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`📝 [模拟] 存储记忆 - 儿童ID: ${childId}, 内容: ${content.substring(0, 50)}...`);
      return memoryId;
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/v1/memories`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          metadata: {
            ...metadata,
            childId,
            timestamp: new Date().toISOString(),
            // mem0 API要求的过滤器参数
            app_id: 'tiny_buddy_agent',
            user_id: childId,
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error(`mem0 API错误: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`✅ 记忆存储成功 - ID: ${result.id}`);
      return result.id;
    } catch (error) {
      console.error('❌ 存储记忆失败:', error);
      throw error;
    }
  }
  
  async retrieveMemories(childId: string, query: string, limit: number = 5): Promise<any[]> {
    if (!this.apiKey) {
      // 模拟模式
      console.log(`🔍 [模拟] 检索记忆 - 儿童ID: ${childId}, 查询: ${query}`);
      return [
        {
          id: 'mem_sim_1',
          content: '这是模拟的记忆内容',
          metadata: { childId, timestamp: new Date().toISOString() },
          timestamp: new Date(),
          relevance: 0.85
        }
      ];
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/v1/memories/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          filters: {
            childId,
          },
          limit,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`mem0 API错误: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.memories || [];
    } catch (error) {
      console.error('❌ 检索记忆失败:', error);
      throw error;
    }
  }
  
  async updateMemory(memoryId: string, content: string, metadata?: Record<string, any>): Promise<void> {
    if (!this.apiKey) {
      // 模拟模式
      console.log(`✏️ [模拟] 更新记忆 - ID: ${memoryId}`);
      return;
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/v1/memories/${memoryId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          metadata,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`mem0 API错误: ${response.status} ${response.statusText}`);
      }
      
      console.log(`✅ 记忆更新成功 - ID: ${memoryId}`);
    } catch (error) {
      console.error('❌ 更新记忆失败:', error);
      throw error;
    }
  }
  
  async deleteMemory(memoryId: string): Promise<void> {
    if (!this.apiKey) {
      // 模拟模式
      console.log(`🗑️ [模拟] 删除记忆 - ID: ${memoryId}`);
      return;
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/v1/memories/${memoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`mem0 API错误: ${response.status} ${response.statusText}`);
      }
      
      console.log(`✅ 记忆删除成功 - ID: ${memoryId}`);
    } catch (error) {
      console.error('❌ 删除记忆失败:', error);
      throw error;
    }
  }
  
  async getChildMemories(childId: string, limit: number = 20): Promise<any[]> {
    if (!this.apiKey) {
      // 模拟模式
      console.log(`📚 [模拟] 获取儿童记忆 - 儿童ID: ${childId}`);
      return [
        {
          id: 'mem_sim_1',
          content: '这是模拟的记忆内容1',
          metadata: { childId, timestamp: new Date().toISOString() },
          timestamp: new Date(),
        },
        {
          id: 'mem_sim_2',
          content: '这是模拟的记忆内容2',
          metadata: { childId, timestamp: new Date().toISOString() },
          timestamp: new Date(),
        }
      ];
    }
    
    try {
      // 使用POST方法搜索特定儿童的所有记忆
      const response = await fetch(`${this.baseUrl}/v1/memories/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: '', // 空查询返回所有记忆
          filters: {
            childId,
          },
          limit,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`mem0 API错误: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.memories || [];
    } catch (error) {
      console.error('❌ 获取儿童记忆失败:', error);
      throw error;
    }
  }
  
  async searchMemories(childId: string, query: string, limit: number = 5): Promise<any[]> {
    return this.retrieveMemories(childId, query, limit);
  }
}

// 记忆服务装饰器，用于在现有记忆服务基础上添加mem0功能
export class Mem0EnhancedMemoryService {
  private baseService: any; // 原有的记忆服务
  private mem0Service: Mem0Service;
  
  constructor(baseService: any) {
    this.baseService = baseService;
    this.mem0Service = new Mem0ApiService();
  }
  
  async init(): Promise<void> {
    await this.baseService.init();
    await this.mem0Service.init();
  }
  
  // 代理原有方法
  async getChildProfile(childId: string) {
    return this.baseService.getChildProfile(childId);
  }
  
  async updateChildProfile(childId: string, profile: any) {
    return this.baseService.updateChildProfile(childId, profile);
  }
  
  async createChildProfile(profile: any) {
    return this.baseService.createChildProfile(profile);
  }
  
  async getConversationHistory(childId: string) {
    return this.baseService.getConversationHistory(childId);
  }
  
  async addMessageToHistory(childId: string, message: any) {
    // 在添加消息到历史的同时，也存储到mem0
    const result = await this.baseService.addMessageToHistory(childId, message);
    
    // 异步存储到mem0
    this.storeMessageToMem0(childId, message).catch(error => {
      console.warn('存储消息到mem0失败:', error);
    });
    
    return result;
  }
  
  async clearConversationHistory(childId: string) {
    return this.baseService.clearConversationHistory(childId);
  }
  
  async analyzeChildInterests(childId: string) {
    return this.baseService.analyzeChildInterests(childId);
  }
  
  async trackLearningProgress(childId: string, knowledgePoint: string, progress: number) {
    return this.baseService.trackLearningProgress(childId, knowledgePoint, progress);
  }
  
  async getPlanningResult(childId: string) {
    return this.baseService.getPlanningResult(childId);
  }
  
  async setPlanningResult(childId: string, plan: any) {
    return this.baseService.setPlanningResult(childId, plan);
  }
  
  async updatePlanningResult(childId: string, plan: any) {
    return this.baseService.updatePlanningResult(childId, plan);
  }
  
  // mem0特有方法
  async storeMessageToMem0(childId: string, message: any): Promise<string> {
    const content = `${message.sender}: ${message.content}`;
    const metadata = {
      messageType: message.type,
      sender: message.sender,
      recipient: message.recipient,
      timestamp: message.timestamp || new Date().toISOString(),
    };
    
    return this.mem0Service.storeMemory(childId, content, metadata);
  }
  
  async getChildMemoriesFromMem0(childId: string, limit?: number) {
    return this.mem0Service.getChildMemories(childId, limit);
  }
  
  async searchMemoriesFromMem0(childId: string, query: string, limit?: number) {
    return this.mem0Service.searchMemories(childId, query, limit);
  }
  
  async retrieveRelevantMemories(childId: string, query: string, limit?: number) {
    return this.mem0Service.retrieveMemories(childId, query, limit);
  }
}

// 获取mem0服务实例
function getMem0Service(): Mem0Service {
  return mem0Service;
}

// 导出默认实例
export const mem0Service = new Mem0ApiService();
export { getMem0Service };