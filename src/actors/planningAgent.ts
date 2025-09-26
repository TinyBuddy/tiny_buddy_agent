import { deepseek } from "@ai-sdk/deepseek";
import { generateText } from "ai";
import { config } from "dotenv";
import type { ChildProfile } from "../models/childProfile";
import type { KnowledgeContent } from "../models/content";
import type { Message } from "../models/message";
import type { KnowledgeBaseService } from "../services/knowledgeBaseService";
import type { MemoryService } from "../services/memoryService";
// 陪伴/教育规划Agent
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

export class PlanningAgent implements BaseActor {
	id: string;
	name: string;
	description: string;
	type: string;
	private state: Record<string, unknown> = {};
	private lastPlan: PlanningResult | null = null;
	private knowledgeBaseService: KnowledgeBaseService | undefined;
	private memoryService: MemoryService | undefined;

	constructor(config: {
		knowledgeBaseService?: KnowledgeBaseService;
		memoryService?: MemoryService;
	}) {
		this.id = "planning_agent";
		this.name = "陪伴/教育规划Agent";
		this.description = "负责规划与儿童的互动内容和教育目标";
		this.type = "planningAgent";
		this.knowledgeBaseService = config.knowledgeBaseService;
		this.memoryService = config.memoryService;
	}

	async init(context?: ActorContext): Promise<void> {
		// 初始化逻辑
		this.state = {
			initialized: true,
			lastUpdated: new Date(),
		};
	}

	async process(input: {
		input: string;
		context: ActorContext;
		plan?: PlanningResult;
	}): Promise<{ output: string; metadata?: Record<string, unknown> }> {
		try {
			// 在开发模式下，直接使用模拟规划
			if (DEVELOPMENT_MODE) {
				console.log("开发模式: 使用模拟规划");
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
						developmentMode: true,
					},
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
					objectives: plan.objectives,
				},
			};
		} catch (error) {
			console.error("大模型规划失败:", error);
			// 降级到默认规划
			const defaultPlan = this.createFallbackPlan(input.context);
			const response = this.generateResponse(defaultPlan);

			return {
				output: response,
				metadata: {
					interactionType: defaultPlan.type,
					contentId: defaultPlan.contentId,
					objectives: defaultPlan.objectives,
					fallback: true,
				},
			};
		}
	}

	// 创建开发模式下的模拟规划
	private createMockPlan(context: ActorContext): PlanningResult {
		const { childProfile } = context;

		// 简单的模拟规划逻辑
		return {
			type: InteractionType.CHAT,
			objectives: ["建立情感连接", "鼓励表达"],
			strategy: `以朋友的身份与${childProfile.name}聊天，使用简单易懂的语言，保持积极鼓励的语气。`,
		};
	}

	getState(): Record<string, unknown> {
		return {
			...this.state,
			lastPlan: this.lastPlan,
		};
	}

	setState(state: Record<string, unknown>): void {
		this.state = state;
		if (state.lastPlan) {
			this.lastPlan = state.lastPlan as PlanningResult;
		}
	}

	// 使用大模型生成互动计划
	private async generatePlanWithLLM(
		context: ActorContext,
	): Promise<PlanningResult> {
		const { childProfile, conversationHistory, knowledgeBase } = context;
		const recentMessages = this.getRecentMessages(conversationHistory, 5);
		const knowledgeSummary = this.summarizeKnowledgeBase(knowledgeBase);

		// 构建规划提示词
		const prompt = this.buildPlanningPrompt(
			childProfile,
			recentMessages,
			knowledgeSummary,
		);

		// 调用大模型生成规划
		const result = await generateText({
			model: deepseek(process.env.DEEPSEEK_MODEL || "deepseek-chat"),
			prompt,
			maxOutputTokens: 500,
			temperature: 0.6,
		});

		// 解析大模型返回的JSON规划
		let llmPlan: Record<string, unknown>;
		try {
			// 从返回结果中提取JSON部分，使用更健壮的正则表达式
			const text = result.text.trim();
			console.log("LLM原始响应:", text); // 用于调试
			
			// 尝试多种方式提取JSON
			let jsonStr: string | null = null;
			
			// 方式1: 查找标准JSON对象或数组
			const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
			if (jsonMatch?.[0]) {
				jsonStr = jsonMatch[0];
			}
			
			// 方式2: 如果方式1失败，尝试查找代码块中的JSON
			if (!jsonStr) {
				const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\}|\[[\s\S]*\])\s*```/);
				if (codeBlockMatch?.[1]) {
					jsonStr = codeBlockMatch[1];
				}
			}
			
			// 方式3: 如果仍然没有找到，尝试更宽松的匹配
			if (!jsonStr) {
				const looseMatch = text.match(/(\{[^}]*"interactionType"[^}]*\})/);
				if (looseMatch?.[1]) {
					jsonStr = looseMatch[1];
				}
			}
			
			if (jsonStr) {
				// 在清理之前先记录原始提取的JSON字符串
				console.log("提取的原始JSON字符串:", jsonStr);
				
				// 清理JSON字符串，移除可能导致解析失败的字符
				// 但要更小心地处理，避免破坏有效的JSON结构
				jsonStr = jsonStr
					.replace(/\\n/g, "\\\\n")  // 转义换行符
					.replace(/\\t/g, "\\\\t")  // 转义制表符
					.replace(/\\\\n\s*\\\\n/g, "\\\\n")  // 合并多个换行符
					.trim();
				
				console.log("清理后的JSON字符串:", jsonStr); // 用于调试
				
				// 尝试解析JSON
				const parsedJson = JSON.parse(jsonStr);
				
				// 如果解析结果是数组，取第一个元素
				if (Array.isArray(parsedJson)) {
					console.log("检测到数组响应，使用第一个元素作为规划");
					llmPlan = parsedJson[0];
				} else {
					llmPlan = parsedJson;
				}
			} else {
				throw new Error("无法从LLM响应中提取有效的JSON");
			}
		} catch (error) {
			console.error("解析大模型响应失败:", error);
			console.error("LLM响应内容:", result.text);
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
						(item): item is string => typeof item === "string",
					)
				: [],
			strategy: typeof llmPlan.strategy === "string" ? llmPlan.strategy : "",
		};
	}

	// 构建规划提示词
	private buildPlanningPrompt(
		childProfile: ChildProfile,
		recentMessages: Message[],
		knowledgeSummary: string,
	): string {
		const messagesText = recentMessages
			.map((m) => `${m.type === "user" ? "用户" : "助手"}: ${m.content}`)
			.join("\n");

		return `你是一个专业的儿童陪伴助手规划师，需要为${childProfile.name}（${childProfile.age}岁）制定互动计划。\n儿童兴趣爱好：${childProfile.interests.join(", ")}\n最近的对话历史：\n${messagesText}\n可用的知识库内容：\n${knowledgeSummary}\n请根据儿童的年龄、兴趣、最近对话和可用知识库，生成一个详细的互动计划。\n互动类型可以是：chat（聊天）、song（唱歌）、story（讲故事）、game（玩游戏）、lesson（学习）\n请以JSON格式返回，包含以下字段：\n- interactionType: 互动类型\n- contentId: 可以使用的知识库内容ID（如果有）\n- objectives: 互动目标数组\n- strategy: 互动策略描述\n请确保JSON格式正确，不要包含任何额外的文本。`;
	}

	// 总结知识库内容
	private summarizeKnowledgeBase(knowledgeBase: KnowledgeContent[]): string {
		if (!knowledgeBase || knowledgeBase.length === 0) {
			return "暂无可用知识库内容";
		}

		return knowledgeBase
			.map(
				(item) =>
					`ID: ${item.id}, 类型: ${item.type}, 标题: ${item.title}, 难度: ${item.difficulty}, 分类: ${item.categories.join(", ")}`,
			)
			.join("\n");
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

	// 创建降级计划
	private createFallbackPlan(context: ActorContext): PlanningResult {
		const { childProfile } = context;

		// 简单的默认规划逻辑
		return {
			type: InteractionType.CHAT,
			objectives: ["建立情感连接", "鼓励表达"],
			strategy: `以朋友的身份与${childProfile.name}聊天，使用简单易懂的语言，保持积极鼓励的语气。`,
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
			[InteractionType.CHAT]: "聊天",
			[InteractionType.SONG]: "唱歌",
			[InteractionType.STORY]: "讲故事",
			[InteractionType.GAME]: "玩游戏",
			[InteractionType.LESSON]: "学习",
		};

		return JSON.stringify({
			type: "plan",
			interactionType: interactionTypeMap[plan.type],
			contentId: plan.contentId,
			objectives: plan.objectives,
			strategy: plan.strategy,
		});
	}
}
