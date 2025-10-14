import axios from 'axios';

/**
 * 知识库API全面测试脚本
 * 测试多种不同类型的查询，以确定API是否能返回有效数据
 */
async function comprehensiveKnowledgeTest() {
  try {
    console.log('=== 知识库API全面测试 ===\n');
    
    // 测试配置
    const apiKey = 'sk-AFVxhsKKYpfMSSIho5hyqskh8Rbd96ZbVytFRy3pan09Vn1g';
    const apiUrl = 'http://136.115.118.154/api/v1/knowledge-chat/d15b185a-a786-4039-b15b-1d6fb4a8d4e3';
    
    // 测试不同类型的查询
    const testQueries = [
      // 1. 中文基础词汇查询
      { category: '中文基础词汇', query: '你好怎么说' },
      { category: '中文基础词汇', query: '苹果的中文' },
      { category: '中文基础词汇', query: '数字1到10的中文' },
      
      // 2. 中文学习方法
      { category: '中文学习方法', query: '如何学习中文拼音' },
      { category: '中文学习方法', query: '教孩子中文的技巧' },
      
      // 3. 日常对话
      { category: '日常对话', query: '你好，很高兴认识你' },
      { category: '日常对话', query: '今天天气怎么样' },
      
      // 4. 英文查询
      { category: '英文查询', query: 'Hello in Chinese' },
      { category: '英文查询', query: 'How to say apple in Chinese' }
    ];
    
    console.log(`API URL: ${apiUrl}`);
    console.log(`API Key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}`);
    console.log(`测试查询总数: ${testQueries.length}\n`);
    
    // 统计信息
    const stats = {
      total: testQueries.length,
      success: 0,
      noMatch: 0,
      error: 0,
      averageResponseTime: 0
    };
    
    const startTime = Date.now();
    
    // 依次测试每个查询
    for (let i = 0; i < testQueries.length; i++) {
      const { category, query } = testQueries[i];
      console.log(`测试 ${i + 1}/${stats.total} [${category}]: "${query}"`);
      
      try {
        const queryStartTime = Date.now();
        const result = await fetchKnowledge(query, apiUrl, apiKey);
        const queryEndTime = Date.now();
        const responseTime = queryEndTime - queryStartTime;
        
        console.log(`  响应时间: ${responseTime} ms`);
        
        if (result.hasValidContent) {
          stats.success++;
          console.log(`  ✅ 状态: 成功获取有效内容`);
          console.log(`  内容长度: ${result.content.length} 字符`);
          // 显示部分内容预览
          const preview = result.content.length > 50 ? result.content.substring(0, 50) + '...' : result.content;
          console.log(`  内容预览: "${preview.replace(/\n/g, '\\n')}"`);
        } else {
          stats.noMatch++;
          console.log(`  ❌ 状态: 无匹配结果`);
          console.log(`  原始内容: "${result.rawContent.replace(/\n/g, '\\n')}"`);
        }
        
        console.log('');
        
      } catch (error) {
        stats.error++;
        console.log(`  ❌ 状态: API调用失败`);
        console.log(`  错误信息: ${error instanceof Error ? error.message : String(error)}`);
        console.log('');
      }
    }
    
    const endTime = Date.now();
    stats.averageResponseTime = Math.round((endTime - startTime) / stats.total);
    
    // 输出测试总结
    console.log('=== 测试总结 ===');
    console.log(`总测试数: ${stats.total}`);
    console.log(`成功获取有效内容: ${stats.success} (${Math.round(stats.success/stats.total*100)}%)`);
    console.log(`无匹配结果: ${stats.noMatch} (${Math.round(stats.noMatch/stats.total*100)}%)`);
    console.log(`API调用失败: ${stats.error} (${Math.round(stats.error/stats.total*100)}%)`);
    console.log(`平均响应时间: ${stats.averageResponseTime} ms`);
    
    // 输出建议
    if (stats.success === 0) {
      console.log('\n建议:');
      console.log('1. 检查API密钥是否正确');
      console.log('2. 确认API端点是否有效');
      console.log('3. 尝试使用知识库中已存在的确切关键词');
      console.log('4. 联系API提供商确认服务状态');
    }
    
    console.log('\n=== 测试完成 ===');
    process.exit(0);
    
  } catch (error) {
    console.error('测试过程中发生致命错误:', error);
    process.exit(1);
  }
}

/**
 * 调用知识库API并处理响应
 */
async function fetchKnowledge(query: string, apiUrl: string, apiKey: string): Promise<{
  hasValidContent: boolean;
  content: string;
  rawContent: string;
}> {
  return new Promise((resolve, reject) => {
    let fullContent = '';
    let isProcessing = false;
    
    axios.post(
      apiUrl,
      { query: query },
      {
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'stream',
        timeout: 15000 // 15秒超时
      }
    ).then(response => {
      response.data.on('data', (chunk: Buffer) => {
        const chunkStr = chunk.toString('utf-8');
        const lines = chunkStr.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const jsonStr = line.substring(5).trim();
              if (jsonStr) {
                const data = JSON.parse(jsonStr);
                if (data.content) {
                  fullContent += data.content;
                }
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      });
      
      response.data.on('end', () => {
        // 清理内容
        const cleanedContent = cleanContent(fullContent);
        
        // 检查是否有有效内容（长度>10且不包含NO_MATCH）
        const hasValidContent = 
          cleanedContent.length > 10 && 
          !cleanedContent.includes('NO_MATCH') &&
          !cleanedContent.includes('无法作答') &&
          !cleanedContent.includes('未检索到相关信息');
        
        resolve({
          hasValidContent,
          content: cleanedContent,
          rawContent: fullContent
        });
      });
      
      response.data.on('error', (error: Error) => {
        reject(error);
      });
      
    }).catch(error => {
      reject(error);
    });
  });
}

/**
 * 清理API返回的内容
 */
function cleanContent(content: string): string {
  return content
    .replace(/```/g, '')
    .replace(/\/\*\*\*/g, '')
    .replace(/\*\*\*\//g, '')
    .replace(/\</think>/g, '')
    .replace(/\</think>/g, '')
    .replace(/<\/think>/g, '')
    .replace(/NO_MATCH/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 运行测试
comprehensiveKnowledgeTest();