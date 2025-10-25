import { serve } from "@hono/node-server";
import { config } from "dotenv";
import { and, eq, gte, lte } from "drizzle-orm";
// API服务器实现
import { Hono } from "hono";
import { z } from "zod";
import app from "../app";
import { db } from "../db/db";
import { vocabulary } from "../db/schema";
import type { InMemoryMemoryService } from "../services/memoryService";
import { mem0Service, type UpdateImportantMemoriesRequest } from "../services/mem0Service";

// 加载环境变量
config();

// 创建API应用实例
const apiApp = new Hono();

// 定义请求验证模式
const chatRequestSchema = z.object({
	childId: z.string().optional(),
	message: z.string().min(1),
});

// 创建默认儿童ID（与app.ts保持一致）
const DEFAULT_CHILD_ID = "default_child";

// API端点定义

// 1. 健康检查端点
apiApp.get("/api/health", (c) => {
	return c.json({
		status: "ok",
		version: "0.1.0",
		timestamp: new Date().toISOString(),
	});
});

// 2. 处理聊天消息端点（流式响应版本）
apiApp.post("/api/chat", async (c) => {
	try {
		// 验证请求体
		const requestBody = await c.req.json();
		const { childId = DEFAULT_CHILD_ID, message } =
			chatRequestSchema.parse(requestBody);

		console.log(`接收到来自儿童 ${childId} 的消息: ${message}`);

		// 设置流式响应的头部
		c.header("Content-Type", "text/event-stream");
		c.header("Cache-Control", "no-cache");
		c.header("Connection", "keep-alive");

		// 创建可写流
		const stream = new ReadableStream({
			async start(controller) {
				// 定义回调函数来处理流式输出
				const onProgress = (content: string) => {
					try {
						// 将内容作为事件流格式发送
						const data = JSON.stringify({
							success: true,
							data: {
								message: content,
								childId,
								timestamp: new Date().toISOString(),
							},
						});
						controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));

						// 响应完成后关闭流
						controller.close();
					} catch (error) {
						console.error("流式输出时出错:", error);
						controller.error(error);
					}
				};

				try {
					// 使用流式处理方法
					await app.processUserInputWithStreaming(childId, message, onProgress);
				} catch (error) {
					console.error("处理用户输入时出错:", error);
					const errorData = JSON.stringify({
						success: false,
						error: "服务器内部错误",
						timestamp: new Date().toISOString(),
					});
					controller.enqueue(
						new TextEncoder().encode(`data: ${errorData}\n\n`),
					);
					controller.close();
				}
			},
		});

		// 返回流式响应
		return c.body(stream);
	} catch (error) {
		console.error("处理聊天请求时出错:", error);

		if (error instanceof z.ZodError) {
			return c.json(
				{
					success: false,
					error: "请求格式错误",
					details: error.errors,
				},
				400,
			);
		}

		return c.json(
			{
				success: false,
				error: "服务器内部错误",
			},
			500,
		);
	}
});

// 3. 获取对话历史端点
apiApp.get("/api/history/:childId?", async (c) => {
	try {
		const childId = c.req.param("childId") || DEFAULT_CHILD_ID;

		console.log(`获取儿童 ${childId} 的对话历史`);

		const history = await app.getConversationHistory(childId);

		return c.json({
			success: true,
			data: {
				history,
				childId,
				totalMessages: history.length,
			},
		});
	} catch (error) {
		console.error("获取对话历史时出错:", error);
		return c.json(
			{
				success: false,
				error: "服务器内部错误",
			},
			500,
		);
	}
});

// 4. 清空对话历史端点
apiApp.post("/api/clear-history/:childId?", async (c) => {
	try {
		const childId = c.req.param("childId") || DEFAULT_CHILD_ID;

		console.log(`清空儿童 ${childId} 的对话历史`);

		await app.memoryService.clearConversationHistory(childId);

		return c.json({
			success: true,
			message: "对话历史已清空",
			childId,
		});
	} catch (error) {
		console.error("清空对话历史时出错:", error);
		return c.json(
			{
				success: false,
				error: "服务器内部错误",
			},
			500,
		);
	}
});

// 5. 获取儿童档案端点
apiApp.get("/api/profile/:childId?", async (c) => {
	try {
		const childId = c.req.param("childId") || DEFAULT_CHILD_ID;

		console.log(`获取儿童 ${childId} 的档案信息`);

		const profile = await app.getChildProfile(childId);

		return c.json({
			success: true,
			data: {
				profile,
				childId,
			},
		});
	} catch (error) {
		console.error("获取儿童档案时出错:", error);
		return c.json(
			{
				success: false,
				error: "服务器内部错误",
			},
			500,
		);
	}
});

// 6. 更新儿童档案端点
apiApp.post("/api/profile/:childId?", async (c) => {
	try {
		const childId = c.req.param("childId") || DEFAULT_CHILD_ID;
		const profileData = await c.req.json();

		console.log(`更新儿童 ${childId} 的档案信息`);

		const updatedProfile = await app.updateChildProfile(childId, profileData);

		return c.json({
			success: true,
			data: {
				profile: updatedProfile,
				childId,
			},
		});
	} catch (error) {
		console.error("更新儿童档案时出错:", error);
		return c.json(
			{
				success: false,
				error: "服务器内部错误",
			},
			500,
		);
	}
});

// 7. 分析儿童兴趣端点
apiApp.get("/api/interests/:childId?", async (c) => {
	try {
		const childId = c.req.param("childId") || DEFAULT_CHILD_ID;

		console.log(`分析儿童 ${childId} 的兴趣爱好`);

		const interests = await app.analyzeChildInterests(childId);

		return c.json({
			success: true,
			data: {
				interests,
				childId,
			},
		});
	} catch (error) {
		console.error("分析儿童兴趣时出错:", error);
		return c.json(
			{
				success: false,
				error: "服务器内部错误",
			},
			500,
		);
	}
});

// 8. 更新儿童重要记忆端点（供第三方系统调用）
apiApp.post("/api/important-memories", async (c) => {
  try {
    // 验证请求体
    const requestBody = await c.req.json();
    
    // 确保必要的字段存在
    if (!requestBody.child_id || !Array.isArray(requestBody.chat_history)) {
      return c.json(
        {
          success: false,
          error: "Parameter validation failed",
          details: [
            { message: "child_id and chat_history are required parameters" }
          ],
        },
        400,
      );
    }

    console.log(`更新儿童 ${requestBody.child_id} 的重要记忆`);

    // 调用mem0服务更新重要记忆
    const result = await mem0Service.updateImportantMemories({
      child_id: requestBody.child_id,
      chat_history: requestBody.chat_history
    });

    return c.json({
      success: result.success,
      message: result.message,
      data: {
        important_info: result.important_info,
        stored_memory: result.stored_memory
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error processing important memories update request:", error);
    return c.json(
      {
        success: false,
        error: "Internal server error",
      },
      500,
    );
  }
});

// 9. 获取词汇表端点（支持时间区间筛选）
apiApp.get("/api/vocabulary", async (c) => {
	try {
		// 获取查询参数
		const childId = c.req.query("childId");
		const startDate = c.req.query("startDate");
		const endDate = c.req.query("endDate");

		// 验证必要的参数
		if (!childId) {
			return c.json(
				{
					success: false,
					error: "参数验证失败",
					details: [{ message: "childId是必需的参数" }],
				},
				400,
			);
		}

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
		return c.json({
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
		return c.json(
			{
				success: false,
				error: "服务器内部错误",
			},
			500,
		);
	}
});

// 10. mem0相关接口 - 已迁移到 /api/important-memories 端点

// 启动服务器函数
export const startServer = async () => {
	// 定义服务器端口，默认使用3142
	const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3142;

	// 启动服务器
	const server = serve({
		fetch: apiApp.fetch,
		port,
	});

	console.log(`TinyBuddy API服务器已启动在 http://localhost:${port}`);
	console.log("可用API端点:");
	console.log("GET    /api/health              - 健康检查");
	console.log("POST   /api/chat                - 发送聊天消息");
	console.log("GET    /api/history/:childId?   - 获取对话历史");
	console.log("POST   /api/clear-history/:childId? - 清空对话历史");
	console.log("GET    /api/profile/:childId?   - 获取儿童档案");
	console.log("POST   /api/profile/:childId?   - 更新儿童档案");
	console.log("GET    /api/interests/:childId? - 分析儿童兴趣");
	console.log(
		"GET    /api/vocabulary          - 获取儿童词汇表(支持时间区间筛选)",
	);
	// mem0相关接口（已整合到/api/important-memories）

	// 处理进程终止信号
	const handleShutdown = async () => {
		console.log("正在关闭TinyBuddy API服务器...");
		server.close();
		await app.shutdown();
		console.log("TinyBuddy API服务器已成功关闭");
		process.exit(0);
	};

	// 监听进程终止信号
	process.on("SIGINT", handleShutdown);
	process.on("SIGTERM", handleShutdown);

	return server;
};

// 如果是直接运行此文件，则启动服务器
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default apiApp;
