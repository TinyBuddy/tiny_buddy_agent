import WebSocket from "ws";

/**
 * WebSocket客户端示例
 * 此文件提供了一个简单的WebSocket客户端实现，用于测试与服务器的连接和通信
 */

class AgentWebSocketClient {
	private ws: WebSocket | null = null;
	private url: string;
	private reconnectInterval = 3000;
	private reconnectTimeout: NodeJS.Timeout | null = null;
	private isConnected = false;

	constructor(url = "ws://localhost:3143") {
		this.url = url;
	}

	/**
	 * 连接到WebSocket服务器
	 */
	connect(): void {
		console.log(`正在连接到WebSocket服务器: ${this.url}`);

		try {
			this.ws = new WebSocket(this.url);

			this.ws.on("open", () => {
				console.log("WebSocket连接成功");
				this.isConnected = true;

				// 如果有重连超时，清除它
				if (this.reconnectTimeout) {
					clearTimeout(this.reconnectTimeout);
					this.reconnectTimeout = null;
				}

				// 发送初始化消息
				this.initialize();
			});

			this.ws.on("message", (data: WebSocket.Data) => {
				this.handleMessage(data);
			});

			this.ws.on("close", (code: number, reason: Buffer) => {
				console.log(`WebSocket连接关闭: ${code} - ${reason.toString()}`);
				this.isConnected = false;

				// 自动重连
				this.scheduleReconnect();
			});

			this.ws.on("error", (error: Error) => {
				console.error("WebSocket错误:", error);
			});
		} catch (error) {
			console.error("连接WebSocket服务器失败:", error);
			this.scheduleReconnect();
		}
	}

	/**
	 * 发送初始化消息
	 */
	private initialize(): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.send({
				type: "initialize",
				childProfileId: "default_child",
			});
		}
	}

	/**
	 * 处理来自服务器的消息
	 */
	private handleMessage(data: WebSocket.Data): void {
		try {
			const message = JSON.parse(data.toString());

			console.log("收到消息:", message);

			switch (message.type) {
				case "connected":
					console.log(`已连接到服务器，连接ID: ${message.connectionId}`);
					break;

				case "initialized":
					console.log("初始化成功，儿童档案:", message.childProfile.name);
					// 初始化成功后，可以检查连接状态
					this.checkConnection();
					break;

				case "processing":
					console.log("处理中:", message.message);
					break;

				case "progress":
					console.log("进度更新:", message.content);
					break;

				case "final_response":
					console.log("最终响应:", message.content);
					break;

				case "error":
					console.error("错误:", message.message);
					break;

				case "connection_status":
					console.log(
						"DeepSeek连接状态:",
						message.connected ? "连接成功" : "连接失败",
					);
					console.log("连接状态详情:", message.message);
					break;

				case "pong":
					console.log("收到pong响应");
					break;

				default:
					console.log("未知消息类型:", message.type);
			}
		} catch (error) {
			console.error("解析消息时出错:", error);
			console.log("原始消息:", data.toString());
		}
	}

	/**
	 * 发送消息到服务器
	 */
	send(message: Record<string, unknown>): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			const messageStr = JSON.stringify(message);
			console.log(
				`发送消息: ${messageStr.substring(0, 100)}${messageStr.length > 100 ? "..." : ""}`,
			);
			this.ws.send(messageStr);
		} else {
			console.warn("WebSocket未连接，无法发送消息");
		}
	}

	/**
	 * 发送用户输入
	 */
	sendUserInput(userInput: string, childProfileId = "default_child"): void {
		this.send({
			type: "user_input",
			userInput,
			childProfileId,
		});
	}

	/**
	 * 检查DeepSeek连接状态
	 */
	checkConnection(): void {
		this.send({
			type: "check_connection",
		});
	}

	/**
	 * 发送ping消息
	 */
	ping(): void {
		this.send({
			type: "ping",
		});
	}

	/**
	 * 安排重连
	 */
	private scheduleReconnect(): void {
		if (!this.reconnectTimeout) {
			console.log(`将在${this.reconnectInterval}ms后尝试重新连接...`);
			this.reconnectTimeout = setTimeout(() => {
				this.reconnectTimeout = null;
				this.connect();
			}, this.reconnectInterval);
		}
	}

	/**
	 * 断开连接
	 */
	disconnect(): void {
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}

		this.isConnected = false;
		console.log("WebSocket连接已断开");
	}

	/**
	 * 获取连接状态
	 */
	isConnectedToServer(): boolean {
		return this.isConnected;
	}
}

// 示例使用方法
function runExample() {
	// 创建客户端实例
	const client = new AgentWebSocketClient();

	// 连接到服务器
	client.connect();

	// 注册键盘输入处理
	process.stdin.on("data", (data) => {
		const input = data.toString().trim();

		if (input === "exit") {
			client.disconnect();
			process.exit(0);
		} else if (input === "ping") {
			client.ping();
		} else if (input === "check") {
			client.checkConnection();
		} else if (input) {
			// 发送用户输入
			client.sendUserInput(input);
		}
	});

	console.log("WebSocket客户端已启动");
	console.log("输入消息发送给服务器，或输入以下命令:");
	console.log("  exit  - 退出客户端");
	console.log("  ping  - 发送ping消息");
	console.log("  check - 检查DeepSeek连接状态");
}

// 如果直接运行此文件，则执行示例
if (require.main === module) {
	runExample();
}

export { AgentWebSocketClient };
