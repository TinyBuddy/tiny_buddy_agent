import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PlanningAgent } from "../../actors/planningAgent";
import { InMemoryMemoryService } from "../../services/memoryService";
import { InMemoryKnowledgeBaseService } from "../../services/inMemoryKnowledgeBaseService";
import { createDefaultChildProfile } from "../../models/childProfile";
import { createMessage } from "../../models/message";
// 不导入私有方法buildPrompt，而是在文件内部实现其逻辑
import { getFullSystemPrompt } from "../../config/agentConfig";
import { mem0Service } from "../../services/mem0Service";

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
    
    // 从历史消息中提取重要记忆并写入mem0
    try {
      // 转换为mem0所需的chat_history格式（只取孩子的消息）
      const chatHistoryForMem0 = historyMsgs.map(msg => msg.child);
      
      console.log(`处理儿童 ${childID} 的历史记忆，准备提取重要信息`);
      
      // 调用mem0服务更新重要记忆
      const mem0Result = await mem0Service.updateImportantMemories({
        child_id: childID,
        chat_history: chatHistoryForMem0
      });
      
      console.log(`mem0处理结果: ${mem0Result.success ? '成功' : '失败'} - ${mem0Result.message}`);
    } catch (error) {
      console.error(`更新mem0重要记忆时出错:`, error);
      // 继续执行，不中断流程
    }
    
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
    
    // 实现与executionAgent.buildPrompt相同逻辑的函数
    const generatePrompt = async (message: string) => {
      const recentMessages = conversationHistory.slice(-5); // 获取最近5条消息
      const chatHistory = recentMessages
        .map((m) => `${m.type === "user" ? "Child" : "Sparky"}: ${m.content}`)
        .join("\n");

      // 从全局配置获取系统提示词
      let systemPrompt = getFullSystemPrompt(childProfile);
      
      // 从mem0读取重要记忆并添加到提示词中
      try {
        console.log(`从mem0读取儿童 ${childID} 的重要记忆`);
        const memories = await mem0Service.search('*', {
          user_id: childID,
          limit: 1
        });
        
        if (memories.length > 0 && memories[0].metadata && memories[0].metadata.important_info) {
          const importantInfo = memories[0].metadata.important_info;
          let importantMemoriesText = "\n\n# Child's Important Memories\n";
          
          if (importantInfo.name) {
            importantMemoriesText += `\n- Child's name: ${importantInfo.name}`;
          }
          
          if (importantInfo.familyMembers.length > 0) {
            importantMemoriesText += `\n\n- Family members: ${importantInfo.familyMembers.join(', ')}`;
          }
          
          if (importantInfo.friends.length > 0) {
            importantMemoriesText += `\n\n- Friends: ${importantInfo.friends.join(', ')}`;
          }
          
          if (importantInfo.interests.length > 0) {
            importantMemoriesText += `\n\n- Interests: ${importantInfo.interests.join(', ')}`;
          }
          
          if (importantInfo.importantEvents.length > 0) {
            importantMemoriesText += `\n\n- Important events: ${importantInfo.importantEvents.join(', ')}`;
          }
          
          if (importantInfo.dreams.length > 0) {
            importantMemoriesText += `\n\n- Dreams: ${importantInfo.dreams.join(', ')}`;
          }
          
          systemPrompt += importantMemoriesText;
          console.log("成功添加重要记忆到提示词中");
        } else {
          console.log("未找到重要记忆");
        }
      } catch (error) {
        console.error("读取mem0重要记忆时出错:", error);
        // 继续执行，不中断流程
      }

      // 添加相关知识库内容（如果有）
      // 注意：这里我们没有实际的知识库内容，但保持了原始逻辑

      if (parsedPlanResult?.strategy) {
        console.log("prompt add Teaching strategy:", parsedPlanResult.strategy);
        systemPrompt += `\n\nTeaching strategy for this interaction: ${parsedPlanResult.strategy}\n`;
      }

      // 添加计划信息（如果有）
      if (parsedPlanResult?.teachingFocus) {
        console.log("prompt add plan:", parsedPlanResult);
        systemPrompt += `\n\nTeaching focus for this interaction: ${parsedPlanResult.teachingFocus}\n`;
      }

      return `${systemPrompt}\n\n${chatHistory}\n\nChild: ${message}\n\nSparky:`;
    };
    
    // 生成最终的prompt
    const prompt = await generatePrompt(lastChildMessage);
    
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