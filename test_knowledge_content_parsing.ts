import axios from 'axios';

/**
 * 知识库API响应内容解析测试
 * 这个脚本专门测试是否能正确获取和解析API返回的知识内容
 */
async function testKnowledgeContentParsing() {
  try {
    console.log('=== 知识库API响应内容解析测试 ===');
    
    // 测试配置
    const apiKey = 'sk-AFVxhsKKYpfMSSIho5hyqskh8Rbd96ZbVytFRy3pan09Vn1g';
    const apiUrl = 'http://136.115.118.154/api/v1/knowledge-chat/d15b185a-a786-4039-b15b-1d6fb4a8d4e3';
    const testQuery = '如何学习中文'; // 选择一个明确的查询用于详细测试
    
    console.log(`测试查询: "${testQuery}"`);
    console.log(`API URL: ${apiUrl}`);
    console.log(`API Key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}`);
    console.log('\n开始测试...\n');
    
    // 记录开始时间
    const startTime = Date.now();
    
    // 创建一个信号量来处理超时
    const timeoutSignal = AbortSignal.timeout(30000); // 30秒超时
    
    try {
      // 调用API并处理流式响应
      const response = await axios.post(
        apiUrl,
        { query: testQuery },
        {
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
          },
          responseType: 'stream',
          signal: timeoutSignal
        }
      );
      
      console.log('API调用成功，开始处理流式响应...');
      console.log(`状态码: ${response.status}`);
      console.log(`状态文本: ${response.statusText}`);
      console.log(`内容类型: ${response.headers['content-type']}`);
      
      // 收集完整的响应内容
      const fullResponse = await new Promise<string>((resolve, reject) => {
        let rawData = '';
        let parsedContent = '';
        
        response.data.on('data', (chunk: Buffer) => {
          const chunkStr = chunk.toString('utf-8');
          rawData += chunkStr;
          
          // 尝试解析事件流格式
          const lines = chunkStr.split('\n');
          for (const line of lines) {
            if (line.startsWith('data:')) {
              try {
                // 提取data字段内容并尝试解析JSON
                const jsonStr = line.substring(5).trim();
                if (jsonStr) {
                  const data = JSON.parse(jsonStr);
                  // 提取content字段
                  if (data.content) {
                    parsedContent += data.content;
                    console.log(`接收到内容片段: "${data.content.replace(/\n/g, '\\n')}"`);
                  }
                  // 检查是否完成
                  if (data.done === true) {
                    console.log('\n响应完成标志已接收');
                  }
                }
              } catch (e) {
                // 如果解析失败，记录原始数据
                console.log(`无法解析的行: ${line}`);
              }
            }
          }
        });
        
        response.data.on('end', () => {
          resolve(parsedContent);
        });
        
        response.data.on('error', (error: Error) => {
          reject(error);
        });
      });
      
      // 记录结束时间
      const endTime = Date.now();
      
      // 输出解析结果
      console.log('\n=== 解析结果 ===');
      console.log(`总响应时间: ${endTime - startTime} ms`);
      console.log(`解析到的完整内容长度: ${fullResponse.length} 字符`);
      console.log(`解析到的完整内容:\n"""${fullResponse}"""`);
      
      // 检查内容质量
      if (fullResponse.length > 0) {
        console.log('\n✅ 测试成功: 成功解析到API返回的知识内容');
        console.log('内容分析:');
        console.log(`- 内容是否为空: 否`);
        console.log(`- 内容是否包含中文: ${/[\u4e00-\u9fa5]/.test(fullResponse)}`);
        console.log(`- 内容是否包含有意义的信息: ${fullResponse.trim().length > 5}`);
      } else {
        console.log('\n❌ 测试失败: 未能解析到有意义的知识内容');
      }
      
    } catch (error) {
      console.error('\n❌ API调用或处理失败:');
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error(`状态码: ${error.response.status}`);
          console.error(`状态文本: ${error.response.statusText}`);
          console.error(`错误消息: ${error.message}`);
        } else if (error.request) {
          console.error('服务器无响应');
          console.error(`错误消息: ${error.message}`);
        } else {
          console.error(`请求配置错误: ${error.message}`);
        }
      } else if (error.name === 'TimeoutError') {
        console.error('请求超时，请检查API服务器响应时间');
      } else {
        console.error(`未知错误: ${error}`);
      }
    }
    
    console.log('\n=== 知识库API响应内容解析测试完成 ===');
    process.exit(0);
    
  } catch (error) {
    console.error('测试过程中发生致命错误:', error);
    process.exit(1);
  }
}

// 运行测试
testKnowledgeContentParsing();