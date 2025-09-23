// 测试多轮聊天功能
import http from 'http';

// 定义API服务器地址
const API_URL = 'http://localhost:3142';
const DEFAULT_CHILD_ID = 'default_child';

/**
 * 发送聊天消息到API
 * @param {string} childId - 儿童ID
 * @param {string} message - 聊天消息
 * @returns {Promise<string>} - 服务器响应
 */
async function sendChatMessage(childId, message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      childId: childId,
      message: message
    });

    const options = {
      hostname: 'localhost',
      port: 3142,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      console.log(`发送消息 "${message}"，状态码: ${res.statusCode}`);

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        // 解析SSE响应格式
        const events = responseData.split('\n\n');
        for (const event of events) {
          if (event.startsWith('data: ')) {
            const jsonData = event.substring(6); // 去掉 'data: ' 前缀
            try {
              const parsedData = JSON.parse(jsonData);
              console.log('收到响应:', parsedData.data.message);
              resolve(parsedData.data.message);
              return;
            } catch (error) {
              console.error('解析响应数据失败:', error);
              reject(new Error('解析响应数据失败'));
            }
          }
        }
        reject(new Error('未找到有效的响应数据'));
      });
    });

    req.on('error', (error) => {
      console.error('请求错误:', error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

/**
 * 获取对话历史
 * @param {string} childId - 儿童ID
 * @returns {Promise<Array>} - 对话历史
 */
async function getConversationHistory(childId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3142,
      path: `/api/history/${childId}`,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          console.log('对话历史获取成功，消息数量:', parsedData.data.totalMessages);
          console.log('完整历史响应:', JSON.stringify(parsedData, null, 2));
          resolve(parsedData.data.history);
        } catch (error) {
          console.error('解析对话历史失败:', error);
          console.error('原始响应数据:', responseData);
          reject(new Error('解析对话历史失败'));
        }
      });
    });

    req.on('error', (error) => {
      console.error('请求错误:', error);
      reject(error);
    });

    req.end();
  });
}

/**
 * 清空对话历史（测试前准备）
 * @param {string} childId - 儿童ID
 * @returns {Promise<void>}
 */
async function clearConversationHistory(childId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3142,
      path: `/api/clear-history/${childId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          console.log('对话历史已清空:', parsedData.message);
          resolve();
        } catch (error) {
          console.error('清空对话历史失败:', error);
          reject(new Error('清空对话历史失败'));
        }
      });
    });

    req.on('error', (error) => {
      console.error('请求错误:', error);
      reject(error);
    });

    req.write(JSON.stringify({}));
    req.end();
  });
}

/**
 * 获取儿童档案信息
 * @param {string} childId - 儿童ID
 * @returns {Promise<any>} - 儿童档案
 */
async function getChildProfile(childId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3142,
      path: `/api/profile/${childId}`,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          console.log('儿童档案获取成功:', parsedData.data.profile.name);
          resolve(parsedData.data.profile);
        } catch (error) {
          console.error('解析儿童档案失败:', error);
          reject(new Error('解析儿童档案失败'));
        }
      });
    });

    req.on('error', (error) => {
      console.error('请求错误:', error);
      reject(error);
    });

    req.end();
  });
}

/**
 * 执行多轮聊天测试（游戏场景）
 */
async function runGameScenarioTest() {
  const childId = DEFAULT_CHILD_ID;

  try {
    console.log('===== 游戏场景多轮聊天测试开始 =====');
    
    // 1. 清空对话历史，确保测试环境干净
    console.log('\n清空对话历史...');
    await clearConversationHistory(childId);
    
    // 2. 获取儿童档案信息
    console.log('\n获取儿童档案信息...');
    const childProfile = await getChildProfile(childId);
    
    // 3. 第一轮对话：打招呼
    console.log('\n===== 第一轮对话 =====');
    console.log('发送消息: "你好，TinyBuddy！"');
    const response1 = await sendChatMessage(childId, '你好，TinyBuddy！');
    console.log('响应:', response1);
    
    // 等待片刻
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 4. 第二轮对话：表达想做游戏的意愿
    console.log('\n===== 第二轮对话 =====');
    console.log('发送消息: "我想做游戏"');
    const response2 = await sendChatMessage(childId, '我想做游戏');
    console.log('响应:', response2);
    
    // 等待片刻
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 5. 第三轮对话：具体游戏建议
    console.log('\n===== 第三轮对话 =====');
    console.log('发送消息: "我们来玩猜谜语的游戏吧！"');
    const response3 = await sendChatMessage(childId, '我们来玩猜谜语的游戏吧！');
    console.log('响应:', response3);
    
    // 等待片刻
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 6. 获取对话历史并验证
    console.log('\n===== 验证对话历史 =====');
    console.log('获取完整对话历史...');
    const history = await getConversationHistory(childId);
    
    if (history && history.length > 0) {
      console.log('对话历史详细内容:');
      history.forEach((msg, index) => {
        console.log(`${index + 1}. [${msg.sender}] ${msg.content}`);
      });
    } else {
      console.log('警告: 对话历史为空或未正确保存');
    }
    
    console.log('\n===== 游戏场景多轮聊天测试完成 =====');
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 运行测试
runGameScenarioTest();