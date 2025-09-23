// 陪伴/教育规划Agent
import { BaseActor, ActorContext } from './baseActor';
import { KnowledgeContent } from '../models/content';
import { Message } from '../models/message';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { config } from 'dotenv';

// 加载环境变量
config();

// 开发模式标志
const DEVELOPMENT_MODE = process.env.DEVELOPMENT_MODE === 'true';

// 互动类型
enum InteractionType {
  CHAT = 'chat',
  SONG = 'song',
  STORY = 'story',
  GAME = 'game',
  LESSON = 'lesson'
}

// 规划结果接口
interface PlanningResult {
  type: InteractionType;
  contentId?: string;
  objectives: string[];
  strategy: string;
}

export class PlanningAgent implements BaseActor {
  id: string;
  name: string;
  description: string;
  type: string;
  private state: Record<string, any> = {};
  private lastPlan: PlanningResult | null = null;
  private knowledgeBaseService: any;
  private memoryService: any;

  constructor(config: {knowledgeBaseService?: any; memoryService?: any}) {
    this.id = 'planning_agent';
    this.name = '陪伴/教育规划Agent';
    this.description = '负责规划与儿童的互动内容和教育目标';
    this.type = 'planningAgent';
    this.knowledgeBaseService = config.knowledgeBaseService;
    this.memoryService = config.memoryService;
  }

  async init(context?: ActorContext): Promise<void> {
    // 初始化逻辑
    this.state = {
      initialized: true,
      lastUpdated: new Date()
    };
  }

  async process(input: {input: string; context: ActorContext; plan?: any}): Promise<{output: string; metadata?: Record<string, any>}> {
    try {
      // 在开发模式下，直接使用模拟规划
      if (DEVELOPMENT_MODE) {
        console.log('开发模式: 使用模拟规划');
        const mockPlan = this.createMockPlan(input.context);
        this.lastPlan = mockPlan;
        
        // 根据计划生成返回信息
        const response = this.generateResponse(mockPlan);
        
        return {
          output: response,
          metadata: {
            interactionType: mockPlan.type,
            contentId: mockPlan.contentId,
            objectives: mockPlan.objectives,
            developmentMode: true
          }
        };
      }
      
      // 生产模式下，调用大模型生成规划
      const plan = await this.generatePlanWithLLM(input.context);
      this.lastPlan = plan;
      
      // 根据计划生成返回信息
      const response = this.generateResponse(plan);
      
      return {
        output: response,
        metadata: {
          interactionType: plan.type,
          contentId: plan.contentId,
          objectives: plan.objectives
        }
      };
    } catch (error) {
      console.error('大模型规划失败:', error);
      // 降级到默认规划
      const defaultPlan = this.createFallbackPlan(input.context);
      const response = this.generateResponse(defaultPlan);
      
      return {
        output: response,
        metadata: {
          interactionType: defaultPlan.type,
          contentId: defaultPlan.contentId,
          objectives: defaultPlan.objectives,
          fallback: true
        }
      };
    }
  }
  
  // 创建开发模式下的模拟规划
  private createMockPlan(context: ActorContext): PlanningResult {
    const { childProfile } = context;
    
    // 简单的模拟规划逻辑
    return {
      type: InteractionType.CHAT,
      objectives: ['建立情感连接', '鼓励表达'],
      strategy: `以朋友的身份与${childProfile.name}聊天，使用简单易懂的语言，保持积极鼓励的语气。`
    };
  }

  getState(): Record<string, any> {
    return {
      ...this.state,
      lastPlan: this.lastPlan
    };
  }

  setState(state: Record<string, any>): void {
    this.state = state;
    if (state.lastPlan) {
      this.lastPlan = state.lastPlan as PlanningResult;
    }
  }

  // 使用大模型生成互动计划
  private async generatePlanWithLLM(context: ActorContext): Promise<PlanningResult> {
    const { childProfile, conversationHistory, knowledgeBase } = context;
    const recentMessages = this.getRecentMessages(conversationHistory, 5);
    const knowledgeSummary = this.summarizeKnowledgeBase(knowledgeBase);
    
    // 构建规划提示词
    const prompt = this.buildPlanningPrompt(
      childProfile,
      recentMessages,
      knowledgeSummary
    );
    
    // 调用大模型生成规划
    const result = await generateText({
      model: openai('gpt-4.1'),
      prompt,
      maxOutputTokens: 500,
      temperature: 0.6
    });
    
    // 解析大模型返回的JSON规划
    let llmPlan;
    try {
      // 从返回结果中提取JSON部分
      const jsonMatch = result.text.trim().match(/\{[\s\S]*\}/);
      if (jsonMatch && jsonMatch[0]) {
        llmPlan = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法从响应中提取JSON');
      }
    } catch (error) {
      console.error('解析大模型响应失败:', error);
      // 使用默认规划
      return this.createFallbackPlan(context);
    }
    
    // 转换为PlanningResult格式
    return {
      type: this.mapInteractionType(llmPlan.interactionType),
      contentId: llmPlan.contentId,
      objectives: llmPlan.objectives || [],
      strategy: llmPlan.strategy || ''
    };
  }
  
  // 构建规划提示词
  private buildPlanningPrompt(
    childProfile: any,
    recentMessages: Message[],
    knowledgeSummary: string
  ): string {
    const messagesText = recentMessages.map(m => 
      `${m.type === 'user' ? '用户' : '助手'}: ${m.content}`
    ).join('\n');
    
    return `你是一个专业的儿童陪伴助手规划师，需要为${childProfile.name}（${childProfile.age}岁）制定互动计划。\n` +
    `儿童兴趣爱好：${childProfile.interests.join(', ')}\n` +
    `最近的对话历史：\n${messagesText}\n` +
    `可用的知识库内容：\n${knowledgeSummary}\n` +
    `请根据儿童的年龄、兴趣、最近对话和可用知识库，生成一个详细的互动计划。\n` +
    `互动类型可以是：chat（聊天）、song（唱歌）、story（讲故事）、game（玩游戏）、lesson（学习）\n` +
    `请以JSON格式返回，包含以下字段：\n` +
    `- interactionType: 互动类型\n` +
    `- contentId: 可以使用的知识库内容ID（如果有）\n` +
    `- objectives: 互动目标数组\n` +
    `- strategy: 互动策略描述\n` +
    `请确保JSON格式正确，不要包含任何额外的文本。`;
  }
  
  // 总结知识库内容
  private summarizeKnowledgeBase(knowledgeBase: KnowledgeContent[]): string {
    if (!knowledgeBase || knowledgeBase.length === 0) {
      return '暂无可用知识库内容';
    }
    
    return knowledgeBase.map(item => 
      `ID: ${item.id}, 类型: ${item.type}, 标题: ${item.title}, 难度: ${item.difficulty}, 分类: ${item.categories.join(', ')}`
    ).join('\n');
  }
  
  // 映射互动类型
  private mapInteractionType(llmType: string): InteractionType {
    const typeMap: Record<string, InteractionType> = {
      'chat': InteractionType.CHAT,
      'song': InteractionType.SONG,
      'story': InteractionType.STORY,
      'game': InteractionType.GAME,
      'lesson': InteractionType.LESSON
    };
    
    return typeMap[llmType.toLowerCase()] || InteractionType.CHAT;
  }
  
  // 创建降级计划
  private createFallbackPlan(context: ActorContext): PlanningResult {
    const { childProfile } = context;
    
    // 简单的默认规划逻辑
    return {
      type: InteractionType.CHAT,
      objectives: ['建立情感连接', '鼓励表达'],
      strategy: `以朋友的身份与${childProfile.name}聊天，使用简单易懂的语言，保持积极鼓励的语气。`
    };
  }
  
  // 获取最近的消息（保留此方法供大模型规划使用）
  private getRecentMessages(messages: Message[], count: number): Message[] {
    return messages.slice(-count).reverse();
  }

  // 根据计划生成响应
  private generateResponse(plan: PlanningResult): string {
    // 将计划转换为执行Agent可以理解的指令
    const interactionTypeMap: Record<InteractionType, string> = {
      [InteractionType.CHAT]: '聊天',
      [InteractionType.SONG]: '唱歌',
      [InteractionType.STORY]: '讲故事',
      [InteractionType.GAME]: '玩游戏',
      [InteractionType.LESSON]: '学习'
    };
    
    return JSON.stringify({
      type: 'plan',
      interactionType: interactionTypeMap[plan.type],
      contentId: plan.contentId,
      objectives: plan.objectives,
      strategy: plan.strategy
    });
  }
}