import { deepseek } from "@ai-sdk/deepseek";
// TinyBuddy应用入口
import { config } from "dotenv";
import app, { TinyBuddyApp } from "./app";
import TinyBuddySDK, { createTinyBuddySDK } from "./sdk";
import type { ChildProfile } from "./models/childProfile";
import type { Message } from "./models/message";
import type { KnowledgeContent } from "./models/content";

// 加载环境变量
config();

// 调试日志
if (process.env.NODE_ENV !== "production") {
	console.log("Node.js 版本:", process.version);
	console.log("环境变量 NODE_ENV:", process.env.NODE_ENV);
	console.log("环境变量 DEVELOPMENT_MODE:", process.env.DEVELOPMENT_MODE);
}

// 导出SDK和核心类型，方便第三方项目集成
export {
	app,
	TinyBuddyApp,
	TinyBuddySDK,
	createTinyBuddySDK
};

export type {
	ChildProfile,
	Message,
	KnowledgeContent
};

// 启动应用（仅作为独立运行时使用）
async function startApplication() {
	try {
		console.log("开始启动TinyBuddy应用...");

		// 初始化主应用
		await app.init();

		// 启动HTTP API服务器
		let apiServer = null;
		let webSocketServerInstance = null;

		try {
			console.log("尝试导入并启动HTTP API服务器...");
			// 延迟导入以避免循环依赖
			const { startServer } = await import('./api/server');
			console.log("成功导入HTTP API服务器模块");

			// 启动HTTP API服务器
			console.log("开始启动HTTP API服务器...");
			apiServer = await startServer();
			console.log("HTTP API服务器启动成功");

			console.log("尝试导入并启动WebSocket服务器...");
			// 延迟导入以避免循环依赖
			const { startWebSocketServer } = await import('./api/webSocketServer');
			console.log("成功导入WebSocket服务器模块");

			// 启动WebSocket服务器
			console.log("开始启动WebSocket服务器...");
			webSocketServerInstance = await startWebSocketServer();
			console.log("WebSocket服务器启动成功");
		} catch (serverError) {
			console.error("服务器启动失败:", serverError);
			console.error("错误详情:", serverError.stack);
		}

		console.log("=== TinyBuddy应用已成功启动 ===");
		console.log("功能访问信息:");
		console.log("- SDK已准备就绪，可以通过导入使用");
		console.log("- Console UI: 请在另一个终端执行 'npm run volt' 启动");
		console.log("- HTTP API: http://localhost:3142/api");
		console.log("- WebSocket: ws://localhost:3143");
		console.log("=================================");

		// 处理进程终止信号
		const handleShutdown = async () => {
			console.log("正在关闭TinyBuddy应用...");

			try {
				// 关闭WebSocket服务器
				if (webSocketServerInstance) {
					const { stopWebSocketServer } = await import('./api/webSocketServer');
					await stopWebSocketServer();
				}

				// 关闭HTTP API服务器
				if (apiServer) {
					await new Promise((resolve) => apiServer.close(resolve));
				}

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
			await app.shutdown();
		} catch (cleanupError) {
			console.error("清理资源时出错:", cleanupError);
		}

		process.exit(1);
	}
}

// 如果作为主程序运行，则启动应用
if (import.meta.url.endsWith(process.argv[1])) {
	startApplication();
}
