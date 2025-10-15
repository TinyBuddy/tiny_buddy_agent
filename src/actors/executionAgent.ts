// import { deepseek } from "@ai-sdk/deepseek";
import { openai } from "@ai-sdk/openai";
import axios from 'axios';
import { generateText, streamText } from "ai";
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
		onStreamChunk?: (chunk: string) => void;
	}): Promise<{ output: string; metadata?: Record<string, unknown> }> {
		console.log("executionAgent process input :", input);

		// // 获取相关知识（统一处理，无论是否有计划）
		// let relevantKnowledge = input.relevantKnowledge;
		// if (!relevantKnowledge && !DEVELOPMENT_MODE) {
		// 	try {
		// 		// 调用知识库API获取相关知识
		// 		const knowledgeResponse = await this.fetchKnowledgeFromRemoteApi(input.input);
		// 		// 正确检查是否有匹配的知识内容
		// 		if (knowledgeResponse && knowledgeResponse.hasMatch && knowledgeResponse.content && knowledgeResponse.content.trim().length > 0) {
		// 			console.log(`成功获取知识库内容，长度: ${knowledgeResponse.content.length} 字符`);
		// 			relevantKnowledge = {
		// 				content: knowledgeResponse.content
		// 			};
		// 		} else if (knowledgeResponse) {
		// 			console.log('知识库返回无匹配结果或内容为空');
		// 		}
		// 	} catch (error) {
		// 		console.warn('知识库API调用失败:', error);
		// 	}
		// }

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
					"",
				);

				console.log("executionAgent prompt :", prompt);

				// 调用大模型生成初始响应
				const response = await this.generateResponse(
					prompt,
					input.onStreamChunk
				);

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

				// 如果提供了流式回调，模拟流式输出
				if (input.onStreamChunk) {
					const words = defaultResponse.split(' ');
					for (let i = 0; i < words.length; i++) {
						await new Promise(resolve => setTimeout(resolve, 100));
						input.onStreamChunk(words[i] + (i < words.length - 1 ? ' ' : ''));
					}
				}

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
		const response = await this.handleUserMessage(input.input, input.context, input.onStreamChunk);

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
		onStreamChunk?: (chunk: string) => void,
	): Promise<string> {
		// 在开发模式下，直接使用模拟响应
		if (DEVELOPMENT_MODE) {
			console.log("开发模式: 使用模拟用户消息响应");
			const mockResponse = this.createMockResponse(message, context);
			
			// 如果提供了流式回调，模拟流式输出
			if (onStreamChunk) {
				const words = mockResponse.split(' ');
				for (let i = 0; i < words.length; i++) {
					await new Promise(resolve => setTimeout(resolve, 100));
					onStreamChunk(words[i] + (i < words.length - 1 ? ' ' : ''));
				}
			}
			
			return mockResponse;
		}

		const { childProfile, conversationHistory } = context;

		try {
			// // 调用知识库API获取相关知识
			// let relevantKnowledge = null;
			// try {
			// 	const knowledgeResponse = await this.fetchKnowledgeFromRemoteApi(message);
			// 	// 正确检查是否有匹配的知识内容
			// 	if (knowledgeResponse && knowledgeResponse.hasMatch && knowledgeResponse.content && knowledgeResponse.content.trim().length > 0) {
			// 		console.log(`成功获取知识库内容，长度: ${knowledgeResponse.content.length} 字符`);
			// 		relevantKnowledge = {
			// 			content: knowledgeResponse.content
			// 		};
			// 	} else if (knowledgeResponse) {
			// 		console.log('知识库返回无匹配结果或内容为空');
			// 	}
			// } catch (error) {
			// 	console.warn('知识库API调用失败:', error);
			// }

			// 构建提示词
			const prompt = this.buildPrompt(
				message,
				childProfile,
				conversationHistory,
				null, // 没有计划
				""
			);

			// 调用大模型生成响应
			return await this.generateResponse(prompt, onStreamChunk);
		} catch (error) {
			console.error("大模型调用失败:", error);
			// 降级到默认响应
			return "我现在有点忙，我们稍后再聊吧！";
		}
	}

	/**
	 * 调用远程知识库API获取相关知识
	 */
	private async fetchKnowledgeFromRemoteApi(query: string): Promise<any> {
		try {
			const apiKey = 'sk-AFVxhsKKYpfMSSIho5hyqskh8Rbd96ZbVytFRy3pan09Vn1g';
			const apiUrl = 'http://136.115.118.154/api/v1/knowledge-chat/d15b185a-a786-4039-b15b-1d6fb4a8d4e3';
			
			console.log(`正在调用知识库API，查询: ${query}`);
			
			const response = await axios.post(
				apiUrl,
				{ query: query },
				{
					headers: {
						'X-API-Key': apiKey,
						'Content-Type': 'application/json'
					},
					responseType: 'stream',
					timeout: 15000 // 15秒超时
				}
			);
			
			// 处理流式响应，收集完整内容
			const fullContent = await this.processKnowledgeStreamResponse(response.data);
			
			// 检查是否有匹配结果
			if (fullContent && !fullContent.includes('NO_MATCH') && fullContent.trim().length > 10) {
				console.log(`知识库API返回有效内容，长度: ${fullContent.length} 字符`);
				return {
					content: fullContent,
					hasMatch: true
				};
			} else {
				console.log('知识库API返回无匹配结果或内容不完整');
				return {
					content: '',
					hasMatch: false
				};
			}
		} catch (error) {
			if (axios.isAxiosError(error)) {
				if (error.response) {
					// 服务器返回了错误状态码
					console.error(`知识库API错误: ${error.response.status} - ${error.response.statusText}`);
					console.error('API响应数据:', error.response.data);
				} else if (error.request) {
					// 请求已发送但没有收到响应
					console.error('知识库API无响应:', error.request);
				} else {
					// 设置请求时发生错误
					console.error('知识库API请求错误:', error.message);
				}
			} else {
				// 其他错误
				console.error('知识库API调用异常:', error);
			}
			console.warn('知识库API调用失败:', error);
			return {
				content: '',
				hasMatch: false
			};
		}
	}
	
	/**
	 * 处理知识库API的流式响应，提取完整内容
	 */
	private async processKnowledgeStreamResponse(stream: any): Promise<string> {
		return new Promise((resolve) => {
			let fullContent = '';
			let hasNoMatch = false;
			
			stream.on('data', (chunk: Buffer) => {
				const chunkStr = chunk.toString('utf-8');
				const lines = chunkStr.split('\n');
				
				for (const line of lines) {
					if (line.startsWith('data:')) {
						try {
							const jsonStr = line.substring(5).trim();
							if (jsonStr) {
								const data = JSON.parse(jsonStr);
								if (data.content && typeof data.content === 'string') {
									// 实时检查是否包含无效标记
									const lowerContent = data.content.toLowerCase();
									if (lowerContent.includes('no_match') || 
										lowerContent.includes('无法作答') || 
										lowerContent.includes('未检索到相关信息')) {
										hasNoMatch = true;
									}
									fullContent += data.content;
								}
							}
						} catch (e) {
							// 忽略无法解析的行
						}
					}
				}
			});
			
			stream.on('end', () => {
				console.log('原始知识库响应内容:', fullContent);
				console.log('原始内容长度:', fullContent.length);
				
				// 优先检查无效标记
				if (hasNoMatch || 
					fullContent.toLowerCase().includes('no_match') || 
					fullContent.includes('无法作答') || 
					fullContent.includes('未检索到相关信息')) {
					console.log('检测到无效标记，没有找到匹配的知识');
					resolve('');
					return;
				}
				
				// 使用split和join方法更安全地清理内容，避免正则表达式问题
				let cleanedContent = fullContent;
				console.log('开始清理内容...');
				
				// 移除各种不需要的标记和文本
				cleanedContent = cleanedContent
					.split('```').join('')   // 移除代码块标记
					.split('\</think>').join('')  // 移除\</think>标记
					.split('</think>').join('')   // 移除</think>标记
					.split('<\/think>').join('') // 移除<\/think>标记
					.split(/\s+/).join(' ')   // 合并空白字符
					.trim();                  // 修剪前后空白
					
				// 提取实际的content内容（如果是JSON格式）
				let actualContent = cleanedContent;
				try {
					// 尝试从event stream格式中提取content字段
					if (cleanedContent.includes('data:')) {
						const lines = cleanedContent.split('\n');
						let extractedContent = '';
						for (const line of lines) {
							if (line.startsWith('data:')) {
								try {
									const jsonStr = line.substring(5).trim();
									if (jsonStr) {
										const data = JSON.parse(jsonStr);
										if (data.content) {
											extractedContent += data.content;
										}
									}
								} catch (e) {
									// 如果解析失败，跳过这一行
								}
							}
						}
						if (extractedContent && extractedContent.trim().length > 0) {
							actualContent = extractedContent;
						}
					}
				} catch (e) {
					console.log('提取content字段失败，使用原始清理内容');
				}
				
				console.log('提取后的实际内容:', actualContent);
				console.log('提取后内容长度:', actualContent.length);
				
				// 额外的内容有效性检查
				if (actualContent.length < 15) {
					console.log(`清理后内容过短 (${actualContent.length} 字符)，视为无效`);
					resolve('');
					return;
				}
				
				// 再次检查是否包含无效标记
				const lowerContent = actualContent.toLowerCase();
				if (lowerContent.includes('no_match') || 
					lowerContent.includes('无法作答') || 
					lowerContent.includes('未检索到相关信息')) {
					console.log('清理后仍检测到无效标记，视为无效');
					resolve('');
					return;
				}
				
				console.log('最终知识库内容:', actualContent);
				console.log('最终内容长度:', actualContent.length);
				resolve(actualContent);
			});
			
			stream.on('error', (error: Error) => {
				console.error('知识库流处理错误:', error);
				resolve('');
			});
		});
	}

	// 生成大模型响应，支持流式输出
	private async generateResponse(
		prompt: string,
		onStreamChunk?: (chunk: string) => void,
	): Promise<string> {
		let fullResponse = '';
		
		// 如果提供了流式回调，使用streamText并实现真正的流式输出
		if (onStreamChunk) {
			const result = await streamText({
				// model: deepseek(process.env.DEEPSEEK_MODEL || "deepseek-chat"),
				model: openai("gpt-5"),
				prompt,
				maxOutputTokens: 300,
				temperature: 0.7,
			});
			
			// 处理真正的流式输出，逐字符接收并传递
			fullResponse = '';
			for await (const chunk of result.textStream) {
				fullResponse += chunk;
				onStreamChunk(chunk); // 直接传递每个字符块
			}
		} else {
			// 否则使用普通的generateText
			const result = await generateText({
				// model: deepseek(process.env.DEEPSEEK_MODEL || "deepseek-chat"),
				model: openai("gpt-5"),
				prompt,
				maxOutputTokens: 300,
				temperature: 0.7,
			});
			
			fullResponse = result.text;
		}
		
		return fullResponse.trim();
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
			console.log("promt add Teaching strategy:", plan.strategy);
			systemPrompt += `\n\nTeaching strategy for this interaction: ${plan.strategy}\n`;
		}

		// systemPrompt += "\n\nrelevantKnowledge: 暂无\n";

		// 添加计划信息（如果有）
		if (plan?.teachingFocus) {
			console.log("promt add plan:", plan);
			systemPrompt += `\n\nTeaching focus for this interaction: ${plan.teachingFocus}\n`;
		}

		return `${systemPrompt}\n\n${chatHistory}\n\nChild: ${message}\n\nSparky:`;
	}
}
