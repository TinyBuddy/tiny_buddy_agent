// 测试多轮聊天功能
import http from 'http';

// 发送聊天消息的函数
async function sendChatMessage(message, childId = 'default_child') {
  console.log(`发送消息: ${message}`);
  
  const options = {
    hostname: 'localhost',
    port: 3142,
    path: '/api/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const requestBody = JSON.stringify({
    message,
    childId
  });
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          // 移除data:前缀和最后的换行符
          const cleanData = responseData.replace(/^data: /, '').trim();
          const parsedResponse = JSON.parse(cleanData);
          console.log(`收到响应: ${parsedResponse.data?.message || '无响应内容'}`);
          resolve(parsedResponse);
        } catch (error) {
          console.error('解析响应失败:', error);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('请求错误:', error);
      reject(error);
    });
    
    req.write(requestBody);
    req.end();
  });
}

// 获取对话历史的函数
async function getConversationHistory(childId = 'default_child') {
  console.log('\n获取对话历史...');
  
  const options = {
    hostname: 'localhost',
    port: 3142,
    path: `/api/history?childId=${childId}`,
    method: 'GET'
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const history = JSON.parse(data);
          console.log('对话历史获取成功');
          console.log(`历史记录中消息数量: ${history.data?.length || 0}`);
          if (history.data && history.data.length > 0) {
            console.log('所有历史消息:');
            history.data.forEach((msg, index) => {
              console.log(`${index + 1}. [${msg.type}] ${msg.content}`);
            });
          }
          resolve(history);
        } catch (error) {
          console.error('解析对话历史失败:', error);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('获取对话历史出错:', error);
      reject(error);
    });
    
    req.end();
  });
}

// 运行多轮测试
async function runMultiTurnTest() {
  try {
    console.log('开始多轮聊天测试...');
    console.log('测试场景: 先打招呼，然后表达想做游戏的意愿\n');
    
    // 发送第一条消息：打招呼
    await sendChatMessage('你好，TinyBuddy！');
    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
    
    // 发送第二条消息：表达想做游戏的意愿
    await sendChatMessage('我想做游戏');
    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
    
    // 获取并显示对话历史
    await getConversationHistory();
    
    console.log('\n多轮聊天测试完成！');
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 执行测试
runMultiTurnTest();