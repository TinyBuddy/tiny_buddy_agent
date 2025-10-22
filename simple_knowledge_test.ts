import axios from 'axios';

/**
 * 简单知识库API测试脚本
 * 用于直接测试API响应内容
 */
async function simpleKnowledgeTest() {
  try {
    console.log('=== 简单知识库API测试 ===\n');
    
    // API配置
    const apiKey = 'sk-AFVxhsKKYpfMSSIho5hyqskh8Rbd96ZbVytFRy3pan09Vn1g';
    const apiUrl = 'http://136.115.118.154/api/v1/knowledge-chat/d15b185a-a786-4039-b15b-1d6fb4a8d4e3';
    const testQuery = '你好怎么说'; // 简单的中文查询
    
    console.log(`API URL: ${apiUrl}`);
    console.log(`查询内容: "${testQuery}"`);
    console.log('正在发送请求...\n');
    
    const startTime = Date.now();
    
    // 发送请求并处理流式响应
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
    
    // 收集流式响应
    const fullContent = await new Promise<string>((resolve) => {
      let content = '';
      response.data.on('data', (chunk: Buffer) => {
        const chunkStr = chunk.toString('utf-8');
        console.log('收到数据片段:', chunkStr);
        content += chunkStr;
      });
      
      response.data.on('end', () => {
        resolve(content);
      });
    });
    
    const endTime = Date.now();
    
    console.log('\n=== 响应详情 ===');
    console.log(`响应状态码: ${response.status}`);
    console.log(`响应时间: ${endTime - startTime} ms`);
    console.log(`完整响应内容长度: ${fullContent.length} 字符`);
    console.log('\n完整响应内容:');
    console.log(fullContent);
    
    // 解析响应内容中的实际数据
    const parsedContent = parseKnowledgeContent(fullContent);
    console.log('\n=== 解析结果 ===');
    console.log(`解析到的内容: "${parsedContent}"`);
    console.log(`解析内容长度: ${parsedContent.length} 字符`);
    
    // 判断是否有有效数据
    const hasValidData = parsedContent.length > 10 && 
                       !parsedContent.includes('NO_MATCH') && 
                       !parsedContent.includes('无法作答');
    
    console.log('\n=== 测试结论 ===');
    console.log(`API连接状态: ✅ 成功 (状态码 ${response.status})`);
    console.log(`有效数据返回: ${hasValidData ? '✅ 有有效数据' : '❌ 无有效数据'}`);
    console.log(`响应内容类型: ${response.headers['content-type']}`);
    
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
 * 从流式响应中解析实际的知识内容
 */
function parseKnowledgeContent(rawContent: string): string {
  try {
    // 分割响应行
    const lines = rawContent.split('\n');
    let parsedContent = '';
    
    // 提取data:后面的JSON数据
    for (const line of lines) {
      if (line.trim().startsWith('data:')) {
        try {
          const jsonStr = line.substring(5).trim();
          if (jsonStr) {
            const data = JSON.parse(jsonStr);
            if (data.content && typeof data.content === 'string') {
              parsedContent += data.content;
            }
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
    
    // 清理内容
    return parsedContent
      .replace(/```/g, '')
      .replace(/\s+/g, ' ')
      .trim();
      
  } catch (e) {
    console.error('解析内容时出错:', e);
    return '';
  }
}

// 运行测试
simpleKnowledgeTest();