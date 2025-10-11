import { deepseek } from "@ai-sdk/deepseek";
import { config } from "dotenv";
// 主应用文件
import { ActorManager } from "./factories/actorManager";
import { ExecutionAgentFactory } from "./factories/executionAgentFactory";
import { LongtermPlanningAgentFactory } from "./factories/longtermPlanningAgentFactory";
import { PlanningAgentFactory } from "./factories/planningAgentFactory";
import {
	type ChildProfile,
	createDefaultChildProfile,
} from "./models/childProfile";
import type { KnowledgeContent } from "./models/content";
import { type Message, createMessage } from "./models/message";
import { InMemoryKnowledgeBaseService } from "./services/inMemoryKnowledgeBaseService";
import { InMemoryMemoryService } from "./services/memoryService";

// 加载环境变量
config();

// TinyBuddy应用类
export class TinyBuddyApp {
	// 单例实例
	private static instance: TinyBuddyApp;

	// 服务
	public knowledgeBaseService: InMemoryKnowledgeBaseService;
	public memoryService: InMemoryMemoryService;

	// Actor管理器
	private actorManager: ActorManager;

	// 应用状态
	private isRunning = false;

	// 私有构造函数
	private constructor() {
		this.knowledgeBaseService = new InMemoryKnowledgeBaseService();
		this.memoryService = new InMemoryMemoryService();
		this.actorManager = ActorManager.getInstance();
	}

	// 获取单例实例
	public static getInstance(): TinyBuddyApp {
		if (!TinyBuddyApp.instance) {
			TinyBuddyApp.instance = new TinyBuddyApp();
		}
		return TinyBuddyApp.instance;
	}

	// 初始化应用
	public async init(): Promise<void> {
		if (this.isRunning) {
			console.log("应用已经在运行中");
			return;
		}

		console.log("正在初始化TinyBuddy应用...");

		// 初始化服务
		await this.knowledgeBaseService.init();
		await this.memoryService.init();

		// 注册Actor工厂
		this.actorManager.registerFactory(new PlanningAgentFactory());
		this.actorManager.registerFactory(new ExecutionAgentFactory());
		this.actorManager.registerFactory(new LongtermPlanningAgentFactory());

		// 创建默认儿童档案（如果不存在）
		const defaultChildId = "default_child";
		try {
			await this.memoryService.getChildProfile(defaultChildId);
		} catch (error) {
			// 如果出错（不太可能，因为getChildProfile会创建默认档案），手动创建
			const defaultProfile = createDefaultChildProfile(defaultChildId);
			await this.memoryService.updateChildProfile(
				defaultChildId,
				defaultProfile,
			);
		}

		// 创建长期规划Agent实例
		try {
			await this.actorManager.createActor("longtermPlanningAgent", {
				knowledgeBaseService: this.knowledgeBaseService,
				memoryService: this.memoryService,
			});
			console.log("长期规划Agent创建成功，已开始每分钟执行一次任务");
		} catch (error) {
			console.error("创建长期规划Agent失败:", error);
		}

		this.isRunning = true;
		console.log("TinyBuddy应用初始化完成！");
	}

	// 处理用户输入（非流式版本）
	public async processUserInput(
		childId: string,
		userInput: string,
	): Promise<string> {
		if (!this.isRunning) {
			throw new Error("应用尚未初始化，请先调用init()方法");
		}

		// 验证参数
		if (!childId || typeof userInput !== "string" || userInput.trim() === "") {
			return "请输入有效的内容";
		}

		try {
			console.log(
				`开始处理用户输入 (${childId}): ${userInput.substring(0, 50)}${userInput.length > 50 ? "..." : ""}`,
			);

			// 创建用户消息并添加到对话历史
			const userMessage = createMessage({
				type: "user",
				content: userInput,
				sender: "user",
				recipient: "tiny_buddy",
			});

			await this.memoryService.addMessageToHistory(childId, userMessage);

			// 获取儿童档案和对话历史
			const childProfile = await this.memoryService.getChildProfile(childId);
			const conversationHistory =
				await this.memoryService.getConversationHistory(childId);

			// 创建Actor上下文
			const knowledgeBase = await this.knowledgeBaseService.getAllContents();
			const context = {
				childProfile,
				conversationHistory,
				knowledgeBase,
			};

			// 获取或创建规划Agent
			let planningAgent = this.actorManager.getActorsByType("planningAgent")[0];
			if (!planningAgent) {
				planningAgent = await this.actorManager.createActor("planningAgent", {
					knowledgeBaseService: this.knowledgeBaseService,
					memoryService: this.memoryService,
				});
				await planningAgent.init?.(context);
			}

			// 调用规划Agent进行思考和规划
			console.log("调用规划Agent进行思考和规划...");
			const planResult = await planningAgent.process?.({
				input: userMessage.content,
				context,
			});

			if (!planResult || !planResult.output) {
				throw new Error("规划Agent未返回有效的规划结果");
			}

			// 解析规划结果
			let parsedPlanResult: any;
			try {
				parsedPlanResult = JSON.parse(planResult.output);
			} catch (parseError) {
				console.warn("解析规划结果失败，使用默认规划:", parseError);
				parsedPlanResult = {
					type: "plan",
					interactionType: "chat",
					strategy:
						"Chat with the child as a friend using simple and easy-to-understand language",
				};
			}

			console.log("规划结果:", parsedPlanResult);

			// 获取或创建执行Agent
			let executionAgent =
				this.actorManager.getActorsByType("executionAgent")[0];
			if (!executionAgent) {
				executionAgent = await this.actorManager.createActor("executionAgent", {
					knowledgeBaseService: this.knowledgeBaseService,
					memoryService: this.memoryService,
					useLLM: true,
					model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
				});
				await executionAgent.init?.(context);
			}

			// 执行Agent根据规划结果生成响应
			console.log("调用执行Agent生成响应...");
			const executionResult = await executionAgent.process?.({
				input: userMessage.content,
				context,
				plan: parsedPlanResult,
			});

			if (!executionResult || !executionResult.output) {
				throw new Error("执行Agent未返回有效的响应");
			}

			// 创建最终响应消息
			const finalMessage = createMessage({
				type: "system",
				content: executionResult.output,
				sender: "tiny_buddy",
				recipient: "user",
				metadata: {
					interactionType: executionResult.metadata?.interactionType || "chat",
					isFinalResponse: true,
				},
			});

			// 添加最终响应到对话历史
			await this.memoryService.addMessageToHistory(childId, finalMessage);

			// 更新儿童档案的学习进度
			if (
				executionResult.metadata?.learningPoint &&
				typeof executionResult.metadata.learningPoint === "string"
			) {
				await this.memoryService.trackLearningProgress(
					childId,
					executionResult.metadata.learningPoint,
					typeof executionResult.metadata.progress === "number"
						? executionResult.metadata.progress
						: 10,
				);
			}

			console.log(
				`生成最终响应: ${executionResult.output.substring(0, 50)}${executionResult.output.length > 50 ? "..." : ""}`,
			);

			// 返回最终响应
			return executionResult.output;
		} catch (error) {
			console.error("处理用户输入时出错:", error);
			return "抱歉，我现在遇到了一些问题，请稍后再试";
		}
	}

	// 添加知识内容
	public async addKnowledgeContent(
		content: Omit<KnowledgeContent, "id" | "createdAt" | "updatedAt">,
	): Promise<KnowledgeContent> {
		if (!this.isRunning) {
			throw new Error("应用尚未初始化，请先调用init()方法");
		}
		return this.knowledgeBaseService.addContent(content);
	}

	// 处理用户输入（流式版本）
	public async processUserInputWithStreaming(
		childId: string,
		userInput: string,
		onProgress: (
			content: string,
			isFinal: boolean,
			metadata?: Record<string, unknown>,
		) => void,
		onError?: (error: Error) => void,
	): Promise<string> {
		if (!this.isRunning) {
			throw new Error("应用尚未初始化，请先调用init()方法");
		}

		// 验证参数
		if (!childId || typeof userInput !== "string" || userInput.trim() === "") {
			const errorMsg = "请输入有效的内容";
			onProgress(errorMsg, true);
			return errorMsg;
		}

		try {
			console.log(
				`开始处理用户输入 (${childId}): ${userInput.substring(0, 50)}${userInput.length > 50 ? "..." : ""}`,
			);

			// 创建用户消息并添加到对话历史
			const userMessage = createMessage({
				type: "user",
				content: userInput,
				sender: "user",
				recipient: "tiny_buddy",
			});

			await this.memoryService.addMessageToHistory(childId, userMessage);

			// 获取儿童档案和对话历史
			const childProfile = await this.memoryService.getChildProfile(childId);

			console.log("app 获取儿童档案:", childProfile);

			const conversationHistory =
				await this.memoryService.getConversationHistory(childId);

			// 创建Actor上下文
			const knowledgeBase = await this.knowledgeBaseService.getAllContents();
			const context = {
				childProfile,
				conversationHistory,
				knowledgeBase,
			};

			// 获取或创建规划Agent
			let planningAgent = this.actorManager.getActorsByType("planningAgent")[0];
			if (!planningAgent) {
				planningAgent = await this.actorManager.createActor("planningAgent", {
					knowledgeBaseService: this.knowledgeBaseService,
					memoryService: this.memoryService,
					useLLM: true, // 确保使用真实的LLM
					model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
				});
				await planningAgent.init?.(context);
			}

			// 获取或创建执行Agent
			let executionAgent =
				this.actorManager.getActorsByType("executionAgent")[0];
			if (!executionAgent) {
				executionAgent = await this.actorManager.createActor("executionAgent", {
					knowledgeBaseService: this.knowledgeBaseService,
					memoryService: this.memoryService,
					useLLM: true, // 确保使用真实的LLM
					model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
				});
				await executionAgent.init?.(context);
			}

			// 发送处理中消息
			// onProgress("正在思考...", false);

			// 首先尝试从内存中获取已有的规划结果
			const planResult = await this.memoryService.getPlanningResult(childId);

			console.log("从内存中获取到的 planResult", planResult);
			let planOutput = planResult?.plan;

			// 检查是否需要创建或更新规划
			// 1. 如果没有规划结果，或者
			// 2. 上一次规划时间超过30秒
			const shouldTriggerPlanning =
				!planResult ||
				(planResult.timestamp &&
					Date.now() - planResult.timestamp.getTime() > 30000);

			if (shouldTriggerPlanning) {
				// 如果没有已有规划或规划已过期，启动异步规划任务
				console.log(
					"启动异步规划任务...",
					shouldTriggerPlanning ? "因为规划不存在或已过期" : "",
				);

				// 创建异步规划任务，但不阻塞当前流程
				(async () => {
					try {
						const newPlanResult = await planningAgent.process?.({
							input: userMessage.content,
							context,
						});

						console.log("规划任务的newPlanResult", newPlanResult);

						if (newPlanResult?.output) {
							console.log("规划任务完成，保存结果到内存");
							await this.memoryService.setPlanningResult(
								childId,
								newPlanResult.output,
							);
						}
					} catch (error) {
						console.error("异步规划任务失败:", error);
					}
				})();

				// 如果没有规划结果，使用默认规划确保对话能够继续
				if (!planOutput) {
					planOutput = {
						type: "plan",
						interactionType: "chat",
						strategy:
							"Chat with the child as a friend using simple and easy-to-understand language",
					};
				}
			} else {
				console.log("使用内存中的规划结果");
			}

			// 根据计划类型发送进度更新
			let planType = "普通对话";
			// 确保planOutput是对象格式
			try {
				// 如果planOutput是字符串，尝试解析为JSON
				if (typeof planOutput === "string") {
					planOutput = JSON.parse(planOutput);
				}
			} catch (parseError) {
				// 如果解析失败，使用默认规划
				console.warn("解析计划输出失败，使用默认规划:", parseError);
				planOutput = {
					type: "plan",
					interactionType: "chat",
					strategy:
						"Chat with the child as a friend using simple and easy-to-understand language",
				};
			}

			if (
				typeof planOutput === "object" &&
				planOutput !== null &&
				"type" in planOutput
			) {
				switch (planOutput.type) {
					case "lesson":
						planType = "教学内容";
						break;
					case "story":
						planType = "故事";
						break;
					case "song":
						planType = "儿歌";
						break;
					case "game":
						planType = "游戏";
						break;
				}
			}

			onProgress(`正在准备${planType}...`, false);

			// 执行Agent根据计划生成响应
		console.log("调用执行Agent生成响应...");
		console.log("传给excution agent的plan:", planOutput);
		const executionResult = await executionAgent.process?.({
			input: userMessage.content,
			context,
			plan: planOutput,
			onStreamChunk: (chunk: string) => {
				// 直接传递执行Agent生成的字符级流式输出
				onProgress(chunk, false, { type: 'stream_chunk' });
			},
		});

			if (!executionResult || !executionResult.output) {
				throw new Error("执行Agent未返回有效的响应");
			}

			console.log(
				"执行Agent生成的提示词:",
				executionResult.metadata?.prompt || "无提示词",
			);

			// 发送带有提示词的进度更新
			if (executionResult.metadata?.prompt) {
				console.log("发送提示词到前端");
				onProgress("已生成提示词", false, {
					prompt: executionResult.metadata.prompt,
				});
			}

			// 创建最终响应消息
			const finalMessage = createMessage({
				type: "system",
				content: executionResult.output,
				sender: "tiny_buddy",
				recipient: "user",
				metadata: {
					interactionType: executionResult.metadata?.interactionType || "chat",
					isFinalResponse: true,
					plan: planOutput,
				},
			});

			// 添加最终响应到对话历史
			await this.memoryService.addMessageToHistory(childId, finalMessage);

			// 更新儿童档案的学习进度
			if (
				executionResult.metadata?.learningPoint &&
				typeof executionResult.metadata.learningPoint === "string"
			) {
				await this.memoryService.trackLearningProgress(
					childId,
					executionResult.metadata.learningPoint,
					typeof executionResult.metadata.progress === "number"
						? executionResult.metadata.progress
						: 10,
				);
			}

			console.log(
				`生成最终响应: ${executionResult.output.substring(0, 50)}${executionResult.output.length > 50 ? "..." : ""}`,
			);

			// 通知调用者有了最终响应
			onProgress(executionResult.output, true);

			return executionResult.output;
		} catch (error) {
			console.error("处理用户输入时出错:", error);
			const errorResponse = `抱歉，我现在遇到了一些问题: ${error instanceof Error ? error.message : "未知错误"}`;
			onProgress(errorResponse, true);
			if (onError && error instanceof Error) {
				onError(error);
			}
			return errorResponse;
		}
	}

	// 检查DeepSeek连接状态
	public async checkDeepSeekConnection(): Promise<{
		connected: boolean;
		message: string;
	}> {
		try {
			if (!process.env.DEEPSEEK_API_KEY) {
				return { connected: false, message: "未配置DeepSeek API密钥" };
			}

			// 尝试一个简单的API调用
			const testMessage = "你好";
			console.log("测试DeepSeek API连接...");

			// 创建一个最小的测试Agent
			const testAgent = await this.actorManager.createActor("executionAgent", {
				useLLM: true,
				model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
				knowledgeBaseService: this.knowledgeBaseService,
				memoryService: this.memoryService,
			});

			// 初始化Agent
			const mockContext = {
				childProfile: createDefaultChildProfile("test"),
				conversationHistory: [],
				knowledgeBase: [],
			};
			await testAgent.init?.(mockContext);

			// 执行一个简单的处理
			const result = await testAgent.process?.({
				input: testMessage,
				context: mockContext,
				plan: { type: "chat", content: "测试连接" },
			});

			if (result?.output) {
				console.log("DeepSeek API连接成功");
				return { connected: true, message: "DeepSeek API连接成功" };
			}
			throw new Error("API调用成功但未返回预期结果");
		} catch (error) {
			console.error("DeepSeek API连接测试失败:", error);
			return {
				connected: false,
				message: `DeepSeek API连接失败: ${error instanceof Error ? error.message : "未知错误"}`,
			};
		}
	}

	// 获取儿童对话历史
	public async getConversationHistory(childId: string): Promise<Message[]> {
		if (!this.isRunning) {
			throw new Error("应用尚未初始化，请先调用init()方法");
		}

		const history = await this.memoryService.getConversationHistory(childId);
		return history.map((msg) => ({
			id: msg.id,
			type: msg.type,
			content: msg.content,
			sender: msg.sender,
			timestamp: msg.timestamp,
		}));
	}

	// 获取儿童档案
	public async getChildProfile(childId: string): Promise<ChildProfile> {
		if (!this.isRunning) {
			throw new Error("应用尚未初始化，请先调用init()方法");
		}

		return this.memoryService.getChildProfile(childId);
	}

	// 更新儿童档案
	public async updateChildProfile(
		childId: string,
		profile: Partial<ChildProfile>,
	): Promise<ChildProfile> {
		if (!this.isRunning) {
			throw new Error("应用尚未初始化，请先调用init()方法");
		}

		return this.memoryService.updateChildProfile(childId, profile);
	}

	// 分析儿童兴趣
	public async analyzeChildInterests(childId: string): Promise<string[]> {
		if (!this.isRunning) {
			throw new Error("应用尚未初始化，请先调用init()方法");
		}

		return this.memoryService.analyzeChildInterests(childId);
	}

	// 关闭应用
	public async shutdown(): Promise<void> {
		if (!this.isRunning) {
			return;
		}

		console.log("正在关闭TinyBuddy应用...");

		// 销毁所有Actor实例
		await this.actorManager.destroyAllActors();

		// 执行其他清理操作（如果有）

		this.isRunning = false;
		console.log("TinyBuddy应用已关闭");
	}

	// 检查应用是否正在运行
	public isAppRunning(): boolean {
		return this.isRunning;
	}
}

// 创建默认导出的应用实例
const app = TinyBuddyApp.getInstance();
export default app;
