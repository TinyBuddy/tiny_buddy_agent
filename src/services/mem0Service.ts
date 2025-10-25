import MemoryClient from 'mem0ai';

// mem0 API配置 - 在类内部动态获取
let mem0Client: MemoryClient | null = null;

// 获取mem0客户端实例的函数
function getMem0Client(): MemoryClient {
  if (!mem0Client) {
    const MEM0_API_KEY = process.env.MEM0_API_KEY;
    const MEM0_ENABLED = process.env.MEM0_ENABLED === 'true';
    
    // 验证必要的配置
    if (MEM0_ENABLED && !MEM0_API_KEY) {
      console.error('警告: mem0已启用但未配置API密钥，请检查MEM0_API_KEY环境变量');
    }
    
    mem0Client = new MemoryClient({ 
      apiKey: MEM0_API_KEY || '' 
    });
  }
  return mem0Client;
}

// 应用ID配置
const APP_ID = process.env.MEM0_APP_ID || 'tiny_buddy_agent';

// 第三方系统接口请求定义
export interface UpdateImportantMemoriesRequest {
  child_id: string;
  chat_history: string[]; // 历史对话记录数组
}

// 重要记忆信息接口
export interface ImportantInfo {
  interests: string[];      // 兴趣爱好
  importantEvents: string[]; // 重要事件
  familyMembers: string[];   // 家庭成员
  friends: string[];         // 朋友伙伴
  dreams: string[];          // 理想梦想
}

// 记忆存储接口
export interface ImportantMemory {
  id: string;
  content: string;
  metadata: {
    child_id: string;
    important_info: ImportantInfo;
    created_at: string;
    updated_at: string;
  };
}

// 扩展关键信息提取正则表达式 - English patterns
const INTEREST_PATTERNS = [
  // 改进的模式：支持更灵活的自然语言表达
  /I like(?:s)?\s+(.+?)(?:\s+and\s+|\s*$)/gi,  // "I like drawing and playing soccer"
  /like(?:s)?\s+(?:movies|music|games|toys|colors|food|activities|animals):?\s*([^,.;!\n]+)/gi,
  /interested in:?\s*([^,.;!\n]+)/gi,
  /want(?:s)?\s+to\s+([^,.;!\n]+)/gi,
  /hobby(?:ies)?:?\s*([^,.;!\n]+)/gi,
  /favorite(?:s)?(?:\s+thing)?:?\s*([^,.;!\n]+)/gi,
  /enjoy(?:s)?\s+([^,.;!\n]+)/gi,
  /I enjoy(?:s)?\s+(.+?)(?:\s+and\s+|\s*$)/gi,  // "I enjoy reading books"
];

const IMPORTANT_EVENT_PATTERNS = [
  // 改进的模式：支持自然语言表达
  /(?:Today is|my|I have a)\s+birthday\s*(.+)?/gi,  // "Today is my birthday"
  /birthday:?\s*([^,.;!\n]+)/gi,
  /exam(?:s)?:?\s*([^,.;!\n]+)/gi,
  /got(?:\s+a)?\s+([^,.;!\n]+)/gi,
  /received(?:\s+a)?\s+([^,.;!\n]+)/gi,
  /first time([^,.;!\n]+)/gi,
  /important:?\s*([^,.;!\n]+)/gi,
  /memorable experience([^,.;!\n]+)/gi,
  /participated in([^,.;!\n]+)/gi,
  /took part in([^,.;!\n]+)/gi,
];

const FAMILY_PATTERNS = [
  /dad:?\s*([^,.;!\n]+)/gi,
  /mom:?\s*([^,.;!\n]+)/gi,
  /brother(?:s)?|sister(?:s)?:?\s*([^,.;!\n]+)/gi,
  /family:?\s*([^,.;!\n]+)/gi,
  /parents:?\s*([^,.;!\n]+)/gi,
];

const FRIEND_PATTERNS = [
  // 改进的模式：支持自然语言表达
  /(?:My|I have a)\s+best friend(?: is)?\s+(.+?)(?:\s+from|\s*$)/gi,  // "My best friend is Tom"
  /friend(?:s)?:?\s*([^,.;!\n]+)/gi,
  /play(?:s)?\s+with\s+([^,.;!\n]+)/gi,
  /study(?:s)?\s+with\s+([^,.;!\n]+)/gi,
  /best friend:?\s*([^,.;!\n]+)/gi,
];

const DREAM_PATTERNS = [
  /want(?:s)?\s+to\s+be\s+([^,.;!\n]+)/gi,
  /when I grow up:?\s*([^,.;!\n]+)/gi,
  /dream:?\s*([^,.;!\n]+)/gi,
  /future:?\s*([^,.;!\n]+)/gi,
  /ambition:?\s*([^,.;!\n]+)/gi,
];

// 第三方系统接口请求定义
export interface UpdateImportantMemoriesRequest {
  child_id: string;
  chat_history: string[]; // 历史对话记录数组
}

// 重要记忆信息接口
export interface ImportantInfo {
  interests: string[];      // 兴趣爱好
  importantEvents: string[]; // 重要事件
  familyMembers: string[];   // 家庭成员
  friends: string[];         // 朋友伙伴
  dreams: string[];          // 理想梦想
}

// 记忆存储接口
export interface ImportantMemory {
  id: string;
  content: string;
  metadata: {
    child_id: string;
    important_info: ImportantInfo;
    created_at: string;
    updated_at: string;
  };
}

// 提取文本中的关键信息
function extractImportantInfo(texts: string[]): ImportantInfo {
  const combinedText = texts.join('\n');
  const interests: string[] = [];
  const importantEvents: string[] = [];
  const familyMembers: string[] = [];
  const friends: string[] = [];
  const dreams: string[] = [];
  
  // 提取兴趣爱好
  INTEREST_PATTERNS.forEach(pattern => {
    let match;
    while ((match = pattern.exec(combinedText)) !== null) {
      if (match[1]) {
        interests.push(match[1].trim());
      }
    }
  });
  
  // 提取重要事件
  IMPORTANT_EVENT_PATTERNS.forEach(pattern => {
    let match;
    while ((match = pattern.exec(combinedText)) !== null) {
      if (match[1]) {
        importantEvents.push(match[1].trim());
      }
    }
  });
  
  // 提取家庭成员
  FAMILY_PATTERNS.forEach(pattern => {
    let match;
    while ((match = pattern.exec(combinedText)) !== null) {
      if (match[1]) {
        familyMembers.push(match[1].trim());
      }
    }
  });
  
  // 提取朋友伙伴
  FRIEND_PATTERNS.forEach(pattern => {
    let match;
    while ((match = pattern.exec(combinedText)) !== null) {
      if (match[1]) {
        friends.push(match[1].trim());
      }
    }
  });
  
  // 提取理想梦想
  DREAM_PATTERNS.forEach(pattern => {
    let match;
    while ((match = pattern.exec(combinedText)) !== null) {
      if (match[1]) {
        dreams.push(match[1].trim());
      }
    }
  });
  
  return {
    interests: [...new Set(interests)], // 去重
    importantEvents: [...new Set(importantEvents)],
    familyMembers: [...new Set(familyMembers)],
    friends: [...new Set(friends)],
    dreams: [...new Set(dreams)]
  };
}

// 检查是否包含重要信息
function hasImportantInfo(info: ImportantInfo): boolean {
  return info.interests.length > 0 || 
         info.importantEvents.length > 0 || 
         info.familyMembers.length > 0 || 
         info.friends.length > 0 || 
         info.dreams.length > 0;
}

// 默认配置常量
const AGENT_ID = 'tiny_buddy_agent';
const USER_ID = 'tiny_buddy_user';

// mem0服务类 - 使用官方mem0ai SDK重写
export class Mem0Service {
  // 添加记忆 - 使用官方SDK的add方法
  async add(messages: Array<{ role: "user" | "assistant"; content: string }>, options: {
    user_id?: string;
    app_id?: string;
    metadata?: any;
  } = {}): Promise<any[]> {
    try {
      const result = await getMem0Client().add(messages, {
        app_id: options.app_id || APP_ID,
        user_id: options.user_id || USER_ID,
        metadata: {
          agent_id: AGENT_ID,
          child_id: options.metadata?.child_id,
          ...options.metadata
        }
      });
      
      // 处理数组格式响应
      if (Array.isArray(result)) {
        return result;
      }
      return [result];
    } catch (error) {
      console.error('添加记忆失败:', error);
      throw error;
    }
  }
  
  // 搜索记忆 - 使用官方SDK的search方法
  async search(query: string, options: {
    limit?: number;
    user_id?: string;
    app_id?: string;
    metadata?: any;
  } = {}): Promise<any[]> {
    try {
      const result = await getMem0Client().search(query, {
        limit: options.limit || 10,
        app_id: options.app_id || APP_ID,
        user_id: options.user_id || USER_ID,
        metadata: {
          agent_id: AGENT_ID,
          child_id: options.metadata?.child_id,
          ...options.metadata
        }
      });
      
      // 处理数组格式响应
      if (Array.isArray(result)) {
        return result;
      }
      return [result];
    } catch (error) {
      console.error('搜索记忆失败:', error);
      throw error;
    }
  }
  
  // 获取所有记忆 - 使用官方SDK的search方法（使用通配符查询获取全部）
  async getAll(options: {
    user_id?: string;
    app_id?: string;
    limit?: number;
    metadata?: any;
  } = {}): Promise<any[]> {
    try {
      const result = await getMem0Client().search('*', {
        limit: options.limit || 100,
        app_id: options.app_id || APP_ID,
        user_id: options.user_id || USER_ID,
        metadata: {
          agent_id: AGENT_ID,
          child_id: options.metadata?.child_id,
          ...options.metadata
        }
      });
      
      // 处理数组格式响应
      if (Array.isArray(result)) {
        return result;
      }
      return [result];
    } catch (error) {
      console.error('获取所有记忆失败:', error);
      throw error;
    }
  }
  
  // 更新记忆 - 使用官方SDK的update方法
  async update(memoryId: string, data: {
    metadata?: any;
    text?: string;
  }): Promise<any> {
    try {
      const result = await getMem0Client().update(memoryId, {
        metadata: data.metadata
      });
      
      // 处理数组格式响应
      if (Array.isArray(result) && result.length > 0) {
        return result[0];
      }
      return result;
    } catch (error) {
      console.error(`更新记忆失败 (ID: ${memoryId}):`, error);
      throw error;
    }
  }
  
  // 删除记忆 - 使用官方SDK的delete方法
  async delete(memoryId: string): Promise<any> {
    try {
      const result = await getMem0Client().delete(memoryId);
      return result;
    } catch (error) {
      console.error(`删除记忆失败 (ID: ${memoryId}):`, error);
      throw error;
    }
  }
  
  // 获取特定记忆 - 使用官方SDK的get方法
  async get(memoryId: string): Promise<any> {
    try {
      const result = await getMem0Client().get(memoryId);
      
      // 处理数组格式响应
      if (Array.isArray(result) && result.length > 0) {
        return result[0];
      }
      return result;
    } catch (error) {
      console.error(`获取记忆失败 (ID: ${memoryId}):`, error);
      throw error;
    }
  }
  
  // 更新特定记忆（内部方法，保持向后兼容）
  private async updateMemory(memoryId: string, data: {
    content: string;
    metadata: any;
    tags?: string[];
  }): Promise<any> {
    try {
      // 使用新的update方法
      return await this.update(memoryId, {
        metadata: {
          ...data.metadata,
          content: data.content,
          updated_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error(`更新记忆失败 (ID: ${memoryId}):`, error);
      throw error;
    }
  }

  // 统一接口：更新重要记忆 - 使用新的官方SDK方法
  async updateImportantMemories(req: UpdateImportantMemoriesRequest): Promise<{
    success: boolean;
    message: string;
    important_info?: ImportantInfo;
    stored_memory?: ImportantMemory;
    error_code?: string;
    error_details?: string;
  }> {
    const MEM0_ENABLED = process.env.MEM0_ENABLED === 'true';
    if (!MEM0_ENABLED) {
      console.log('mem0 service is disabled');
      return {
        success: false,
        message: 'mem0 service is disabled'
      };
    }
    
    try {
      const { child_id, chat_history } = req;
      
      // 1. 提取新的重要信息
      const newImportantInfo = extractImportantInfo(chat_history);
      
      // 如果没有提取到重要信息，直接返回
      if (!hasImportantInfo(newImportantInfo)) {
        return {
          success: true,
          message: 'No important information extracted',
          important_info: newImportantInfo
        };
      }
      
      // 2. 查找现有的重要记忆 - 使用新的search方法
      const existingMemories = await this.search('*', {
        user_id: child_id,
        limit: 10
      });
      
      // 3. 合并新旧重要信息（如果有现有记忆）
      let finalImportantInfo = newImportantInfo;
      if (existingMemories.length > 0) {
        // 从现有记忆中提取重要信息
        const existingImportantInfos = existingMemories
          .filter(mem => mem.metadata && mem.metadata.important_info)
          .map(mem => mem.metadata.important_info);
        
        if (existingImportantInfos.length > 0) {
          finalImportantInfo = this.mergeImportantInfo(existingImportantInfos);
          
          // 合并新的重要信息
          finalImportantInfo = this.mergeImportantInfo([
            finalImportantInfo,
            newImportantInfo
          ]);
        }
        
        // 生成重要记忆内容
        const memoryContent = this.generateMemoryContent(finalImportantInfo);
        
        // 更新现有的第一个记忆（如果存在），而不是删除重建
        const timestamp = new Date().toISOString();
        const metadata = {
          ...existingMemories[0].metadata,
          important_info: finalImportantInfo,
          updated_at: timestamp
        };
        
        // 使用新的update接口更新记忆
        const updatedMemory = await this.update(existingMemories[0].id, {
          metadata: {
            ...metadata,
            content: memoryContent
          }
        });
        
        // 删除其他可能存在的旧记忆（如果有多个）
        for (const memory of existingMemories.slice(1)) {
          await this.delete(memory.id);
        }
        
        return {
          success: true,
          message: 'Important memories updated successfully',
          important_info: finalImportantInfo,
          stored_memory: {
            id: updatedMemory.id,
            content: memoryContent,
            metadata
          }
        };
      }
      
      // 4. 如果没有现有记忆，创建新的重要记忆 - 使用新的add方法
      const memoryContent = this.generateMemoryContent(finalImportantInfo);
      
      const timestamp = new Date().toISOString();
      const metadata = {
        child_id,
        important_info: finalImportantInfo,
        created_at: timestamp,
        updated_at: timestamp
      };
      
      // 使用新的add方法创建记忆
      const messages = [
        { role: 'user' as const, content: memoryContent }
      ];
      
      console.log('创建新记忆数据:', { child_id, memoryContent_length: memoryContent.length });
      const addResult = await this.add(messages, {
        user_id: child_id,
        metadata: {
          ...metadata,
          content: memoryContent
        }
      });
      
      const memoryId = addResult[0]?.id;
      console.log('创建记忆成功:', memoryId);
      
      return {
        success: true,
        message: 'Important memories created successfully',
        important_info: finalImportantInfo,
        stored_memory: {
          id: memoryId,
          content: memoryContent,
          metadata
        }
      };
    } catch (error: any) {
      console.error('Failed to update important memories:', error);
      
      // 详细的错误日志
      if (error.response) {
        console.error('mem0 API错误状态:', error.response.status);
        console.error('mem0 API错误数据:', JSON.stringify(error.response.data, null, 2));
        
        // 根据错误类型提供更具体的错误信息
        if (error.response.status === 401) {
          return {
            success: false,
            message: 'Authentication failed: Invalid or expired API key',
            error_code: 'AUTHENTICATION_FAILED'
          };
        } else if (error.response.status === 400) {
          return {
            success: false,
            message: 'Invalid request parameters',
            error_code: 'INVALID_PARAMETERS'
          };
        } else if (error.response.status === 404) {
          return {
            success: false,
            message: 'mem0 API endpoint not found',
            error_code: 'ENDPOINT_NOT_FOUND'
          };
        }
      } else if (error.request) {
        console.error('无法连接到mem0服务:', error.request);
        return {
          success: false,
          message: 'Failed to connect to mem0 service',
          error_code: 'CONNECTION_ERROR'
        };
      }
      
      return {
        success: false,
        message: 'Failed to update important memories',
        error_code: 'UNKNOWN_ERROR',
        error_details: error.message
      };
    }
  }
  
  // 搜索特定孩子的重要记忆（内部方法，保持向后兼容）
  private async searchImportantMemories(child_id: string): Promise<ImportantMemory[]> {
    try {
      // 使用新的search方法
      const memories = await this.search('*', {
        user_id: child_id,
        limit: 10
      });
      
      return memories.map((item: any) => ({
        id: item.id,
        content: item.memory || item.text || item.content || '',
        metadata: item.metadata || {}
      })).filter((mem: ImportantMemory) => 
        mem.metadata && mem.metadata.important_info
      );
    } catch (error) {
      console.error('搜索重要记忆失败:', error);
      return [];
    }
  }
  
  // 删除特定记忆
  private async deleteMemory(memoryId: string): Promise<void> {
    try {
      // 使用官方SDK的delete方法
      await this.delete(memoryId);
    } catch (error) {
      console.error(`删除记忆失败 (ID: ${memoryId}):`, error);
      // 忽略删除错误，继续执行
    }
  }
  
  // 合并多个重要信息对象
  private mergeImportantInfo(infoList: ImportantInfo[]): ImportantInfo {
    const merged: ImportantInfo = {
      interests: [],
      importantEvents: [],
      familyMembers: [],
      friends: [],
      dreams: []
    };
    
    infoList.forEach(info => {
      merged.interests.push(...info.interests);
      merged.importantEvents.push(...info.importantEvents);
      merged.familyMembers.push(...info.familyMembers);
      merged.friends.push(...info.friends);
      merged.dreams.push(...info.dreams);
    });
    
    // 去重
    merged.interests = [...new Set(merged.interests)];
    merged.importantEvents = [...new Set(merged.importantEvents)];
    merged.familyMembers = [...new Set(merged.familyMembers)];
    merged.friends = [...new Set(merged.friends)];
    merged.dreams = [...new Set(merged.dreams)];
    
    return merged;
  }
  
  // 生成记忆内容文本 - English version
  private generateMemoryContent(info: ImportantInfo): string {
    let content = `Child Important Information Summary:\n\n`;
    
    if (info.interests.length > 0) {
      content += `Interests:\n${info.interests.map(item => `- ${item}`).join('\n')}\n\n`;
    }
    
    if (info.importantEvents.length > 0) {
      content += `Important Events:\n${info.importantEvents.map(item => `- ${item}`).join('\n')}\n\n`;
    }
    
    if (info.familyMembers.length > 0) {
      content += `Family Members:\n${info.familyMembers.map(item => `- ${item}`).join('\n')}\n\n`;
    }
    
    if (info.friends.length > 0) {
      content += `Friends:\n${info.friends.map(item => `- ${item}`).join('\n')}\n\n`;
    }
    
    if (info.dreams.length > 0) {
      content += `Dreams & Ambitions:\n${info.dreams.map(item => `- ${item}`).join('\n')}\n`;
    }
    
    return content.trim();
  }
}

// 创建单例实例
export const mem0Service = new Mem0Service();