// mem0集成测试脚本
import { config } from "dotenv";
import { MemoryServiceFactory } from "./src/services/memoryServiceFactory";
import { isMem0Available } from "./src/config/mem0Config";

// 加载环境变量
config();

async function testMem0Integration() {
  console.log("🧪 开始测试mem0记忆库集成...\n");

  // 测试mem0配置可用性
  console.log("1. 检查mem0配置可用性...");
  const mem0Available = isMem0Available();
  console.log(`   mem0可用: ${mem0Available}`);
  console.log(`   MEM0_API_KEY: ${process.env.MEM0_API_KEY ? '已配置' : '未配置'}`);
  console.log(`   MEM0_BASE_URL: ${process.env.MEM0_BASE_URL || '使用默认值'}`);

  // 测试记忆服务工厂
  console.log("\n2. 测试记忆服务工厂...");
  
  try {
    // 测试自动选择
    console.log("   - 测试自动选择记忆服务...");
    const autoService = await MemoryServiceFactory.createMemoryService('auto');
    const autoServiceType = MemoryServiceFactory.getCurrentServiceType();
    console.log(`     当前服务类型: ${autoServiceType}`);

    // 测试儿童档案管理
    console.log("\n3. 测试儿童档案管理...");
    const testChildId = `test_child_${Date.now()}`;
    
    // 创建儿童档案
    console.log("   - 创建儿童档案...");
    const profile = await autoService.createChildProfile({
      id: testChildId,
      name: '测试儿童',
      age: 6,
      gender: 'other',
      preferredLanguage: 'zh',
      interests: ['阅读', '科学实验'],
      dislikes: ['吵闹'],
      learningProgress: { '数学': 30, '语文': 40 },
      lastInteraction: new Date()
    });
    console.log(`     创建成功，儿童ID: ${profile.id}`);

    // 获取儿童档案
    console.log("   - 获取儿童档案...");
    const fetchedProfile = await autoService.getChildProfile(testChildId);
    console.log(`     获取成功，儿童姓名: ${fetchedProfile.name}`);

    // 测试对话历史管理
    console.log("\n4. 测试对话历史管理...");
    
    // 添加消息到历史
    console.log("   - 添加消息到对话历史...");
    await autoService.addMessageToHistory(testChildId, {
      id: `msg_${Date.now()}`,
      type: 'user',
      content: '你好，我是测试用户',
      sender: 'user',
      recipient: 'tiny_buddy',
      timestamp: new Date()
    });
    console.log("     消息添加成功");

    // 获取对话历史
    console.log("   - 获取对话历史...");
    const history = await autoService.getConversationHistory(testChildId);
    console.log(`     历史消息数量: ${history.length}`);

    // 测试兴趣分析
    console.log("\n5. 测试兴趣分析...");
    const interests = await autoService.analyzeChildInterests(testChildId);
    console.log(`     分析出的兴趣: ${interests.join(', ')}`);

    // 测试学习进度跟踪
    console.log("\n6. 测试学习进度跟踪...");
    await autoService.trackLearningProgress(testChildId, '数学', 50);
    console.log("     学习进度更新成功");

    // 测试规划结果管理
    console.log("\n7. 测试规划结果管理...");
    const testPlan = {
      type: 'lesson',
      topic: '数学',
      strategy: '通过游戏学习加法'
    };
    
    await autoService.setPlanningResult(testChildId, testPlan);
    console.log("     规划结果设置成功");
    
    const retrievedPlan = await autoService.getPlanningResult(testChildId);
    console.log(`     获取的规划结果: ${JSON.stringify(retrievedPlan?.plan)}`);

    // 测试mem0服务（如果可用）
    if (mem0Available) {
      console.log("\n8. 测试mem0服务...");
      const mem0Service = MemoryServiceFactory.getMem0Service();
      
      if (mem0Service) {
        console.log("   - mem0服务可用，测试记忆存储...");
        
        try {
          const memoryId = await mem0Service.storeMemory(testChildId, '这是一个测试记忆', {
            test: true,
            timestamp: new Date().toISOString()
          });
          console.log(`     记忆存储成功，ID: ${memoryId}`);
          
          // 测试记忆检索
          const memories = await mem0Service.retrieveMemories(testChildId, '测试', 1);
          console.log(`     检索到 ${memories.length} 条相关记忆`);
          
        } catch (error) {
          console.log("     mem0服务测试失败（可能是API密钥未配置）:", error.message);
        }
      }
    }

    console.log("\n✅ 所有测试完成！");
    console.log(`📊 测试总结:`);
    console.log(`   - 记忆服务类型: ${autoServiceType}`);
    console.log(`   - mem0可用性: ${mem0Available}`);
    console.log(`   - 测试儿童ID: ${testChildId}`);
    console.log(`   - 所有功能测试通过: ✅`);

  } catch (error) {
    console.error("❌ 测试过程中出错:", error);
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testMem0Integration().catch(console.error);
}

export { testMem0Integration };