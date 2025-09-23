// 执行Agent
import { BaseActor, ActorContext } from './baseActor';
import { Message } from '../models/message';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { config } from 'dotenv';

// 加载环境变量
config();

// 开发模式标志
const DEVELOPMENT_MODE = process.env.DEVELOPMENT_MODE === 'true';

// 执行Agent配置接口
interface ExecutionAgentConfig {
  useLLM?: boolean;
  model?: string;
  knowledgeBaseService?: any;
  memoryService?: any;
}

export class ExecutionAgent implements BaseActor {
  id: string;
  name: string;
  description: string;
  type: string;
  private state: Record<string, any> = {};
  private config: ExecutionAgentConfig;
  private currentPlan: any = null;
  private knowledgeBaseService: any;
  private memoryService: any;

  constructor(config: ExecutionAgentConfig = {}) {
    this.id = 'execution_agent';
    this.name = '执行Agent';
    this.description = '负责根据规划Agent的计划与儿童进行实际互动';
    this.type = 'executionAgent';
    this.config = {
      useLLM: true,
      model: 'gpt-4.1',
      ...config
    };
    this.knowledgeBaseService = config.knowledgeBaseService;
    this.memoryService = config.memoryService;
  }

  async init(context?: ActorContext): Promise<void> {
    // 初始化逻辑
    this.state = {
      initialized: true,
      lastUpdated: new Date(),
      currentInteractionType: null,
      currentContentId: null
    };
  }

  async process(input: {input: string; context: ActorContext; plan?: any}): Promise<{output: string; metadata?: Record<string, any>}> {
    // 使用传入的计划
    if (input.plan) {
      this.currentPlan = input.plan;
      this.state.currentInteractionType = input.plan.interactionType || input.plan.type;
      this.state.currentContentId = input.plan.contentId;
      
      // 在开发模式下，直接使用模拟响应
      if (DEVELOPMENT_MODE) {
        console.log('开发模式: 使用模拟响应');
        const mockResponse = this.createMockGreeting(input.context);
        
        // 确定交互类型
        const interactionType = this.state.currentInteractionType || 'chat';
        
        // 确定学习点（如果有）
        let learningPoint = null;
        let progress = 10;
        
        if (interactionType === '学习') {
          // 对于学习类型的互动，提取学习点
          learningPoint = `lesson_${Date.now()}`;
        }
        
        return {
          output: mockResponse,
          metadata: {
            interactionType,
            learningPoint,
            progress,
            developmentMode: true
          }
        };
      }
      
      try {
        // 构建更智能的响应提示词，考虑用户的输入内容
        const prompt = `你是TinyBuddy，一个儿童智能陪伴助手，专门陪伴${input.context.childProfile.name}（${input.context.childProfile.age}岁）。
` +
        `儿童的兴趣爱好是: ${input.context.childProfile.interests.join(', ')}
` +
        `请用简单、友好、活泼的语气，符合${input.context.childProfile.age}岁儿童的认知水平。
` +
        `当前互动类型: ${this.state.currentInteractionType || '聊天'}
` +
        `用户刚才说: "${input.input}"
` +
        `如果用户表达了想做游戏的意愿，请立即回应游戏相关内容。
` +
        `请直接回复合适的内容，不要包含任何额外信息。`;
        
        // 调用大模型生成初始响应
        const result = await generateText({
          model: openai('gpt-4.1'),
          prompt,
          maxOutputTokens: 100,
          temperature: 0.7
        });
        
        const response = result.text.trim();
        
        // 确定交互类型
        const interactionType = this.state.currentInteractionType || 'chat';
        
        // 确定学习点（如果有）
        let learningPoint = null;
        let progress = 10;
        
        if (interactionType === '学习') {
          // 对于学习类型的互动，提取学习点
          learningPoint = `lesson_${Date.now()}`;
        }
        
        return {
          output: response,
          metadata: {
            interactionType,
            learningPoint,
            progress
          }
        };
      } catch (error) {
        console.error('生成初始响应失败:', error);
        // 降级到默认初始响应
        const greetings = [
          `你好！我是你的好朋友TinyBuddy！我听说你叫${input.context.childProfile.name}，今年${input.context.childProfile.age}岁了，对吗？`,
          `嗨！${input.context.childProfile.name}小朋友你好呀！我是TinyBuddy，很高兴认识你！`,
          `你好呀${input.context.childProfile.name}！我是TinyBuddy，我们来一起玩吧！`
        ];
        const defaultResponse = greetings[Math.floor(Math.random() * greetings.length)];
        
        // 确定交互类型
        const interactionType = this.state.currentInteractionType || 'chat';
        
        // 确定学习点（如果有）
        let learningPoint = null;
        let progress = 10;
        
        if (interactionType === '学习') {
          // 对于学习类型的互动，提取学习点
          learningPoint = `lesson_${Date.now()}`;
        }
        
        return {
          output: defaultResponse,
          metadata: {
            interactionType,
            learningPoint,
            progress,
            fallback: true
          }
        };
      }
    }
    
    // 处理用户消息
    const response = await this.handleUserMessage(input.input, input.context);
    
    // 确定交互类型
    const interactionType = this.state.currentInteractionType || 'chat';
    
    // 确定学习点（如果有）
    let learningPoint = null;
    let progress = 10;
    
    if (interactionType === '学习') {
      // 对于学习类型的互动，提取学习点
      learningPoint = `lesson_${Date.now()}`;
    }
    
    return {
      output: response,
      metadata: {
        interactionType,
        learningPoint,
        progress
      }
    };
  }

  getState(): Record<string, any> {
    return {
      ...this.state,
      currentPlan: this.currentPlan
    };
  }

  setState(state: Record<string, any>): void {
    this.state = state;
    if (state.currentPlan) {
      this.currentPlan = state.currentPlan;
    }
  }

  // 处理用户消息
  private async handleUserMessage(message: string, context: ActorContext): Promise<string> {
    // 在开发模式下，直接使用模拟响应
    if (DEVELOPMENT_MODE) {
      console.log('开发模式: 使用模拟用户消息响应');
      return this.createMockResponse(message, context);
    }
    
    const { childProfile, conversationHistory } = context;
    
    try {
      // 构建提示词
      const prompt = this.buildPrompt(message, childProfile, conversationHistory);
      
      // 调用大模型生成响应
      const result = await generateText({
        model: openai('gpt-4.1'),
        prompt,
        maxOutputTokens: 200,
        temperature: 0.7
      });
      
      return result.text.trim();
    } catch (error) {
      console.error('大模型调用失败:', error);
      // 降级到默认响应
      return '我现在有点忙，我们稍后再聊吧！';
    }
  }
  
  // 创建开发模式下的模拟问候语
  private createMockGreeting(context: ActorContext): string {
    const { childProfile } = context;
    const greetings = [
      `你好！我是你的好朋友TinyBuddy！我听说你叫${childProfile.name}，今年${childProfile.age}岁了，对吗？`,
      `嗨！${childProfile.name}小朋友你好呀！我是TinyBuddy，很高兴认识你！`,
      `你好呀${childProfile.name}！我是TinyBuddy，我们来一起玩吧！`,
      `哇！${childProfile.name}小朋友，你好可爱呀！我是你的新朋友TinyBuddy！`
    ];
    
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
  
  // 创建开发模式下的模拟用户消息响应
  private createMockResponse(message: string, context: ActorContext): string {
    const { childProfile } = context;
    
    // 简单的响应映射
    const responseMap: Record<string, string[]> = {
      '你好': [
        `${childProfile.name}你好呀！今天过得怎么样？`,
        `你好你好！很高兴见到你！`
      ],
      '你是谁': [
        `我是TinyBuddy，你的智能陪伴助手！`,
        `我是TinyBuddy，专门来陪你玩的！`
      ],
      '玩游戏': [
        `好呀！我们来玩猜谜语的游戏吧！`,
        `太好了！你想玩什么游戏呢？`
      ],
      '讲故事': [
        `好呀！我来给你讲一个关于勇敢小兔子的故事吧！`,
        `想听故事吗？那我给你讲一个神奇的冒险故事！`
      ]
    };
    
    // 检查是否有匹配的关键词
    for (const [keyword, responses] of Object.entries(responseMap)) {
      if (message.includes(keyword)) {
        return responses[Math.floor(Math.random() * responses.length)];
      }
    }
    
    // 默认响应
    const defaultResponses = [
      `${childProfile.name}，你刚才说的话真有趣！`,
      `我明白了！那我们接下来做什么呢？`,
      `哈哈，真好玩！我们继续聊天吧！`,
      `你想不想玩个小游戏？`
    ];
    
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  }
  
  // 构建提示词
  private buildPrompt(message: string, childProfile: any, conversationHistory: Message[]): string {
    const recentMessages = conversationHistory.slice(-5); // 获取最近5条消息
    const chatHistory = recentMessages.map(m => 
      `${m.type === 'user' ? '用户' : '助手'}: ${m.content}`
    ).join('\n');
    
    const systemPrompt = `你是一个名为TinyBuddy的儿童智能陪伴助手，专门陪伴${childProfile.age}岁的儿童${childProfile.name}。
` +
    `儿童的兴趣爱好是: ${childProfile.interests.join(', ')}
` +
    `请用简单、友好、有趣的语言与儿童交流，避免使用复杂词汇。
` +
    `当前互动类型: ${this.state.currentInteractionType || '聊天'}
` +
    `如果儿童情绪低落，请给予安慰和鼓励。
` +
    `保持对话自然、亲切，符合${childProfile.age}岁儿童的认知水平。`;
    
    return `${systemPrompt}\n\n${chatHistory}\n\n用户: ${message}\n\n助手:`;
  }
}