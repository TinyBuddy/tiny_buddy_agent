import { WebSocketServer } from 'ws';

// 创建模拟WebSocket服务器，监听8082端口
const wss = new WebSocketServer({ port: 8082 });

console.log('模拟WebSocket服务器已启动，监听端口: 8082');

wss.on('connection', (ws) => {
  console.log('✅ 收到新的连接');

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('接收到消息:', message);
      
      // 检查是否包含认证数据
      if (message.authToken && message.deviceId && message.version) {
        console.log('✅ 收到认证数据，返回成功响应');
        // 返回成功响应
        ws.send(JSON.stringify({
          success: true,
          message: '认证成功',
          timestamp: new Date().toISOString(),
          data: {
            userId: 'test-user-123',
            permissions: ['read', 'write']
          }
        }));
      } else {
        console.log('❌ 认证数据不完整');
        // 返回错误响应
        ws.send(JSON.stringify({
          success: false,
          message: '认证数据不完整',
          code: 400
        }));
      }
    } catch (error) {
      console.error('解析消息时出错:', error);
      ws.send(JSON.stringify({
        success: false,
        message: '无效的JSON格式',
        code: 400
      }));
    }
  });

  ws.on('close', () => {
    console.log('❌ 连接已关闭');
  });

  ws.on('error', (error) => {
    console.error('WebSocket错误:', error);
  });
});

// 处理服务器错误
wss.on('error', (error) => {
  console.error('服务器错误:', error);
});

console.log('模拟服务器准备就绪，可以接收连接...');