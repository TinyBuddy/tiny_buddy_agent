// 测试PlanningAgent功能
import { PlanningAgent } from './src/actors/planningAgent';
import { ChildProfile } from './src/models/childProfile';
import { KnowledgeContent } from './src/models/content';

async function testPlanningAgent() {
  console.log('=== 开始测试 PlanningAgent ===');
  
  try {
    // 创建PlanningAgent实例（不需要知识库和记忆服务）
    const planningAgent = new PlanningAgent({
      // 可以传入mock服务，这里暂时留空
    });
    
    // 初始化Agent
    console.log('初始化PlanningAgent...');
    await planningAgent.init();
    
    // 创建测试上下文
    const mockChildProfile: ChildProfile = {
      id: 'test_child_001',
      name: '测试小朋友',
      age: 8,
      gender: 'male',
      preferredLanguage: 'zh',
      interests: ['编程', '科学', '音乐'],
      dislikes: [],
      learningProgress: {},
      lastInteraction: new Date(),
      languageLevel: 'L3',
    };
    
    const context = {
      childProfile: mockChildProfile,
      conversationHistory: [],
      knowledgeBase: [] as KnowledgeContent[],
    };
    
    // 测试输入
    const testInput = '你好，我今天想学习新知识！';
    console.log(`\n输入消息: "${testInput}"`);
    
    // 调用process方法
    console.log('调用PlanningAgent.process()...');
    const startTime = Date.now();
    const result = await planningAgent.process({
      input: testInput,
      context,
    });
    const endTime = Date.now();
    
    console.log(`\n处理耗时: ${endTime - startTime} 毫秒`);
    
    // 检查结果
    if (!result || !result.output) {
      console.error('错误: PlanningAgent未返回有效的规划结果');
      process.exit(1);
    }
    
    console.log('\n原始规划结果:');
    console.log(result.output);
    
    // 尝试解析JSON
    try {
      const parsedResult = JSON.parse(result.output);
      console.log('\n解析后的规划结果:');
      console.log(JSON.stringify(parsedResult, null, 2));
      
      // 检查必要字段
      if (parsedResult.type === 'plan' && 
          parsedResult.interactionType && 
          parsedResult.objectives && 
          parsedResult.strategy) {
        console.log('\n✅ 规划结果包含所有必要字段');
        console.log(`互动类型: ${parsedResult.interactionType}`);
        console.log(`目标: ${parsedResult.objectives.join(', ')}`);
        console.log(`策略: ${parsedResult.strategy}`);
      } else {
        console.log('\n⚠️  规划结果缺少部分必要字段');
      }
    } catch (parseError) {
      console.error('\n错误: 无法解析规划结果为JSON:', parseError);
    }
    
    console.log('\n=== PlanningAgent 测试完成 ===');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error);
    process.exit(1);
  }
}

// 运行测试
testPlanningAgent();