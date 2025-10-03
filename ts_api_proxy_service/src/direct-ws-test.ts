import WebSocket from "ws";

// 直接连接到目标WebSocket服务器
try {
  console.log(
    "正在直接连接到目标WebSocket服务器: wss://stg.tinybuddy.dev/hardware",
  );

  const ws = new WebSocket("wss://stg.tinybuddy.dev/hardware", {
    headers: {
      "User-Agent": "Direct-WS-Test/1.0",
    },
  });

  ws.on("open", () => {
    console.log("✅ 直接连接成功建立！");
    // 发送一个简单的测试消息
    try {
      ws.send(JSON.stringify({ test: "Hello from direct test" }));
      console.log("测试消息已发送");
    } catch (error) {
      console.error("发送测试消息失败:", error);
    }
  });

  ws.on("message", (data) => {
    console.log("✅ 收到来自目标服务器的消息:");
    try {
      const message = JSON.parse(data.toString());
      console.log(JSON.stringify(message, null, 2));
    } catch (e) {
      console.log(data.toString());
    }
  });

  ws.on("close", (code, reason) => {
    console.log(`❌ WebSocket连接已关闭: 代码=${code}, 原因=${reason}`);
  });

  ws.on("error", (error) => {
    console.error("❌ WebSocket连接错误:", error);
  });

  // 10秒后关闭连接
  setTimeout(() => {
    console.log("10秒后关闭连接");
    ws.close();
  }, 10000);
} catch (error) {
  console.error("❌ 连接初始化失败:", error);
}
