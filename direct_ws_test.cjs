const WebSocket = require('ws');

// 连接配置
const SERVER_URL = 'ws://localhost:3143';
const CHILD_ID = 'test_streaming';

// 创建连接URL
const wsUrl = new URL(SERVER_URL);
wsUrl.searchParams.append('childID', CHILD_ID);

console.log(`连接到WebSocket服务器: ${wsUrl.toString()}`);

// 创建WebSocket连接
const ws = new WebSocket(wsUrl.toString());

// 发送的消息
const TEST_MESSAGE = '你好，TinyBuddy!';
const CHARS = TEST_MESSAGE.split('');
let currentIndex = 0;

// 连接打开事件
ws.on('open', () => {
  console.log('WebSocket连接已建立');
  
  // 发送初始化消息
  const initMessage = {
    type: 'initialize',
    childProfileId: CHILD_ID,
    childAge: '8',
    childInterests: '编程,科学,音乐',
    languageLevel: 'L3',
    gender: 'male'
  };
  
  ws.send(JSON.stringify(initMessage));
  console.log('已发送初始化消息');
});

// 消息接收事件
ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log(`收到服务器消息: ${JSON.stringify(message)}`);
    
    if (message.type === 'initialized') {
      console.log('\n初始化成功，开始测试流式发送...');
      // 初始化成功后，立即开始流式发送
      sendNextChar();
    }
    
    if (message.type === 'progress') {
      console.log(`流式响应: ${message.content}`);
    }
    
    if (message.type === 'final_response') {
      console.log(`\n最终响应: ${message.content}`);
      // 测试完成后关闭连接
      setTimeout(() => {
        console.log('测试完成，关闭连接');
        ws.close(1000, '测试完成');
      }, 1000);
    }
  } catch (error) {
    console.error(`解析消息失败: ${error}`);
  }
});

// 连接关闭事件
ws.on('close', (code, reason) => {
  console.log(`连接已关闭: 代码=${code}, 原因=${reason}`);
  process.exit(0);
});

// 连接错误事件
ws.on('error', (error) => {
  console.error(`连接错误: ${error.message}`);
  process.exit(1);
});

// 流式发送字符的函数
function sendNextChar() {
  if (currentIndex < CHARS.length) {
    const char = CHARS[currentIndex];
    console.log(`发送字符: "${char}" (索引: ${currentIndex})`);
    
    const message = {
      type: 'user_input',
      userInput: char,
      childProfileId: CHILD_ID,
      isStreaming: true,
      isFinal: currentIndex === CHARS.length - 1
    };
    
    ws.send(JSON.stringify(message));
    currentIndex++;
    
    // 200ms后发送下一个字符
    setTimeout(sendNextChar, 200);
  } else {
    console.log('\n流式发送完成，等待服务器响应...');
  }
}

// 设置超时，防止测试无限等待
setTimeout(() => {
  console.error('测试超时');
  ws.close(1008, '测试超时');
  process.exit(1);
}, 30000); // 30秒超时