import http from 'http';

// 测试流式响应的函数
async function testStreamingChat() {
  console.log('开始测试流式聊天响应...');
  
  const options = {
    hostname: 'localhost',
    port: 3141,
    path: '/api/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const requestBody = JSON.stringify({
    message: '你好，这是一个测试消息',
    childId: 'default_child'
  });
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      console.log(`状态码: ${res.statusCode}`);
      console.log(`响应头: ${JSON.stringify(res.headers)}`);
      
      // 用于存储接收到的数据
      let responseData = '';
      
      // 处理接收到的数据块
      res.on('data', (chunk) => {
        console.log(`接收到数据块: ${chunk}`);
        responseData += chunk;
      });
      
      // 响应结束时处理
      res.on('end', () => {
        console.log('响应已完成');
        
        // 解析SSE格式的响应
        try {
          // 移除data:前缀和最后的换行符
          const cleanData = responseData.replace(/^data: /, '').trim();
          const parsedResponse = JSON.parse(cleanData);
          console.log('解析后的响应:', parsedResponse);
          resolve(parsedResponse);
        } catch (error) {
          console.error('解析响应失败:', error);
          reject(error);
        }
      });
    });
    
    // 处理请求错误
    req.on('error', (error) => {
      console.error('请求错误:', error);
      reject(error);
    });
    
    // 发送请求体
    req.write(requestBody);
    req.end();
  });
}

// 运行测试
async function runTest() {
  try {
    console.log('正在连接到聊天服务...');
    const result = await testStreamingChat();
    
    // 测试对话历史
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒确保历史记录已保存
    await getConversationHistory();
    
    console.log('测试完成！');
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 获取对话历史的函数
async function getConversationHistory() {
  console.log('\n获取对话历史...');
  
  const options = {
    hostname: 'localhost',
    port: 3141,
    path: '/api/history?childId=default_child',
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
            console.log('最后一条消息:', history.data[history.data.length - 1]);
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

// 执行测试
runTest();