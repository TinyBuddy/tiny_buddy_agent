import { openai } from "@ai-sdk/openai";
import { honoServer } from "@voltagent/server-hono";

import { Agent, VoltAgent } from "@voltagent/core";
import { config } from "dotenv";
import {
	startWebSocketServer,
	stopWebSocketServer,
} from "./api/webSocketServer";
// 应用入口文件
import app from "./app";

// 加载环境变量
config();

// 调试日志
console.log("Node.js 版本:", process.version);
console.log("环境变量 NODE_ENV:", process.env.NODE_ENV);
console.log("环境变量 DEVELOPMENT_MODE:", process.env.DEVELOPMENT_MODE);
console.log("应用入口文件已加载");

// 创建标准Agent实例
const agent = new Agent({
	name: "tiny-buddy-agent",
	instructions:
		"你是一个为4-7岁儿童设计的智能助手，友好、耐心，会以适合儿童的方式回答问题。",
	model: openai(process.env.OPENAI_MODEL || "gpt-4.1"),
});

// 创建多Agent系统实例，使用app中的planning/execution功能
const multiAgent = new Agent({
	name: "tiny-buddy-multi-agent",
	instructions: `你是TinyBuddy的多Agent系统助手，专为4-7岁儿童设计。使用planning/execution多Agent系统处理用户问题，并始终以适合儿童的语言风格回应。

无论何时处理用户输入，你都必须使用processUserInput工具。这个工具会调用app中的planning/execution多Agent系统来生成响应。

你必须始终返回这个工具调用的结果作为最终回答。

如果工具调用失败，你应该返回一个友好的默认响应。`,
	model: openai(process.env.OPENAI_MODEL || "gpt-4.1"),
	// 简化实现，直接使用app中的processUserInput处理输入
	tools: [
		{
			id: "process-user-input-tool",
			name: "processUserInput",
			description: "使用app中的planning/execution多Agent系统处理用户输入",
			parameters: {
				type: "object",
				properties: {
					userInput: {
						type: "string",
						description: "用户的输入内容",
					},
				},
				required: ["userInput"],
			},
			execute: async (params: { userInput: string }) => {
				try {
					console.log("调用processUserInput工具，参数:", params);
					const response = await app.processUserInput(
						"default_child",
						params.userInput,
					);
					console.log("processUserInput工具返回结果:", response);
					// 确保返回的输出不为空
					if (!response || response.trim() === "") {
						return { output: "抱歉，我现在无法处理您的请求，请稍后再试" };
					}
					return { output: response };
				} catch (error) {
					console.error("使用planning/execution系统处理输入时出错:", error);
					return { output: "抱歉，多Agent系统现在遇到了一些问题，请稍后再试" };
				}
			},
		},
	],
});

// 启动应用和服务器
async function startApplication() {
	try {
		console.log("开始启动TinyBuddy应用...");

		// 初始化主应用
		await app.init();

		// 启动WebSocket服务器（使用默认端口3143）
		const webSocketServer = await startWebSocketServer();

		// 初始化VoltAgent，配置端口3141作为VoltAgent远程控制台
		const voltAgentServer = new VoltAgent({
			agents: {
				agent, // 标准Agent
				multiAgent, // 多Agent系统（planning/execution）
			},
			server: honoServer({
				port: 3141,
			}),
		});

		console.log("VoltAgent远程控制台已启动，端口3141");
		console.log("可用Agent列表：");
		console.log("  - tiny-buddy-agent: 标准智能助手");
		console.log(
			"  - tiny-buddy-multi-agent: 使用planning/execution多Agent系统的助手",
		);

		console.log("=== TinyBuddy应用已成功启动 ===");
		console.log("服务端口配置:");
		console.log("  - Console UI:       http://localhost:3141");
		console.log("  - WebSocket Server: ws://localhost:3143");
		console.log("=================================");

		// 处理进程终止信号
		const handleShutdown = async () => {
			console.log("正在关闭TinyBuddy应用...");

			try {
				// 停止WebSocket服务器
				await stopWebSocketServer();

				// 关闭主应用
				await app.shutdown();

				console.log("TinyBuddy应用已成功关闭");
				process.exit(0);
			} catch (error) {
				console.error("关闭应用时出错:", error);
				process.exit(1);
			}
		};

		// 监听进程终止信号
		process.on("SIGINT", handleShutdown);
		process.on("SIGTERM", handleShutdown);
	} catch (error) {
		console.error("应用启动失败:", error);

		// 尝试清理资源
		try {
			await stopWebSocketServer();
			await app.shutdown();
		} catch (cleanupError) {
			console.error("清理资源时出错:", cleanupError);
		}

		process.exit(1);
	}
}

// 导出应用实例
export { app };

// 直接启动应用
startApplication();
