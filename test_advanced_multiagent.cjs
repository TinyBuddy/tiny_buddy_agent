const WebSocket = require('ws');

// 创建WebSocket连接
const ws = new WebSocket('ws://localhost:3143');

console.log('开始高级multiAgent系统测试...');

// 测试用例
const testCases = [
  {
    name: '故事创作测试',
    message: '请给我讲一个关于小兔子和乌龟赛跑的故事，要体现坚持和努力的主题。'
  },
  {
    name: '知识问答测试',
    message: 'Do you know why sky is blue？'
  },
  {
    name: '创意启发测试',
    message: 'I wanna build a beautiful graph of ocean, 你可以帮助我吗？'
  }
];

let currentTestIndex = 0;
let testResults = [];

ws.on('open', function open() {
  console.log('WebSocket连接已建立');
  
  // 发送初始化消息
  const initMessage = {
    type: 'initialize',
    childProfileId: 'default_child'
  };
  
  ws.send(JSON.stringify(initMessage));
  console.log('已发送初始化消息');
});

ws.on('message', function incoming(data) {
  // 解析消息
  try {
    const message = JSON.parse(data.toString());
    
    // 根据消息类型处理
    switch (message.type) {
      case 'connected':
        console.log(`已连接到服务器，连接ID: ${message.connectionId}`);
        break;
        
      case 'initialized':
        console.log('初始化成功，开始执行测试用例...');
        executeNextTest();
        break;
        
      case 'processing':
        console.log('处理中:', message.message);
        break;
        
      case 'progress':
        console.log('进度更新:', message.content);
        break;
        
      case 'final_response':
        console.log(`\n=== ${testCases[currentTestIndex].name} - 最终响应 ===`);
        console.log(message.content);
        console.log('========================\n');
        
        // 记录测试结果
        testResults.push({
          testName: testCases[currentTestIndex].name,
          success: message.content && message.content.length > 30,
          responseLength: message.content ? message.content.length : 0
        });
        
        // 执行下一个测试
        currentTestIndex++;
        if (currentTestIndex < testCases.length) {
          setTimeout(executeNextTest, 2000);
        } else {
          // 所有测试完成
          setTimeout(showTestResults, 2000);
        }
        break;
        
      case 'error':
        console.error('错误:', message.message);
        testResults.push({
          testName: testCases[currentTestIndex].name,
          success: false,
          error: message.message
        });
        
        // 执行下一个测试
        currentTestIndex++;
        if (currentTestIndex < testCases.length) {
          setTimeout(executeNextTest, 2000);
        } else {
          // 所有测试完成
          setTimeout(showTestResults, 2000);
        }
        break;
    }
  } catch (error) {
    console.error('解析消息时出错:', error.message);
  }
});

function executeNextTest() {
  if (currentTestIndex < testCases.length) {
    console.log(`\n执行测试: ${testCases[currentTestIndex].name}`);
    console.log(`测试消息: ${testCases[currentTestIndex].message}`);
    
    const chatMessage = {
      type: 'user_input',
      userInput: testCases[currentTestIndex].message,
      childProfileId: 'default_child'
    };
    
    ws.send(JSON.stringify(chatMessage));
    console.log('已发送测试消息');
  }
}

function showTestResults() {
  console.log('\n=================== 测试结果汇总 ===================');
  let passedTests = 0;
  
  testResults.forEach((result, index) => {
    const status = result.success ? '✓ 通过' : '✗ 失败';
    console.log(`${index + 1}. ${result.testName}: ${status}`);
    
    if (result.success) {
      console.log(`   响应长度: ${result.responseLength} 字符`);
      passedTests++;
    } else if (result.error) {
      console.log(`   错误信息: ${result.error}`);
    }
  });
  
  console.log(`\n总计: ${passedTests}/${testCases.length} 个测试通过`);
  console.log('====================================================\n');
  
  ws.close();
}

ws.on('error', function error(err) {
  console.error('WebSocket错误:', err.message);
});

ws.on('close', function close() {
  console.log('WebSocket连接已关闭');
  console.log('高级测试结束');
});