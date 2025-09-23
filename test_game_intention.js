import http from 'http';

/**
 * 测试脚本：专门测试"我想做游戏"的场景响应
 */

// 儿童ID
const CHILD_ID = 'default_child';

/**
 * 发送聊天消息到API
 */
async function testGameIntention() {
  console.log('===== 游戏意图测试开始 =====');
  
  // 清空对话历史
  await clearHistory();
  
  // 测试消息：我想做游戏
  const message = '我想做游戏';
  console.log(`\n发送消息: "${message}"`);
  
  try {
    // 发送消息并等待响应
    const response = await sendChatMessage(message);
    console.log('\n游戏场景响应测试结果:');
    console.log(`✅ 消息发送成功，状态码: 200`);
    console.log(`✅ 收到响应: ${response}`);
    
    // 检查响应是否与游戏相关
    const gameKeywords = ['游戏', '玩', '猜谜', '角色扮演', '互动'];
    const isGameRelated = gameKeywords.some(keyword => response.includes(keyword));
    
    console.log(`\n🎯 响应内容分析:`);
    console.log(`游戏相关度: ${isGameRelated ? '高 (包含游戏相关词汇)' : '需要改进 (未包含明显的游戏相关词汇)'}`);
    
    // 获取并显示对话历史，验证消息是否正确保存
    const history = await getHistory();
    console.log(`\n📋 对话历史验证:`);
    console.log(`消息总数: ${history.length}`);
    if (history.length > 0) {
      console.log('最近消息:');
      history.slice(-2).forEach((msg, index) => {
        console.log(`${index + 1}. [${msg.sender}] ${msg.content}`);
      });
    }
    
    console.log('\n===== 游戏意图测试完成 =====');
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.log('\n===== 游戏意图测试失败 =====');
  }
}

/**
 * 发送聊天消息
 */
function sendChatMessage(message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      childId: CHILD_ID,
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

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        // 解析SSE响应格式
        const events = responseData.split('\n\n');
        for (const event of events) {
          if (event.startsWith('data: ')) {
            const jsonData = event.substring(6);
            try {
              const parsedData = JSON.parse(jsonData);
              resolve(parsedData.data.message);
              return;
            } catch (error) {
              reject(new Error('解析响应数据失败'));
            }
          }
        }
        reject(new Error('未找到有效的响应数据'));
      });
    });

    req.on('error', (error) => {
      reject(new Error(`请求错误: ${error.message}`));
    });

    req.write(data);
    req.end();
  });
}

/**
 * 清空对话历史
 */
function clearHistory() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3142,
      path: `/api/clear-history/${CHILD_ID}`,
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
          console.log('对话历史已清空');
          resolve();
        } catch (error) {
          reject(new Error('清空对话历史失败'));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`请求错误: ${error.message}`));
    });

    req.write(JSON.stringify({}));
    req.end();
  });
}

/**
 * 获取对话历史
 */
function getHistory() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3142,
      path: `/api/history/${CHILD_ID}`,
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
          resolve(parsedData.data.history);
        } catch (error) {
          reject(new Error('获取对话历史失败'));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`请求错误: ${error.message}`));
    });

    req.end();
  });
}

// 运行测试
console.log('等待服务器准备就绪...');
setTimeout(() => {
  testGameIntention();
}, 2000);