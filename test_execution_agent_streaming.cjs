// 简单的执行Agent流式输出测试脚本
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('执行Agent流式输出测试...');

// 创建一个简单的测试文件来验证流式输出功能
// 修复TypeScript语法错误，确保所有字符串正确格式化
const testScriptContent = `
import { ExecutionAgent } from './src/actors/executionAgent';
import type { ChildProfile } from './src/models/childProfile';
import type { Message } from './src/models/message';

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
`;

// 写入测试脚本到临时文件
const testScriptPath = path.join(__dirname, 'temp_stream_test.ts');
fs.writeFileSync(testScriptPath, testScriptContent);

console.log('测试脚本已创建，正在运行...\n');

// 执行测试脚本
const testProcess = exec(`node --no-warnings --experimental-specifier-resolution=node ${testScriptPath}`, {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'pipe'] // 单独的流以便捕获输出
});

// 捕获标准输出
let stdoutData = '';
testProcess.stdout.on('data', (data) => {
  stdoutData += data.toString();
  process.stdout.write(data);
});

// 捕获标准错误
let stderrData = '';
testProcess.stderr.on('data', (data) => {
  stderrData += data.toString();
  process.stderr.write(data);
});

// 处理测试进程结束
let timeoutId;

testProcess.on('exit', (code) => {
  clearTimeout(timeoutId);
  
  console.log('\n=== 测试进程退出信息 ===');
  console.log('退出码:', code);
  console.log('标准输出内容:', stdoutData.length > 0 ? stdoutData : '无');
  console.log('标准错误内容:', stderrData.length > 0 ? stderrData : '无');
  
  // 清理临时文件
  try {
    fs.unlinkSync(testScriptPath);
    console.log('\n临时测试文件已清理');
  } catch (err) {
    console.error('清理临时文件失败:', err);
  }
  
  process.exit(code);
});

// 设置超时（30秒）
timeoutId = setTimeout(() => {
  console.error('\n测试超时！');
  testProcess.kill();
  process.exit(1);
}, 30000);