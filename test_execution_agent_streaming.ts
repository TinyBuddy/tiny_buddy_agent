// 执行Agent流式输出测试脚本
import { ExecutionAgent } from './src/actors/executionAgent.js';
import type { ChildProfile } from './src/models/childProfile.js';
import type { Message } from './src/models/message.js';

// 模拟儿童档案
const mockChildProfile: ChildProfile = {
  id: 'test_child',
  name: 'Test Child',
  age: 8,
  languageLevel: 'L3',
  gender: 'male',
  interests: ['编程', '科学', '音乐'],
  lastInteraction: new Date().toISOString()
};

// 模拟对话历史
const mockConversationHistory: Message[] = [
  {
    id: 'msg_1',
    type: 'user',
    content: 'Hello, Sparky!',
    timestamp: new Date().toISOString()
  }
];

// 创建执行Agent实例
const executionAgent = new ExecutionAgent({
  useLLM: true
});

async function runTest() {
  try {
    console.log('执行Agent流式输出测试...');
    
    // 初始化Agent
    await executionAgent.init();
    
    console.log('执行Agent初始化完成，开始测试流式输出...\n');
    
    // 记录开始时间
    const startTime = Date.now();
    
    // 调用process方法并提供流式回调
    const result = await executionAgent.process({
      input: '你好，Sparky！我今天学到了新的中文单词！',
      context: {
        childProfile: mockChildProfile,
        conversationHistory: mockConversationHistory,
        knowledgeBase: []
      },
      // 流式回调函数
      onStreamChunk: (chunk) => {
        process.stdout.write('流数据: ' + chunk);
      }
    });
    
    // 记录结束时间
    const endTime = Date.now();
    
    console.log('\n\n=== 测试结果 ===');
    console.log('最终输出:', result.output);
    console.log('元数据:', JSON.stringify(result.metadata, null, 2));
    console.log('总耗时:', endTime - startTime, '毫秒');
    console.log('测试完成！');
  } catch (error) {
    console.error('测试过程中发生错误:', error);
    process.exit(1);
  }
}

// 运行测试
runTest();