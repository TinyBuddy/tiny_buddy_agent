import WebSocket from 'ws';

// 直接连接到目标WebSocket服务器
try {
  console.log('正在直接连接到目标WebSocket服务器: wss://stg.tinybuddy.dev/hardware');
  
  const ws = new WebSocket('wss://stg.tinybuddy.dev/hardware', {
    headers: {
      'User-Agent': 'Direct-WS-Test/1.0'
    }
  });
  
  ws.on('open', () => {
    console.log('✅ 直接连接成功建立！');
    // 发送认证数据
    try {
      const authData = {"authToken":"9b4f328f-c427-424c-a549-09674f41af28","deviceId":"94a99031b91c","version":"1.7.7"};
      ws.send(JSON.stringify(authData));
      console.log('已发送认证数据到目标服务器:', authData);
    } catch (error) {
      console.error('发送认证数据失败:', error);
    }
  });
  
  ws.on('message', (data) => {
    console.log('✅ 收到来自目标服务器的消息:');
    try {
      const message = JSON.parse(data.toString());
      console.log(JSON.stringify(message, null, 2));
    } catch (e) {
      console.log(data.toString());
    }
  });
  
  ws.on('close', (code, reason) => {
    console.log(`❌ WebSocket连接已关闭: 代码=${code}, 原因=${reason}`);
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket连接错误:', error);
  });
  
  // 10秒后关闭连接
  setTimeout(() => {
    console.log('10秒后关闭连接');
    ws.close();
  }, 10000);
  
} catch (error) {
  console.error('❌ 连接初始化失败:', error);
}