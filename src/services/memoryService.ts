// 记忆服务
import type { ChildProfile } from "../models/childProfile";
import { createDefaultChildProfile } from "../models/childProfile";
import type { ConversationHistory, Message } from "../models/message";
import { createMessage } from "../models/message";
import { 
  createChildProfile as dbCreateChildProfile,
  getChildProfileById as dbGetChildProfileById,
  updateChildProfile as dbUpdateChildProfile,
  listChildProfiles as dbListChildProfiles,
} from '../db/db';

// 记忆服务接口
export interface MemoryService {
	// 初始化记忆服务
	init(): Promise<void>;

	// 儿童档案管理
	getChildProfile(childId: string): Promise<ChildProfile>;
	updateChildProfile(
		childId: string,
		profile: Partial<ChildProfile>,
	): Promise<ChildProfile>;
	createChildProfile(profile: Omit<ChildProfile, "id">): Promise<ChildProfile>;
	getAllChildIds(): Promise<string[]>;

	// 对话历史管理
	getConversationHistory(childId: string): Promise<Message[]>;
	addMessageToHistory(childId: string, message: Message): Promise<void>;
	clearConversationHistory(childId: string): Promise<void>;

	// 记忆分析
	analyzeChildInterests(childId: string): Promise<string[]>;
	trackLearningProgress(
		childId: string,
		knowledgePoint: string,
		progress: number,
	): Promise<void>;

	// 规划管理
	getPlanningResult(
		childId: string,
	): Promise<{ plan: any; timestamp: Date } | null>;
	setPlanningResult(childId: string, plan: any): Promise<void>;
	updatePlanningResult(childId: string, plan: any): Promise<void>;
}

// 内存实现的记忆服务
// 注意：在实际应用中，应该使用持久化存储
export class InMemoryMemoryService implements MemoryService {
	private childProfiles: Map<string, ChildProfile> = new Map();
	private conversationHistories: Map<string, ConversationHistory> = new Map();
	private planningResults: Map<string, { plan: any; timestamp: Date }> =
		new Map();
	private initialized = false;

	async init(): Promise<void> {
		if (this.initialized) {
			return;
		}

		// 初始化逻辑
		this.initialized = true;
		console.log("记忆服务初始化完成");
	}

	async getChildProfile(childId: string): Promise<ChildProfile> {
		await this.ensureInitialized();

		// 首先尝试从内存获取
		if (this.childProfiles.has(childId)) {
			const profile = this.childProfiles.get(childId);
			if (profile) {
				return { ...profile };
			}
		}

		// 如果内存中找不到，尝试从数据库获取
		try {
			const dbProfile = await dbGetChildProfileById(childId);
			if (dbProfile) {
				// 转换gender字段类型以匹配接口定义
				const formattedProfile: ChildProfile = {
					id: dbProfile.id,
					name: dbProfile.name,
					age: dbProfile.age,
					gender: (dbProfile.gender as "male" | "female" | "other") || "other",
					preferredLanguage: dbProfile.preferredLanguage,
					interests: Array.isArray(dbProfile.interests) ? dbProfile.interests : [],
					dislikes: Array.isArray(dbProfile.dislikes) ? dbProfile.dislikes : [],
					learningProgress: typeof dbProfile.learningProgress === 'object' && !Array.isArray(dbProfile.learningProgress) && dbProfile.learningProgress !== null ? (dbProfile.learningProgress as Record<string, number>) : {},
					lastInteraction: new Date(dbProfile.lastInteraction),
					languageLevel: dbProfile.languageLevel || undefined
				};
				// 同步到内存
				this.childProfiles.set(childId, formattedProfile);
				return formattedProfile;
			}
		} catch (error) {
			console.warn(`从数据库获取儿童档案失败，继续使用内存模式: ${error}`);
		}

		// 如果数据库也找不到，创建默认档案
		const defaultProfile = createDefaultChildProfile(childId);
		this.childProfiles.set(childId, defaultProfile);

		// 保存默认档案到数据库
		try {
			// 为数据库创建包含所需字段的对象
			const dbProfile = {
				...defaultProfile,
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			await dbCreateChildProfile(dbProfile);
			console.log(`儿童默认档案已成功创建并保存到数据库: ${childId}`);
		} catch (error) {
			console.warn(`保存儿童默认档案到数据库失败: ${error}`);
		}

		return defaultProfile;
	}

	async updateChildProfile(
		childId: string,
		profile: Partial<ChildProfile>,
	): Promise<ChildProfile> {
		await this.ensureInitialized();

		// 获取或创建儿童档案
		const currentProfile = await this.getChildProfile(childId);

		// 更新档案
		const updatedProfile: ChildProfile = {
			...currentProfile,
			...profile,
			lastInteraction: new Date(),
		};

		// 更新内存中的档案
		this.childProfiles.set(childId, updatedProfile);

		// 异步更新数据库中的档案
		try {
			await dbUpdateChildProfile(childId, updatedProfile);
			console.log(`儿童档案已成功更新到数据库: ${childId}`);
		} catch (error) {
			console.warn(`更新数据库中的儿童档案失败: ${error}`);
		}

		return updatedProfile;
	}

	async createChildProfile(
		profile: Omit<ChildProfile, "id">,
	): Promise<ChildProfile> {
		await this.ensureInitialized();

		const childId = `child_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const newProfile: ChildProfile = {
			...profile,
			id: childId,
			lastInteraction: new Date(),
		};

		// 保存到内存
		this.childProfiles.set(childId, newProfile);

		// 异步保存到数据库
		try {
			// 为数据库创建包含所需字段的对象
			const dbProfile = {
				...newProfile,
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			await dbCreateChildProfile(dbProfile);
			console.log(`儿童档案已成功创建并保存到数据库: ${childId}`);
		} catch (error) {
			console.warn(`保存儿童档案到数据库失败: ${error}`);
		}

		return newProfile;
	}

	async getConversationHistory(childId: string): Promise<Message[]> {
		await this.ensureInitialized();

		// 获取或创建对话历史
		if (!this.conversationHistories.has(childId)) {
			this.conversationHistories.set(childId, {
				childId,
				messages: [],
				lastUpdated: new Date(),
			});
			return [];
		}

		const history = this.conversationHistories.get(childId);
		if (!history) {
			return [];
		}
		return [...history.messages];
	}

	async addMessageToHistory(childId: string, message: Message): Promise<void> {
		await this.ensureInitialized();

		// 获取或创建对话历史
		let history = this.conversationHistories.get(childId);
		if (!history) {
			history = {
				childId,
				messages: [],
				lastUpdated: new Date(),
			};
		}

		// 添加消息
		history.messages.push({ ...message });
		history.lastUpdated = new Date();

		// 限制历史记录长度，避免内存占用过大
		if (history.messages.length > 100) {
			history.messages = history.messages.slice(-100);
		}

		this.conversationHistories.set(childId, history);

		// 如果是用户消息，更新儿童最后互动时间
		if (message.type === "user") {
			await this.updateChildProfile(childId, { lastInteraction: new Date() });
		}
	}

	async clearConversationHistory(childId: string): Promise<void> {
		await this.ensureInitialized();

		if (this.conversationHistories.has(childId)) {
			this.conversationHistories.set(childId, {
				childId,
				messages: [],
				lastUpdated: new Date(),
			});
		}
	}

	async analyzeChildInterests(childId: string): Promise<string[]> {
		await this.ensureInitialized();

		const profile = await this.getChildProfile(childId);
		const history = await this.getConversationHistory(childId);

		// 基于对话历史分析儿童兴趣
		const interestKeywords: Record<string, number> = {};

		// 预设的兴趣关键词
		const predefinedInterests: Record<string, string[]> = {
			动物: [
				"猫",
				"狗",
				"兔子",
				"熊猫",
				"bird",
				"cat",
				"dog",
				"rabbit",
				"panda",
			],
			音乐: ["唱歌", "歌", "music", "song", "sing"],
			游戏: ["玩", "游戏", "game", "play"],
			故事: ["故事", "book", "story", "read"],
			科学: ["为什么", "怎么", "what", "why", "how"],
			艺术: ["画画", "画", "color", "draw", "painting"],
		};

		// 分析对话历史中的关键词
		for (const message of history) {
			if (message.type === "user") {
				const content = message.content.toLowerCase();

				// 检查每个兴趣类别的关键词
				for (const [interest, keywords] of Object.entries(
					predefinedInterests,
				)) {
					for (const keyword of keywords) {
						if (content.includes(keyword.toLowerCase())) {
							interestKeywords[interest] =
								(interestKeywords[interest] || 0) + 1;
						}
					}
				}
			}
		}

		// 合并已有兴趣和新分析的兴趣
		const allInterests = new Set<string>(profile.interests);

		// 根据关键词出现次数排序，取前5个最感兴趣的类别
		const sortedInterests = Object.entries(interestKeywords)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5)
			.map(([interest]) => interest);

		// 添加到已有兴趣中
		for (const interest of sortedInterests) {
			allInterests.add(interest);
		}

		return Array.from(allInterests);
	}

	async trackLearningProgress(
		childId: string,
		knowledgePoint: string,
		progress: number,
	): Promise<void> {
		await this.ensureInitialized();

		const profile = await this.getChildProfile(childId);

		// 更新学习进度
		const updatedProgress: Record<string, number> = {
			...profile.learningProgress,
			[knowledgePoint]: Math.max(0, Math.min(100, progress)), // 确保进度在0-100之间
		};

		await this.updateChildProfile(childId, {
			learningProgress: updatedProgress,
		});
	}

	// 获取规划结果
	async getPlanningResult(
		childId: string,
	): Promise<{ plan: any; timestamp: Date } | null> {
		await this.ensureInitialized();

		const result = this.planningResults.get(childId);
		return result || null;
	}

	// 设置规划结果
	async setPlanningResult(childId: string, plan: any): Promise<void> {
		await this.ensureInitialized();

		this.planningResults.set(childId, {
			plan,
			timestamp: new Date(),
		});
	}

	// 更新规划结果
	async updatePlanningResult(childId: string, plan: any): Promise<void> {
		await this.ensureInitialized();

		// 这里可以添加合并逻辑，根据需要更新现有计划
		this.planningResults.set(childId, {
			plan: {
				...(this.planningResults.get(childId)?.plan || {}),
				...plan,
			},
			timestamp: new Date(),
		});
	}

	// 确保服务已初始化
	private async ensureInitialized(): Promise<void> {
		if (!this.initialized) {
			await this.init();
		}
	}

	// 获取所有儿童ID
	async getAllChildIds(): Promise<string[]> {
		await this.ensureInitialized();

		try {
			// 尝试从数据库获取所有儿童档案
			const dbProfiles = await dbListChildProfiles();
			if (dbProfiles && dbProfiles.length > 0) {
				const dbIds = dbProfiles.map(profile => profile.id);
				// 确保内存中的ID也包含数据库中的ID
				dbIds.forEach(id => {
					if (!this.childProfiles.has(id)) {
						// 如果内存中没有该ID的档案，创建一个占位符
						// 实际数据会在getChildProfile时从数据库加载
						this.childProfiles.set(id, { id } as ChildProfile);
					}
				});
				return dbIds;
			}
		} catch (error) {
			console.warn(`从数据库获取儿童ID列表失败，使用内存中的ID: ${error}`);
		}

		// 如果数据库操作失败，返回内存中的ID
		return Array.from(this.childProfiles.keys());
	}
}
