// import { deepseek } from "@ai-sdk/deepseek";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { config } from "dotenv";
import { testDbConnection } from "../db/db";
import type { ChildProfile } from "../models/childProfile";
import type { KnowledgeContent } from "../models/content";
import type { Message } from "../models/message";
import type { KnowledgeBaseService } from "../services/knowledgeBaseService";
import type { MemoryService } from "../services/memoryService";
import type { VocabularyService } from "../services/vocabularyService";
import { defaultVocabularyService } from "../services/vocabularyService";
import type { ActorContext, BaseActor } from "./baseActor";

// 加载环境变量
config();

// 开发模式标志
const DEVELOPMENT_MODE = process.env.DEVELOPMENT_MODE === "true";

// 互动类型
enum InteractionType {
	CHAT = "chat",
	SONG = "song",
	STORY = "story",
	GAME = "game",
	LESSON = "lesson",
}

// 规划结果接口
interface PlanningResult {
	type: InteractionType;
	contentId?: string;
	objectives: string[];
	strategy: string;
}

// 中文词汇存储接口（已迁移到数据库，保留接口用于兼容性）
interface ChineseVocabularyStore {
	// 存储中文词汇，按childId组织
	vocabularyMap: Map<string, Set<string>>;
}

export class LongtermPlanningAgent implements BaseActor {
	id: string;
	name: string;
	description: string;
	type: string;
	private state: Record<string, unknown> = {};
	private lastPlan: PlanningResult | null = null;
	private knowledgeBaseService: KnowledgeBaseService | undefined;
	private memoryService: MemoryService | undefined;
	private scheduleTimer: NodeJS.Timeout | null = null;
	private vocabularyService: VocabularyService;
	// 保留内存中的词汇存储作为缓存
	private vocabularyStore: ChineseVocabularyStore = {
		vocabularyMap: new Map(),
	};
	private checkIntervalMinutes = 600; // 每分钟执行一次
	private dbInitialized = false;

	constructor(config: {
		knowledgeBaseService?: KnowledgeBaseService;
		memoryService?: MemoryService;
		vocabularyService?: VocabularyService;
	}) {
		this.id = "longterm_planning_agent";
		this.name = "长期规划Agent";
		this.description = "每分钟执行一次，分析用户对话并生成长期互动计划";
		this.type = "longtermPlanningAgent";
		this.knowledgeBaseService = config.knowledgeBaseService;
		this.memoryService = config.memoryService;
		this.vocabularyService =
			config.vocabularyService || defaultVocabularyService;
	}

	async init(context?: ActorContext): Promise<void> {
		console.log("初始化 LongtermPlanningAgent");
		// 初始化逻辑
		this.state = {
			initialized: true,
			lastUpdated: new Date(),
		};

		// 初始化数据库连接
		try {
			this.dbInitialized = await testDbConnection();
			if (this.dbInitialized) {
				console.log("数据库连接成功，将使用数据库存储词汇表");
				// 预加载所有用户的词汇表到内存缓存
				await this.preloadVocabularyCache();
			} else {
				console.warn("数据库连接失败，将使用内存存储词汇表");
			}
		} catch (error) {
			console.error("数据库初始化失败:", error);
			this.dbInitialized = false;
		}

		// 启动周期调度器（每分钟执行一次）
		this.startPeriodicScheduler();
	}

	// 预加载所有用户的词汇表到内存缓存
	private async preloadVocabularyCache(): Promise<void> {
		try {
			if (!this.memoryService) {
				return;
			}

			// 获取所有用户ID
			const allChildIds = await this.memoryService.getAllChildIds();

			// 为每个用户预加载词汇表
			for (const childId of allChildIds) {
				const words =
					await this.vocabularyService.getVocabularyByChildId(childId);
				const wordSet = new Set(words);
				this.vocabularyStore.vocabularyMap.set(childId, wordSet);
				console.log(
					`预加载用户 ${childId} 的词汇表，共 ${words.length} 个词汇`,
				);
			}
		} catch (error) {
			console.error("预加载词汇表缓存失败:", error);
		}
	}

	// 启动每分钟的调度器
	private async startPeriodicScheduler(): Promise<void> {
		// 清除已有的定时器
		if (this.scheduleTimer) {
			clearInterval(this.scheduleTimer);
		}

		// 设置定时器，每分钟执行一次
		this.scheduleTimer = setInterval(
			async () => {
				try {
					console.log("执行长期规划Agent任务");
					await this.processAllUsers();
				} catch (error) {
					console.error("执行长期规划Agent任务失败:", error);
				}
			},
			this.checkIntervalMinutes * 60 * 1000,
		); // 转换为毫秒

		console.log(
			`长期规划Agent已启动，每${this.checkIntervalMinutes}分钟执行一次`,
		);

		// 立即执行一次，不需要等待第一分钟 
		// 注释掉  后面有用再打开
		//await this.processAllUsers();
	}

	// 处理所有用户的逻辑
	private async processAllUsers(): Promise<void> {
		if (!this.memoryService) {
			console.error("缺少memoryService，无法处理用户");
			return;
		}

		try {
			// 获取所有用户ID
			const allChildIds = await this.memoryService.getAllChildIds();

			// 如果没有用户ID，添加默认用户
			if (allChildIds.length === 0) {
				const defaultChildId = "default_child";
				await this.memoryService.getChildProfile(defaultChildId); // 这会创建默认用户档案

				// 重新获取所有用户ID，包含默认用户
				const updatedChildIds = await this.memoryService.getAllChildIds();

				// 为每个用户处理
				for (const childId of updatedChildIds) {
					// 获取用户档案
					const childProfile =
						await this.memoryService.getChildProfile(childId);

					// 处理单个用户
					await this.processUser(childId, childProfile);
				}
			} else {
				// 为每个用户处理
				for (const childId of allChildIds) {
					// 获取用户档案
					const childProfile =
						await this.memoryService.getChildProfile(childId);

					// 处理单个用户
					await this.processUser(childId, childProfile);
				}
			}
		} catch (error) {
			console.error("处理所有用户失败:", error);
		}
	}

	// 处理单个用户的逻辑
	private async processUser(
		childId: string,
		childProfile: ChildProfile,
	): Promise<void> {
		try {
			// 1. 获取用户最近100条聊天记录
			const recentMessages = await this.getRecentMessages(childId, 100);

			// 2. 获取知识库内容摘要
			const knowledgeSummary = await this.getKnowledgeSummary();

			// 3. 构建提示词
			const prompt = this.buildPlanningPrompt(
				childProfile,
				recentMessages,
				knowledgeSummary,
			);

			// 4. 调用大模型生成计划
			const planningResult = await this.generatePlanningWithLLM(prompt, {
				childProfile,
				conversationHistory: recentMessages,
				knowledgeBase: [],
			});

			// 5. 提取并存储中文词汇
			await this.extractAndStoreChineseVocabulary(childId, recentMessages);

			// 6. 执行语言分级评估
			await this.performLanguageLevelAssessment(childId, childProfile, recentMessages);

			console.log(`为用户 ${childProfile.name}(${childId}) 生成了长期规划`);
			console.log(
				`存储的中文词汇数量: ${this.vocabularyStore.vocabularyMap.get(childId)?.size || 0}`,
			);
		} catch (error) {
			console.error(`处理用户 ${childId} 失败:`, error);
		}
	}

	// 获取用户最近的消息
	private async getRecentMessages(
		childId: string,
		count: number,
	): Promise<Message[]> {
		if (!this.memoryService) {
			return [];
		}

		try {
			const allMessages =
				await this.memoryService.getConversationHistory(childId);
			// 返回最近的消息，保持时间顺序
			return allMessages.slice(-count);
		} catch (error) {
			console.error(`获取用户 ${childId} 的消息失败:`, error);
			return [];
		}
	}

	// 获取知识库内容摘要
	private async getKnowledgeSummary(): Promise<string> {
		if (!this.knowledgeBaseService) {
			return "No available knowledge base content";
		}

		try {
			const knowledgeBase = await this.knowledgeBaseService.getAllContents();

			if (!knowledgeBase || knowledgeBase.length === 0) {
				return "No available knowledge base content";
			}

			return knowledgeBase
				.map(
					(item) =>
						`ID: ${item.id}, 类型: ${item.type}, 标题: ${item.title}, 难度: ${item.difficulty}, 分类: ${item.categories.join(", ")}`,
				)
				.join("\n");
		} catch (error) {
			console.error("获取知识库内容失败:", error);
			return "No available knowledge base content";
		}
	}

	// 构建规划提示词
	private buildPlanningPrompt(
		childProfile: ChildProfile,
		recentMessages: Message[],
		knowledgeSummary: string,
	): string {
		const messagesText = recentMessages
			.map((m) => `${m.type === "user" ? "User" : "Assistant"}: ${m.content}`)
			.join("\n");

		// 确保 interests 字段存在且是数组
		const interests = Array.isArray(childProfile.interests) ? childProfile.interests : [];
		const interestsText = interests.join(", ") || "暂无兴趣记录";

		return `You are a professional children's companion assistant planner, and you need to create an interaction plan for ${childProfile.name} (${childProfile.age} years old).\nChild Interests and Hobbies: ${interestsText}\nRecent Conversation History:\n${messagesText}\nAvailable Knowledge Base Content:\n${knowledgeSummary}\nBased on the child's age, interests, recent conversations, and available knowledge base, generate a detailed interaction plan.Extract Chinese vocabulary mentioned in the dialogue, then store these terms in memory. Each child (childID) is recorded separately in a Map format.\nInteraction types can be: chat, song, story, game, lesson\nPlease return in JSON format with the following fields:\n- interactionType: interaction type\n- contentId: ID of knowledge base content that can be used (if any)\n- objectives: array of interaction objectives\n- strategy: interaction strategy description\nPlease ensure the JSON format is correct and does not include any additional text.`;
	}

	// 使用大模型生成规划
	private async generatePlanningWithLLM(
		prompt: string,
		context: ActorContext,
	): Promise<PlanningResult> {
		try {
			// 在开发模式下，使用模拟数据
			if (DEVELOPMENT_MODE) {
				return this.createMockPlanningResult(context);
			}

			// 调用大模型生成规划
			const result = await generateText({
				// model: deepseek(process.env.DEEPSEEK_MODEL || "deepseek-chat"),
				model: openai("gpt-4.1"),
				prompt,
			});

			// 解析大模型响应
			return this.parseLLMResponse(result.text, context);
		} catch (error) {
			console.error("生成规划失败:", error);
			// 使用默认规划
			return this.createFallbackPlan(context);
		}
	}

	// 解析大模型响应
	private parseLLMResponse(
		text: string,
		context: ActorContext,
	): PlanningResult {
		let llmPlan: any = null;
		let jsonStr: string | null = null;

		try {
			// 尝试多种方式解析JSON
			// 方式1: 直接尝试解析整个文本
			try {
				llmPlan = JSON.parse(text);
			} catch (e) {
				// 方式2: 尝试提取代码块中的JSON
				const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
				if (codeBlockMatch?.[1]) {
					jsonStr = codeBlockMatch[1];
					llmPlan = JSON.parse(jsonStr);
				} else {
					// 方式3: 如果仍然没有找到，尝试更宽松的匹配
					if (!jsonStr) {
						const looseMatch = text.match(/(\{[^}]*"interactionType"[^}]*\})/);
						if (looseMatch?.[1]) {
							jsonStr = looseMatch[1];
							llmPlan = JSON.parse(jsonStr);
						}
					}
				}
			}

			if (!llmPlan) {
				throw new Error("无法从LLM响应中提取有效的JSON");
			}
		} catch (error) {
			console.error("解析大模型响应失败:", error);
			console.error("LLM响应内容:", text);
			// 使用默认规划
			return this.createFallbackPlan(context);
		}

		// 转换为PlanningResult格式
		return {
			type: this.mapInteractionType(
				typeof llmPlan.interactionType === "string"
					? llmPlan.interactionType
					: "",
			),
			contentId:
				typeof llmPlan.contentId === "string" ? llmPlan.contentId : undefined,
			objectives: Array.isArray(llmPlan.objectives)
				? llmPlan.objectives.filter(
						(item: any): item is string => typeof item === "string",
					)
				: [],
			strategy: typeof llmPlan.strategy === "string" ? llmPlan.strategy : "",
		};
	}

	// 提取并存储中文词汇
	private async extractAndStoreChineseVocabulary(
		childId: string,
		messages: Message[],
	): Promise<void> {
		try {
			// 合并所有消息内容
			const allContent = messages.map((m) => m.content).join(" ");

			// 正则表达式匹配中文字符
			const chineseChars = allContent.match(/[\u4e00-\u9fa5]+/g) || [];

			if (chineseChars.length === 0) {
				console.log(`用户 ${childId} 的消息中没有找到中文字符`);
				return;
			}

			// 初始化用户的词汇集合（内存缓存）
			if (!this.vocabularyStore.vocabularyMap.has(childId)) {
				this.vocabularyStore.vocabularyMap.set(childId, new Set());
			}

			const vocabularySet = this.vocabularyStore.vocabularyMap.get(childId)!;

			// 过滤掉已存在于内存缓存中的词汇
			const newChars = chineseChars.filter((char) => !vocabularySet.has(char));

			if (newChars.length === 0) {
				console.log(`用户 ${childId} 没有发现新的中文字符`);
				return;
			}

			// 更新内存缓存
			newChars.forEach((char) => {
				vocabularySet.add(char);
			});

			// 将词汇持久化存储到数据库
			if (this.dbInitialized) {
				try {
					await this.vocabularyService.addVocabulary(childId, newChars);
					console.log(
						`为用户 ${childId} 提取并保存了 ${newChars.length} 个新的中文字符到数据库`,
					);
				} catch (dbError) {
					console.error("将词汇保存到数据库失败:", dbError);
					// 即使数据库保存失败，我们仍然保留内存中的更新
				}
			} else {
				console.log(
					`数据库未初始化，仅在内存中保存了 ${newChars.length} 个中文字符`,
				);
			}

			console.log(`为用户 ${childId} 提取了 ${chineseChars.length} 个中文字符`);
			console.log(`用户 ${childId} 的词汇集合:`, Array.from(vocabularySet));
		} catch (error) {
			console.error("提取中文词汇失败:", error);
		}
	}

	// 执行语言分级评估
	private async performLanguageLevelAssessment(
		childId: string,
		childProfile: ChildProfile,
		recentMessages: Message[],
	): Promise<void> {
		try {
			// 1. 从本地文件读取语言分级标准
			const languageLevelStandards = await this.loadLanguageLevelStandards();
			
			// 2. 从mem0获取长期记忆（如果可用）
			const longTermMemories = await this.getLongTermMemories(childId);
			
			// 3. 构建语言分级评估提示词
			const assessmentPrompt = this.buildLanguageAssessmentPrompt(
				childProfile,
				recentMessages,
				longTermMemories,
				languageLevelStandards
			);
			
			// 4. 调用大模型进行语言分级评估
			const languageLevel = await this.generateLanguageLevelWithLLM(assessmentPrompt);
			
			// 5. 将语言分级结果存储到数据库
			await this.storeLanguageLevelToDatabase(childId, languageLevel);
			
			console.log(`为用户 ${childProfile.name}(${childId}) 完成语言分级评估: ${languageLevel}`);
		} catch (error) {
			console.error(`语言分级评估失败:`, error);
		}
	}

	// 从本地文件读取语言分级标准
	private async loadLanguageLevelStandards(): Promise<any> {
		try {
			const fs = require('fs');
			const path = require('path');
			
			const levelSpeakingPath = path.join(__dirname, '..', '..', '..', 'level speaking.md');
			
			if (fs.existsSync(levelSpeakingPath)) {
				const content = fs.readFileSync(levelSpeakingPath, 'utf-8');
				// 解析JSON格式的语言分级标准
				// 这里假设文件内容是JSON格式
				return JSON.parse(content);
			} else {
				console.warn('Language level standards file not found:', levelSpeakingPath);
				return {};
			}
		} catch (error) {
			console.error('Error loading language level standards:', error);
			return {};
		}
	}

	// 从mem0获取长期记忆
	private async getLongTermMemories(childId: string): Promise<any[]> {
		try {
			// 这里需要检查是否有mem0服务可用
			// 暂时返回空数组，后续可以集成mem0服务
			return [];
		} catch (error) {
			console.error('Error getting long term memories:', error);
			return [];
		}
	}

	// 构建语言分级评估提示词
	private buildLanguageAssessmentPrompt(
		childProfile: ChildProfile,
		recentMessages: Message[],
		longTermMemories: any[],
		languageLevelStandards: any
	): string {
		const messageContent = recentMessages
			.map(msg => `${msg.type === "user" ? "User" : "Assistant"}: ${msg.content}`)
			.join('\n');
		
		const memoryContent = longTermMemories
			.map(memory => memory.content || '')
			.join('\n');
		
		return `请根据以下信息评估儿童的语言能力等级（L1-L5）：

儿童信息：
- 姓名：${childProfile.name}
- 年龄：${childProfile.age}

近期对话记录：
${messageContent}

长期记忆信息：
${memoryContent}

语言分级标准：
${JSON.stringify(languageLevelStandards, null, 2)}

请分析该儿童的语言能力，并给出L1到L5的等级评估。
请只返回等级编号（L1, L2, L3, L4, 或 L5），不要包含其他内容。`;
	}

	// 调用大模型生成语言分级
	private async generateLanguageLevelWithLLM(prompt: string): Promise<string> {
		try {
			// 这里需要调用大模型API
			// 暂时返回默认值L3
			return 'L3';
		} catch (error) {
			console.error('Error generating language level with LLM:', error);
			return 'L3'; // 默认等级
		}
	}

	// 将语言分级结果存储到数据库
	private async storeLanguageLevelToDatabase(childId: string, languageLevel: string): Promise<void> {
		try {
			// 这里需要调用数据库服务更新儿童档案的语言分级字段
			console.log(`Storing language level ${languageLevel} for child ${childId} to database`);
			
			// 模拟数据库更新操作
			// 实际实现需要调用相应的数据库服务
		} catch (error) {
			console.error('Error storing language level to database:', error);
		}
	}

	// 创建模拟规划结果
	private createMockPlanningResult(context: ActorContext): PlanningResult {
		const { childProfile } = context;

		// 简单的模拟规划
		return {
			type: InteractionType.CHAT,
			objectives: ["建立情感连接", "鼓励表达", "长期发展"],
			strategy: `与${childProfile.name}进行友好交流，使用简单易懂的语言，保持积极鼓励的语气。根据最近的对话内容，探讨他们感兴趣的话题。`,
		};
	}

	// 创建降级计划
	private createFallbackPlan(context: ActorContext): PlanningResult {
		const { childProfile } = context;

		// 简单的默认规划逻辑
		return {
			type: InteractionType.CHAT,
			objectives: ["建立情感连接", "鼓励表达"],
			strategy: `Chat with ${childProfile.name} as a friend, using simple and easy-to-understand language, maintaining a positive and encouraging tone.`,
		};
	}

	// 映射互动类型
	private mapInteractionType(llmType: string): InteractionType {
		const typeMap: Record<string, InteractionType> = {
			chat: InteractionType.CHAT,
			song: InteractionType.SONG,
			story: InteractionType.STORY,
			game: InteractionType.GAME,
			lesson: InteractionType.LESSON,
		};

		return typeMap[llmType.toLowerCase()] || InteractionType.CHAT;
	}

	// 实现BaseActor接口的process方法
	async process(input: {
		input: string;
		context: ActorContext;
		plan?: unknown;
	}): Promise<{ output: string; metadata?: Record<string, unknown> }> {
		try {
			// 这里可以根据需要处理实时输入
			// 但LongtermPlanningAgent主要是后台任务，所以这个方法可能用得不多

			// 获取用户的中文词汇数量作为元数据
			const childId = input.context.childProfile.id;
			const vocabularyCount =
				this.vocabularyStore.vocabularyMap.get(childId)?.size || 0;

			return {
				output: "长期规划Agent正在运行中...",
				metadata: {
					vocabularyCount,
					lastUpdated: new Date(),
				},
			};
		} catch (error) {
			console.error("处理输入失败:", error);
			return {
				output: "处理失败，请稍后再试。",
			};
		}
	}

	// 实现BaseActor接口的getState方法
	getState(): Record<string, unknown> {
		// 词汇统计接口定义
		interface VocabularyStats {
			[childId: string]: {
				count: number;
			};
		}

		// 返回当前状态，包括词汇存储信息
		const stateWithVocabulary: Record<string, unknown> & {
			vocabularyStats: VocabularyStats;
		} = {
			...this.state,
			vocabularyStats: {},
		};

		// 添加每个用户的词汇统计
		this.vocabularyStore.vocabularyMap.forEach((vocabularySet, childId) => {
			stateWithVocabulary.vocabularyStats[childId] = {
				count: vocabularySet.size,
				// 可以根据需要添加更多统计信息
			};
		});

		return stateWithVocabulary;
	}

	// 实现BaseActor接口的setState方法
	setState(state: Record<string, unknown>): void {
		this.state = { ...state };
	}

	// 清理资源
	async cleanup(): Promise<void> {
		if (this.scheduleTimer) {
			clearInterval(this.scheduleTimer);
			this.scheduleTimer = null;
		}
		console.log("长期规划Agent已停止");
	}
}
