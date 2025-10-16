// import { deepseek } from "@ai-sdk/deepseek";
import { openai } from "@ai-sdk/openai";
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

// 儿童年龄分级
interface AgeLevel {
	minAge: number;
	maxAge: number;
	level: string;
	characteristics: string[];
	recommendedActivities: string[];
}

// 天级别计划接口
interface DailyPlan {
	date: string;
	childId: string;
	ageLevel: AgeLevel;
	morningActivity: { type: string; content: string };
	afternoonActivity: { type: string; content: string };
	eveningActivity: { type: string; content: string };
	objectives: string[];
	notes: string;
}

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
	private dailyPlans: Map<string, DailyPlan> = new Map(); // 存储每天的计划，key为childId_date
	private scheduleTimer: NodeJS.Timeout | null = null;
	private ageLevels: AgeLevel[] = [
		{
			minAge: 3,
			maxAge: 4,
			level: "Preschool启蒙期",
			characteristics: [
				"Early language development",
				"Strong curiosity",
				"Concrete thinking",
			],
			recommendedActivities: [
				"Simple storytelling",
				"Interactive games",
				"Basic cognition",
			],
		},
		{
			minAge: 5,
			maxAge: 6,
			level: "Kindergarten准备期",
			characteristics: [
				"Extended attention span",
				"Beginning to understand abstract concepts",
				"Social skills development",
			],
			recommendedActivities: [
				"Structured stories",
				"Educational games",
				"Basic reading",
			],
		},
		{
			minAge: 7,
			maxAge: 9,
			level: "Lower elementary小学低年级",
			characteristics: [
				"Logical thinking development",
				"Increasing independence",
				"Enhanced learning ability",
			],
			recommendedActivities: [
				"Knowledge exploration",
				"Creative expression",
				"Teamwork",
			],
		},
		{
			minAge: 10,
			maxAge: 12,
			level: "Upper elementary小学高年级",
			characteristics: [
				"Abstract thinking formation",
				"Self-directed learning",
				"Interest development",
			],
			recommendedActivities: [
				"Thematic research",
				"Project-based learning",
				"Talent development",
			],
		},
	];

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
		console.log("初始化 PlanningAgent");
		// 初始化逻辑
		this.state = {
			initialized: true,
			lastUpdated: new Date(),
		};

		// 启动周期调度器（每天凌晨1点执行）
		this.startDailyScheduler();

		// 如果有上下文，立即为当前儿童生成当天计划
		if (context?.childProfile) {
			await this.generateDailyPlanForChild(
				context.childProfile.id,
				context.childProfile,
			);
		}
	}

	// 启动每天的调度器
	private startDailyScheduler(): void {
		// 清除已有的定时器
		if (this.scheduleTimer) {
			clearTimeout(this.scheduleTimer);
		}

		// 计算距离下次执行的时间（明天凌晨1点）
		const now = new Date();
		const nextExecution = new Date(now);
		nextExecution.setDate(nextExecution.getDate() + 1);
		nextExecution.setHours(1, 0, 0, 0);
		const delay = nextExecution.getTime() - now.getTime();

		// 设置定时器
		this.scheduleTimer = setTimeout(async () => {
			try {
				console.log("执行每日计划生成任务");
				// 获取所有儿童档案并为每个儿童生成当天计划
				if (this.memoryService) {
					// 只为默认儿童生成计划（简化处理）
					const defaultChildId = "default_child";
					try {
						const childProfile =
							await this.memoryService.getChildProfile(defaultChildId);
						await this.generateDailyPlanForChild(defaultChildId, childProfile);
					} catch (error) {
						console.error("为默认儿童生成计划失败:", error);
					}
				}
			} catch (error) {
				console.error("执行每日计划生成任务失败:", error);
			} finally {
				// 递归设置下一次执行
				this.startDailyScheduler();
			}
		}, delay);
	}

	// 为特定儿童生成当天计划
	public async generateDailyPlanForChild(
		childId: string,
		childProfile?: ChildProfile,
	): Promise<DailyPlan> {
		try {
			// 如果没有提供儿童档案，从服务中获取
			if (!childProfile && this.memoryService) {
				childProfile = await this.memoryService.getChildProfile(childId);
				if (!childProfile) {
					throw new Error(`未找到儿童档案: ${childId}`);
				}
			}

			if (!childProfile) {
				throw new Error(`无法为儿童生成计划: ${childId}，缺少儿童档案`);
			}

			const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD 格式
			const planKey = `${childId}_${today}`;

			// 检查是否已经存在当天计划
			let dailyPlan = this.dailyPlans.get(planKey);
			if (!dailyPlan) {
				// 确定年龄级别
				const ageLevel = this.determineAgeLevel(childProfile.age);

				// 生成当天的活动计划
				dailyPlan = await this.createDailyPlan(childProfile, ageLevel);

				// 存储计划
				this.dailyPlans.set(planKey, dailyPlan);

				console.log(
					`为儿童 ${childProfile.name}(${childId}) 生成了当天计划:`,
					dailyPlan,
				);
			}

			return dailyPlan;
		} catch (error) {
			console.error("生成儿童计划失败:", error);
			// 返回一个默认的简单计划
			const today = new Date().toISOString().split("T")[0];
			const defaultPlan: DailyPlan = {
				date: today,
				childId: childId,
				ageLevel: this.ageLevels[0], // 使用最低级别
				morningActivity: { type: "chat", content: "早上好！今天感觉怎么样？" },
				afternoonActivity: { type: "story", content: "让我们一起读个故事吧！" },
				eveningActivity: { type: "chat", content: "今天过得开心吗？" },
				objectives: ["建立情感连接", "鼓励表达"],
				notes: "默认计划 - 生成过程中出现错误",
			};
			return defaultPlan;
		}
	}

	// 确定儿童的年龄级别
	private determineAgeLevel(age: number): AgeLevel {
		for (const level of this.ageLevels) {
			if (age >= level.minAge && age <= level.maxAge) {
				return level;
			}
		}
		// 如果没有匹配的级别，返回最高级别
		return this.ageLevels[this.ageLevels.length - 1];
	}

	// 创建当天的详细计划
	private async createDailyPlan(
		childProfile: ChildProfile,
		ageLevel: AgeLevel,
	): Promise<DailyPlan> {
		const today = new Date().toISOString().split("T")[0];

		// 在开发模式下，使用简单的随机计划
		if (DEVELOPMENT_MODE) {
			return this.createMockDailyPlan(childProfile, ageLevel, today);
		}

		// 生产模式下，使用大模型生成计划
		return this.createDailyPlanWithLLM(childProfile, ageLevel, today);
	}

	// 创建开发模式下的模拟天级别计划
	private createMockDailyPlan(
		childProfile: ChildProfile,
		ageLevel: AgeLevel,
		date: string,
	): DailyPlan {
		// Activity type and content pools
		const morningActivities = [
			{
				type: "chat",
				content: `Good morning, ${childProfile.name}! Today is a wonderful day!`,
			},
			{
				type: "chat",
				content: `${childProfile.name}, did you sleep well last night?`,
			},
			{ type: "song", content: `Let's sing a good morning song together!` },
		];

		const afternoonActivities = [
			{
				type: "story",
				content: `${ageLevel.recommendedActivities.includes("Simple storytelling") || ageLevel.recommendedActivities.includes("Structured stories") ? "Let me tell you an interesting story" : "Let's play a fun game"}`,
			},
			{
				type: "game",
				content: `${ageLevel.recommendedActivities.includes("Interactive games") || ageLevel.recommendedActivities.includes("Educational games") ? "Let's play a guessing game" : "Let's explore new knowledge together"}`,
			},
			{
				type: "lesson",
				content: `${ageLevel.recommendedActivities.includes("Basic cognition") || ageLevel.recommendedActivities.includes("Knowledge exploration") ? "Today let's learn new knowledge" : "Let's use our imagination to create something"}`,
			},
		];

		const eveningActivities = [
			{
				type: "chat",
				content: `Did you have a good day, ${childProfile.name}?`,
			},
			{ type: "story", content: `It's bedtime story time!` },
			{ type: "chat", content: "Did anything interesting happen today?" },
		];

		// Randomly select activities
		const getRandomActivity = (
			activities: { type: string; content: string }[],
		) => {
			return activities[Math.floor(Math.random() * activities.length)];
		};

		// Generate objectives based on age level and interests
		const objectives = [
			`Based on cognitive characteristics of ${ageLevel.level} children`,
			`Aligns with ${childProfile.name}'s interests: ${childProfile.interests[0] || "Exploration"}`,
			...ageLevel.recommendedActivities.slice(0, 2),
		];

		return {
			date: date,
			childId: childProfile.id,
			ageLevel: ageLevel,
			morningActivity: getRandomActivity(morningActivities),
			afternoonActivity: getRandomActivity(afternoonActivities),
			eveningActivity: getRandomActivity(eveningActivities),
			objectives: objectives,
			notes: "Mock plan in development mode",
		};
	}

	// 使用大模型生成天级别计划
	private async createDailyPlanWithLLM(
		childProfile: ChildProfile,
		ageLevel: AgeLevel,
		date: string,
	): Promise<DailyPlan> {
		try {
			// 构建天级别计划提示词
			const prompt = this.buildDailyPlanPrompt(childProfile, ageLevel, date);

			// 调用大模型生成计划
			const result = await generateText({
				// model: deepseek(process.env.DEEPSEEK_MODEL || "deepseek-chat"),
				model: openai("gpt-4.1"),
				prompt,
				maxOutputTokens: 800,
				temperature: 0.7,
			});

			// 解析大模型返回的JSON计划
			let dailyPlan: DailyPlan;
			try {
				// 从返回结果中提取JSON部分
				const text = result.text.trim();
				// console.log("LLM天级别计划原始响应:", text);

				// 尝试多种方式提取JSON
				let jsonStr: string | null = null;

				// 方式1: 查找标准JSON对象
				const jsonMatch = text.match(/(\{[\s\S]*\})/);
				if (jsonMatch?.[0]) {
					jsonStr = jsonMatch[0];
				}

				// 方式2: 查找代码块中的JSON
				if (!jsonStr) {
					const codeBlockMatch = text.match(
						/```(?:json)?\s*(\{[\s\S]*\})\s*```/,
					);
					if (codeBlockMatch?.[1]) {
						jsonStr = codeBlockMatch[1];
					}
				}

				if (jsonStr) {
					// 清理JSON字符串
					jsonStr = jsonStr
						.replace(/\\n/g, "\\\\n")
						.replace(/\\t/g, "\\\\t")
						.trim();

					// 解析JSON
					const parsedJson = JSON.parse(jsonStr);

					// 构建DailyPlan对象
					dailyPlan = {
						date: date,
						childId: childProfile.id,
						ageLevel: ageLevel,
						morningActivity: {
							type: parsedJson.morningActivity?.type || "chat",
							content: parsedJson.morningActivity?.content || "早上好！",
						},
						afternoonActivity: {
							type: parsedJson.afternoonActivity?.type || "story",
							content:
								parsedJson.afternoonActivity?.content ||
								"我们一起读个故事吧！",
						},
						eveningActivity: {
							type: parsedJson.eveningActivity?.type || "chat",
							content:
								parsedJson.eveningActivity?.content || "今天过得开心吗？",
						},
						objectives: Array.isArray(parsedJson.objectives)
							? parsedJson.objectives
							: ["建立情感连接", "促进学习"],
						notes: parsedJson.notes || "大模型生成的天级别计划",
					};
				} else {
					throw new Error("无法从LLM响应中提取有效的JSON");
				}
			} catch (error) {
				console.error("解析天级别计划失败:", error);
				// 返回默认计划
				return this.createMockDailyPlan(childProfile, ageLevel, date);
			}

			return dailyPlan;
		} catch (error) {
			console.error("大模型生成天级别计划失败:", error);
			// 返回默认计划
			return this.createMockDailyPlan(childProfile, ageLevel, date);
		}
	}

	// 构建天级别计划提示词
	private buildDailyPlanPrompt(
		childProfile: ChildProfile,
		ageLevel: AgeLevel,
		date: string,
	): string {
		return `You are a professional children's education planner, and you need to create a daily companionship plan for ${childProfile.name} (${childProfile.age} years old).\nChild Age Level: ${ageLevel.level}\nChild Characteristics: ${ageLevel.characteristics.join(", ")}\nRecommended Activities: ${ageLevel.recommendedActivities.join(", ")}\nChild Interests: ${childProfile.interests.join(", ")}\nBased on the above information, generate a detailed daily companionship plan including morning, afternoon, and evening sessions.\nEach session should include:\n- type: activity type (chat, song, story, game, lesson)\n- content: specific activity content\n\nThe plan should consider:\n1. Suitable for the cognitive development level of a ${childProfile.age}-year-old child\n2. Combining the child's interests and hobbies\n3. Including both educational and fun elements\n4. Various activity types in different sessions to avoid repetition\n\nPlease return in JSON format with the following fields:\n{\n  "morningActivity": {"type": "", "content": ""},\n  "afternoonActivity": {"type": "", "content": ""},\n  "eveningActivity": {"type": "", "content": ""},\n  "objectives": ["Objective 1", "Objective 2", "Objective 3"],\n  "notes": "Plan description"\n}\nPlease ensure the JSON format is correct and does not include any additional text.`;
	}

	// 获取儿童当天的计划
	public getChildDailyPlan(childId: string): DailyPlan | null {
		const today = new Date().toISOString().split("T")[0];
		const planKey = `${childId}_${today}`;
		return this.dailyPlans.get(planKey) || null;
	}

	// 根据当前时间获取推荐的活动
	public getRecommendedActivity(
		childId: string,
	): { type: string; content: string } | null {
		const dailyPlan = this.getChildDailyPlan(childId);
		if (!dailyPlan) {
			return null;
		}

		const now = new Date();
		const hour = now.getHours();

		// 根据当前时间返回推荐活动
		if (hour < 12) {
			return dailyPlan.morningActivity;
		}
		if (hour < 18) {
			return dailyPlan.afternoonActivity;
		}
		return dailyPlan.eveningActivity;
	}

	// 清理过期的计划（保留最近7天的计划）
	public cleanupExpiredPlans(): void {
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
		const cutoffDate = sevenDaysAgo.toISOString().split("T")[0];

		for (const [key, plan] of this.dailyPlans.entries()) {
			if (plan.date < cutoffDate) {
				this.dailyPlans.delete(key);
			}
		}
		console.log(`清理过期计划完成，当前保留计划数: ${this.dailyPlans.size}`);
	}

	// 停止周期调度器
	public stopScheduler(): void {
		if (this.scheduleTimer) {
			clearTimeout(this.scheduleTimer);
			this.scheduleTimer = null;
			console.log("计划调度器已停止");
		}
	}

	// 实现BaseActor接口的getState方法，包含计划信息
	getState(): Record<string, unknown> {
		return {
			...this.state,
			lastPlan: this.lastPlan,
			dailyPlansCount: this.dailyPlans.size,
			schedulerRunning: this.scheduleTimer !== null,
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
			objectives: ["Build emotional connection", "Encourage expression"],
			strategy: `Chat with ${childProfile.name} as a friend, using simple and easy-to-understand language, maintaining a positive and encouraging tone.`,
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

		console.log("规划agent 调用最近5条消息:", recentMessages);

		// 构建规划提示词
		const prompt = this.buildPlanningPrompt(
			childProfile,
			recentMessages,
			knowledgeSummary,
		);

		console.log("规划agent promt:", prompt);

		// 调用大模型生成规划
		const result = await generateText({
			// model: deepseek(process.env.DEEPSEEK_MODEL || "deepseek-chat"),
			model: openai("gpt-4.1"),
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
			try {
				const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
				if (jsonMatch?.[0]) {
					jsonStr = jsonMatch[0];
				}
			} catch (e) {
				console.error("正则表达式匹配失败:", e);
			}

			// 方式2: 如果方式1失败，尝试查找代码块中的JSON
			if (!jsonStr) {
				try {
					const codeBlockMatch = text.match(
						/```(?:json)?\s*(\{[\s\S]*\}|\[[\s\S]*\])\s*```/,
					);
					if (codeBlockMatch?.[1]) {
						jsonStr = codeBlockMatch[1];
					}
				} catch (e) {
					console.error("代码块正则匹配失败:", e);
				}
			}

			// 方式3: 如果仍然没有找到，尝试更宽松的匹配
			if (!jsonStr) {
				try {
					const looseMatch = text.match(/(\{[^}]*"interactionType"[^}]*\})/);
					if (looseMatch?.[1]) {
						jsonStr = looseMatch[1];
					}
				} catch (e) {
					console.error("宽松匹配失败:", e);
				}
			}

			// 方式4: 如果返回以[开头但可能不完整，尝试构造有效的JSON
			if (!jsonStr && text.trim().startsWith('[')) {
				console.log("检测到以[开头的不完整响应，尝试构造有效的JSON");
				// 构造一个包含基本结构的JSON
				jsonStr = JSON.stringify([{
					interactionType: "chat",
					objectives: ["建立情感连接", "鼓励表达"],
					strategy: `Chat with ${childProfile.name} as a friend`
				}]);
			}

			// 如果仍然没有有效的JSON，使用默认结构
			if (!jsonStr) {
				console.warn("无法提取有效的JSON，使用默认规划结构");
				jsonStr = JSON.stringify({
					interactionType: "chat",
					objectives: ["建立情感连接", "鼓励表达"],
					strategy: `Chat with ${childProfile.name} as a friend`
				});
			}

			// 在清理之前先记录原始提取的JSON字符串
			console.log("提取的原始JSON字符串:", jsonStr);

			// 清理JSON字符串，移除可能导致解析失败的字符
			// 增强的JSON清理和修复机制
			jsonStr = jsonStr
				.replace(/\t/g, " ") // 替换制表符为空格
				.replace(/,\s*\}/g, "}") // 移除末尾逗号
				.replace(/,\s*\]/g, "]") // 移除数组末尾逗号
				.replace(/\}\s*\{/g, "},{") // 修复缺少的逗号
				.replace(/([^\\])"([^\\"])"([^\s:,}"])/g, "$1\"$2\" $3") // 确保字符串后有空格
				.replace(/([^:\s"]+)\s*:/g, '"$1":') // 确保属性名有引号
				.replace(/:\s*([^"\s\[\{][^,}\]]*)/g, ': "$1"') // 为非引用值添加引号
				.replace(/""([^"]+)""/g, '"$1"') // 修复重复引号
				.replace(/\\n/g, "\\\\n") // 转义换行符
				.trim();

			console.log("清理后的JSON字符串:", jsonStr); // 用于调试

			// 尝试解析JSON，如果失败则使用更多修复措施
			let parsedJson: any = null;
			let parsingAttempts = 0;
			const maxAttempts = 3;

			while (!parsedJson && parsingAttempts < maxAttempts) {
				parsingAttempts++;
				try {
					if (parsingAttempts === 1) {
						// 第一次尝试直接解析
						parsedJson = JSON.parse(jsonStr);
					} else if (parsingAttempts === 2) {
						// 第二次尝试：更激进的修复
						console.log("第一次解析失败，尝试更激进的修复措施");
						const moreFixedJsonStr = jsonStr
							.replace(/[^\x20-\x7E\u4e00-\u9fa5\{\}\[\]\:",]/g, '') // 仅保留基本JSON字符和中文
							.replace(/\s+/g, ' ') // 合并多余空格
							.replace(/([{,])\s*"([^"]*)":\s*"([^"]*?)"\s*/g, '$1 "$2":"$3"'); // 标准化格式
						console.log(`第${parsingAttempts}次修复后的JSON:`, moreFixedJsonStr);
						parsedJson = JSON.parse(moreFixedJsonStr);
					} else {
						// 第三次尝试：使用非常保守的方法，直接返回默认结构
						console.log("第二次解析失败，使用保守默认结构");
						return this.createFallbackPlan(context);
					}
				} catch (parseError) {
					console.error(`第${parsingAttempts}次解析失败:`, parseError);
					// 继续下一次尝试
				}
			}

			// 确保parsedJson不为null
			if (!parsedJson) {
				throw new Error("所有解析尝试都失败了");
			}

			// 如果解析结果是数组，取第一个元素
			if (Array.isArray(parsedJson)) {
				console.log("检测到数组响应，使用第一个元素作为规划");
				llmPlan = parsedJson[0] || { interactionType: "chat" };
			} else {
				llmPlan = parsedJson;
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
			.map((m) => `${m.type === "user" ? "User" : "Assistant"}: ${m.content}`)
			.join("\n");

		return `You are a professional children's companion assistant planner, 
		and you need to create an interaction plan for 
		${childProfile.age} years old child.\nChild Interests and 
		Hobbies: ${childProfile.interests.join(", ")}\nRecent Conversation 
		History:\n${messagesText}\nBased on the child's age, interests, 
		recent conversations, and available knowledge base, generate a detailed 
		interaction plan.\nInteraction types can be: chat, song, story, game, 
		lesson\nPlease return in JSON format with the following fields:\n- 
		interactionType: interaction type\n- contentId: ID of knowledge base 
		content that can be used (if any)\n- objectives: array of interaction 
		objectives\n- strategy: interaction strategy description\nPlease ensure the 
		JSON format is correct and does not include any additional text.
		
		You need to gauge the child's emotional changes based on the conversation history.
		You have one more crucial task: if you notice any negative feedback 
		from the child—such as not understanding, refusing to speak, or similar situations—then your generated strategy 
		must include the recommendation to “reduce the use of Chinese vocabulary.”
		
		All output must be in English.
		`
		;
	}

	// 总结知识库内容
	private summarizeKnowledgeBase(knowledgeBase: KnowledgeContent[]): string {
		if (!knowledgeBase || knowledgeBase.length === 0) {
			return "No available knowledge base content";
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
			objectives: ["Build emotional connection", "Encourage expression"],
			strategy: `Chat with ${childProfile.name} as a friend, using simple and easy-to-understand language, maintaining a positive and encouraging tone.`,
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
			[InteractionType.CHAT]: "chat",
			[InteractionType.SONG]: "song",
			[InteractionType.STORY]: "story",
			[InteractionType.GAME]: "game",
			[InteractionType.LESSON]: "lesson",
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
