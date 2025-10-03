import app, { type TinyBuddyApp } from "./app";
import type { ChildProfile } from "./models/childProfile";
import type { KnowledgeContent } from "./models/content";
import type { Message } from "./models/message";

/**
 * TinyBuddy SDK
 * 提供简洁的API接口，方便第三方项目集成和调用multi-agent系统功能
 */
export class TinyBuddySDK {
  private app: TinyBuddyApp;
  private childId: string;

  /**
   * 初始化TinyBuddy SDK
   * @param childId 儿童ID
   */
  constructor(childId = "default_child") {
    this.app = app;
    this.childId = childId;
  }

  /**
   * 初始化SDK和底层系统
   * @returns 初始化结果
   */
  async init(): Promise<{ success: boolean; message: string }> {
    try {
      await this.app.init();
      return {
        success: true,
        message: "TinyBuddy SDK initialized successfully",
      };
    } catch (error) {
      console.error("SDK initialization failed:", error);
      return {
        success: false,
        message: `Initialization failed: ${error instanceof Error ? error.message : "unknown error"}`,
      };
    }
  }

  /**
   * 处理用户输入并生成响应
   * @param userInput 用户输入文本
   * @returns 系统响应文本
   */
  async processUserInput(userInput: string): Promise<string> {
    try {
      const result = await this.app.processUserInput(this.childId, userInput);
      return result;
    } catch (error) {
      console.error("Failed to process user input:", error);
      return "Sorry, I couldn't process your request at the moment.";
    }
  }

  /**
   * 获取儿童档案
   * @returns 儿童档案对象
   */
  async getChildProfile(): Promise<ChildProfile> {
    try {
      return await this.app.getChildProfile(this.childId);
    } catch (error) {
      console.error("Failed to get child profile:", error);
      throw error;
    }
  }

  /**
   * 更新儿童档案
   * @param profile 要更新的档案信息
   * @returns 更新后的儿童档案
   */
  async updateChildProfile(
    profile: Partial<ChildProfile>,
  ): Promise<ChildProfile> {
    try {
      return await this.app.updateChildProfile(this.childId, profile);
    } catch (error) {
      console.error("Failed to update child profile:", error);
      throw error;
    }
  }

  /**
   * 获取对话历史
   * @returns 对话历史消息数组
   */
  async getConversationHistory(): Promise<Message[]> {
    try {
      return await this.app.getConversationHistory(this.childId);
    } catch (error) {
      console.error("Failed to get conversation history:", error);
      throw error;
    }
  }

  /**
   * 分析儿童兴趣
   * @returns 兴趣标签数组
   */
  async analyzeChildInterests(): Promise<string[]> {
    try {
      return await this.app.analyzeChildInterests(this.childId);
    } catch (error) {
      console.error("Failed to analyze child interests:", error);
      throw error;
    }
  }

  /**
   * 添加自定义知识库内容
   * @param content 知识库内容对象
   * @returns 添加结果
   */
  async addKnowledgeContent(
    content: Omit<KnowledgeContent, "id" | "createdAt">,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.app.addKnowledgeContent(content);
      return { success: true, message: "Knowledge content added successfully" };
    } catch (error) {
      console.error("Failed to add knowledge content:", error);
      return {
        success: false,
        message: `Failed to add knowledge content: ${error instanceof Error ? error.message : "unknown error"}`,
      };
    }
  }

  /**
   * 检查系统运行状态
   * @returns 运行状态
   */
  isRunning(): boolean {
    return this.app.isAppRunning();
  }

  /**
   * 关闭SDK和底层系统
   */
  async shutdown(): Promise<void> {
    try {
      await this.app.shutdown();
    } catch (error) {
      console.error("Failed to shutdown SDK:", error);
      throw error;
    }
  }
}

/**
 * 便捷工厂方法，创建TinyBuddy SDK实例
 * @param childId 可选的儿童ID
 * @returns TinyBuddy SDK实例
 */
export async function createTinyBuddySDK(
  childId?: string,
): Promise<TinyBuddySDK> {
  const sdk = new TinyBuddySDK(childId || "default_child");
  const initResult = await sdk.init();

  if (!initResult.success) {
    console.warn("SDK initialization has warning:", initResult.message);
  }

  return sdk;
}

// 默认导出SDK类
export default TinyBuddySDK;
