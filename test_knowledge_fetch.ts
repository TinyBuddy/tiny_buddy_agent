// 测试ExecutionAgent中的fetchKnowledgeFromRemoteApi方法
import { ExecutionAgent } from './src/actors/executionAgent';
import type { ChildProfile } from './src/models/childProfile';
import type { Message } from './src/models/message';
import type { ActorContext } from './src/actors/baseActor';

// 创建一个可测试的ExecutionAgent类，暴露私有方法
class TestableExecutionAgent extends ExecutionAgent {
  // 暴露私有方法以便测试
  public async testFetchKnowledge(query: string): Promise<{ hasMatch: boolean; content: string }> {
    // 使用@ts-ignore绕过TypeScript的私有方法检查
    // @ts-ignore
    return this.fetchKnowledgeFromRemoteApi(query);
  }
}

// 创建模拟上下文
export function createMockContext(childProfile?: Partial<ChildProfile>): ActorContext {
  const mockChildProfile: ChildProfile = {
    id: 'test_child_1',
    name: '测试用户',
    age: 4,
    gender: 'other',
    preferredLanguage: 'zh',
    interests: ['恐龙', '太空'],
    dislikes: ['危险'],
    learningProgress: { 'knowledge_1': 0.5 },
    lastInteraction: new Date(),
    languageLevel: 'L2',
    ...childProfile
  };

  const mockMessage: Message = {
    id: 'msg_1',
    type: 'user',
    content: '你好',
    timestamp: new Date(),
    sender: 'test_user',
    recipient: 'agent'
  };

  return {
    childProfile: mockChildProfile,
    conversationHistory: [mockMessage],
    knowledgeBase: []
  };
}

export { TestableExecutionAgent };

// 测试函数
async function runKnowledgeFetchTest() {
  console.log('=== 开始测试fetchKnowledgeFromRemoteApi方法 ===\n');
  
  const agent = new TestableExecutionAgent();
  await agent.init(createMockContext());
  
  // 测试查询列表
  const testQueries = [
    'sing a song for you ',

  ];
  
  let allResults = [];
  
  for (const query of testQueries) {
    console.log(`\n测试查询: "${query}"`);
    console.log('----------------------------------------');
    
    const startTime = Date.now();
    try {
      const result = await agent.testFetchKnowledge(query);
      const endTime = Date.now();


      console.log(`原始res: "${result.content}"`);
      
      // console.log(`查询耗时: ${endTime - startTime} ms`);
      // console.log(`hasMatch: ${result.hasMatch}`);
      // console.log(`内容长度: ${result.content.length} 字符`);
      // console.log(`内容预览: "${result.content.substring(0, 100)}${result.content.length > 100 ? '...' : ''}"`);
      
      allResults.push({
        query,
        hasMatch: result.hasMatch,
        contentLength: result.content.length,
        responseTime: endTime - startTime
      });
      
    } catch (error) {
      console.error('查询出错:', error);
      allResults.push({
        query,
        error: String(error)
      });
    }
  }
  
  console.log('\n=== 测试结果汇总 ===');
  console.table(allResults);
  
  // 统计匹配率
  const matchCount = allResults.filter(r => r.hasMatch === true).length;
  const totalQueries = testQueries.length;
  console.log(`\n匹配率: ${matchCount}/${totalQueries} (${(matchCount/totalQueries*100).toFixed(1)}%)`);
  
  console.log('\n=== 测试完成 ===');
}

// 直接运行测试函数（在ES模块中不需要条件检查）
runKnowledgeFetchTest().catch(console.error);