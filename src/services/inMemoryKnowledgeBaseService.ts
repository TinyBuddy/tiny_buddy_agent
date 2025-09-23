// 内存实现的知识库服务
import { KnowledgeBaseService } from './knowledgeBaseService';
import { KnowledgeContent } from '../models/content';

// 内存实现的知识库服务
// 注意：这是一个内存实现，适用于开发和测试环境
export class InMemoryKnowledgeBaseService implements KnowledgeBaseService {
  private contents: KnowledgeContent[] = [];
  private initialized = false;
  
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    // 初始化一些模拟数据
    this.contents = this.loadMockData();
    this.initialized = true;
    
    console.log(`内存知识库初始化完成，加载了${this.contents.length}条内容`);
  }
  
  async getAllContents(): Promise<KnowledgeContent[]> {
    await this.ensureInitialized();
    return [...this.contents];
  }
  
  async getContentById(id: string): Promise<KnowledgeContent | undefined> {
    await this.ensureInitialized();
    return this.contents.find(content => content.id === id);
  }
  
  async getContentsByType(type: string): Promise<KnowledgeContent[]> {
    await this.ensureInitialized();
    return this.contents.filter(content => content.type === type);
  }
  
  async searchContents(keyword: string): Promise<KnowledgeContent[]> {
    await this.ensureInitialized();
    const lowerKeyword = keyword.toLowerCase();
    return this.contents.filter(content => 
      content.title.toLowerCase().includes(lowerKeyword) ||
      content.description.toLowerCase().includes(lowerKeyword) ||
      content.content.toLowerCase().includes(lowerKeyword)
    );
  }
  
  async addContent(content: Omit<KnowledgeContent, 'id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeContent> {
    await this.ensureInitialized();
    
    const newContent: KnowledgeContent = {
      id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...content
    };
    
    this.contents.push(newContent);
    return newContent;
  }
  
  async updateContent(id: string, content: Partial<KnowledgeContent>): Promise<KnowledgeContent | undefined> {
    await this.ensureInitialized();
    
    const index = this.contents.findIndex(item => item.id === id);
    if (index === -1) {
      return undefined;
    }
    
    this.contents[index] = {
      ...this.contents[index],
      ...content,
      updatedAt: new Date()
    };
    
    return this.contents[index];
  }
  
  async deleteContent(id: string): Promise<boolean> {
    await this.ensureInitialized();
    
    const initialLength = this.contents.length;
    this.contents = this.contents.filter(content => content.id !== id);
    
    return this.contents.length < initialLength;
  }
  
  // 确保服务已初始化
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }
  
  // 加载模拟数据
  private loadMockData(): KnowledgeContent[] {
    return [
      {
        id: 'content_001',
        title: '认识数字',
        type: 'lesson',
        description: '帮助儿童认识基本数字1-10',
        content: '1像铅笔细又长，2像鸭子水中游，3像耳朵听声音，4像小旗随风飘，5像秤钩来买菜，6像哨子嘟嘟叫，7像镰刀割青草，8像麻花拧一道，9像勺子来吃饭，10像铅笔加鸡蛋。',
        language: 'zh',
        difficulty: 'easy',
        categories: ['数学', '数字', '基础'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      },
      {
        id: 'content_002',
        title: '小星星',
        type: 'song',
        description: '经典儿歌小星星',
        content: '一闪一闪亮晶晶，满天都是小星星，挂在天上放光明，好像许多小眼睛。一闪一闪亮晶晶，满天都是小星星。',
        language: 'zh',
        difficulty: 'easy',
        categories: ['儿歌', '音乐', '经典'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      },
      {
        id: 'content_003',
        title: '小兔子乖乖',
        type: 'story',
        description: '经典童话故事小兔子乖乖',
        content: '小兔子乖乖，把门开开，快点开开，我要进来。不开不开我不开，妈妈没回来，谁来也不开。小兔子乖乖，把门开开，快点开开，我要进来。就开就开我就开，妈妈回来了，我就把门开。',
        language: 'zh',
        difficulty: 'easy',
        categories: ['童话', '安全', '经典'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      }
    ];
  }
}