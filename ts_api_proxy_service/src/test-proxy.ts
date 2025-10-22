import fetch from "node-fetch";

/**
 * 测试代理服务器的脚本
 * 用于验证代理服务是否能正确处理请求并避免返回302重定向
 */
async function testProxyServer() {
  const proxyBaseUrl = "http://localhost:3000/api/proxy";
  const testPaths = [
    "/api/devices/94a99031b91c/check-upgrade", // 用户指定的测试路径
    "/api/devices/94a99031b91c", // 额外的测试路径
  ];

  console.log("开始测试TypeScript API代理服务器...\n");

  for (const path of testPaths) {
    const proxyUrl = `${proxyBaseUrl}${path}`;
    console.log(`测试路径: ${path}`);
    console.log(`代理URL: ${proxyUrl}`);

    try {
      // 记录请求开始时间
      const startTime = Date.now();

      // 发送请求到代理服务器
      const response = await fetch(proxyUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Proxy-Test-Script/1.0",
        },
      });

      // 计算请求耗时
      const requestTime = Date.now() - startTime;

      // 输出响应信息
      console.log(`响应状态码: ${response.status}`);
      console.log(`响应耗时: ${requestTime}ms`);

      // 输出响应头
      console.log("响应头:");
      response.headers.forEach((value, key) => {
        console.log(`  ${key}: ${value}`);
      });

      // 尝试解析响应体
      try {
        const data = await response.json();
        console.log("响应体 (JSON):");
        console.log(JSON.stringify(data, null, 2));
      } catch (jsonError) {
        // 如果不是JSON，获取原始文本
        const text = await response.text();
        console.log("响应体 (Text):");
        console.log(
          text.length > 1000 ? text.substring(0, 1000) + "..." : text,
        );
      }
    } catch (error) {
      console.error(
        "请求失败:",
        error instanceof Error ? error.message : String(error),
      );
    }

    console.log("----------------------------------------\n");
  }

  console.log("测试完成！");
}

// 使用ES模块方式检查是否直接运行脚本
if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  testProxyServer().catch((err) => {
    console.error("测试脚本执行失败:", err);
    process.exit(1);
  });
}
