// 测试知识库API对"快乐的音乐"查询的响应
import { ExecutionAgent } from './src/actors/executionAgent';
import { createMockContext, TestableExecutionAgent } from './test_knowledge_fetch';

// 测试函数
async function testHappyMusicQuery() {
  console.log('=== 开始测试"快乐的音乐"查询 ===\n');
  
  // 使用TestableExecutionAgent进行测试
  const agent = new TestableExecutionAgent();
  await agent.init(createMockContext());
  
  const query = '快乐的音乐';
  console.log(`测试查询: "${query}"`);
  console.log('----------------------------------------');
  
  const startTime = Date.now();
  try {
    const result = await agent.testFetchKnowledge(query);
    const endTime = Date.now();
    
    console.log(`查询耗时: ${endTime - startTime} ms`);
    console.log(`hasMatch: ${result.hasMatch}`);
    console.log(`内容长度: ${result.content.length} 字符`);
    
    if (result.hasMatch && result.content) {
      console.log('\n查询结果:');
      console.log('----------------------------------------');
      console.log(result.content);
      console.log('----------------------------------------');
    } else {
      console.log('\n查询结果: 无匹配内容');
    }
    
  } catch (error) {
    console.error('查询出错:', error);
  }
  
  console.log('\n=== 测试完成 ===');
}

// 直接运行测试函数（在ES模块中不需要条件检查）
testHappyMusicQuery().catch(console.error);