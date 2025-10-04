import WebSocket from 'ws';

// 连接到HAProxy代理 - 使用与配置相同的端口
const wsUrl = 'ws://localhost:8081';

// 认证数据 - 与之前测试使用的相同
const authData = {
  "authToken": "9b4f328f-c427-424c-a549-09674f41af28",
  "deviceId": "94a99031b91c",
  "version": "1.7.7"
};

console.log('正在连接到HAProxy代理:', wsUrl);
console.log('目标后端服务器:', 'wss://stg.tinybuddy.dev/hardware');

const ws = new WebSocket(wsUrl);

// 连接打开事件
ws.on('open', () => {
  console.log('✅ 成功连接到HAProxy代理');
  console.log('发送认证数据...');
  ws.send(JSON.stringify(authData));
});

// 接收消息事件 - 专门检测success字段
ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('✅ 接收到后端服务器返回的消息:');
    console.log(JSON.stringify(message, null, 2));
    
    // 检查是否包含success字段
    if (message.success === true) {
      console.log('✅ 成功接收到success响应！');
    } else {
      console.log('ℹ️  接收到的消息不包含success:true');
    }
  } catch (error) {
    console.log('接收到原始消息:', data.toString());
  }
});

// 连接关闭事件
ws.on('close', (code, reason) => {
  console.log(`❌ 连接关闭，代码: ${code}, 原因: ${reason || '无原因'}`);
  // 常见的WebSocket关闭代码含义
  if (code === 1005) console.log('  提示: 1005代码通常表示正常关闭但无状态码');
  if (code === 1006) console.log('  提示: 1006代码通常表示连接意外关闭');
  if (code === 1011) console.log('  提示: 1011代码通常表示服务器遇到错误');
});

// 错误事件 - 更详细地记录连接错误
ws.on('error', (error) => {
  console.error('❌ WebSocket错误:', error.message);
  // 尝试解析常见错误类型
  if (error.code === 'ECONNREFUSED') {
    console.error('  错误提示: HAProxy服务可能未启动或端口未开放');
  } else if (error.message.includes('SSL')) {
    console.error('  错误提示: 可能是SSL/TLS连接问题');
  }
});

// 10秒后关闭连接
setTimeout(() => {
  console.log('10秒后关闭连接');
  ws.close();
}, 10000);