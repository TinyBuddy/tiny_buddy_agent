import WebSocket from "ws";

// 代理服务器的WebSocket地址
const proxyWsUrl = "ws://localhost:8899/ws/proxy/hardware";

console.log(`连接到WebSocket代理服务器: ${proxyWsUrl}`);

// 创建WebSocket连接
const ws = new WebSocket(proxyWsUrl);

// 连接建立时的处理
ws.on("open", () => {
  console.log("WebSocket连接已成功建立");

  // 发送测试消息到服务器
  try {
    const testMessage = JSON.stringify({
      test: "Hello from proxy test client",
    });
    ws.send(testMessage);
    console.log("已发送测试消息到代理服务器");
  } catch (error) {
    console.error("发送测试消息失败:", error);
  }
});

// 接收消息时的处理
ws.on("message", (data) => {
  console.log("收到来自服务器的消息:");
  try {
    // 尝试将数据解析为JSON
    const message = JSON.parse(data.toString());
    console.log(JSON.stringify(message, null, 2));
  } catch (e) {
    // 如果解析失败，直接输出原始数据
    console.log(data.toString());
  }
});

// 连接关闭时的处理
ws.on("close", (code, reason) => {
  console.log(`WebSocket连接已关闭: 代码=${code}, 原因=${reason}`);
});

// 错误处理
ws.on("error", (error) => {
  console.error("WebSocket错误:", error);
});

// 10秒后自动关闭连接（如果需要的话）
setTimeout(() => {
  console.log("10秒后关闭连接");
  ws.close();
}, 10000);
