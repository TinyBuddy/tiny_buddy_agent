import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PlanningAgent } from "../../actors/planningAgent";
import { InMemoryMemoryService } from "../../services/memoryService";
import { InMemoryKnowledgeBaseService } from "../../services/inMemoryKnowledgeBaseService";
import { createDefaultChildProfile } from "../../models/childProfile";
import { createMessage } from "../../models/message";
// 不导入私有方法buildPrompt，而是在文件内部实现其逻辑
import { getFullSystemPrompt } from "../../config/agentConfig";

// 定义请求体参数验证模式
export const requestBodySchema = z.object({
  childID: z.string(),
  gender: z.enum(["male", "female", "other"]),
  interests: z.array(z.string()),
  languageLevel: z.string().regex(/^L[1-5]$/i),
  historyMsgs: z.array(
    z.object({
      child: z.string(),
      AI: z.string(),
    })
  ),
});

/**
 * 生成prompt内容的API接口
 * @param request Next.js请求对象
 * @returns 包含生成的prompt的JSON响应
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const requestBody = await request.json();
    
    // 验证请求参数
    const { childID, gender, interests, languageLevel, historyMsgs } = requestBodySchema.parse(requestBody);
    
    console.log(`生成prompt请求: 儿童ID=${childID}, 语言级别=${languageLevel}`);
    
    // 初始化必要的服务
    const memoryService = new InMemoryMemoryService();
    const knowledgeBaseService = new InMemoryKnowledgeBaseService();
    await memoryService.init();
    await knowledgeBaseService.init();
    
    // 创建儿童档案
    const childProfile = {
      ...createDefaultChildProfile(childID),
      id: childID,
      name: childID, // 使用ID作为名称
      gender,
      interests,
      languageLevel: languageLevel.toUpperCase(),
    };
    
    // 转换历史消息格式
    const conversationHistory = historyMsgs.flatMap((msg: { child: string; AI: string }) => [
      createMessage({
        type: "user",
        content: msg.child,
        sender: childID,
      }),
      createMessage({
        type: "agent",
        content: msg.AI,
        sender: "assistant",
      }),
    ]);
    
    // 获取最后一条儿童消息作为输入
    const lastChildMessage = historyMsgs.length > 0 ? historyMsgs[historyMsgs.length - 1].child : "Hello";
    
    // 创建规划Agent
    const planningAgent = new PlanningAgent({
      knowledgeBaseService,
      memoryService,
    });
    
    // 初始化规划Agent
    await planningAgent.init({
      childProfile,
      conversationHistory,
      knowledgeBase: [] // 添加必要的knowledgeBase属性，初始化为空数组
    });
    
    // 调用规划Agent的process方法生成计划
    const planResult = await planningAgent.process({
      input: lastChildMessage,
      context: {
        childProfile,
        conversationHistory,
        knowledgeBase: [] // 添加必要的knowledgeBase属性
      },
    });
    
    // 解析规划结果
    let parsedPlanResult;
    if (planResult && planResult.output) {
      try {
        parsedPlanResult = typeof planResult.output === 'string' ? JSON.parse(planResult.output) : planResult.output;
      } catch (parseError) {
        console.warn("解析规划结果失败，使用降级方案:", parseError);
        parsedPlanResult = {
          type: "chat",
          interactionType: "chat",
          strategy: "Chat with the child as a friend using simple and easy-to-understand language",
        };
      }
    } else {
      // 如果没有有效的规划结果，使用降级方案
      parsedPlanResult = {
        type: "chat",
        interactionType: "chat",
        strategy: "Chat with the child as a friend using simple and easy-to-understand language",
      };
    }
    
    console.log("规划结果:", parsedPlanResult);
    
    // 检测重复问题并计算重复次数
    const detectRepetition = (currentMessage: string, historyMsgs: Array<{child: string, AI: string}>): {isRepeated: boolean, repetitionCount: number, similarQuestion: string} => {
      if (historyMsgs.length < 2) return {isRepeated: false, repetitionCount: 0, similarQuestion: ''};
      
      // 简单的文本相似度检测
      const normalizeText = (text: string) => {
        return text.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .trim()
          .split(/\s+/)
          .filter(word => word.length > 2)
          .sort()
          .join(' ');
      };
      
      const normalizedCurrent = normalizeText(currentMessage);
      let repetitionCount = 0;
      let similarQuestion = '';
      
      // 检查最近的历史消息
      for (let i = historyMsgs.length - 2; i >= 0; i--) {
        const normalizedHistory = normalizeText(historyMsgs[i].child);
        
        if (normalizedHistory && normalizedCurrent) {
          const currentWords = new Set(normalizedCurrent.split(' '));
          const historyWords = new Set(normalizedHistory.split(' '));
          const intersection = new Set([...currentWords].filter(x => historyWords.has(x)));
          const similarity = intersection.size / Math.min(currentWords.size, historyWords.size);
          
          if (similarity > 0.5) {
            repetitionCount++;
            similarQuestion = historyMsgs[i].child;
            if (repetitionCount >= 2) break;
          }
        }
      }
      
      return {isRepeated: repetitionCount > 0, repetitionCount, similarQuestion};
    };

    // 根据重复次数获取情绪状态
    const getEmotionBasedOnRepetition = (repetitionCount: number): string => {
      switch(repetitionCount) {
        case 1:
          return "friendly_reminder"; // 友好提醒
        case 2:
          return "mildly_impatient"; // 轻微不耐烦
        default:
          return "neutral"; // 中性
      }
    };
    
    // 提取对话中的关键话题和上下文关联
    const extractConversationContext = (historyMsgs: Array<{child: string, AI: string}>, currentMsg: string): string => {
      // 如果历史消息不足，直接返回基本上下文
      if (historyMsgs.length < 2) {
        return "Recent conversation context is limited. Focus on direct response.";
      }
      
      // 获取最近的对话历史
      const recentMsgs = historyMsgs.slice(-3); // 最近3轮对话
      let keyTopics: string[] = [];
      let continuityNotes: string[] = [];
      
      // 提取关键话题和连续性信息
      for (let i = 0; i < recentMsgs.length; i++) {
        const msg = recentMsgs[i];
        
        // 提取可能的关键词
        const words = msg.child.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
        const importantWords = words.filter(word => {
          // 过滤掉常见词，但保留可能有意义的词汇
          const commonWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'I', 'you', 'he', 'she', 'it', 'we', 'they', 'and', 'or', 'but', 'for', 'with', 'in', 'on', 'to', 'of']);
          return !commonWords.has(word);
        });
        
        if (importantWords.length > 0) {
          keyTopics.push(...importantWords);
        }
        
        // 检查是否有需要保持连续性的问题或话题
        if (msg.child.includes('?') || importantWords.length > 2) {
          continuityNotes.push(`Previously discussed: "${msg.child.substring(0, 50)}${msg.child.length > 50 ? '...' : ''}"`);
        }
      }
      
      // 去重并限制数量
      const uniqueTopics = [...new Set(keyTopics)].slice(0, 5);
      
      // 构建上下文提示
      let contextPrompt = "Conversation Context Analysis:\n";
      
      if (uniqueTopics.length > 0) {
        contextPrompt += `- Key topics in recent conversation: ${uniqueTopics.join(", ")}\n`;
      }
      
      if (continuityNotes.length > 0) {
        contextPrompt += `- ${continuityNotes.join("\n- ")}\n`;
      }
      
      // 分析当前消息与历史的关联性
      const currentWords = currentMsg.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
      const currentImportantWords = currentWords.filter(word => !new Set(['the', 'a', 'an', 'is', 'are', 'I', 'you']).has(word));
      
      // 检查当前消息是否与之前的话题相关
      const relatedTopics = uniqueTopics.filter(topic => currentImportantWords.includes(topic));
      if (relatedTopics.length > 0) {
        contextPrompt += `- Current message relates to previously discussed topics: ${relatedTopics.join(", ")}\n`;
      }
      
      // 检测特殊模式，如请求解释、重复请求等
      if (currentMsg.toLowerCase().includes('explain') || currentMsg.toLowerCase().includes('tell me more')) {
        contextPrompt += `- The child is asking for more information. Refer to previous discussion when responding.\n`;
      }
      
      // 检测是否有连续性请求（如"what's that"可能是指之前提到的内容）
      const continuityPatterns = [/what's that|what is that|what's this|what is this/i, /who is|who are/i, /where is|where are/i];
      for (const pattern of continuityPatterns) {
        if (pattern.test(currentMsg) && recentMsgs.length > 0) {
          const lastTopic = recentMsgs[recentMsgs.length - 1].child.substring(0, 30);
          contextPrompt += `- The child's question may refer to: "${lastTopic}${recentMsgs[recentMsgs.length - 1].child.length > 30 ? '...' : ''}"\n`;
          break;
        }
      }
      
      return contextPrompt;
    };

    // 实现增强版的prompt生成函数
    const generatePrompt = (message: string) => {
      const recentMessages = conversationHistory.slice(-20); // 获取最近20条消息
      const chatHistory = recentMessages
        .map((m) => `${m.type === "user" ? "Child" : "Sparky"}: ${m.content}`)
        .join("\n");

      // 检测重复问题
      const repetitionInfo = detectRepetition(message, historyMsgs);
      
      // 获取上一轮对话内容用于回指
      let conversationContext = "";
      if (historyMsgs.length > 0) {
        const lastChildMsg = historyMsgs[historyMsgs.length - 1].child;
        const lastAIMsg = historyMsgs[historyMsgs.length - 1].AI;
        conversationContext = `Last child message: "${lastChildMsg}"
Last AI response: "${lastAIMsg}"
`;
        
        // 添加对话上下文分析
        const detailedContext = extractConversationContext(historyMsgs, message);
        conversationContext += `\n${detailedContext}`;
      }

      // 从全局配置获取系统提示词
      let systemPrompt = getFullSystemPrompt(childProfile);

      // 添加教学策略
      if (parsedPlanResult?.strategy) {
        console.log("prompt add Teaching strategy:", parsedPlanResult.strategy);
        systemPrompt += `\n\nTeaching strategy for this interaction: ${parsedPlanResult.strategy}\n`;
      }

      // 添加计划信息（如果有）
      if (parsedPlanResult?.teachingFocus) {
        console.log("prompt add plan:", parsedPlanResult);
        systemPrompt += `\n\nTeaching focus for this interaction: ${parsedPlanResult.teachingFocus}\n`;
      }
      
      // 添加重复检测结果和情绪状态
      if (repetitionInfo.isRepeated) {
        const emotionState = getEmotionBasedOnRepetition(repetitionInfo.repetitionCount);
        systemPrompt += `\n\nRepetition detected: The child has asked a similar question ${repetitionInfo.repetitionCount} time(s) before.`;
        systemPrompt += `\nEmotional state for response: ${emotionState}`;
        systemPrompt += `\nSimilar previous question: "${repetitionInfo.similarQuestion}"`;
      }
      
      // 添加通用对话规则增强
      systemPrompt += `\n\nConversation Rules Enhancement：
1. Banned repetitive opening phrases: Do not repeat the same opening phrases at the beginning of responses.
2. Diverse sentence patterns: Use different sentence structures and expressions to avoid repetitive patterns.
3. Concise answers: Limit each response to 1-2 sentences, keeping it clear and concise.
4. Single question: Ask only one question at a time, avoid multiple questions simultaneously.
5. Anaphora and connection: Must include references to key points from the previous conversation, such as "You mentioned..." or "As I said earlier...".
6. Avoid complete repetition: Even for the same question, answer differently by changing sentence structure, vocabulary, and examples.
7. Context awareness: Always interpret the child's current message in the context of the entire conversation history.
8. Topic continuity: Maintain logical connections between topics mentioned throughout the conversation.
9. Reference resolution: When the child asks follow-up questions (like "what's that"), connect it to the most recently discussed topic.`;

      // 构建完整的prompt
      const prompt = `
${systemPrompt}


# Conversation context
${conversationContext}

# History conversations

${chatHistory}

# Current input
Child: ${message}

# Response requirements
- Include a reference to the last interaction
- If this is a repeated question, vary your response significantly
- Limit to 1-2 sentences
- Ask only one question if you ask anything
- Use a different opening phrase than before
- Maintain logical continuity with the entire conversation flow
- Always interpret the current message in the context of previously discussed topics
- When responding to follow-up questions, explicitly connect to the relevant topic from earlier in the conversation

Sparky:`;
      return prompt;
    };
    
    // 生成最终的prompt
    const prompt = generatePrompt(lastChildMessage);
    
    // 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        prompt,
        childID
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("生成prompt时出错:", error);

    // 处理验证错误
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "参数验证失败",
          details: error.errors,
        },
        {
          status: 400,
        }
      );
    }

    // 处理其他错误
    return NextResponse.json(
      {
        success: false,
        error: "服务器内部错误",
        message: error instanceof Error ? error.message : "未知错误",
      },
      {
        status: 500,
      }
    );
  }
}