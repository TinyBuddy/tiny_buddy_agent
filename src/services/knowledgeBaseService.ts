// 知识库服务
import type { KnowledgeContent } from "../models/content";

// 知识库服务接口
export interface KnowledgeBaseService {
	// 初始化知识库
	init(): Promise<void>;

	// 获取所有内容
	getAllContents(): Promise<KnowledgeContent[]>;

	// 根据ID获取内容
	getContentById(id: string): Promise<KnowledgeContent | undefined>;

	// 根据类型获取内容
	getContentsByType(type: string): Promise<KnowledgeContent[]>;

	// 根据关键词搜索内容
	searchContents(keyword: string): Promise<KnowledgeContent[]>;

	// 添加新内容
	addContent(
		content: Omit<KnowledgeContent, "id" | "createdAt" | "updatedAt">,
	): Promise<KnowledgeContent>;

	// 更新内容
	updateContent(
		id: string,
		content: Partial<KnowledgeContent>,
	): Promise<KnowledgeContent | undefined>;

	// 删除内容
	deleteContent(id: string): Promise<boolean>;
}

// WeKnora知识库服务实现
// 注意：这是一个模拟实现，实际应用中需要集成真实的WeKnora API
export class WeKnoraKnowledgeBaseService implements KnowledgeBaseService {
	private contents: KnowledgeContent[] = [];
	private initialized = false;

	async init(): Promise<void> {
		if (this.initialized) {
			return;
		}

		// 在实际应用中，这里会连接到WeKnora服务器并获取初始数据
		// 这里我们使用一些模拟数据进行初始化
		this.contents = this.loadMockData();
		this.initialized = true;

		console.log(`知识库初始化完成，加载了${this.contents.length}条内容`);
	}

	async getAllContents(): Promise<KnowledgeContent[]> {
		await this.ensureInitialized();
		return [...this.contents];
	}

	async getContentById(id: string): Promise<KnowledgeContent | undefined> {
		await this.ensureInitialized();
		return this.contents.find((content) => content.id === id);
	}

	async getContentsByType(type: string): Promise<KnowledgeContent[]> {
		await this.ensureInitialized();
		return this.contents.filter((content) => content.type === type);
	}

	async searchContents(keyword: string): Promise<KnowledgeContent[]> {
		await this.ensureInitialized();
		const lowerKeyword = keyword.toLowerCase();
		return this.contents.filter(
			(content) =>
				content.title.toLowerCase().includes(lowerKeyword) ||
				content.description.toLowerCase().includes(lowerKeyword) ||
				content.content.toLowerCase().includes(lowerKeyword) ||
				content.categories.some((cat) =>
					cat.toLowerCase().includes(lowerKeyword),
				),
		);
	}

	async addContent(
		content: Omit<KnowledgeContent, "id" | "createdAt" | "updatedAt">,
	): Promise<KnowledgeContent> {
		await this.ensureInitialized();

		const newContent: KnowledgeContent = {
			...content,
			id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		this.contents.push(newContent);

		// 在实际应用中，这里会将新内容保存到WeKnora服务器
		console.log(`添加新内容: ${newContent.title}`);

		return newContent;
	}

	async updateContent(
		id: string,
		content: Partial<KnowledgeContent>,
	): Promise<KnowledgeContent | undefined> {
		await this.ensureInitialized();

		const index = this.contents.findIndex((item) => item.id === id);
		if (index === -1) {
			return undefined;
		}

		const updatedContent: KnowledgeContent = {
			...this.contents[index],
			...content,
			updatedAt: new Date(),
		};

		this.contents[index] = updatedContent;

		// 在实际应用中，这里会更新WeKnora服务器上的内容
		console.log(`更新内容: ${updatedContent.title}`);

		return updatedContent;
	}

	async deleteContent(id: string): Promise<boolean> {
		await this.ensureInitialized();

		const initialLength = this.contents.length;
		this.contents = this.contents.filter((content) => content.id !== id);

		// 在实际应用中，这里会删除WeKnora服务器上的内容
		if (this.contents.length < initialLength) {
			console.log(`删除内容: ${id}`);
			return true;
		}

		return false;
	}

	// 确保知识库已初始化
	private async ensureInitialized(): Promise<void> {
		if (!this.initialized) {
			await this.init();
		}
	}

	// 加载模拟数据 - 符合用户要求的知识库mock语料类型
	private loadMockData(): KnowledgeContent[] {
		// 创建符合要求的模拟数据，包含教学、唱歌、游戏和正常聊天内容
		const mockData: KnowledgeContent[] = [
			{
				id: "content_001",
				type: "lesson",
				title: "Animal Sounds Learning (L1)",
				description: "Learn animal sounds in Chinese - Level 1",
				content: JSON.stringify({
					level: "L1",
					scene: "singing",
					child_input: "Animal song",
					sparky_response: "Animal sounds! 狗狗... gǒu gǒu... 汪汪! 狗狗 dog!",
					chinese_word: "狗狗",
					pinyin: "gǒu gǒu",
					teaching_focus: "animal sounds",
					wait_time: 5,
				}),
				language: "mix",
				difficulty: "easy",
				categories: ["learning", "animal", "chinese", "english"],
				createdAt: new Date("2023-01-01"),
				updatedAt: new Date("2023-01-01"),
			},
			{
				id: "content_002",
				type: "lesson",
				title: "Colors Learning (L1)",
				description: "Learn colors in Chinese - Level 1",
				content: JSON.stringify({
					level: "L1",
					scene: "game",
					child_input: "What color is this?",
					sparky_response:
						"That's red! 红色... hóng sè... 红色 red! Let's find more red things!",
					chinese_word: "红色",
					pinyin: "hóng sè",
					teaching_focus: "colors",
					wait_time: 4,
				}),
				language: "mix",
				difficulty: "easy",
				categories: ["learning", "colors", "chinese", "english"],
				createdAt: new Date("2023-01-01"),
				updatedAt: new Date("2023-01-01"),
			},
			{
				id: "content_003",
				type: "lesson",
				title: "Numbers Learning (L1)",
				description: "Learn numbers in Chinese - Level 1",
				content: JSON.stringify({
					level: "L1",
					scene: "game",
					child_input: "How many fingers?",
					sparky_response:
						"I see one finger! 一... yī... 一 one! Show me another finger!",
					chinese_word: "一",
					pinyin: "yī",
					teaching_focus: "numbers",
					wait_time: 3,
				}),
				language: "mix",
				difficulty: "easy",
				categories: ["learning", "numbers", "chinese", "english"],
				createdAt: new Date("2023-01-01"),
				updatedAt: new Date("2023-01-01"),
			},
			{
				id: "content_004",
				type: "song",
				title: "Hello Song (L1)",
				description: "Greeting song in Chinese and English - Level 1",
				content: JSON.stringify({
					level: "L1",
					scene: "singing",
					child_input: "Say hello",
					sparky_response:
						"Hello hello! 你好... nǐ hǎo... 你好 hello! Let's sing together!",
					chinese_word: "你好",
					pinyin: "nǐ hǎo",
					teaching_focus: "greetings",
					wait_time: 6,
				}),
				language: "mix",
				difficulty: "easy",
				categories: ["song", "greetings", "chinese", "english"],
				createdAt: new Date("2023-01-01"),
				updatedAt: new Date("2023-01-01"),
			},
			{
				id: "content_005",
				type: "game",
				title: "Body Parts Game (L1)",
				description: "Learn body parts in Chinese through game - Level 1",
				content: JSON.stringify({
					level: "L1",
					scene: "game",
					child_input: "Touch your nose",
					sparky_response:
						"Nose! 鼻子... bí zi... 鼻子 nose! Can you touch your nose?",
					chinese_word: "鼻子",
					pinyin: "bí zi",
					teaching_focus: "body parts",
					wait_time: 4,
				}),
				language: "mix",
				difficulty: "easy",
				categories: ["game", "body parts", "chinese", "english"],
				createdAt: new Date("2023-01-01"),
				updatedAt: new Date("2023-01-01"),
			},
			{
				id: "content_006",
				type: "lesson",
				title: "Family Members (L2)",
				description: "Learn family members in Chinese - Level 2",
				content: JSON.stringify({
					level: "L2",
					scene: "conversation",
					child_input: "Who's that?",
					sparky_response:
						"That's your mother! 妈妈... mā ma... 妈妈 mother! Do you love your mommy?",
					chinese_word: "妈妈",
					pinyin: "mā ma",
					teaching_focus: "family",
					wait_time: 5,
				}),
				language: "mix",
				difficulty: "easy",
				categories: ["learning", "family", "chinese", "english"],
				createdAt: new Date("2023-01-01"),
				updatedAt: new Date("2023-01-01"),
			},
			// 添加正常聊天内容
			{
				id: "content_007",
				type: "chat",
				title: "Daily Conversation (L1)",
				description: "Normal daily chat for kids - Level 1",
				content: JSON.stringify({
					level: "L1",
					scene: "chat",
					child_input: "How are you today?",
					sparky_response: "I'm great! How about you? Did you have a nice day?",
					teaching_focus: "conversation",
					wait_time: 4,
				}),
				language: "en",
				difficulty: "easy",
				categories: ["chat", "daily", "conversation"],
				createdAt: new Date("2023-01-01"),
				updatedAt: new Date("2023-01-01"),
			},
			{
				id: "content_008",
				type: "chat",
				title: "Weather Talk (L1)",
				description: "Chat about weather - Level 1",
				content: JSON.stringify({
					level: "L1",
					scene: "chat",
					child_input: "What's the weather like?",
					sparky_response:
						"It's sunny today! The sun is shining bright. What's your favorite weather?",
					teaching_focus: "weather",
					wait_time: 5,
				}),
				language: "en",
				difficulty: "easy",
				categories: ["chat", "weather"],
				createdAt: new Date("2023-01-01"),
				updatedAt: new Date("2023-01-01"),
			},
			{
				id: "content_009",
				type: "chat",
				title: "Hobbies Chat (L1)",
				description: "Chat about hobbies and interests - Level 1",
				content: JSON.stringify({
					level: "L1",
					scene: "chat",
					child_input: "What do you like to do?",
					sparky_response:
						"I love to sing, play games, and learn new things! What's your favorite thing to do?",
					teaching_focus: "hobbies",
					wait_time: 4,
				}),
				language: "en",
				difficulty: "easy",
				categories: ["chat", "hobbies"],
				createdAt: new Date("2023-01-01"),
				updatedAt: new Date("2023-01-01"),
			},
			{
				id: "content_010",
				type: "chat",
				title: "Feelings Chat (L1)",
				description: "Talking about feelings - Level 1",
				content: JSON.stringify({
					level: "L1",
					scene: "chat",
					child_input: "I'm happy/sad/angry",
					sparky_response:
						"Oh, I'm glad you're feeling happy! Tell me why! / I'm sorry you're feeling sad. Want to talk about it?",
					teaching_focus: "emotions",
					wait_time: 5,
				}),
				language: "en",
				difficulty: "easy",
				categories: ["chat", "feelings", "emotions"],
				createdAt: new Date("2023-01-01"),
				updatedAt: new Date("2023-01-01"),
			},
		];

		return mockData;
	}
}
