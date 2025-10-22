import { ExecutionAgent } from './src/actors/executionAgent';
import { createMockContext } from './test_knowledge_fetch';

// 添加更多可能匹配的测试查询
const testQueries = [
  '恐龙有哪些种类？',
  '霸王龙是什么样的恐龙？',
  '恐龙生活在什么时期？',
  '如何学习中文？',
  '你知道什么是拼音吗？',
];

// 运行完整的ExecutionAgent测试
async function runFullAgentTest() {
  console.log('=== 开始测试ExecutionAgent完整流程（含知识库功能） ===\n');
  
  // 创建执行Agent实例
  const agent = new ExecutionAgent();
  await agent.init();
  
  // 创建模拟上下文
  const context = createMockContext();
  
  // 测试每个查询
  for (const query of testQueries) {
    console.log(`\n测试查询: "${query}"`);
    console.log('----------------------------------');
    
    try {
      // 测试完整的process方法，这会调用fetchKnowledgeFromRemoteApi
      const startTime = Date.now();
      console.log('执行Agent处理中...');
      
      // 模拟流式回调
      const chunks: string[] = [];
      const onStreamChunk = (chunk: string) => {
        chunks.push(chunk);
      };
      
      const result = await agent.process({
        input: query,
        context: context,
        onStreamChunk: onStreamChunk
      });
      
      const endTime = Date.now();
      
      console.log(`\n处理完成，耗时: ${endTime - startTime}ms`);
      console.log(`输出内容: "${result.output}"`);
      console.log(`元数据:`, result.metadata);
      console.log(`流式输出块数: ${chunks.length}`);
      
    } catch (error) {
      console.error('测试失败:', error);
    }
    
    console.log('----------------------------------');
  }
  
  console.log('\n=== 测试完成 ===');
}

// 运行测试
runFullAgentTest().catch(console.error);