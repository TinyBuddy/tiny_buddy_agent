import { and, eq, gte, lte } from "drizzle-orm";
// 使用Next.js框架创建HTTP服务器
import express from "express";
import { z, ZodError } from "zod";
import { db } from "./db/db";
import { vocabulary } from "./db/schema";
import { PlanningAgent } from "./actors/planningAgent";
import { InMemoryMemoryService } from "./services/memoryService";
import { InMemoryKnowledgeBaseService } from "./services/inMemoryKnowledgeBaseService";
import { createDefaultChildProfile } from "./models/childProfile";
import { createMessage } from "./models/message";
import { getFullSystemPrompt } from "./config/agentConfig";

// 创建Express应用（集成Next.js功能）
const app = express();
app.use(express.json());

// 定义请求体参数验证模式
const generatePromptSchema = z.object({
  childID: z.string(),
  gender: z.enum(["male", "female", "other"]),
  interests: z.array(z.string()),
  languageLevel: z.string().regex(/^L[1-5]$/i),
  childAge: z.number().min(0).max(100),
  historyMsgs: z.array(
    z.object({
      child: z.string(),
      AI: z.string(),
    })
  ),
});

// 定义查询参数验证模式
const querySchema = z.object({
	childId: z.string(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
});

/**
 * 处理GET请求：获取指定儿童ID在指定时间区间内的词汇表列表（去重）
 */
app.get("/api/vocabulary", async (req, res) => {
	try {
		// 解析查询参数
		const queryParams = {
			childId: req.query.childId as string,
			startDate: req.query.startDate as string | undefined,
			endDate: req.query.endDate as string | undefined,
		};

		// 验证查询参数
		const { childId, startDate, endDate } = querySchema.parse(queryParams);

		console.log(
			`获取儿童 ${childId} 的词汇表，时间区间: ${startDate || "开始"} 到 ${endDate || "现在"}`,
		);

		// 构建查询条件
		const conditions = [eq(vocabulary.childId, childId)];

		// 添加时间区间条件
		if (startDate) {
			conditions.push(gte(vocabulary.createdAt, new Date(startDate)));
		}

		if (endDate) {
			conditions.push(lte(vocabulary.createdAt, new Date(endDate)));
		}

		// 查询数据库获取词汇表
		const result = await db
			.select({ word: vocabulary.word })
			.from(vocabulary)
			.where(and(...conditions));

		// 提取词汇并去重
		const words = Array.from(new Set(result.map((item) => item.word)));

		// 返回成功响应
		res.json({
			success: true,
			data: {
				words,
				count: words.length,
				childId,
				timeRange: {
					start: startDate || null,
					end: endDate || null,
				},
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("获取词汇表时出错:", error);

		// 处理验证错误
		if (error instanceof z.ZodError) {
			return res.status(400).json({
				success: false,
				error: "参数验证失败",
				details: error.errors,
			});
		}

		// 处理其他错误
		return res.status(500).json({
			success: false,
			error: "服务器内部错误",
			message: error instanceof Error ? error.message : "未知错误",
		});
	}
});

// 全局服务实例，避免每次请求都重新创建
let globalMemoryService: InMemoryMemoryService | null = null;
let globalKnowledgeBaseService: InMemoryKnowledgeBaseService | null = null;
let globalPlanningAgent: PlanningAgent | null = null;

// 初始化全局服务
const initGlobalServices = async () => {
  if (!globalMemoryService) {
    globalMemoryService = new InMemoryMemoryService();
    await globalMemoryService.init();
  }
  if (!globalKnowledgeBaseService) {
    globalKnowledgeBaseService = new InMemoryKnowledgeBaseService();
    await globalKnowledgeBaseService.init();
  }
  if (!globalPlanningAgent) {
    globalPlanningAgent = new PlanningAgent({
      knowledgeBaseService: globalKnowledgeBaseService,
      memoryService: globalMemoryService,
    });
  }
  return { 
    memoryService: globalMemoryService, 
    knowledgeBaseService: globalKnowledgeBaseService,
    planningAgent: globalPlanningAgent
  };
};

/**
 * 生成prompt内容的API端点
 */
app.post("/api/agent/generate-prompt", async (req, res) => {
  try {
    const startTime = Date.now();
    const parseStart = Date.now();
    
    // 验证请求参数
    const { childID, gender, interests, languageLevel, childAge, historyMsgs } = generatePromptSchema.parse(req.body);
    console.log(`[API_PERF] 参数解析与验证耗时: ${Date.now() - parseStart}ms`);
    
    console.log(`生成prompt请求: 儿童ID=${childID}, 语言级别=${languageLevel}`);
    
    // 使用全局服务实例
    const serviceStart = Date.now();
    const { memoryService, knowledgeBaseService, planningAgent } = await initGlobalServices();
    console.log(`[API_PERF] 服务初始化耗时: ${Date.now() - serviceStart}ms`);
    
    // 创建儿童档案
    const profileStart = Date.now();
    const childProfile = {
      ...createDefaultChildProfile(childID),
      id: childID,
      name: childID, // 使用ID作为名称
      gender,
      interests,
      languageLevel: languageLevel.toUpperCase(),
      age: childAge,
    };
    console.log(`[API_PERF] 创建儿童档案耗时: ${Date.now() - profileStart}ms`);
    
    // 转换历史消息格式
    const historyStart = Date.now();
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
    console.log(`[API_PERF] 转换历史消息耗时: ${Date.now() - historyStart}ms`);
    
    // 获取最后一条儿童消息作为输入
    const lastChildMessage = historyMsgs.length > 0 ? historyMsgs[historyMsgs.length - 1].child : "Hello";
    
    // 将所有历史消息格式化为更适合PlanningAgent处理的格式
    const allChildMessages = historyMsgs.map(msg => msg.child);
    
    // 初始化规划Agent（使用全局实例）
    const initAgentStart = Date.now();
    await planningAgent.init({
      childProfile,
      conversationHistory,
      knowledgeBase: [] // 添加必要的knowledgeBase属性，初始化为空数组
    });
    console.log(`[API_PERF] 初始化规划Agent耗时: ${Date.now() - initAgentStart}ms`);
    
    // 调用规划Agent的process方法生成计划，传递所有历史消息
    const planStart = Date.now();
    const planResult = await planningAgent.process({
      input: allChildMessages.length > 0 ? allChildMessages.join(" ") : lastChildMessage,
      context: {
        childProfile,
        conversationHistory,
        knowledgeBase: [] // 添加必要的knowledgeBase属性
      },
    });
    console.log(`[API_PERF] 生成规划耗时: ${Date.now() - planStart}ms`);
    
    // 解析规划结果
    const parsePlanStart = Date.now();
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
    console.log(`[API_PERF] 解析规划结果耗时: ${Date.now() - parsePlanStart}ms`);
    
    console.log("规划结果:", parsedPlanResult);
    
    // 实现简化版的prompt生成函数
    const generatePrompt = (message: string) => {
      const recentMessages = conversationHistory.slice(-5); // 获取最近5条消息
      const chatHistory = recentMessages
        .map((m) => `${m.type === "user" ? "Child" : "Sparky"}: ${m.content}`)
        .join("\n");

      // 从全局配置获取系统提示词，确保使用正确的儿童年龄
      let systemPrompt = getFullSystemPrompt(childProfile);

      // 添加教学策略
      systemPrompt += `\n\nTeaching strategy for this interaction: ${parsedPlanResult.strategy}\n`;

      // 构建完整的prompt
      const prompt = `
${systemPrompt}


Child: ${message}

Sparky:`;
      
      return prompt;
    };
    
    // 生成最终的prompt
    const promptStart = Date.now();
    const prompt = generatePrompt(lastChildMessage);
    console.log(`[API_PERF] 生成prompt耗时: ${Date.now() - promptStart}ms`);
    
    // 返回标准的JSON响应格式
    const responseStart = Date.now();
    res.json({
      success: true,
      code: 0,
      msg: "提示生成成功",
      data: {
        prompt,
        childID
      },
      timestamp: new Date().toISOString(),
    });
    console.log(`[API_PERF] 发送响应耗时: ${Date.now() - responseStart}ms`);
    
    console.log(`[API_PERF] 请求总耗时: ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error("生成prompt时发生错误:", error);
    
    // 统一的错误处理
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        code: 400,
        msg: "请求参数验证失败",
        error: {
          type: "validation_error",
          message: "请求参数验证失败",
          details: error.errors,
        },
      });
    }
    // 服务器内部错误
    console.error('API请求处理错误:', error);
    return res.status(500).json({
        success: false,
        code: 500,
        msg: "服务器内部错误",
        error: {
          type: "internal_error",
          message: "服务器内部错误",
        },
      });
  }
});

/**
 * 启动HTTP服务器
 */
export const startHttpServer = async () => {
	// 使用不同的端口（3144）以避免与现有服务器冲突
	const port = 3144;

	// 启动服务器
	const server = app.listen(port, () => {
		console.log(
			`TinyBuddy Next.js HTTP服务器已启动在 http://localhost:${port}`,
		);
		console.log("可用API端点:");
		console.log(
			"GET    /api/vocabulary          - 获取儿童词汇表(支持时间区间筛选)",
		);
		console.log(
		"POST   /api/agent/generate-prompt     - 生成prompt内容",
	);
		console.log(
			`示例: http://localhost:${port}/api/vocabulary?childId=test_child&startDate=2023-01-01&endDate=2023-12-31`,
		);
		console.log(
		`示例: POST http://localhost:${port}/api/agent/generate-prompt`,
	);
	});

	// 处理进程终止信号
	const handleShutdown = async () => {
		console.log("正在关闭TinyBuddy HTTP服务器...");
		server.close();
		console.log("TinyBuddy HTTP服务器已成功关闭");
	};

	// 监听进程终止信号
	process.on("SIGINT", handleShutdown);
	process.on("SIGTERM", handleShutdown);

	return server;
};

export default app;
