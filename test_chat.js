// 测试聊天API和对话历史的脚本
import http from 'http';

// 发送聊天请求并等待异步更新
async function testChatAndGetHistory() {
  try {
    // 1. 发送聊天请求
    console.log('发送聊天请求: "你好"');
    const chatResponse = await sendChatRequest('你好');
    console.log('即时聊天响应:');
    console.log(JSON.stringify(chatResponse, null, 2));
    
    // 2. 等待2秒，让异步更新完成
    console.log('\n等待2秒，让异步更新完成...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. 获取对话历史
    console.log('\n获取对话历史:');
    const historyResponse = await getConversationHistory(chatResponse.data.childId);
    console.log('对话历史:');
    historyResponse.data.history.forEach((msg, index) => {
      console.log(`${index + 1}. [${msg.type}] ${msg.content}`);
    });
    
    // 4. 再次发送聊天请求，测试后续交互
    console.log('\n发送第二个聊天请求: "你是谁"');
    const secondChatResponse = await sendChatRequest('你是谁');
    console.log('第二个聊天响应:');
    console.log(JSON.stringify(secondChatResponse, null, 2));
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

// 发送聊天请求
function sendChatRequest(message) {
  const data = JSON.stringify({ message });
  const options = {
    hostname: 'localhost',
    port: 3141,
    path: '/api/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (error) {
          reject(new Error(`解析响应失败: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => { reject(error); });
    req.write(data);
    req.end();
  });
}

// 获取对话历史
function getConversationHistory(childId) {
  const options = {
    hostname: 'localhost',
    port: 3141,
    path: `/api/history/${childId}`,
    method: 'GET'
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (error) {
          reject(new Error(`解析响应失败: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => { reject(error); });
    req.end();
  });
}

// 运行测试
console.log('开始测试TinyBuddy API...');
testChatAndGetHistory().then(() => {
  console.log('\n测试完成！');
}).catch(error => {
  console.error('测试失败:', error);
});