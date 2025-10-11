const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// 创建临时的测试客户端脚本
const testClientScript = `
const WebSocket = require('ws');

// Server config
const SERVER_ADDRESS = 'ws://localhost:3143';
const CHILD_ID = 'test_streaming_cli';
const CHILD_AGE = '8';
const CHILD_INTERESTS = '编程,科学,音乐';
const LANGUAGE_LEVEL = 'L3';
const GENDER = 'male';

// Build URL with params
const wsUrl = new URL(SERVER_ADDRESS);
wsUrl.searchParams.append('childID', CHILD_ID);

console.log('Test script started, connecting to WebSocket server...');
const ws = new WebSocket(wsUrl.toString());

// Connection open event
ws.on('open', function() {
  console.log('WebSocket connection established');
  
  // Send initialization message
  const initMessage = {
    type: 'initialize',
    childProfileId: CHILD_ID,
    childAge: CHILD_AGE,
    childInterests: CHILD_INTERESTS,
    languageLevel: LANGUAGE_LEVEL,
    gender: GENDER
  };
  
  ws.send(JSON.stringify(initMessage));
  console.log('Initialization message sent');
});

// Message received event
ws.on('message', function(data) {
  try {
    const message = JSON.parse(data.toString());
    
    console.log('Server message received: ' + JSON.stringify(message));
    
    switch (message.type) {
      case 'connected':
        console.log('Connection successful: ID=' + message.connectionId);
        break;
        
      case 'initialized':
        console.log('Initialization successful, starting streaming test...');
        // Start streaming test after initialization
        testStreamingSend(ws, CHILD_ID);
        break;
        
      case 'processing':
        console.log('Processing: ' + message.message);
        break;
        
      case 'progress':
        console.log('Streaming response: ' + message.content);
        break;
        
      case 'final_response':
        console.log('\nFinal response: ' + message.content);
        // Close connection and exit after test completes
        setTimeout(function() {
          console.log('Test completed, closing connection');
          ws.close(1000, 'Test completed');
          process.exit(0);
        }, 1000);
        break;
        
      case 'error':
        console.error('Error occurred: ' + message.message);
        process.exit(1);
        break;
    }
  } catch (error) {
    console.error('Failed to parse message: ' + error);
  }
});

// Connection close event
ws.on('close', function(code, reason) {
  console.log('Connection closed: code=' + code + ', reason=' + reason);
});

// Connection error event
ws.on('error', function(error) {
  console.error('Connection error: ' + error.message);
  process.exit(1);
});

// Test streaming send function
function testStreamingSend(ws, childId) {
  const testMessage = '你好，TinyBuddy!';
  const chars = testMessage.split('');
  let index = 0;
  
  console.log('Starting streaming send: "' + testMessage + '"');
  
  // Send first character
  if (chars.length > 0) {
    console.log('Sending: "' + chars[0] + '"');
    const firstCharMessage = {
      type: 'user_input',
      userInput: chars[0],
      childProfileId: childId,
      isStreaming: true,
      isFinal: false
    };
    ws.send(JSON.stringify(firstCharMessage));
    index++;
  }
  
  // Recursively send remaining characters
  function sendNextChar() {
    if (index < chars.length) {
      setTimeout(function() {
        if (ws.readyState === WebSocket.OPEN) {
          console.log('Sending: "' + chars[index] + '"');
          const charMessage = {
            type: 'user_input',
            userInput: chars[index],
            childProfileId: childId,
            isStreaming: true,
            isFinal: index === chars.length - 1
          };
          ws.send(JSON.stringify(charMessage));
          index++;
          sendNextChar();
        }
      }, 200); // 200ms interval
    } else {
      console.log('Streaming send completed');
    }
  }
  
  // Continue sending remaining characters
  if (chars.length > 1) {
    sendNextChar();
  }
}

// Set timeout to prevent infinite waiting
setTimeout(function() {
  console.error('Test timed out');
  process.exit(1);
}, 30000); // 30 seconds timeout
`;

// 写入临时脚本文件
const tempScriptPath = path.join(__dirname, 'temp_streaming_test.cjs');
fs.writeFileSync(tempScriptPath, testClientScript);

console.log('开始测试流式发送功能...');

// 执行测试脚本
const testProcess = exec(`node ${tempScriptPath}`, (error, stdout, stderr) => {
  // 清理临时文件
  fs.unlinkSync(tempScriptPath);
  
  if (error) {
    console.error(`测试失败: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`错误输出: ${stderr}`);
    return;
  }
});

// 捕获并显示测试输出
testProcess.stdout.on('data', (data) => {
  console.log(data.toString());
});

testProcess.stderr.on('data', (data) => {
  console.error(data.toString());
});

testProcess.on('close', (code) => {
  console.log(`测试进程退出，代码: ${code}`);
});