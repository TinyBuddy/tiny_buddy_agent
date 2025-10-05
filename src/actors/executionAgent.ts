import { deepseek } from "@ai-sdk/deepseek";
// import { openai } from "@ai-sdk/openai";

import { generateText } from "ai";
import { config } from "dotenv";
import { getFullSystemPrompt } from "../config/agentConfig";
import type { ChildProfile } from "../models/childProfile";
import type { Message } from "../models/message";
import type { KnowledgeBaseService } from "../services/knowledgeBaseService";
import type { MemoryService } from "../services/memoryService";
// 执行Agent
import type { ActorContext, BaseActor } from "./baseActor";

// 加载环境变量
config();

// 开发模式标志
const DEVELOPMENT_MODE = process.env.DEVELOPMENT_MODE === "true";

// 执行Agent配置接口
interface ExecutionAgentConfig {
	useLLM?: boolean;
	model?: string;
	knowledgeBaseService?: KnowledgeBaseService;
	memoryService?: MemoryService;
}

// 执行计划接口
interface ExecutionPlan {
	interactionType?: string;
	type?: string;
	contentId?: string;
	objectives?: string[];
	strategy?: string;
	[key: string]: unknown; // 允许其他属性
}

export class ExecutionAgent implements BaseActor {
	id: string;
	name: string;
	description: string;
	type: string;
	private state: Record<string, unknown> = {};
	private config: ExecutionAgentConfig;
	private currentPlan: unknown = null;
	private knowledgeBaseService: KnowledgeBaseService | undefined;
	private memoryService: MemoryService | undefined;

	constructor(config: ExecutionAgentConfig = {}) {
		this.id = "execution_agent";
		this.name = "执行Agent";
		this.description = "负责根据规划Agent的计划与儿童进行实际互动";
		this.type = "executionAgent";
		this.config = {
			useLLM: true,
			model: "gpt-4.1",
			...config,
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
			currentContentId: null,
		};
	}

	async process(input: {
		input: string;
		context: ActorContext;
		plan?: ExecutionPlan;
		relevantKnowledge?: any;
	}): Promise<{ output: string; metadata?: Record<string, unknown> }> {
		console.log("executionAgent process input :", input);

		// 使用传入的计划
		if (input.plan) {
			this.currentPlan = input.plan;
			this.state.currentInteractionType =
				input.plan.interactionType || input.plan.type;
			this.state.currentContentId = input.plan.contentId;

			// 在开发模式下，直接使用模拟响应
			if (DEVELOPMENT_MODE) {
				console.log("开发模式: 使用模拟响应");
				const mockResponse = this.createMockGreeting(input.context);

				// 确定交互类型
				const interactionType = this.state.currentInteractionType || "chat";

				// 确定学习点（如果有）
				let learningPoint = null;
				const progress = 10;

				if (interactionType === "学习") {
					// 对于学习类型的互动，提取学习点
					learningPoint = `lesson_${Date.now()}`;
				}

				return {
					output: mockResponse,
					metadata: {
						interactionType,
						learningPoint,
						progress,
						developmentMode: true,
					},
				};
			}

			try {
				// 构建更智能的响应提示词，使用Sparky角色设定
				const prompt = this.buildPrompt(
					input.input,
					input.context.childProfile,
					input.context.conversationHistory,
					input.plan,
					input.relevantKnowledge,
				);

				console.log("executionAgent prompt :", prompt);

				// 调用大模型生成初始响应
				const result = await generateText({
					model: deepseek(process.env.DEEPSEEK_MODEL || "deepseek-chat"),
					//   model: openai("gpt-4.1"),
					prompt,
					maxOutputTokens: 300, // 增加token数以支持更长的响应
					temperature: 0.7,
				});

				const response = result.text.trim();

				// 确定交互类型
				const interactionType = this.state.currentInteractionType || "chat";

				// 确定学习点（如果有）
				let learningPoint = null;
				const progress = 10;

				if (interactionType === "学习") {
					// 对于学习类型的互动，提取学习点
					learningPoint = `lesson_${Date.now()}`;
				}

				return {
					output: response,
					metadata: {
						interactionType,
						learningPoint,
						progress,
						prompt, // 添加提示词到metadata
					},
				};
			} catch (error) {
				console.error("生成初始响应失败:", error);
				// 降级到默认初始响应
				const greetings = [
					`Hi there! I'm Sparky, your friendly dinosaur pal! I hear your name is ${input.context.childProfile.name} and you're ${input.context.childProfile.age} years old! Nice to meet you!`,
					`Hey ${input.context.childProfile.name}! I'm Sparky the dinosaur! Let's be friends and learn Chinese together!`,
					`Roar! Hi ${input.context.childProfile.name}! I'm Sparky! I can't wait to play and learn with you!`,
				];
				const defaultResponse =
					greetings[Math.floor(Math.random() * greetings.length)];

				// 确定交互类型
				const interactionType = this.state.currentInteractionType || "chat";

				// 确定学习点（如果有）
				let learningPoint = null;
				const progress = 10;

				if (interactionType === "学习") {
					// 对于学习类型的互动，提取学习点
					learningPoint = `lesson_${Date.now()}`;
				}

				return {
					output: defaultResponse,
					metadata: {
						interactionType,
						learningPoint,
						progress,
						fallback: true,
					},
				};
			}
		}

		// 处理用户消息
		const response = await this.handleUserMessage(input.input, input.context);

		// 确定交互类型
		const interactionType = this.state.currentInteractionType || "chat";

		// 确定学习点（如果有）
		let learningPoint = null;
		const progress = 10;

		if (interactionType === "学习") {
			// 对于学习类型的互动，提取学习点
			learningPoint = `lesson_${Date.now()}`;
		}

		return {
			output: response,
			metadata: {
				interactionType,
				learningPoint,
				progress,
			},
		};
	}

	getState(): Record<string, unknown> {
		return {
			...this.state,
			currentPlan: this.currentPlan,
		};
	}

	setState(state: Record<string, unknown>): void {
		this.state = state;
		if (state.currentPlan) {
			this.currentPlan = state.currentPlan;
		}
	}

	// 处理用户消息
	private async handleUserMessage(
		message: string,
		context: ActorContext,
	): Promise<string> {
		// 在开发模式下，直接使用模拟响应
		if (DEVELOPMENT_MODE) {
			console.log("开发模式: 使用模拟用户消息响应");
			return this.createMockResponse(message, context);
		}

		const { childProfile, conversationHistory } = context;

		try {
			// 构建提示词
			const prompt = this.buildPrompt(
				message,
				childProfile,
				conversationHistory,
			);

			// 调用大模型生成响应
			const result = await generateText({
				model: deepseek(process.env.DEEPSEEK_MODEL || "deepseek-chat"),
				// model: openai("gpt-4.1"),
				prompt,
				maxOutputTokens: 200,
				temperature: 0.7,
			});

			return result.text.trim();
		} catch (error) {
			console.error("大模型调用失败:", error);
			// 降级到默认响应
			return "我现在有点忙，我们稍后再聊吧！";
		}
	}

	// 创建开发模式下的模拟问候语
	private createMockGreeting(context: ActorContext): string {
		const { childProfile } = context;
		const greetings = [
			`Hi there! I'm Sparky, your friendly dinosaur pal! I hear your name is ${childProfile.name} and you're ${childProfile.age} years old! Nice to meet you! 我听得到你！wǒ tīng dé dào nǐ!`,
			`Hey ${childProfile.name}! I'm Sparky the dinosaur! Let's be friends and learn Chinese together! 我们来玩吧！wǒ men lái wán ba!`,
			`Roar! Hi ${childProfile.name}! I'm Sparky! I can't wait to play and learn with you! 太有趣了！tài yǒu qù le!`,
			`Oh hi ${childProfile.name}! I'm Sparky! I'm a dinosaur who loves to learn Chinese words! 你好！nǐ hǎo! That means "hello"!`,
		];

		return greetings[Math.floor(Math.random() * greetings.length)];
	}

	// 创建开发模式下的模拟用户消息响应
	private createMockResponse(message: string, context: ActorContext): string {
		const { childProfile } = context;

		// 简单的响应映射 - 英文为主，插入中文词汇
		const responseMap: Record<string, string[]> = {
			hello: [
				`Hi ${childProfile.name}! It's so nice to hear from you! 你好！nǐ hǎo! That means "hello" in Chinese!`,
				`Hello hello! How's your day going? Let's learn a new Chinese word today! 你好！nǐ hǎo!`,
			],
			"who are you": [
				`I'm Sparky, your fuzzy dinosaur friend who loves teaching Chinese! 我是Sparky！wǒ shì Sparky!`,
				`I'm Sparky! I'm a dinosaur who can't see with eyes, but I can hear everything! 我听得到你！wǒ tīng dé dào nǐ!`,
			],
			"play game": [
				`Yes! Let's play a game! How about we learn animal sounds in Chinese? 狗狗... gǒu gǒu... woof! 狗狗 dog!`,
				`Great idea! Let's play "I spy" and learn Chinese words as we go! 看！kàn! That means "look"!`,
			],
			story: [
				`Once upon a time, there was a happy little dinosaur named Sparky who loved learning Chinese! 开心！kāi xīn! That means "happy"!`,
				`Let me tell you a story about a magical adventure! 魔法！mó fǎ! That means "magic"!`,
			],
		};

		// 转换消息为小写进行匹配
		const lowerMessage = message.toLowerCase();

		// 检查是否有匹配的关键词
		for (const [keyword, responses] of Object.entries(responseMap)) {
			if (lowerMessage.includes(keyword)) {
				return responses[Math.floor(Math.random() * responses.length)];
			}
		}

		// 默认响应 - 英文为主，插入中文词汇
		const defaultResponses = [
			`That's so interesting, ${childProfile.name}! Let's keep talking and learning Chinese together! 太有趣了！tài yǒu qù le!`,
			`I love chatting with you! What should we talk about next? Maybe learn a new Chinese word? 学习！xué xí! That means "learn"!`,
			`You're doing a great job, ${childProfile.name}! Let's keep having fun and learning! 开心！kāi xīn! Happy!`,
			`Want to play a game or learn a new Chinese word? I'm ready for anything! 准备好了！zhǔn bèi hǎo le!`,
		];

		return defaultResponses[
			Math.floor(Math.random() * defaultResponses.length)
		];
	}

	// 构建提示词 - 使用Sparky角色设定（英文为主）
	private buildPrompt(
		message: string,
		childProfile: ChildProfile,
		conversationHistory: Message[],
		plan?: any,
		relevantKnowledge?: any,
	): string {
		const recentMessages = conversationHistory.slice(-5); // 获取最近5条消息
		const chatHistory = recentMessages
			.map((m) => `${m.type === "user" ? "Child" : "Sparky"}: ${m.content}`)
			.join("\n");

		// 从全局配置获取系统提示词
		let systemPrompt = getFullSystemPrompt(childProfile);

		// 添加相关知识库内容（如果有）
		if (relevantKnowledge?.content) {
			console.log("promt add relevantKnowledge:", relevantKnowledge);
			systemPrompt += `\n\nHere's some relevant teaching material to reference in your response: ${JSON.stringify(relevantKnowledge.content)}\n`;
		}

		if (plan?.strategy) {
			systemPrompt += `\n\nTeaching strategy for this interaction: ${plan.strategy}\n`;
		}

		systemPrompt += "\n\nrelevantKnowledge: 暂无\n";

		// 添加计划信息（如果有）
		if (plan?.teachingFocus) {
			console.log("promt add plan:", plan);
			systemPrompt += `\n\nTeaching focus for this interaction: ${plan.teachingFocus}\n`;
		}

		return `${systemPrompt}\n\n${chatHistory}\n\nChild: ${message}\n\nSparky:`;
	}
}
