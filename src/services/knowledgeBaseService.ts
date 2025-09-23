// 知识库服务
import { KnowledgeContent } from '../models/content';

// 知识库服务接口
export interface KnowledgeBaseService {
  // 初始化知识库
  init(): Promise<void>;
  
  // 获取所有内容
  getAllContents(): Promise<KnowledgeContent[]>;
  
  // 根据ID获取内容
  getContentById(id: string): Promise<KnowledgeContent | undefined>;
  
  // 根据类型获取内容
  getContentsByType(type: string): Promise<KnowledgeContent[]>;
  
  // 根据关键词搜索内容
  searchContents(keyword: string): Promise<KnowledgeContent[]>;
  
  // 添加新内容
  addContent(content: Omit<KnowledgeContent, 'id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeContent>;
  
  // 更新内容
  updateContent(id: string, content: Partial<KnowledgeContent>): Promise<KnowledgeContent | undefined>;
  
  // 删除内容
  deleteContent(id: string): Promise<boolean>;
}

// WeKnora知识库服务实现
// 注意：这是一个模拟实现，实际应用中需要集成真实的WeKnora API
export class WeKnoraKnowledgeBaseService implements KnowledgeBaseService {
  private contents: KnowledgeContent[] = [];
  private initialized = false;
  
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    // 在实际应用中，这里会连接到WeKnora服务器并获取初始数据
    // 这里我们使用一些模拟数据进行初始化
    this.contents = this.loadMockData();
    this.initialized = true;
    
    console.log(`知识库初始化完成，加载了${this.contents.length}条内容`);
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
      content.content.toLowerCase().includes(lowerKeyword) ||
      content.categories.some(cat => cat.toLowerCase().includes(lowerKeyword))
    );
  }
  
  async addContent(content: Omit<KnowledgeContent, 'id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeContent> {
    await this.ensureInitialized();
    
    const newContent: KnowledgeContent = {
      ...content,
      id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.contents.push(newContent);
    
    // 在实际应用中，这里会将新内容保存到WeKnora服务器
    console.log(`添加新内容: ${newContent.title}`);
    
    return newContent;
  }
  
  async updateContent(id: string, content: Partial<KnowledgeContent>): Promise<KnowledgeContent | undefined> {
    await this.ensureInitialized();
    
    const index = this.contents.findIndex(item => item.id === id);
    if (index === -1) {
      return undefined;
    }
    
    const updatedContent: KnowledgeContent = {
      ...this.contents[index],
      ...content,
      updatedAt: new Date()
    };
    
    this.contents[index] = updatedContent;
    
    // 在实际应用中，这里会更新WeKnora服务器上的内容
    console.log(`更新内容: ${updatedContent.title}`);
    
    return updatedContent;
  }
  
  async deleteContent(id: string): Promise<boolean> {
    await this.ensureInitialized();
    
    const initialLength = this.contents.length;
    this.contents = this.contents.filter(content => content.id !== id);
    
    // 在实际应用中，这里会删除WeKnora服务器上的内容
    if (this.contents.length < initialLength) {
      console.log(`删除内容: ${id}`);
      return true;
    }
    
    return false;
  }
  
  // 确保知识库已初始化
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }
  
  // 加载模拟数据
  private loadMockData(): KnowledgeContent[] {
    // 模拟的儿歌数据
    const songs: KnowledgeContent[] = [
      {
        id: 'song_001',
        type: 'song',
        title: '小星星',
        description: '经典儿歌',
        content: 'Twinkle twinkle little star, how I wonder what you are. Up above the world so high, like a diamond in the sky. 一闪一闪亮晶晶，满天都是小星星。挂在天空放光明，好像许多小眼睛。',
        language: 'mix',
        difficulty: 'easy',
        categories: ['儿歌', '英文', '中文'],
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      {
        id: 'song_002',
        type: 'song',
        title: 'ABC歌',
        description: '字母学习儿歌',
        content: 'A B C D E F G, H I J K L M N O P. Q R S, T U V. W X Y and Z. Now I know my ABCs, next time won\'t you sing with me?',
        language: 'en',
        difficulty: 'easy',
        categories: ['儿歌', '英文', '字母'],
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      }
    ];
    
    // 模拟的故事数据
    const stories: KnowledgeContent[] = [
      {
        id: 'story_001',
        type: 'story',
        title: '小兔子乖乖',
        description: '经典童话故事',
        content: '小兔子乖乖，把门儿开开，快点儿开开，我要进来。不开不开我不开，妈妈没回来，谁来也不开。小兔子乖乖，把门儿开开，快点儿开开，我要进来。就开就开我就开，妈妈回来了，我就把门开。',
        language: 'zh',
        difficulty: 'easy',
        categories: ['故事', '中文', '童话'],
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      {
        id: 'story_002',
        type: 'story',
        title: 'The Little Red Hen',
        description: '经典英文故事',
        content: 'Once upon a time, there was a little red hen who lived on a farm. She found some wheat seeds and asked the other animals to help her plant them, but they all said no. So she planted the seeds by herself...',
        language: 'en',
        difficulty: 'medium',
        categories: ['故事', '英文', '童话'],
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      }
    ];
    
    // 模拟的游戏数据
    const games: KnowledgeContent[] = [
      {
        id: 'game_001',
        type: 'game',
        title: '数字猜猜乐',
        description: '数字学习游戏',
        content: '游戏规则：一个人想一个数字（1-10），另一个人来猜。每猜一次，给出提示是大了还是小了，直到猜对为止。可以用英语或中文进行游戏。例如："I\'m thinking of a number between 1 and 10. Can you guess what it is?" "我心里想了一个1到10之间的数字，你能猜出来吗？"',
        language: 'mix',
        difficulty: 'easy',
        categories: ['游戏', '数学', '英文', '中文'],
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      }
    ];
    
    // 模拟的课程数据
    const lessons: KnowledgeContent[] = [
      {
        id: 'lesson_001',
        type: 'lesson',
        title: '颜色认知',
        description: '学习颜色的中英文表达',
        content: '红色 - red\n蓝色 - blue\n黄色 - yellow\n绿色 - green\n紫色 - purple\n橙色 - orange\n我们可以玩一个游戏：我说出一个颜色，你在房间里找到这个颜色的东西。例如："Can you find something red?" "你能找到红色的东西吗？"',
        language: 'mix',
        difficulty: 'easy',
        categories: ['学习', '英文', '中文', '颜色'],
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      {
        id: 'lesson_002',
        type: 'lesson',
        title: '动物朋友',
        description: '学习动物的中英文名称',
        content: '猫 - cat\n狗 - dog\n鸟 - bird\n鱼 - fish\n兔子 - rabbit\n熊猫 - panda\n我们来玩个角色扮演游戏吧！你想扮演什么动物？我来扮演另一个动物，我们用英语和中文对话。',
        language: 'mix',
        difficulty: 'easy',
        categories: ['学习', '英文', '中文', '动物'],
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      }
    ];
    
    // 合并所有内容
    return [...songs, ...stories, ...games, ...lessons];
  }
}