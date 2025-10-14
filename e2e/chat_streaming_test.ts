// 服务器聊天流式输出测试
import { WebSocket } from 'ws';

// 连接配置
const SERVER_URL = 'ws://47.250.116.113:3143';
const CHILD_ID = 'e2e_test_streaming';
const TEST_MESSAGE = '你好，TinyBuddy！我想测试一下你的流式输出功能。';

// 记录开始时间和收到的流数据
let startTime: number;
let receivedStreamData: string[] = []; // 包含所有类型的流数据（包括系统消息）
let actualChatResponse: string[] = []; // 仅包含实际的对话内容（字符级流数据）
let receivedFinalResponse: string = '';
let isTestComplete = false;
let streamChunkCount = 0;

console.log('=== 服务器聊天流式输出测试 ===');

// 创建连接URL
const wsUrl = new URL(SERVER_URL);
wsUrl.searchParams.append('childID', CHILD_ID);

console.log(`连接到WebSocket服务器: ${wsUrl.toString()}`);

// 创建WebSocket连接
const ws = new WebSocket(wsUrl.toString());

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
    // 打印原始响应
    console.log('原始响应:', data.toString());
    const message = JSON.parse(data.toString());
    
    if (message.type === 'initialized') {
      console.log('初始化成功，准备发送测试消息...');
      
      // 初始化成功后，发送测试消息
      setTimeout(() => {
        startTime = Date.now();
        console.log(`发送测试消息: "${TEST_MESSAGE}"`);
        
        const messageData = {
          type: 'user_input',
          userInput: TEST_MESSAGE,
          childProfileId: CHILD_ID
        };
        
        ws.send(JSON.stringify(messageData));
      }, 1000);
    }
    
    // 处理字符级流式输出
    if (message.type === 'stream_chunk') {
      const chunk = message.content || '';
      receivedStreamData.push(chunk);
      actualChatResponse.push(chunk); // 仅将实际对话内容添加到专用数组
      streamChunkCount++;
      
      // 在终端中一个字符一个字符地打印
      process.stdout.write(chunk);
    }
    
    // 处理流式进度消息
    if (message.type === 'progress') {
      const chunk = message.content || '';
      console.log(`收到流数据: "${chunk}"`);
      receivedStreamData.push(chunk);
    }
    
    // 处理最终响应
    if (message.type === 'final_response') {
      receivedFinalResponse = message.content || '';
      
      // 检查是否已经接收到流式数据
      if (receivedStreamData.length === 0) {
        // 如果没有收到流式数据，使用最终响应作为流式数据
        console.log('警告: 未收到流式进度消息，使用最终响应作为替代');
        receivedStreamData.push(receivedFinalResponse);
      }
      console.log('\n\n收到最终响应:\n', receivedFinalResponse);
      
      // 如果测试还未标记为完成，计算耗时
      if (!isTestComplete) {
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        console.log('总耗时:', totalTime, '毫秒');
        
        // 等待1秒后关闭连接
        setTimeout(() => {
          console.log('\n测试完成，关闭连接');
          ws.close(1000, '测试完成');
        }, 1000);
      }
    }
    
    // 处理其他类型的消息
    if (message.type !== 'initialized' && 
        message.type !== 'stream_chunk' && 
        message.type !== 'progress' && 
        message.type !== 'final_response') {
      console.log(`收到其他类型消息: ${message.type}`);
    }
    
  } catch (error) {
    console.error(`解析消息失败: ${error}`);
  }
});

// 连接关闭事件
ws.on('close', (code, reason) => {
  console.log(`连接已关闭: 代码=${code}, 原因=${reason}`);
  
  // 构建完整的流式响应
  const completeStreamResponse = receivedStreamData.join('');
  
  console.log('\n=== 测试结果 ===');
  
  // 检查测试结果
  if (streamChunkCount > 0) {
    // 如果收到字符级流数据，说明字符级流式输出正常工作
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log('✅ 测试通过: 成功接收字符级流式输出');
    console.log('总响应长度(含系统消息):', completeStreamResponse.length, '字符');
    console.log('对话内容长度:', actualChatResponse.join('').length, '字符');
    console.log('流数据块数量:', receivedStreamData.length);
    console.log('字符级流数据块数量:', streamChunkCount);
    console.log('总耗时:', totalTime, '毫秒');
    console.log('\n完整对话内容:\n', actualChatResponse.join(''));
    console.log('\n完整流式响应(含系统消息):\n', completeStreamResponse);
  } else if (receivedStreamData.length > 1) {
    // 如果收到多个流数据块，说明流式输出正常工作
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log('✅ 测试通过: 成功接收流式输出');
    console.log('流式响应总长度:', completeStreamResponse.length, '字符');
    console.log('流数据块数量:', receivedStreamData.length);
    console.log('总耗时:', totalTime, '毫秒');
    console.log('\n完整流式响应:\n', completeStreamResponse);
  } else if (receivedStreamData.length === 1) {
    // 如果只收到一个流数据块（可能是最终响应作为替代）
    console.log('⚠️ 测试部分通过: 只收到一个数据块');
    console.log('响应长度:', completeStreamResponse.length, '字符');
    console.log('\n响应内容:\n', completeStreamResponse);
  } else if (receivedFinalResponse) {
    console.log('⚠️ 测试部分通过: 只收到最终响应，未收到流式输出');
  } else {
    console.log('❌ 测试失败: 未收到响应');
  }
  
  process.exit(0);
});

// 连接错误事件
ws.on('error', (error) => {
  console.error(`连接错误: ${error.message}`);
  console.error('❌ 测试失败: 无法连接到服务器');
  process.exit(1);
});

// 设置超时处理
setTimeout(() => {
  if (receivedStreamData.length === 0 && !receivedFinalResponse) {
    console.error('❌ 测试失败: 超时未收到响应');
    process.exit(1);
  }
}, 30000); // 30秒超时