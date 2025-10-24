import axios from 'axios';

// mem0 API配置
const MEM0_API_URL = process.env.MEM0_BASE_URL || 'https://api.mem0.ai';
const MEM0_API_KEY = process.env.MEM0_API_KEY;
const MEM0_ENABLED = process.env.MEM0_ENABLED === 'true';

// 创建axios实例
const mem0Client = axios.create({
  baseURL: MEM0_API_URL,
  headers: {
    'Content-Type': 'application/json',
    ...(MEM0_API_KEY && { 'Authorization': `Bearer ${MEM0_API_KEY}` }),
  },
});

// 扩展关键信息提取正则表达式 - English patterns
const INTEREST_PATTERNS = [
  /like(?:s)?\s+(?:movies|music|games|toys|colors|food|activities|animals):?\s*([^,.;!\n]+)/gi,
  /interested in:?\s*([^,.;!\n]+)/gi,
  /want(?:s)?\s+to\s+([^,.;!\n]+)/gi,
  /hobby(?:ies)?:?\s*([^,.;!\n]+)/gi,
  /favorite(?:s)?(?:\s+thing)?:?\s*([^,.;!\n]+)/gi,
  /enjoy(?:s)?\s+([^,.;!\n]+)/gi,
];

const IMPORTANT_EVENT_PATTERNS = [
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

// mem0服务类 - 专注于重要记忆管理
export class Mem0Service {
  // 更新特定记忆
  private async updateMemory(memoryId: string, data: {
    content: string;
    metadata: any;
    tags?: string[];
  }): Promise<any> {
    try {
      // 符合mem0 SDK的update接口
      const response = await mem0Client.put(`/v1/memories/${memoryId}`, {
        text: data.content,  // 使用text字段，符合mem0 SDK示例
        metadata: data.metadata,
        tags: data.tags
      });
      return response.data;
    } catch (error) {
      console.error(`更新记忆失败 (ID: ${memoryId}):`, error);
      throw error;
    }
  }

  // 统一接口：更新重要记忆
  async updateImportantMemories(req: UpdateImportantMemoriesRequest): Promise<{
    success: boolean;
    message: string;
    important_info?: ImportantInfo;
    stored_memory?: ImportantMemory;
  }> {
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
      
      // 2. 查找现有的重要记忆
      const existingMemories = await this.searchImportantMemories(child_id);
      
      // 3. 合并新旧重要信息（如果有现有记忆）
      let finalImportantInfo = newImportantInfo;
      if (existingMemories.length > 0) {
        finalImportantInfo = this.mergeImportantInfo(
          existingMemories.map(mem => mem.metadata.important_info)
        );
        
        // 合并新的重要信息
        finalImportantInfo = this.mergeImportantInfo([
          finalImportantInfo,
          newImportantInfo
        ]);
        
        // 生成重要记忆内容
        const memoryContent = this.generateMemoryContent(finalImportantInfo);
        
        // 更新现有的第一个记忆（如果存在），而不是删除重建
        const timestamp = new Date().toISOString();
        const metadata = {
          ...existingMemories[0].metadata,
          important_info: finalImportantInfo,
          updated_at: timestamp
        };
        
        // 使用update接口更新记忆
        const updatedMemory = await this.updateMemory(existingMemories[0].id, {
          content: memoryContent,
          metadata,
          tags: [child_id, 'important_memory']
        });
        
        // 删除其他可能存在的旧记忆（如果有多个）
        for (const memory of existingMemories.slice(1)) {
          await this.deleteMemory(memory.id);
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
      
      // 4. 如果没有现有记忆，创建新的重要记忆
      const memoryContent = this.generateMemoryContent(finalImportantInfo);
      
      const timestamp = new Date().toISOString();
      const metadata = {
        child_id,
        important_info: finalImportantInfo,
        created_at: timestamp,
        updated_at: timestamp
      };
      
      const memoryData = {
        content: memoryContent,
        metadata,
        tags: [child_id, 'important_memory'],
        version: 'v2'
      };
      
      const response = await mem0Client.post('/v1/memories/', memoryData);
      
      return {
        success: true,
        message: 'Important memories created successfully',
        important_info: finalImportantInfo,
        stored_memory: {
          id: response.data.id,
          content: memoryContent,
          metadata
        }
      };
    } catch (error) {
      console.error('Failed to update important memories:', error);
      return {
        success: false,
        message: 'Failed to update important memories'
      };
    }
  }
  
  // 搜索特定孩子的重要记忆
  private async searchImportantMemories(child_id: string): Promise<ImportantMemory[]> {
    try {
      const searchData = {
        query: '',
        limit: 10,
        filters: {
          AND: [
            {
              metadata: {
                child_id
              }
            }
          ]
        },
        use_knowledge_graph: true
      };
      
      // 使用v2版本的搜索接口，符合mem0 SDK示例
      const response = await mem0Client.post('/v2/memories/search', searchData);
      
      return response.data.map((item: any) => ({
        id: item.id,
        content: item.content || '',
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
      // 符合mem0 SDK的delete接口
      await mem0Client.delete(`/v1/memories/${memoryId}`);
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