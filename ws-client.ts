#!/usr/bin/env node
import WebSocket from 'ws';
import readline from 'readline';
import process from 'process';

// 服务器配置
const SERVER_ADDRESS = 'ws://47.250.116.113:3143'; // 更改为指定IP地址
const CHILD_ID = 'test_child_cli';
const CHILD_AGE = '8';
const CHILD_INTERESTS = '编程,科学,音乐';
const LANGUAGE_LEVEL = 'L3';
const GENDER = 'male';

// 心跳配置
const HEARTBEAT_INTERVAL = 30000; // 30秒发送一次心跳
const HEARTBEAT_TIMEOUT = 15000; // 15秒内未收到响应则认为超时

// 重连配置
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_INTERVAL = 3000; // 基础重连间隔3秒

// 全局变量
let ws: WebSocket | null = null;
let heartbeatTimer: NodeJS.Timeout | null = null;
let heartbeatTimeoutTimer: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
let reconnectTimer: NodeJS.Timeout | null = null;
let isInitialized = false;

// 创建命令行界面
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> '
});

// 创建WebSocket连接
function createWebSocketConnection() {
  // 构建带参数的URL
  const wsUrl = new URL(SERVER_ADDRESS);
  wsUrl.searchParams.append('childID', CHILD_ID);
  wsUrl.searchParams.append('childAge', CHILD_AGE);
  wsUrl.searchParams.append('childInterests', CHILD_INTERESTS);
  wsUrl.searchParams.append('languageLevel', LANGUAGE_LEVEL);
  wsUrl.searchParams.append('gender', GENDER);

  console.log(`连接到服务器: ${wsUrl.toString()}`);
  ws = new WebSocket(wsUrl.toString());

  // 连接打开事件
  ws.on('open', handleConnectionOpen);

  // 消息接收事件
  ws.on('message', handleMessageReceived);

  // 连接关闭事件
  ws.on('close', handleConnectionClose);

  // 连接错误事件
  ws.on('error', handleConnectionError);
}

// 处理连接打开
function handleConnectionOpen() {
  console.log('WebSocket连接已建立');
  reconnectAttempts = 0;
  isInitialized = false;
  
  // 发送初始化消息
  sendInitializeMessage();
  
  // 启动心跳机制
  startHeartbeat();
}

// 发送初始化消息
function sendInitializeMessage() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error('WebSocket未连接，无法发送初始化消息');
    return;
  }

  const initMessage = {
    type: 'initialize' as const,
    childProfileId: CHILD_ID,
    childAge: CHILD_AGE,
    childInterests: CHILD_INTERESTS,
    languageLevel: LANGUAGE_LEVEL,
    gender: GENDER
  };

  ws.send(JSON.stringify(initMessage));
  console.log('已发送初始化消息');
}

// 处理接收到的消息
function handleMessageReceived(data: Buffer) {
  try {
    const message = JSON.parse(data.toString());
    
    switch (message.type) {
      case 'connected':
        console.log(`连接成功: ID=${message.connectionId}`);
        break;
        
      case 'initialized':
        console.log(`初始化成功: 儿童档案信息=${JSON.stringify(message.childProfile, null, 2)}`);
        isInitialized = true;
        rl.prompt();
        break;
        
      case 'processing':
        console.log(`处理中: ${message.message}`);
        break;
        
      case 'progress':
        process.stdout.write(`部分响应: ${message.content}\r`);
        break;
        
      case 'final_response':
        console.log(`\n最终响应: ${message.content}`);
        rl.prompt();
        break;
        
      case 'pong':
        // 收到心跳响应，重置超时定时器
        resetHeartbeatTimeout();
        break;
        
      case 'error':
        console.error(`发生错误: ${message.message}`);
        rl.prompt();
        break;
        
      default:
        console.log(`收到未知类型的消息: ${JSON.stringify(message)}`);
        rl.prompt();
    }
  } catch (error) {
    console.error(`解析消息失败: ${error}`);
    rl.prompt();
  }
}

// 处理连接关闭
function handleConnectionClose(code: number, reason: string) {
  console.log(`连接已关闭: 代码=${code}, 原因=${reason}`);
  
  // 清理定时器
  cleanupTimers();
  
  // 尝试重连（非主动关闭且未超过最大重连次数）
  if (code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    const interval = BASE_RECONNECT_INTERVAL * Math.pow(2, reconnectAttempts - 1) + Math.random() * 1000;
    console.log(`尝试第${reconnectAttempts}次重连，${Math.round(interval / 1000)}秒后...`);
    
    reconnectTimer = setTimeout(() => {
      createWebSocketConnection();
    }, interval);
  }
}

// 处理连接错误
function handleConnectionError(error: Error) {
  console.error(`连接错误: ${error.message}`);
}

// 启动心跳机制
function startHeartbeat() {
  // 清理可能存在的定时器
  cleanupTimers();
  
  // 发送心跳
  heartbeatTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  }, HEARTBEAT_INTERVAL);
  
  // 设置超时检测
  heartbeatTimeoutTimer = setTimeout(() => {
    console.error('心跳超时，关闭连接');
    if (ws) {
      ws.close(1001, '心跳超时');
    }
  }, HEARTBEAT_TIMEOUT);
}

// 重置心跳超时定时器
function resetHeartbeatTimeout() {
  if (heartbeatTimeoutTimer) {
    clearTimeout(heartbeatTimeoutTimer);
  }
  
  heartbeatTimeoutTimer = setTimeout(() => {
    console.error('心跳超时，关闭连接');
    if (ws) {
      ws.close(1001, '心跳超时');
    }
  }, HEARTBEAT_TIMEOUT);
}

// 清理所有定时器
function cleanupTimers() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  
  if (heartbeatTimeoutTimer) {
    clearTimeout(heartbeatTimeoutTimer);
    heartbeatTimeoutTimer = null;
  }
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

// 发送完整的用户输入消息
function sendUserMessage(message: string) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error('WebSocket未连接，无法发送消息');
    rl.prompt();
    return;
  }
  
  const userMessage = {
    type: 'user_input' as const,
    userInput: message,
    childProfileId: CHILD_ID
  };
  
  ws.send(JSON.stringify(userMessage));
}

// 流式发送用户输入消息（逐字发送）
function sendUserMessageStream(message: string, delayMs: number = 200) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error('WebSocket未连接，无法发送消息');
    rl.prompt();
    return;
  }
  
  let index = 0;
  const chars = message.split('');
  
  console.log('开始流式发送消息...');
  
  // 发送第一个字符
  if (chars.length > 0) {
    console.log(`发送: "${chars[0]}"`);
    const firstCharMessage = {
      type: 'user_input' as const,
      userInput: chars[0],
      childProfileId: CHILD_ID,
      isStreaming: true,
      isFinal: false
    };
    ws.send(JSON.stringify(firstCharMessage));
    index++;
  }
  
  // 递归发送剩余字符
  function sendNextChar() {
    if (index < chars.length) {
      setTimeout(() => {
        // 再次检查ws状态，因为异步执行期间可能发生变化
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          console.error('WebSocket连接已关闭，停止流式发送');
          rl.prompt();
          return;
        }
        
        console.log(`发送: "${chars[index]}"`);
        const charMessage = {
          type: 'user_input' as const,
          userInput: chars[index],
          childProfileId: CHILD_ID,
          isStreaming: true,
          isFinal: index === chars.length - 1
        };
        ws.send(JSON.stringify(charMessage));
        index++;
        sendNextChar();
      }, delayMs);
    } else {
      console.log('流式发送完成');
      rl.prompt();
    }
  }
  
  // 继续发送剩余字符
  if (chars.length > 1) {
    sendNextChar();
  } else {
    rl.prompt();
  }
}

// 处理用户输入
rl.on('line', (input) => {
  if (!isInitialized) {
    console.log('系统尚未初始化完成，请等待...');
    rl.prompt();
    return;
  }
  
  if (input.trim().toLowerCase() === 'exit') {
    // 清理资源并退出
    cleanupTimers();
    ws?.close(1000, '用户退出');
    rl.close();
    process.exit(0);
  } else if (input.trim().toLowerCase() === 'check') {
    // 检查连接状态
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'check_connection' }));
    }
  } else if (input.trim().toLowerCase() === 'help') {
    // 显示帮助信息
    console.log('命令帮助:');
    console.log('  exit - 退出程序');
    console.log('  check - 检查连接状态');
    console.log('  help - 显示帮助信息');
    console.log('  stream:<消息> - 以流式方式发送消息（逐字发送）');
    console.log('  直接输入消息 - 一次性发送完整消息');
    rl.prompt();
  } else if (input.trim().toLowerCase().startsWith('stream:')) {
    // 以流式方式发送消息
    const message = input.trim().substring('stream:'.length);
    if (message.trim()) {
      console.log(`准备以流式方式发送消息: ${message}`);
      sendUserMessageStream(message);
    } else {
      console.log('请在stream:后输入要发送的消息');
      rl.prompt();
    }
  } else {
    // 一次性发送完整消息
    sendUserMessage(input);
  }
});

// 处理程序退出
process.on('SIGINT', () => {
  console.log('用户中断程序');
  cleanupTimers();
  if (ws) {
    ws.close(1000, '用户中断');
  }
  rl.close();
  process.exit(0);
});

// 启动客户端
console.log('WebSocket客户端启动中...');
createWebSocketConnection();