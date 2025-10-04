import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

// 创建HTTP服务器用于处理WebSocket升级
const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Node.js WebSocket代理服务器运行中\n');
});

// 在HTTP服务器上创建WebSocket服务器
const wss = new WebSocketServer({ server: httpServer });

// 监听端口
const PORT = 8081;
httpServer.listen(PORT, () => {
  console.log(`✅ Node.js WebSocket代理服务器已启动，监听端口: ${PORT}`);
  console.log(`🔄 代理将转发请求到模拟服务器: ws://localhost:8082`);
});

// 处理新的WebSocket连接
wss.on('connection', (clientWs, req) => {
  console.log('✅ 客户端已连接到代理服务器，IP:', req.socket.remoteAddress);
  
  // 消息队列，用于存储在后端连接建立前收到的消息
  const messageQueue = [];
  let backendConnected = false;
  
  // 连接到后端模拟服务器
  console.log('🔄 正在连接到后端模拟服务器: ws://localhost:8082');
  const backendWs = new WebSocket('ws://localhost:8082');
  
  // 处理到后端的连接
  backendWs.on('open', () => {
    console.log('✅ 代理已连接到后端服务器');
    backendConnected = true;
    
    // 发送队列中的消息
    if (messageQueue.length > 0) {
      console.log('📤 正在发送队列中的消息，共:', messageQueue.length, '条');
      while (messageQueue.length > 0) {
        const data = messageQueue.shift();
        backendWs.send(data);
        console.log('  已发送队列中的消息，长度:', data.length, '字节');
      }
    }
  });
  
  // 从客户端接收消息并转发到后端
  clientWs.on('message', (data) => {
    console.log('📤 从客户端接收消息，长度:', data.length, '字节');
    if (backendConnected && backendWs.readyState === WebSocket.OPEN) {
      console.log('  后端连接状态: OPEN，转发消息');
      backendWs.send(data);
    } else {
      console.log('  后端连接状态: ' + backendWs.readyState + '，将消息加入队列');
      messageQueue.push(data);
    }
  });
  
  // 从后端接收消息并转发到客户端
  backendWs.on('message', (data) => {
    console.log('📥 从后端接收消息，长度:', data.length, '字节');
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data);
    }
  });
  
  // 处理客户端连接关闭
  clientWs.on('close', (code, reason) => {
    console.log('❌ 客户端连接已关闭，代码:', code, '原因:', reason);
    if (backendWs.readyState === WebSocket.OPEN) {
      backendWs.close();
    }
  });
  
  // 处理后端连接关闭
  backendWs.on('close', (code, reason) => {
    console.log('❌ 后端连接已关闭，代码:', code, '原因:', reason);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close();
    }
  });
  
  // 处理客户端错误
  clientWs.on('error', (error) => {
    console.error('❌ 客户端连接错误:', error.message);
  });
  
  // 处理后端错误
  backendWs.on('error', (error) => {
    console.error('❌ 后端连接错误:', error.message);
  });
});

// 处理服务器错误
httpServer.on('error', (error) => {
  console.error('❌ 服务器错误:', error);
});

console.log('代理服务器准备就绪，可以接收连接...');