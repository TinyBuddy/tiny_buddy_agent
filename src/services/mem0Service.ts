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
      console.error('❌ MEM0_API_KEY未配置，mem0服务初始化失败');
      throw new Error('MEM0_API_KEY未配置');
    } else {
      console.log('✅ mem0服务初始化完成，使用真实API调用');
    }
    
    this.initialized = true;
  }
  
  async storeMemory(childId: string, content: string, metadata: Record<string, any> = {}): Promise<string> {
    try {
      console.log(`📝 存储记忆 - 儿童ID: ${childId}, 内容: ${content.substring(0, 50)}...`);
      
      const requestBody = {
        content,
        metadata: {
          ...metadata,
          childId,
          timestamp: new Date().toISOString(),
          app_id: 'tiny_buddy_agent',
          user_id: childId,
        },
      };

      const response = await fetch(`${this.baseUrl}/v1/memories`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('存储响应状态:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`mem0 API错误: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      // 确保返回一个有效的ID
      const memoryId = result.id || `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`✅ 存储成功，记忆ID: ${memoryId}`);
      return memoryId;
    } catch (error) {
      console.error('❌ 存储记忆失败:', error);
      throw error;
    }
  }
  
  /**
   * 检索记忆
   */
  async retrieveMemories(childId: string, query: string, limit: number = 5): Promise<Array<{
    id: string;
    content: string;
    metadata: Record<string, any>;
    timestamp: Date;
    relevance: number;
  }>> {
    try {
      console.log(`🔍 检索记忆 - 儿童ID: ${childId}, 查询: ${query}`);
      
      // 根据mem0 API文档格式构建请求体
      const filters = {
        OR: [
          { user_id: childId }
        ]
      };
      
      // 使用v2搜索接口
      const response = await fetch(`${this.baseUrl}/v2/memories/search/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          filters: filters,
          top_k: limit
        }),
      });
      
      console.log('搜索响应状态:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`mem0 API错误: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      const memories = result.memories || [];
      console.log(`✅ v2搜索成功，找到 ${memories.length} 条记忆`);
      
      // 确保返回正确的类型格式
      return memories.map((memory: any) => ({
        id: memory.id,
        content: memory.content,
        metadata: memory.metadata || {},
        timestamp: new Date(memory.timestamp || Date.now()),
        relevance: memory.relevance || 0
      }));
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
    try {
      console.log(`🗑️ 删除记忆 - ID: ${memoryId}`);
      
      // 使用v1接口删除记忆
      const response = await fetch(`${this.baseUrl}/v1/memories/${encodeURIComponent(memoryId)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('删除响应状态:', response.status, response.statusText);
      
      // 处理404错误，表示记忆不存在，视为删除成功
      if (response.status === 404 || response.status === 400) {
        console.log(`✅ 删除成功或记忆不存在`);
        return;
      }

      if (!response.ok) {
        // 尝试获取详细错误信息
        let errorDetail = '';
        try {
          errorDetail = await response.text();
        } catch (e) {
          // 如果无法获取详细信息，继续使用状态文本
        }
        throw new Error(`mem0 API错误: ${response.status} ${response.statusText}${errorDetail ? ` - ${errorDetail}` : ''}`);
      }

      console.log('✅ 删除成功');
    } catch (error) {
      console.error('❌ 删除记忆失败:', error);
      throw error;
    }
  }
  
  async getChildMemories(childId: string, limit: number = 10): Promise<Array<{
    id: string;
    content: string;
    metadata: Record<string, any>;
    timestamp: Date;
  }>> {
    try {
      console.log(`📚 获取儿童记忆 - 儿童ID: ${childId}`);
      
      // 使用v1接口通过URL参数传递过滤器
      const response = await fetch(`${this.baseUrl}/v1/memories?user_id=${encodeURIComponent(childId)}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('获取儿童记忆响应状态:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`mem0 API错误: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      // 处理不同格式的响应
      let memories: any[] = [];
      if (Array.isArray(result)) {
        memories = result;
      } else {
        memories = result.memories || [];
      }
      
      console.log(`✅ 获取成功，找到 ${memories.length} 条记忆`);
      
      // 确保返回正确的类型格式
      return memories.slice(0, limit).map((memory: any) => ({
        id: memory.id,
        content: memory.content,
        metadata: memory.metadata || {},
        timestamp: new Date(memory.timestamp || Date.now())
      }));
    } catch (error) {
      console.error('❌ 获取儿童记忆失败:', error);
      throw error;
    }
  }
  
  // 降级方案：使用v2接口获取儿童记忆
  private async fallbackGetChildMemories(childId: string, limit: number): Promise<Array<{
    id: string;
    content: string;
    metadata: Record<string, any>;
    timestamp: Date;
  }>> {
    console.log('尝试使用v2接口作为降级方案');
    const filters = {
      OR: [
        { user_id: childId }
      ]
    };
    
    const response = await fetch(`${this.baseUrl}/v2/memories/search/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: '', // 空查询返回所有记忆
        filters: filters,
        top_k: limit
      }),
    });
    
    if (!response.ok) {
      throw new Error(`mem0 API错误: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    const memories = result.memories || [];
    
    // 确保返回正确的类型格式
    return memories.map((memory: any) => ({
      id: memory.id,
      content: memory.content,
      metadata: memory.metadata || {},
      timestamp: new Date(memory.timestamp || Date.now())
    }));
  }
  
  async searchMemories(childId: string, query: string, limit: number = 5): Promise<Array<{
    id: string;
    content: string;
    metadata: Record<string, any>;
    timestamp: Date;
    relevance: number;
  }>> {
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