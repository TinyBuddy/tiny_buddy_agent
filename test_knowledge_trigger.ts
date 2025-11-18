import axios from 'axios';

/**
 * 测试新的知识库触发机制
 * 验证Tool Call Instructions修改后的效果
 */
async function testKnowledgeTrigger() {
  try {
    console.log('=== 测试新的知识库触发机制 ===\n');
    
    // 测试用例 - 包含所有触发关键词
    const testCases = [
      { name: 'sing a song', query: 'Can you sing a song for me?' },
      { name: 'needs a song', query: 'I needs a song right now' },
      { name: 'nursery rhymes', query: 'I want to hear some nursery rhymes' },
      { name: 'music', query: 'Play some music please' },
      { name: 'stories', query: 'Tell me a story' },
      { name: 'rhyme', query: 'Do you know any rhyme?' },
      { name: 'poem', query: 'Can you recite a poem?' },
      { name: 'lullaby', query: 'Sing me a lullaby' },
      { name: 'bored', query: 'I\'m bored, let\'s have fun' },
      { name: 'entertainment', query: 'I want some entertainment' }
    ];
    
    console.log(`测试用例总数: ${testCases.length}`);
    console.log('\n开始测试...\n');
    
    // API配置
    const apiKey = 'sk-AFVxhsKKYpfMSSIho5hyqskh8Rbd96ZbVytFRy3pan09Vn1g';
    const apiUrl = 'http://localhost:3144/api/agent/generate-prompt';
    
    // 测试每个用例
    for (const testCase of testCases) {
      console.log(`=== 测试: ${testCase.name} ===`);
      console.log(`用户输入: "${testCase.query}"`);
      
      try {
        const response = await axios.post(
          apiUrl,
          {
            childID: 'test_child_001',
            message: testCase.query,
            languageLevel: 'L1',
            chatHistory: []
          },
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );
        
        if (response.data.success) {
          const prompt = response.data.data.prompt;
          
          // 检查是否包含知识库调用指令
          const hasKnowledgeCall = prompt.includes('fetch_from_knowledge_base');
          const hasMandatoryTrigger = prompt.includes('MANDATORY TRIGGER CONDITIONS');
          
          console.log(`✅ 请求成功`);
          console.log(`   知识库调用指令: ${hasKnowledgeCall ? '✅ 存在' : '❌ 缺失'}`);
          console.log(`   强制触发机制: ${hasMandatoryTrigger ? '✅ 存在' : '❌ 缺失'}`);
          
          // 检查具体的触发关键词是否被识别
          const triggerWords = ['sing a song', 'nursery rhymes', 'music', 'stories', 'rhyme', 'poem', 'lullaby'];
          const foundTriggers = triggerWords.filter(word => 
            prompt.toLowerCase().includes(word.toLowerCase())
          );
          
          if (foundTriggers.length > 0) {
            console.log(`   检测到的触发词: ${foundTriggers.join(', ')}`);
          }
          
          // 检查JSON格式是否正确
          const jsonMatch = prompt.match(/\{\s*"reply".*?"fetch_from_knowledge_base".*?\}/s);
          console.log(`   JSON格式: ${jsonMatch ? '✅ 正确' : '❌ 不正确'}`);
          
        } else {
          console.log(`❌ 请求失败: ${response.data.msg}`);
        }
        
      } catch (error: any) {
        console.log(`❌ 请求错误: ${error.message}`);
      }
      
      console.log(''); // 空行分隔
    }
    
    console.log('=== 测试完成 ===');
    
  } catch (error) {
    console.error('测试脚本执行错误:', error);
  }
}

// 运行测试
testKnowledgeTrigger().catch(console.error);