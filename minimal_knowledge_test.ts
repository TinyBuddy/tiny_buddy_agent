import axios from 'axios';

/**
 * 最小化知识库API测试脚本
 * 简单直接地测试API响应
 */
async function minimalKnowledgeTest() {
  try {
    console.log('=== 最小化知识库API测试 ===\n');
    
    // API配置
    const apiKey = 'sk-AFVxhsKKYpfMSSIho5hyqskh8Rbd96ZbVytFRy3pan09Vn1g';
    const apiUrl = 'http://136.115.118.154/api/v1/knowledge-chat/d15b185a-a786-4039-b15b-1d6fb4a8d4e3';
    const testQuery = '你好怎么说';
    
    console.log(`API URL: ${apiUrl}`);
    console.log(`查询内容: "${testQuery}"`);
    console.log('\n发送请求...');
    
    const startTime = Date.now();
    
    // 发送请求
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
    
    // 收集完整响应内容
    const fullContent = await collectStreamContent(response.data);
    
    const endTime = Date.now();
    
    // 打印结果
    console.log('\n=== 测试结果 ===');
    console.log(`状态码: ${response.status}`);
    console.log(`响应时间: ${endTime - startTime} ms`);
    console.log(`内容长度: ${fullContent.length} 字符`);
    console.log('\n原始响应内容:');
    console.log(fullContent);
    
    // 检查是否有有效内容
    const hasValidContent = checkValidContent(fullContent);
    
    console.log('\n=== 内容分析 ===');
    console.log(`包含有效内容: ${hasValidContent ? '✅ 是' : '❌ 否'}`);
    if (hasValidContent) {
      // 尝试提取有用信息
      const usefulInfo = extractUsefulInfo(fullContent);
      console.log(`提取的有用信息: "${usefulInfo}"`);
    }
    
  } catch (error) {
    console.error('\n=== 测试失败 ===');
    console.error('错误信息:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error) {
      console.error('错误堆栈:', error.stack);
    }
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
 * 检查内容是否有效
 */
function checkValidContent(content: string): boolean {
  if (!content || content.length < 10) {
    return false;
  }
  
  // 检查是否包含无效标记
  const invalidMarkers = ['NO_MATCH', '无法作答', '未检索到相关信息'];
  for (const marker of invalidMarkers) {
    if (content.includes(marker)) {
      return false;
    }
  }
  
  // 检查是否包含中文字符
  return /[\u4e00-\u9fa5]/.test(content);
}

/**
 * 尝试从响应中提取有用信息
 */
function extractUsefulInfo(content: string): string {
  try {
    // 简单的文本清理
    let cleaned = content;
    
    // 移除常见的标记
    cleaned = cleaned.replace(/```/g, '');
    cleaned = cleaned.replace(/<\/think>/g, '');
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.trim();
    
    // 限制长度以便显示
    return cleaned.length > 200 ? cleaned.substring(0, 200) + '...' : cleaned;
  } catch (e) {
    return content.substring(0, 200) + '...';
  }
}

// 运行测试
minimalKnowledgeTest();