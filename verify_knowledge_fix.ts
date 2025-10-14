import axios from 'axios';

/**
 * 验证知识库修复效果的测试脚本
 * 模拟executionAgent中的知识库API调用逻辑
 */
async function verifyKnowledgeFix() {
  try {
    console.log('=== 验证知识库修复效果 ===\n');
    
    // API配置
    const apiKey = 'sk-AFVxhsKKYpfMSSIho5hyqskh8Rbd96ZbVytFRy3pan09Vn1g';
    const apiUrl = 'http://136.115.118.154/api/v1/knowledge-chat/d15b185a-a786-4039-b15b-1d6fb4a8d4e3';
    
    // 测试多个查询
    const testQueries = [
      { name: '基础中文词汇', query: '你好怎么说' },
      { name: '学习方法', query: '如何学习中文' },
      { name: '日常对话', query: '今天天气怎么样' },
      { name: '英文查询', query: 'Hello in Chinese' }
    ];
    
    console.log(`测试查询总数: ${testQueries.length}`);
    console.log(`API URL: ${apiUrl}`);
    console.log('\n开始测试...\n');
    
    // 对每个查询进行测试
    for (const test of testQueries) {
      console.log(`=== 测试: ${test.name} ===`);
      console.log(`查询内容: "${test.query}"`);
      
      try {
        const startTime = Date.now();
        
        // 调用API
        const response = await axios.post(
          apiUrl,
          { query: test.query },
          {
            headers: {
              'X-API-Key': apiKey,
              'Content-Type': 'application/json'
            },
            responseType: 'stream',
            timeout: 15000
          }
        );
        
        // 使用修复后的逻辑处理响应
        const result = await processKnowledgeResponse(response.data);
        
        const endTime = Date.now();
        
        console.log(`响应时间: ${endTime - startTime} ms`);
        console.log(`状态码: ${response.status}`);
        console.log(`找到有效内容: ${result.hasValidContent ? '✅ 是' : '❌ 否'}`);
        
        if (result.hasValidContent) {
          console.log(`内容长度: ${result.content.length} 字符`);
          console.log(`内容预览: "${result.content.substring(0, 100)}${result.content.length > 100 ? '...' : ''}"`);
        } else {
          console.log(`原因: ${result.reason || '未找到匹配内容'}`);
        }
        
      } catch (error) {
        console.error('API调用失败:', error instanceof Error ? error.message : String(error));
      }
      
      console.log('\n');
    }
    
    console.log('=== 测试总结 ===');
    console.log('1. 修复后的代码会在检测到NO_MATCH标记时直接返回空字符串');
    console.log('2. 增加了内容长度检查，确保至少有10个字符才视为有效');
    console.log('3. 增强了日志记录，便于调试');
    console.log('4. 优化了特殊标记的处理逻辑');
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
    process.exit(1);
  }
}

/**
 * 模拟修复后的processKnowledgeStreamResponse方法
 */
async function processKnowledgeResponse(stream: any): Promise<{
  hasValidContent: boolean;
  content: string;
  reason?: string;
}> {
  return new Promise((resolve) => {
    let fullContent = '';
    let hasNoMatch = false;
    
    stream.on('data', (chunk: Buffer) => {
      const chunkStr = chunk.toString('utf-8');
      const lines = chunkStr.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data:')) {
          try {
            const jsonStr = line.substring(5).trim();
            if (jsonStr) {
              const data = JSON.parse(jsonStr);
              if (data.content && typeof data.content === 'string') {
                // 实时检查NO_MATCH标记
                if (data.content.includes('NO_MATCH')) {
                  hasNoMatch = true;
                }
                fullContent += data.content;
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    });
    
    stream.on('end', () => {
      console.log('处理原始内容:', fullContent.length > 100 ? fullContent.substring(0, 100) + '...' : fullContent);
      
      // 检查NO_MATCH标记
      if (hasNoMatch || fullContent.includes('NO_MATCH')) {
        resolve({
          hasValidContent: false,
          content: '',
          reason: '检测到NO_MATCH标记'
        });
        return;
      }
      
      // 清理内容 - 使用更安全的方法处理特殊字符
      let cleanedContent = fullContent;
      cleanedContent = cleanedContent.split('```').join('');
      cleanedContent = cleanedContent.split('\</think>').join('');
      cleanedContent = cleanedContent.split('</think>').join('');
      cleanedContent = cleanedContent.split('</think>').join('');
      cleanedContent = cleanedContent.split('无法作答').join('');
      cleanedContent = cleanedContent.split('未检索到相关信息').join('');
      cleanedContent = cleanedContent.replace(/\s+/g, ' ');
      cleanedContent = cleanedContent.trim();
      
      // 检查内容长度
      if (cleanedContent.length < 10) {
        resolve({
          hasValidContent: false,
          content: '',
          reason: '清理后的内容太短'
        });
        return;
      }
      
      resolve({
        hasValidContent: true,
        content: cleanedContent
      });
    });
    
    stream.on('error', () => {
      resolve({
        hasValidContent: false,
        content: '',
        reason: '流式处理错误'
      });
    });
  });
}

// 运行测试
verifyKnowledgeFix();