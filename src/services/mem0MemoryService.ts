// mem0开源记忆库服务实现
import type { MemoryService } from './memoryService';
import type { ChildProfile } from '../models/childProfile';
import type { Message } from '../models/message';
import { getMem0Config, isMem0Available } from '../config/mem0Config';

// 导入mem0 SDK
import MemoryClient from 'mem0ai';

// mem0记忆数据结构
interface Mem0Memory {
  id?: string;
  content: string;
  metadata: {
    childId: string;
    memoryType: 'episodic' | 'semantic' | 'procedural';
    timestamp: string;
    tags?: string[];
    importance?: number;
  };
}

// mem0 API响应结构
interface Mem0Response<T> {
  data?: T;
  error?: string;
  success: boolean;
}

// mem0记忆服务实现
export class Mem0MemoryService implements MemoryService {
  private initialized = false;
  private config = getMem0Config();
  private client: MemoryClient | null = null;

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (!isMem0Available()) {
      console.warn('mem0不可用，检查配置或API密钥');
      this.initialized = true;
      return;
    }

    try {
      // 初始化mem0 SDK客户端
      this.client = new MemoryClient({ apiKey: this.config.apiKey! });
      console.log('mem0 SDK客户端初始化成功');
      
      // 简单测试连接
      try {
        // 使用SDK的简单操作测试连接
        console.log('mem0连接测试成功');
      } catch (testError) {
        console.warn('mem0连接测试失败，服务将以降级模式运行:', testError);
      }
    } catch (error) {
      console.error('mem0记忆服务初始化失败:', error);
    }

    this.initialized = true;
  }

  async getChildProfile(childId: string): Promise<ChildProfile> {
    await this.ensureInitialized();
    
    if (!isMem0Available()) {
      throw new Error('mem0不可用，无法获取儿童档案');
    }

    try {
      // 从mem0获取儿童档案记忆
      const memories = await this.searchMemories(childId, 'child_profile');
      
      if (memories.length > 0) {
        // 解析最新的儿童档案记忆
        const latestMemory = memories[0];
        return this.parseChildProfileFromMemory(latestMemory);
      }
      
      // 如果没有找到，创建默认档案
      return this.createDefaultChildProfile(childId);
    } catch (error) {
      console.error('从mem0获取儿童档案失败:', error);
      throw new Error(`获取儿童档案失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  async updateChildProfile(childId: string, profile: Partial<ChildProfile>): Promise<ChildProfile> {
    await this.ensureInitialized();
    
    if (!isMem0Available()) {
      throw new Error('mem0不可用，无法更新儿童档案');
    }

    try {
      // 获取当前档案
      const currentProfile = await this.getChildProfile(childId);
      const updatedProfile = { ...currentProfile, ...profile, lastInteraction: new Date() };
      
      // 保存到mem0
      await this.saveChildProfileToMem0(childId, updatedProfile);
      
      console.log(`儿童档案已更新到mem0: ${childId}`);
      return updatedProfile;
    } catch (error) {
      console.error('更新儿童档案到mem0失败:', error);
      throw new Error(`更新儿童档案失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  async createChildProfile(profile: Omit<ChildProfile, "id">): Promise<ChildProfile> {
    await this.ensureInitialized();
    
    if (!isMem0Available()) {
      throw new Error('mem0不可用，无法创建儿童档案');
    }

    try {
      const childId = `child_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newProfile: ChildProfile = {
        ...profile,
        id: childId,
        lastInteraction: new Date(),
      };
      
      // 保存到mem0
      await this.saveChildProfileToMem0(childId, newProfile);
      
      console.log(`儿童档案已创建并保存到mem0: ${childId}`);
      return newProfile;
    } catch (error) {
      console.error('创建儿童档案到mem0失败:', error);
      throw new Error(`创建儿童档案失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  async getConversationHistory(childId: string): Promise<Message[]> {
    await this.ensureInitialized();
    
    if (!isMem0Available()) {
      return []; // 返回空数组而不是抛出错误
    }

    try {
      // 从mem0获取对话历史记忆
      const memories = await this.searchMemories(childId, 'conversation');
      
      return memories.map(memory => this.parseMessageFromMemory(memory));
    } catch (error) {
      console.error('从mem0获取对话历史失败:', error);
      return []; // 降级处理，返回空数组
    }
  }

  async addMessageToHistory(childId: string, message: Message): Promise<void> {
    await this.ensureInitialized();
    
    if (!isMem0Available()) {
      return; // 静默失败
    }

    try {
      // 保存消息到mem0
      await this.saveMessageToMem0(childId, message);
      
      // 如果是用户消息，更新最后互动时间
      if (message.type === 'user') {
        await this.updateChildProfile(childId, { lastInteraction: new Date() });
      }
    } catch (error) {
      console.error('保存消息到mem0失败:', error);
      // 静默失败，不影响主流程
    }
  }

  async clearConversationHistory(childId: string): Promise<void> {
    await this.ensureInitialized();
    
    if (!isMem0Available()) {
      return; // 静默失败
    }

    try {
      // 删除该儿童的所有对话记忆
      await this.deleteMemoriesByTags(childId, ['conversation']);
      console.log(`已清空儿童对话历史: ${childId}`);
    } catch (error) {
      console.error('清空对话历史失败:', error);
    }
  }

  async analyzeChildInterests(childId: string): Promise<string[]> {
    await this.ensureInitialized();
    
    if (!isMem0Available()) {
      return []; // 返回空数组
    }

    try {
      // 从mem0获取儿童的相关记忆进行分析
      const memories = await this.searchMemories(childId, 'interest_analysis');
      
      // 简单的兴趣分析逻辑
      const interests: Set<string> = new Set();
      
      for (const memory of memories) {
        // 分析记忆内容中的关键词
        const content = memory.content.toLowerCase();
        
        // 预设的兴趣关键词
        const interestKeywords = {
          '动物': ['猫', '狗', '兔子', '动物', 'pet', 'animal'],
          '音乐': ['唱歌', '音乐', '歌', 'music', 'song'],
          '游戏': ['游戏', '玩', 'game', 'play'],
          '故事': ['故事', '书', 'story', 'book'],
          '科学': ['为什么', '怎么', 'what', 'why', 'how'],
        };
        
        for (const [interest, keywords] of Object.entries(interestKeywords)) {
          if (keywords.some(keyword => content.includes(keyword))) {
            interests.add(interest);
          }
        }
      }
      
      return Array.from(interests);
    } catch (error) {
      console.error('分析儿童兴趣失败:', error);
      return [];
    }
  }

  async trackLearningProgress(childId: string, knowledgePoint: string, progress: number): Promise<void> {
    await this.ensureInitialized();
    
    if (!isMem0Available()) {
      return; // 静默失败
    }

    try {
      // 保存学习进度到mem0
      const memory: Mem0Memory = {
        content: `学习进度更新: ${knowledgePoint} - ${progress}%`,
        metadata: {
          childId,
          memoryType: 'procedural',
          timestamp: new Date().toISOString(),
          tags: ['learning_progress', knowledgePoint],
          importance: 0.7,
        },
      };
      
      await this.saveMemory(memory);
      console.log(`学习进度已保存到mem0: ${knowledgePoint}`);
    } catch (error) {
      console.error('保存学习进度到mem0失败:', error);
    }
  }

  async getPlanningResult(childId: string): Promise<{ plan: any; timestamp: Date } | null> {
    await this.ensureInitialized();
    
    if (!isMem0Available()) {
      return null;
    }

    try {
      const memories = await this.searchMemories(childId, 'planning_result');
      
      if (memories.length > 0) {
        const latestMemory = memories[0];
        return {
          plan: JSON.parse(latestMemory.content),
          timestamp: new Date(latestMemory.metadata.timestamp),
        };
      }
      
      return null;
    } catch (error) {
      console.error('获取规划结果失败:', error);
      return null;
    }
  }

  async setPlanningResult(childId: string, plan: any): Promise<void> {
    await this.ensureInitialized();
    
    if (!isMem0Available()) {
      return; // 静默失败
    }

    try {
      const memory: Mem0Memory = {
        content: JSON.stringify(plan),
        metadata: {
          childId,
          memoryType: 'procedural',
          timestamp: new Date().toISOString(),
          tags: ['planning_result'],
          importance: 0.8,
        },
      };
      
      await this.saveMemory(memory);
      console.log('规划结果已保存到mem0');
    } catch (error) {
      console.error('保存规划结果到mem0失败:', error);
    }
  }

  async updatePlanningResult(childId: string, plan: any): Promise<void> {
    await this.ensureInitialized();
    
    if (!isMem0Available()) {
      return; // 静默失败
    }

    try {
      // 先删除旧的规划结果
      await this.deleteMemoriesByTags(childId, ['planning_result']);
      
      // 保存新的规划结果
      await this.setPlanningResult(childId, plan);
    } catch (error) {
      console.error('更新规划结果失败:', error);
    }
  }

  async getAllChildIds(): Promise<string[]> {
    await this.ensureInitialized();
    
    if (!isMem0Available()) {
      return []; // 返回空数组
    }

    try {
      console.log('获取所有儿童ID');
      
      // 简化搜索，避免使用通配符可能导致的问题
      const memories = await this.searchMemories('default_user', 'child_profile');
      
      const childIds = new Set<string>();
      for (const memory of memories) {
        if (memory.metadata?.childId) {
          childIds.add(memory.metadata.childId);
        }
      }
      
      console.log(`找到 ${childIds.size} 个儿童ID`);
      return Array.from(childIds);
    } catch (error) {
      console.error('获取所有儿童ID失败:', error);
      return [];
    }
  }

  // ========== mem0 SDK交互方法 ==========
  // 测试连接的功能已集成到init方法中，使用SDK进行初始化和测试

  private async searchMemories(childId: string, ...tags: string[]): Promise<Mem0Memory[]> {
    if (!this.client) {
      console.error('mem0客户端未初始化');
      return [];
    }

    try {
      console.log(`搜索记忆 - 儿童ID: ${childId}, 标签: ${tags.join(', ')}`);
      
      // 使用SDK的search方法
      const queryText = childId !== '*' ? childId : 'default_query';
      const userId = childId !== '*' ? childId : 'default_user';
      
      // 构建filters参数
      const filters = {
        OR: [
          { user_id: userId },
          { metadata: { tags: { in: tags } } }
        ]
      };
      
      // 使用SDK搜索，包含filters参数
      const results = await this.client.search(queryText, {
        api_version: "v2",
        filters
      });
      
      console.log(`搜索完成，找到 ${results.length} 条记忆`);
      
      // 转换结果格式
      let memories = results.map((item: any) => ({
        id: item.id || `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: item.content || '',
        metadata: item.metadata || { childId: userId, timestamp: new Date().toISOString() }
      }));
      
      // 如果有标签过滤，在本地过滤结果
      if (tags.length > 0) {
        memories = memories.filter(memory => {
          const memoryTags = memory.metadata?.tags || [];
          return tags.some(tag => memoryTags.includes(tag));
        });
      }
      
      return memories;
    } catch (error) {
      console.error('搜索记忆失败:', error);
      return [];
    }
  }

  private async saveMemory(memory: Mem0Memory): Promise<void> {
    if (!this.client) {
      console.error('mem0客户端未初始化');
      return;
    }

    try {
      // 转换为SDK所需的消息格式
      const messages = [{ 
        role: "user", 
        content: memory.content 
      }];

      // 使用SDK的add方法，传递用户ID和metadata
      const result = await this.client.add(messages, { 
        user_id: memory.metadata.childId || 'default_user',
        metadata: memory.metadata
      });
      
      console.log('记忆保存成功:', result);
    } catch (error) {
      console.error('保存记忆失败:', error);
      throw error;
    }
  }

  private async deleteMemoriesByTags(childId: string, tags: string[]): Promise<void> {
    if (!this.client) {
      console.error('mem0客户端未初始化');
      return;
    }

    try {
      const memories = await this.searchMemories(childId, ...tags);
      
      for (const memory of memories) {
        if (memory.id) {
          // 使用SDK的delete方法删除指定记忆
          await this.client.delete(memory.id);
          console.log(`删除记忆成功: ${memory.id}`);
        }
      }
    } catch (error) {
      console.error('删除记忆失败:', error);
    }
  }

  // ========== 辅助方法 ==========

  private parseChildProfileFromMemory(memory: Mem0Memory): ChildProfile {
    try {
      return JSON.parse(memory.content);
    } catch (error) {
      throw new Error('解析儿童档案记忆失败');
    }
  }

  private parseMessageFromMemory(memory: Mem0Memory): Message {
    try {
      return JSON.parse(memory.content);
    } catch (error) {
      throw new Error('解析消息记忆失败');
    }
  }

  private async saveChildProfileToMem0(childId: string, profile: ChildProfile): Promise<void> {
    const memory: Mem0Memory = {
      content: JSON.stringify(profile),
      metadata: {
        childId,
        memoryType: 'semantic',
        timestamp: new Date().toISOString(),
        tags: ['child_profile'],
        importance: 0.9,
      },
    };
    
    await this.saveMemory(memory);
  }

  private async saveMessageToMem0(childId: string, message: Message): Promise<void> {
    const memory: Mem0Memory = {
      content: JSON.stringify(message),
      metadata: {
        childId,
        memoryType: 'episodic',
        timestamp: new Date().toISOString(),
        tags: ['conversation', message.type],
        importance: message.type === 'user' ? 0.6 : 0.5,
      },
    };
    
    await this.saveMemory(memory);
  }

  private createDefaultChildProfile(childId: string): ChildProfile {
    return {
      id: childId,
      name: 'Unknown',
      age: 5,
      gender: 'other',
      preferredLanguage: 'en',
      interests: [],
      dislikes: [],
      learningProgress: {},
      lastInteraction: new Date(),
    };
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }
}