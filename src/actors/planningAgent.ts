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

// 简单的LRU缓存类
class PlanCache {
  private cache: Map<string, { value: PlanningResult, timestamp: number }>;
  private maxSize: number;
  private maxAge: number;

  constructor(options: { max: number, maxAge: number }) {
    this.cache = new Map();
    this.maxSize = options.max;
    this.maxAge = options.maxAge;
  }

  get(key: string): PlanningResult | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // 检查是否过期
    if (Date.now() - item.timestamp > this.maxAge) {
      this.cache.delete(key);
      return undefined;
    }

    // 移动到Map的末尾（最近使用）
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key: string, value: PlanningResult): void {
    // 如果达到最大容量，删除最旧的项
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKeyResult = this.cache.keys().next();
      if (!oldestKeyResult.done && oldestKeyResult.value) {
        this.cache.delete(oldestKeyResult.value);
      }
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  // 清除特定儿童的所有缓存
  clearChildCache(childId: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(`childId:${childId}`)) {
        this.cache.delete(key);
      }
    }
  }
}

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
		// 保留现有的年龄级别定义
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

	// 添加planCache属性
	private planCache: PlanCache;

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
		// 创建规划缓存，缓存50条记录，有效期10分钟
		this.planCache = new PlanCache({ max: 50, maxAge: 1000 * 60 * 10 });
	}

	// 清除规划缓存
	clearCache(childId?: string): void {
		if (childId) {
			this.planCache.clearChildCache(childId);
			console.log(`已清除儿童 ${childId} 的规划缓存`);
		} else {
			// 重置缓存
			this.planCache = new PlanCache({ max: 50, maxAge: 1000 * 60 * 10 });
			console.log("已清除所有规划缓存");
		}
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
					`为儿童 ${childProfile.name}(${childProfile.id}) 生成了当天计划:`,
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
				afternoonActivity: { type: "story", content: "我们一起读个故事吧！" },
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
				maxOutputTokens: 1200,
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
		return `You are a professional children's education planner, and you need to create a daily companionship plan for ${childProfile.name} (${childProfile.age} years old).\nChild Age Level: ${ageLevel.level}\nChild Characteristics: ${ageLevel.characteristics.join(", ")}\nRecommended Activities: ${ageLevel.recommendedActivities.join(", ")}\nChild Interests: ${childProfile.interests.join(", ")}\nBased on the above information, generate a detailed daily companionship plan including morning, afternoon, and evening sessions.\nEach session should include:\n- type: activity type (chat, song, story, game, lesson)\n- content: specific activity content\n\nThe plan should consider:\n1. Suitable for the cognitive development level of a ${childProfile.age}-year-old child\n2. Combining the child's interests and hobbies\n3. Including both educational and fun elements\n4. Various activity types in different sessions to avoid repetition\n\nPlease return in JSON format with the following fields:\n{\n  "morningActivity": {"type": "", "content": ""},\n  "afternoonActivity": {"type": "", "content": ""},\n  "eveningActivity": {"type": "", "content": ""},\n  "objectives": ["Objective 1", "Objective 2", "Objective 3"],\n  "notes": "Plan description"\n}\nPlease ensure the JSON format is correct and does not include any additional text.
		`
		;
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
		const processStartTime = Date.now();
		console.log(`[PERF] process 函数开始执行`);
		
		try {
			// 在开发模式下，直接使用模拟规划
			if (DEVELOPMENT_MODE) {
				console.log("开发模式: 使用模拟规划");
				const mockPlanTime = Date.now();
				const mockPlan = this.createMockPlan(input.context);
				console.log(`[PERF] 创建模拟规划耗时: ${Date.now() - mockPlanTime}ms`);
				this.lastPlan = mockPlan;

				// 根据计划生成返回信息
				const responseTime = Date.now();
				const response = this.generateResponse(mockPlan);
				console.log(`[PERF] 生成响应耗时: ${Date.now() - responseTime}ms`);

				console.log(`[PERF] process 函数执行完成，总耗时: ${Date.now() - processStartTime}ms`);
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
			const llmPlanTime = Date.now();
			const plan = await this.generatePlanWithLLM(input.context);
			console.log(`[PERF] LLM生成规划总耗时: ${Date.now() - llmPlanTime}ms`);
			this.lastPlan = plan;

			// 根据计划生成返回信息
			const responseTime = Date.now();
			const response = this.generateResponse(plan);
			console.log(`[PERF] 生成响应耗时: ${Date.now() - responseTime}ms`);

			console.log(`[PERF] process 函数执行完成，总耗时: ${Date.now() - processStartTime}ms`);
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
			const fallbackTime = Date.now();
			const defaultPlan = this.createFallbackPlan(input.context);
			console.log(`[PERF] 创建降级规划耗时: ${Date.now() - fallbackTime}ms`);
			const response = this.generateResponse(defaultPlan);

			console.log(`[PERF] process 函数异常完成，总耗时: ${Date.now() - processStartTime}ms`);
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
		const { childProfile } = context || {};
		if (!childProfile) {
			// 返回默认规划
			return {
				type: InteractionType.CHAT,
				objectives: ["Build emotional connection", "Encourage expression"],
				strategy: "Chat as a friend with simple language and positive tone.",
			};
		}

		// 检查缓存
		const cacheKey = this.generatePlanCacheKey(context);
		if (cacheKey && this.planCache.has(cacheKey)) {
			const cachedPlan = this.planCache.get(cacheKey);
			if (cachedPlan) return cachedPlan;
		}

		// 简单的模拟规划逻辑，但根据儿童兴趣生成更相关的策略
		const interestBasedActivities: Record<string, InteractionType> = {
			math: InteractionType.GAME,
			science: InteractionType.LESSON,
			music: InteractionType.SONG,
			stories: InteractionType.STORY,
			art: InteractionType.CHAT,
		};

		// 根据兴趣选择活动类型
		let activityType = InteractionType.CHAT;
		if (childProfile.interests) {
			for (const interest of childProfile.interests) {
				const normalizedInterest = interest.toLowerCase();
				for (const [key, type] of Object.entries(interestBasedActivities)) {
					if (normalizedInterest.includes(key)) {
						activityType = type;
						break;
					}
				}
			}
		}

		const mockPlan: PlanningResult = {
			type: activityType,
			objectives: [
				`Engage child's interest in ${childProfile.interests?.[0] || "learning"}`,
				`Build positive connection with ${childProfile.name || "the child"}`
			],
			strategy: `Interactive ${activityType} focused on ${childProfile.interests?.join(", ") || "activities"}, using age-appropriate language and positive reinforcement.`,
		};

		// 存入缓存
		if (cacheKey) {
			this.planCache.set(cacheKey, mockPlan);
		}

		return mockPlan;
	}

	setState(state: Record<string, unknown>): void {
		this.state = state;
		if (state.lastPlan) {
			this.lastPlan = state.lastPlan as PlanningResult;
		}
	}

	// 生成缓存键
	private generatePlanCacheKey(context: ActorContext): string {
		const { childProfile, conversationHistory } = context || {};
		if (!childProfile) return "";
		
		// 获取最后一条消息作为缓存键的一部分
		const lastMessage = conversationHistory && conversationHistory.length > 0 
			? conversationHistory[conversationHistory.length - 1].content 
			: "";
		
		return JSON.stringify({
			childId: childProfile.id,
			age: childProfile.age,
			interests: childProfile.interests ? [...childProfile.interests].sort() : [],
			languageLevel: childProfile.languageLevel || "",
			lastMessage: lastMessage ? lastMessage.slice(0, 100) : "",
		});
	}

	// 使用大模型生成互动计划
	private async generatePlanWithLLM(context: ActorContext): Promise<PlanningResult> {
		const startTime = Date.now();
		console.log("[PERF] 开始执行 generatePlanWithLLM");
		
		// 检查缓存
		const cacheKey = this.generatePlanCacheKey(context);
		if (cacheKey && this.planCache.has(cacheKey)) {
			const cachedPlan = this.planCache.get(cacheKey);
			console.log(`[PERF] 规划缓存命中，跳过LLM调用，耗时: ${Date.now() - startTime}ms`);
			return cachedPlan!;
		}
		
		const { childProfile, conversationHistory, knowledgeBase } = context;
		const getRecentMessagesTime = Date.now();
		// 减少处理的消息数量，只保留最近3条
		const recentMessages = this.getRecentMessages(conversationHistory || [], 3);
		console.log(`[PERF] getRecentMessages 耗时: ${Date.now() - getRecentMessagesTime}ms`);
		
		const summarizeKnowledgeTime = Date.now();
		// 只使用最近5条知识内容，减少处理量
		const knowledgeSummary = knowledgeBase && knowledgeBase.length > 0 
			? this.summarizeKnowledgeBase(knowledgeBase.slice(0, 5)) 
			: "No knowledge available";
		console.log(`[PERF] summarizeKnowledgeBase 耗时: ${Date.now() - summarizeKnowledgeTime}ms`);

		// 构建规划提示词
		const buildPromptTime = Date.now();
		const prompt = this.buildPlanningPrompt(
			childProfile,
			recentMessages,
			knowledgeSummary,
		);
		console.log(`[PERF] buildPlanningPrompt 耗时: ${Date.now() - buildPromptTime}ms`);

		console.log(`[PERF] 提示词: ${prompt}`);
		// 调用大模型生成规划，优化参数
		const llmCallTime = Date.now();
		const result = await generateText({
			// model: deepseek(process.env.DEEPSEEK_MODEL || "deepseek-chat"),
			model: openai("gpt-4.1"),
			prompt,
			maxOutputTokens: 800, // 减少输出 tokens 数量，从1500降到800
			temperature: 0.4, // 降低随机性，从0.6降到0.4
			topP: 0.8, // 添加 top_p 参数以提高效率
		});
		console.log(`[PERF] LLM调用耗时: ${Date.now() - llmCallTime}ms`);

		// 解析大模型返回的JSON规划
		let llmPlan: Record<string, unknown>;
		try {
			// 从返回结果中提取JSON部分
			const text = result.text.trim();
			console.log("LLM原始响应:", text); // 用于调试

			// 首先检查并移除代码块标记 - 改进的正则表达式
			let cleanText = text;
			// 匹配代码块格式 ```json ... ``` 或 ``` ... ```，使用更严格的匹配模式
			const codeBlockRegex = /^\s*```(?:json)?\s*([\s\S]*)\s*```\s*$/;
			const codeBlockMatch = cleanText.match(codeBlockRegex);
			if (codeBlockMatch?.[1]) {
				cleanText = codeBlockMatch[1].trim();
				console.log("从代码块中提取JSON:", cleanText);
			}

			// 如果没有匹配到代码块，尝试直接从文本中提取JSON对象或数组
			if (cleanText === text) {
				// 尝试找到第一个 { 和最后一个 } 来提取JSON对象
				const firstBraceIndex = cleanText.indexOf('{');
				const lastBraceIndex = cleanText.lastIndexOf('}');
				if (firstBraceIndex !== -1 && lastBraceIndex !== -1 && firstBraceIndex < lastBraceIndex) {
					cleanText = cleanText.substring(firstBraceIndex, lastBraceIndex + 1);
					console.log("提取JSON对象:", cleanText);
				}
			}

			// 尝试解析清理后的JSON
			try {
				const parsedJson = JSON.parse(cleanText);
				
				// 如果解析结果是数组，取第一个元素
				if (Array.isArray(parsedJson)) {
					console.log("检测到数组响应，使用第一个元素作为规划");
					// 确保数组不为空且第一个元素有效
					if (parsedJson.length > 0 && parsedJson[0]) {
						llmPlan = parsedJson[0];
					} else {
						return this.createFallbackPlan(context);
					}
				} else {
					// 确保parsedJson是对象类型
					if (typeof parsedJson === 'object' && parsedJson !== null) {
						llmPlan = parsedJson;
					} else {
						return this.createFallbackPlan(context);
					}
				}
			} catch (parseError) {
				console.error("JSON解析失败:", parseError);
				console.error("LLM响应内容:", text);
				return this.createFallbackPlan(context);
			}
			
			// 确保llmPlan具有必要的字段
			if (!llmPlan.interactionType || typeof llmPlan.interactionType !== 'string') {
				llmPlan.interactionType = "chat";
			}
			if (!llmPlan.objectives || !Array.isArray(llmPlan.objectives) || llmPlan.objectives.length === 0) {
				llmPlan.objectives = ["建立情感连接", "鼓励表达"];
			}
			if (!llmPlan.strategy || typeof llmPlan.strategy !== 'string') {
				llmPlan.strategy = `Chat with ${childProfile.name || 'the child'} as a friend`;
			}
		} catch (error) {
			console.error("解析大模型响应失败:", error);
			console.error("LLM响应内容:", result.text);
			// 使用默认规划
			return this.createFallbackPlan(context);
		}

		// 转换为PlanningResult格式
		const formatResultTime = Date.now();
		const planningResult = {
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
		console.log(`[PERF] 格式化结果耗时: ${Date.now() - formatResultTime}ms`);
		
		// 存入缓存
		if (cacheKey) {
			this.planCache.set(cacheKey, planningResult);
			console.log("[PERF] 规划已存入缓存");
		}
		
		console.log(`[PERF] 总执行时间: ${Date.now() - startTime}ms`);
		return planningResult;
	}

	// 构建规划提示词
	private buildPlanningPrompt(
		childProfile: ChildProfile,
		recentMessages: Message[],
		knowledgeSummary: string,
	): string {
		// 优化消息历史格式，只保留最近的对话，并限制每条消息长度
		const messagesText = recentMessages
			?.map((m) => `${m.type === "user" ? "Child" : "Assistant"}: ${m.content?.substring(0, 100) || ""}`)
			?.join("\n") || "No recent conversation";

		// 简化prompt结构，提高效率
		return `You are a children's companion assistant planner. Create an interaction plan for ${childProfile?.age || "unknown"} years old child.

CHILD PROFILE:
- Interests: ${childProfile?.interests?.join(", ") || "not specified"}
- Language Level: ${childProfile?.languageLevel || "Unknown"}

RECENT CONVERSATION:
${messagesText}

${knowledgeSummary ? `KNOWLEDGE BASE SUMMARY: ${knowledgeSummary}` : ""}

Generate a JSON interaction plan with these fields:
- interactionType: chat, song, story, game, or lesson
- contentId: optional knowledge base content ID
- objectives: array of 2-3 interaction objectives
- strategy: interaction strategy description

If you notice negative feedback from the child (not understanding, refusing to speak), include "reduce Chinese vocabulary" in your strategy.

Output only valid JSON with no extra text.`;
	}

	// 总结知识库内容（优化版）
	private summarizeKnowledgeBase(knowledgeBase: KnowledgeContent[]): string {
		if (!knowledgeBase || knowledgeBase.length === 0) {
			return "";
		}

		// 只返回最近5条最相关的知识库内容，并简化信息格式
		const limitedKnowledge = knowledgeBase.slice(0, 5);
		return limitedKnowledge
			.map((item) => `ID:${item.id}, Type:${item.type}, Title:"${item.title?.substring(0, 30)}${item.title?.length > 30 ? '...' : ''}"`)
			.join(" | ");
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
		const { childProfile, conversationHistory } = context;

		// 根据儿童年龄和兴趣生成更智能的降级计划
		const age = childProfile?.age || 5;
		const interests = childProfile?.interests || [];
		const childName = childProfile?.name || "child";

		// 根据年龄选择合适的互动类型
		let interactionType: InteractionType;
		let objectives: string[];
		let strategy: string;

		// 根据年龄分组选择互动类型
		if (age <= 4) {
			// 幼儿倾向于简单的故事或歌曲
			interactionType = Math.random() > 0.5 ? InteractionType.STORY : InteractionType.SONG;
			objectives = ["Spark imagination", "Build basic vocabulary"];
		} else if (age <= 7) {
			// 学龄前儿童喜欢游戏和故事
			interactionType = Math.random() > 0.6 ? InteractionType.GAME : InteractionType.STORY;
			objectives = ["Encourage active participation", "Develop cognitive skills"];
		} else {
			// 年长儿童可以进行聊天或课程
			interactionType = Math.random() > 0.5 ? InteractionType.CHAT : InteractionType.LESSON;
			objectives = ["Stimulate critical thinking", "Foster creativity"];
		}

		// 如果有兴趣信息，将其融入策略
		if (interests.length > 0) {
			const interest = interests[Math.floor(Math.random() * interests.length)];
			strategy = `Focus on ${interactionType.toLowerCase()} related to ${interest}. Use age-appropriate language for ${age}-year-old. Be friendly and encouraging.`;
		} else {
			// 默认策略
			strategy = `Engage ${childName} with ${interactionType.toLowerCase()} activities. Use simple, clear language. Maintain a positive, supportive tone.`;
		}

		return {
			type: interactionType,
			objectives,
			strategy,
		};
	}

	// 获取最近的消息（保留此方法供大模型规划使用）
	private getRecentMessages(messages: Message[], count: number): Message[] {
		// 添加空值检查和参数验证
		if (!Array.isArray(messages)) {
			return [];
		}
		
		// 限制消息数量，确保不超过指定数量
		const safeCount = Math.max(1, Math.min(count || 3, 5)); // 确保count在合理范围内
		
		// 过滤出有效的消息并获取最近的消息
		const validMessages = messages.filter(msg => msg && typeof msg === 'object');
		return validMessages.slice(-safeCount).reverse();
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
