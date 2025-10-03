// 记忆服务
import type { ChildProfile } from "../models/childProfile";
import { createDefaultChildProfile } from "../models/childProfile";
import type { ConversationHistory, Message } from "../models/message";
import { createMessage } from "../models/message";

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
}

// 内存实现的记忆服务
// 注意：在实际应用中，应该使用持久化存储

export class InMemoryMemoryService implements MemoryService {
  private childProfiles: Map<string, ChildProfile> = new Map();
  private conversationHistories: Map<string, ConversationHistory> = new Map();
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

    // 如果找不到儿童档案，创建默认档案
    if (!this.childProfiles.has(childId)) {
      const defaultProfile = createDefaultChildProfile(childId);
      this.childProfiles.set(childId, defaultProfile);
      return defaultProfile;
    }

    const profile = this.childProfiles.get(childId);
    if (!profile) {
      throw new Error(`Child profile not found for id: ${childId}`);
    }
    return { ...profile };
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

    this.childProfiles.set(childId, updatedProfile);
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

    this.childProfiles.set(childId, newProfile);
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

  // 确保服务已初始化
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }
}
