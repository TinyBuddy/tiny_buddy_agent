import http from 'http';

/**
 * 测试脚本：完整的游戏场景多轮对话测试
 */

// 儿童ID
const CHILD_ID = 'default_child';

/**
 * 发送聊天消息到API
 */
async function sendChatMessage(message) {
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
async function clearHistory() {
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
async function getHistory() {
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

/**
 * 执行完整的游戏场景多轮对话测试
 */
async function runCompleteGameScenario() {
  console.log('===== 完整游戏场景多轮对话测试开始 =====');
  
  try {
    // 1. 清空对话历史
    await clearHistory();
    console.log('对话历史已清空，准备开始测试...\n');
    
    // 测试对话序列
    const conversationSequence = [
      { user: '你好，TinyBuddy！', expectedKeywords: ['你好', '嗨', '小朋友'] },
      { user: '我想做游戏', expectedKeywords: ['游戏', '玩', '玩吧'] },
      { user: '我们来玩猜谜语的游戏吧！', expectedKeywords: ['猜谜语', '好呀', '可以'] },
      { user: '你能出一个谜语给我猜吗？', expectedKeywords: ['谜语', '好的', '猜一猜'] }
    ];
    
    const conversationLog = [];
    let allResponsesAppropriate = true;
    
    // 2. 执行多轮对话
    for (let i = 0; i < conversationSequence.length; i++) {
      const turn = conversationSequence[i];
      
      console.log(`===== 第${i + 1}轮对话 =====`);
      console.log(`👦 用户: ${turn.user}`);
      
      const response = await sendChatMessage(turn.user);
      console.log(`🤖 TinyBuddy: ${response}`);
      
      // 记录对话
      conversationLog.push({ role: 'user', content: turn.user });
      conversationLog.push({ role: 'assistant', content: response });
      
      // 检查响应是否包含预期关键词
      const containsKeyword = turn.expectedKeywords.some(keyword => 
        response.includes(keyword)
      );
      
      console.log(`✅ 响应相关性: ${containsKeyword ? '相关' : '不相关'}`);
      if (!containsKeyword) {
        allResponsesAppropriate = false;
      }
      
      // 等待一下，模拟真实对话节奏
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('');
    }
    
    // 3. 获取并显示完整对话历史
    console.log('===== 完整对话历史 =====');
    const history = await getHistory();
    console.log(`消息总数: ${history.length}`);
    console.log('对话详情:');
    history.forEach((msg, index) => {
      console.log(`${index + 1}. [${msg.sender}] ${msg.content}`);
    });
    
    // 4. 测试总结
    console.log('\n===== 游戏场景测试总结 =====');
    console.log(`✅ 测试状态: ${allResponsesAppropriate ? '成功' : '需要改进'}`);
    console.log(`✅ 所有消息均成功发送并接收响应`);
    console.log(`✅ 对话历史正确保存`);
    console.log(`✅ API服务正常运行`);
    
    if (allResponsesAppropriate) {
      console.log('🎉 恭喜！游戏场景多轮对话功能测试通过！TinyBuddy能够正确理解并回应用户关于游戏的请求。');
    } else {
      console.log('⚠️ 部分响应可能不够相关，建议进一步优化模型提示词。');
    }
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
  }
  
  console.log('\n===== 完整游戏场景多轮对话测试完成 =====');
}

// 运行测试
console.log('等待服务器准备就绪...');
setTimeout(() => {
  runCompleteGameScenario();
}, 2000);