import axios from 'axios';

/**
 * 简化的知识库修复验证脚本
 * 避免复杂的字符处理，专注于核心逻辑验证
 */
async function verifyKnowledgeSimple() {
  try {
    console.log('=== 简化知识库修复验证 ===\n');
    
    // API配置
    const apiKey = 'sk-AFVxhsKKYpfMSSIho5hyqskh8Rbd96ZbVytFRy3pan09Vn1g';
    const apiUrl = 'http://136.115.118.154/api/v1/knowledge-chat/d15b185a-a786-4039-b15b-1d6fb4a8d4e3';
    
    // 测试查询
    const testQuery = '你好怎么说';
    
    console.log(`测试查询: "${testQuery}"`);
    console.log(`API URL: ${apiUrl}`);
    console.log('\n开始测试...\n');
    
    try {
      const startTime = Date.now();
      
      // 调用API
      const response = await axios.post(
        apiUrl,
        { query: testQuery },
        {
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
          },
          responseType: 'stream',
          timeout: 15000
        }
      );
      
      // 收集完整响应
      const fullContent = await collectStreamContent(response.data);
      const endTime = Date.now();
      
      console.log(`响应时间: ${endTime - startTime} ms`);
      console.log(`状态码: ${response.status}`);
      console.log(`响应内容长度: ${fullContent.length} 字符`);
      
      // 检查是否包含NO_MATCH标记
      const hasNoMatch = checkForNoMatch(fullContent);
      console.log(`包含NO_MATCH标记: ${hasNoMatch ? '✅ 是' : '❌ 否'}`);
      
      // 输出响应内容样本
      if (fullContent.length > 200) {
        console.log('响应内容样本 (前200字符):');
        console.log(fullContent.substring(0, 200));
      } else {
        console.log('完整响应内容:');
        console.log(fullContent);
      }
      
      // 根据测试结果提供建议
      console.log('\n=== 修复建议 ===');
      console.log('1. 在executionAgent.ts中增强NO_MATCH检测逻辑');
      console.log('2. 确保在检测到NO_MATCH时不使用该内容');
      console.log('3. 添加额外的内容有效性检查');
      console.log('4. 增加详细日志便于调试');
      
    } catch (error) {
      console.error('API调用失败:', error instanceof Error ? error.message : String(error));
    }
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
    process.exit(1);
  }
}

/**
 * 收集流式响应内容
 */
async function collectStreamContent(stream: any): Promise<string> {
  return new Promise((resolve) => {
    let content = '';
    
    stream.on('data', (chunk: Buffer) => {
      content += chunk.toString('utf-8');
    });
    
    stream.on('end', () => {
      resolve(content);
    });
    
    stream.on('error', () => {
      resolve('');
    });
  });
}

/**
 * 检查内容是否包含NO_MATCH标记
 */
function checkForNoMatch(content: string): boolean {
  // 检查多种可能的NO_MATCH形式
  const patterns = ['NO_MATCH', 'no_match', '无法作答', '未检索到相关信息'];
  for (const pattern of patterns) {
    if (content.includes(pattern)) {
      return true;
    }
  }
  return false;
}

// 运行测试
verifyKnowledgeSimple();