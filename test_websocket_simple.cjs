const WebSocket = require('ws');

console.log('开始测试WebSocket连接...');

// 创建WebSocket连接
const ws = new WebSocket('ws://localhost:3143');

ws.on('open', function open() {
  console.log('✓ WebSocket连接已成功建立');
  ws.close();
});

ws.on('error', function error(err) {
  console.error('✗ WebSocket连接错误:', err.message);
});

ws.on('close', function close() {
  console.log('WebSocket连接已关闭');
});

// 设置超时
setTimeout(() => {
  if (ws.readyState === WebSocket.CONNECTING) {
    console.log('连接超时');
    ws.terminate();
  }
}, 5000);