import WebSocket, { WebSocketServer } from "ws";
import app from "../app";
import { updateSystemPromptTemplate } from "../config/agentConfig";
import type { ChildProfile } from "../models/childProfile";
import { createDefaultChildProfile } from "../models/childProfile";

// WebSocket连接管理器
class WebSocketConnectionManager {
	private connections: Map<string, WebSocket> = new Map();
	private nextId = 1;

	addConnection(ws: WebSocket): string {
		const id = `conn_${this.nextId++}`;
		this.connections.set(id, ws);
		console.log(
			`WebSocket连接已建立: ${id}, 当前连接数: ${this.connections.size}`,
		);

		// 当连接关闭时移除
		ws.on("close", () => {
			this.connections.delete(id);
			console.log(
				`WebSocket连接已关闭: ${id}, 当前连接数: ${this.connections.size}`,
			);
		});

		return id;
	}

	getConnection(id: string): WebSocket | undefined {
		return this.connections.get(id);
	}

	broadcast(message: string) {
		for (const ws of this.connections.values()) {
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(message);
			}
		}
	}

	getConnectionCount(): number {
		return this.connections.size;
	}
}

// WebSocket消息处理器
class WebSocketMessageHandler {
	private connectionManager: WebSocketConnectionManager;

	constructor(connectionManager: WebSocketConnectionManager) {
		this.connectionManager = connectionManager;
	}

	async handleMessage(
		ws: WebSocket,
		message: string,
		connectionId: string,
	): Promise<void> {
		try {
			// 解析消息
			const parsedMessage = JSON.parse(message);

			switch (parsedMessage.type) {
				case "user_input":
					await this.handleUserInput(ws, parsedMessage, connectionId);
					break;
				case "ping":
					ws.send(JSON.stringify({ type: "pong" }));
					break;
				case "initialize":
					await this.handleInitialize(ws, parsedMessage);
					break;
				case "check_connection":
					await this.handleConnectionCheck(ws);
					break;
				case "update_prompt":
					await this.handleUpdatePrompt(ws, parsedMessage);
					break;
				default:
					console.warn(`未知的消息类型: ${parsedMessage.type}`);
					ws.send(
						JSON.stringify({
							type: "error",
							message: `未知的消息类型: ${parsedMessage.type}`,
						}),
					);
			}
		} catch (error) {
			console.error("处理WebSocket消息时出错:", error);
			ws.send(
				JSON.stringify({
					type: "error",
					message: `处理消息时出错: ${error instanceof Error ? error.message : "未知错误"}`,
				}),
			);
		}
	}

	private async handleInitialize(
		ws: WebSocket,
		message: { type: string; childProfileId?: string },
	): Promise<void> {
		try {
			// 初始化儿童档案
			const childProfileId = message.childProfileId || "default_child";

			// 检查是否需要创建新的儿童档案
			let childProfile: ChildProfile;
			try {
				childProfile = await app.getChildProfile(childProfileId);
			} catch {
				// 如果不存在，创建默认档案
				childProfile = createDefaultChildProfile(childProfileId);
				await app.updateChildProfile(childProfileId, childProfile);
			}

			// 返回初始化成功消息
			ws.send(
				JSON.stringify({
					type: "initialized",
					childProfile,
					message: "初始化成功",
				}),
			);
		} catch (error) {
			console.error("初始化失败:", error);
			ws.send(
				JSON.stringify({
					type: "error",
					message: `初始化失败: ${error instanceof Error ? error.message : "未知错误"}`,
				}),
			);
		}
	}

	private async handleUserInput(
		ws: WebSocket,
		message: { type: string; userInput?: string; childProfileId?: string },
		connectionId: string,
	): Promise<void> {
		const { userInput, childProfileId = "default_child" } = message;

		if (!userInput) {
			ws.send(
				JSON.stringify({
					type: "error",
					message: "用户输入不能为空",
				}),
			);
			return;
		}

		try {
			// 发送处理中消息
			ws.send(
				JSON.stringify({
					type: "processing",
					message: "正在处理您的请求...",
				}),
			);

			// 使用流式处理方法处理用户输入
			await app.processUserInputWithStreaming(
				childProfileId,
				userInput,
				(
					content: string,
					isFinal: boolean,
					metadata?: Record<string, unknown>,
				) => {
					if (ws.readyState === WebSocket.OPEN) {
						// 如果有提示词元数据，创建专门的提示词消息
						if (metadata?.prompt && !isFinal) {
							ws.send(
								JSON.stringify({
									type: "prompt",
									content: metadata.prompt,
									timestamp: new Date().toISOString(),
								}),
							);
						}

						// 发送正常的进度或最终响应消息
						ws.send(
							JSON.stringify({
								type: isFinal ? "final_response" : "progress",
								content,
								isFinal,
								timestamp: new Date().toISOString(),
							}),
						);
					}
				},
				(error: Error) => {
					if (ws.readyState === WebSocket.OPEN) {
						ws.send(
							JSON.stringify({
								type: "error",
								message: `处理请求时出错: ${error.message}`,
								timestamp: new Date().toISOString(),
							}),
						);
					}
				},
			);
		} catch (error) {
			console.error("处理用户输入时出错:", error);
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(
					JSON.stringify({
						type: "error",
						message: `处理请求时出错: ${error instanceof Error ? error.message : "未知错误"}`,
						timestamp: new Date().toISOString(),
					}),
				);
			}
		}
	}

	private async handleUpdatePrompt(
		ws: WebSocket,
		message: { type: string; prompt?: string },
	): Promise<void> {
		try {
			const { prompt } = message;

			if (prompt === undefined) {
				ws.send(
					JSON.stringify({
						type: "error",
						message: "prompt参数不能为空",
					}),
				);
				return;
			}

			// 更新全局提示词
			updateSystemPromptTemplate(prompt);

			console.log("系统提示词已更新");

			// 返回更新成功消息
			ws.send(
				JSON.stringify({
					type: "prompt_updated",
					message: "系统提示词已成功更新",
					timestamp: new Date().toISOString(),
				}),
			);
		} catch (error) {
			console.error("更新系统提示词时出错:", error);
			ws.send(
				JSON.stringify({
					type: "error",
					message: `更新系统提示词时出错: ${error instanceof Error ? error.message : "未知错误"}`,
				}),
			);
		}
	}

	private async handleConnectionCheck(ws: WebSocket): Promise<void> {
		try {
			// 检查DeepSeek连接状态
			const connectionStatus = await app.checkDeepSeekConnection();

			// 发送连接状态
			ws.send(
				JSON.stringify({
					type: "connection_status",
					...connectionStatus,
					timestamp: new Date().toISOString(),
				}),
			);
		} catch (error) {
			console.error("检查连接状态时出错:", error);
			ws.send(
				JSON.stringify({
					type: "error",
					message: `检查连接状态时出错: ${error instanceof Error ? error.message : "未知错误"}`,
				}),
			);
		}
	}
}

// WebSocket服务器类
class AgentWebSocketServer {
	private wss: WebSocketServer | null = null;
	private connectionManager: WebSocketConnectionManager;
	private messageHandler: WebSocketMessageHandler;
	private port: number;

	constructor(port = 3143) {
		this.port = port;
		this.connectionManager = new WebSocketConnectionManager();
		this.messageHandler = new WebSocketMessageHandler(this.connectionManager);
	}

	async start(): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				// 创建WebSocket服务器
				this.wss = new WebSocketServer({
					port: this.port,
					perMessageDeflate: {
						zlibDeflateOptions: {
							// 优化压缩级别，平衡CPU使用和带宽
							chunkSize: 1024,
							memLevel: 7,
							level: 3,
						},
						zlibInflateOptions: {
							chunkSize: 10 * 1024,
						},
						clientNoContextTakeover: true,
						serverNoContextTakeover: true,
						serverMaxWindowBits: 10,
						concurrencyLimit: 10,
						threshold: 1024,
					},
				});

				// 监听连接
				this.wss.on("connection", (ws) => {
					const connectionId = this.connectionManager.addConnection(ws);

					// 监听消息
					ws.on("message", (message) => {
						const messageStr = message.toString();
						console.log(
							`收到来自 ${connectionId} 的消息: ${messageStr.substring(0, 100)}${messageStr.length > 100 ? "..." : ""}`,
						);
						this.messageHandler.handleMessage(ws, messageStr, connectionId);
					});

					// 监听错误
					ws.on("error", (error) => {
						console.error(`WebSocket连接错误 (${connectionId}):`, error);
					});

					// 发送连接成功消息
					ws.send(
						JSON.stringify({
							type: "connected",
							message: "WebSocket连接成功",
							connectionId,
						}),
					);
				});

				// 监听服务器错误
				this.wss.on("error", (error) => {
					console.error("WebSocket服务器错误:", error);
					reject(error);
				});

				// 监听服务器启动
				this.wss.on("listening", () => {
					console.log(`WebSocket服务器已启动，端口: ${this.port}`);
					console.log("WebSocket服务器等待连接...");
					resolve();
				});
			} catch (error) {
				console.error("启动WebSocket服务器失败:", error);
				reject(error);
			}
		});
	}

	async stop(): Promise<void> {
		if (this.wss) {
			return new Promise((resolve) => {
				this.wss?.close(() => {
					console.log("WebSocket服务器已停止");
					this.wss = null;
					resolve();
				});
			});
		}
	}

	getConnectionCount(): number {
		return this.connectionManager.getConnectionCount();
	}
}

// 导出服务器实例
let webSocketServer: AgentWebSocketServer | null = null;

export async function startWebSocketServer(
	port = 3143,
): Promise<AgentWebSocketServer> {
	if (!webSocketServer) {
		webSocketServer = new AgentWebSocketServer(port);
		await webSocketServer.start();
	}
	return webSocketServer;
}

export function getWebSocketServer(): AgentWebSocketServer | null {
	return webSocketServer;
}

export async function stopWebSocketServer(): Promise<void> {
	if (webSocketServer) {
		await webSocketServer.stop();
		webSocketServer = null;
	}
}
