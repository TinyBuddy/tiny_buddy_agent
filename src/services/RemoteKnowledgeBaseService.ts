import axios from 'axios';
import type { KnowledgeContent } from '../models/content';
import type { KnowledgeBaseService } from './knowledgeBaseService';

/**
 * 远程知识库服务实现
 * 用于调用外部知识库API获取相关知识内容
 */
export class RemoteKnowledgeBaseService implements KnowledgeBaseService {
  private apiKey: string;
  private apiUrl: string;
  private initialized = false;

  constructor() {
    // 从环境变量获取API密钥和URL，如果没有则使用默认值
    this.apiKey = process.env.KNOWLEDGE_BASE_API_KEY || 'sk-AFVxhsKKYpfMSSIho5hyqskh8Rbd96ZbVytFRy3pan09Vn1g';
    this.apiUrl = process.env.KNOWLEDGE_BASE_API_URL || 'http://136.115.118.154/api/v1/knowledge-chat/d15b185a-a786-4039-b15b-1d6fb4a8d4e3';
  }

  /**
   * 初始化知识库服务
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    // 可以在这里添加验证API连接的逻辑
    try {
      console.log('初始化远程知识库服务...');
      console.log(`API URL: ${this.apiUrl}`);
      // 不实际调用API进行初始化，避免不必要的请求
      this.initialized = true;
      console.log('远程知识库服务初始化完成');
    } catch (error) {
      console.error('远程知识库服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有内容
   * 注意：远程API可能不支持此操作，返回空数组
   */
  async getAllContents(): Promise<KnowledgeContent[]> {
    await this.ensureInitialized();
    return [];
  }

  /**
   * 根据ID获取内容
   * 注意：远程API可能不支持此操作，返回undefined
   */
  async getContentById(id: string): Promise<KnowledgeContent | undefined> {
    await this.ensureInitialized();
    return undefined;
  }

  /**
   * 根据类型获取内容
   * 注意：远程API可能不支持此操作，返回空数组
   */
  async getContentsByType(type: string): Promise<KnowledgeContent[]> {
    await this.ensureInitialized();
    return [];
  }

  /**
   * 根据关键词搜索内容
   * 调用远程API进行搜索
   */
  async searchContents(keyword: string): Promise<KnowledgeContent[]> {
    await this.ensureInitialized();
    
    try {
      // 调用远程知识库API搜索相关内容
      const response = await this.fetchKnowledgeFromApi(keyword);
      
      // 将API响应转换为KnowledgeContent数组格式
      if (response && typeof response === 'object') {
        // 根据API返回格式进行适当的转换
        return [{ 
          id: `remote_${Date.now()}`,
          type: 'lesson', // 使用符合KnowledgeContent接口的类型
          title: `知识库结果: ${keyword}`,
          description: '来自远程知识库的相关内容',
          content: JSON.stringify(response),
          language: 'mix',
          difficulty: 'medium',
          categories: ['knowledge', 'remote'],
          createdAt: new Date(),
          updatedAt: new Date()
        }];
      }
      
      return [];
    } catch (error) {
      console.error('搜索知识库内容失败:', error);
      return [];
    }
  }

  /**
   * 添加新内容
   * 注意：远程API可能不支持此操作，返回模拟数据
   */
  async addContent(
    content: Omit<KnowledgeContent, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<KnowledgeContent> {
    await this.ensureInitialized();
    
    return {
      ...content,
      id: `content_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * 更新内容
   * 注意：远程API可能不支持此操作，返回undefined
   */
  async updateContent(
    id: string,
    content: Partial<KnowledgeContent>,
  ): Promise<KnowledgeContent | undefined> {
    await this.ensureInitialized();
    return undefined;
  }

  /**
   * 删除内容
   * 注意：远程API可能不支持此操作，返回false
   */
  async deleteContent(id: string): Promise<boolean> {
    await this.ensureInitialized();
    return false;
  }

  /**
   * 调用远程知识库API获取知识内容
   */
  private async fetchKnowledgeFromApi(query: string): Promise<any> {
    try {
      const response = await axios.post(
        this.apiUrl,
        { query: query },
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 10000, // 10秒超时
        }
      );
      
      console.log('知识库API响应:', response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // 服务器返回了错误状态码
          console.error(`知识库API错误: ${error.response.status} - ${error.response.statusText}`);
          console.error('API响应数据:', error.response.data);
        } else if (error.request) {
          // 请求已发送但没有收到响应
          console.error('知识库API无响应:', error.request);
        } else {
          // 设置请求时发生错误
          console.error('知识库API请求错误:', error.message);
        }
      } else {
        // 其他错误
        console.error('知识库API调用异常:', error);
      }
      
      throw error;
    }
  }

  /**
   * 确保知识库服务已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }
}