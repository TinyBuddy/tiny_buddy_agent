// 简单的WebSocket测试服务器
const http = require('http');
const WebSocket = require('ws');

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket测试服务器正在运行\n');
});

// 创建WebSocket服务器
const wss = new WebSocket.Server({ server });

// 处理连接
wss.on('connection', (ws) => {
    console.log('新的WebSocket连接已建立');
    
    // 发送欢迎消息
    ws.send('欢迎连接到WebSocket测试服务器！');
    
    // 处理消息
    ws.on('message', (message) => {
        console.log('收到消息:', message.toString());
        // 回显消息
        ws.send(`服务器收到: ${message.toString()}`);
    });
    
    // 处理断开连接
    ws.on('close', () => {
        console.log('WebSocket连接已关闭');
    });
    
    // 处理错误
    ws.on('error', (error) => {
        console.error('WebSocket错误:', error);
    });
});

// 启动服务器
const PORT = 8081;
server.listen(PORT, () => {
    console.log(`HTTP和WebSocket测试服务器运行在 http://localhost:${PORT}`);
    console.log(`WebSocket端点: ws://localhost:${PORT}`);
    console.log('\n要测试代理功能:');
    console.log('- 通过Nginx代理访问:  http://localhost:8080/proxy');
    console.log('- 通过Nginx代理连接WebSocket:  ws://localhost:8080/proxy');
});

// 创建package.json文件以安装依赖
/*
{
  "name": "websocket-test-server",
  "version": "1.0.0",
  "description": "简单的WebSocket测试服务器",
  "main": "websocket_test_server.js",
  "scripts": {
    "start": "node websocket_test_server.js"
  },
  "dependencies": {
    "ws": "^8.18.0"
  }
}
*/