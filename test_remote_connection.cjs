const WebSocket = require('ws');

// 配置 - 使用修改后的服务器地址
const SERVER_ADDRESS = 'ws://47.250.116.113:3143';
const TEST_DURATION = 10000; // 测试持续时间：10秒

console.log(`正在测试连接到远程服务器: ${SERVER_ADDRESS}`);
console.log('如果连接成功，将在10秒后自动关闭...');

// 创建WebSocket连接
const ws = new WebSocket(SERVER_ADDRESS);

// 连接打开事件
ws.on('open', () => {
  console.log('✓ WebSocket连接已成功建立');
  
  // 发送简单的测试消息
  try {
    const testMessage = {
      type: 'ping',
      timestamp: new Date().toISOString()
    };
    ws.send(JSON.stringify(testMessage));
    console.log('已发送ping测试消息');
  } catch (error) {
    console.error(`发送消息失败: ${error}`);
  }
});

// 消息接收事件
ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log(`✓ 收到服务器响应: ${JSON.stringify(message)}`);
  } catch (error) {
    console.error(`解析消息失败: ${error}`);
  }
});

// 连接关闭事件
ws.on('close', (code, reason) => {
  console.log(`连接已关闭: 代码=${code}, 原因=${reason}`);
  process.exit(code === 1000 ? 0 : 1);
});

// 连接错误事件
ws.on('error', (error) => {
  console.error(`✗ 连接错误: ${error.message}`);
  process.exit(1);
});

// 设置测试超时
setTimeout(() => {
  console.log('测试完成，关闭连接');
  ws.close(1000, '测试完成');
}, TEST_DURATION);