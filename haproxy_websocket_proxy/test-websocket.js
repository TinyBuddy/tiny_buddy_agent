// WebSocket测试脚本 - 测试HAProxy代理功能

import WebSocket from 'ws';

// 连接到HAProxy代理
const wsUrl = 'ws://localhost:8081';

// 认证数据 - 与之前测试使用的相同
const authData = {
  "authToken": "9b4f328f-c427-424c-a549-09674f41af28",
  "deviceId": "94a99031b91c",
  "version": "1.7.7"
};

console.log('正在连接到HAProxy代理:', wsUrl);

const ws = new WebSocket(wsUrl);

// 连接打开事件
ws.on('open', () => {
  console.log('✅ 成功连接到HAProxy代理');
  console.log('发送认证数据...');
  ws.send(JSON.stringify(authData));
});

// 接收消息事件
ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('✅ 接收到返回消息:');
    console.log(JSON.stringify(message, null, 2));
  } catch (error) {
    console.log('接收到原始消息:', data.toString());
  }
});

// 连接关闭事件
ws.on('close', (code, reason) => {
  console.log(`❌ 连接关闭，代码: ${code}, 原因: ${reason}`);
});

// 错误事件
ws.on('error', (error) => {
  console.error('❌ WebSocket错误:', error);
});

// 10秒后关闭连接
setTimeout(() => {
  console.log('10秒后关闭连接');
  ws.close();
}, 10000);