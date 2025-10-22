import axios from 'axios';
import { ExecutionAgent } from './src/actors/executionAgent';

/**
 * 测试ExecutionAgent中的知识库API集成功能
 * 专门验证fetchKnowledgeFromRemoteApi方法是否能正确返回有效数据
 */
async function testExecutionAgentKnowledge() {
  try {
    console.log('=== ExecutionAgent知识库API集成测试 ===\n');
    
    // 创建模拟上下文和参数
    const mockContext = {
      childProfile: {
        name: 'Test Child',
        age: 8,
        language: 'zh'
      }
    };
    
    const testQuery = '你好怎么说'; // 与之前成功测试相同的查询
    
    console.log(`测试查询: "${testQuery}"`);
    
    // 初始化ExecutionAgent（如果需要完整初始化）
    // 或者直接测试fetchKnowledgeFromRemoteApi方法
    // 由于fetchKnowledgeFromRemoteApi是私有方法，我们需要创建一个代理来访问它
    
    // 直接复制fetchKnowledgeFromRemoteApi方法的核心逻辑进行测试
    console.log('\n=== 直接测试API调用逻辑 ===');
    const apiResult = await directTestKnowledgeApi(testQuery);
    
    console.log('\n=== 测试结论 ===');
    console.log(`API调用成功: ${apiResult.success}`);
    if (apiResult.success) {
      console.log(`返回内容长度: ${apiResult.content.length} 字符`);
      console.log(`内容预览: "${apiResult.content.substring(0, 100)}${apiResult.content.length > 100 ? '...' : ''}"`);
      console.log(`有效匹配: ${apiResult.hasMatch}`);
    } else {
      console.log('错误信息:', apiResult.error);
    }
    
    // 额外测试：创建一个简化版的executionAgent实例
    console.log('\n=== 测试简化版ExecutionAgent ===');
    const simplifiedAgent = createSimplifiedExecutionAgent();
    const agentResult = await simplifiedAgent.testFetchKnowledge(testQuery);
    
    console.log('\n=== 简化版Agent测试结论 ===');
    console.log(`API调用成功: ${agentResult.success}`);
    if (agentResult.success) {
      console.log(`返回内容长度: ${agentResult.content.length} 字符`);
      console.log(`内容预览: "${agentResult.content.substring(0, 100)}${agentResult.content.length > 100 ? '...' : ''}"`);
    } else {
      console.log('错误信息:', agentResult.error);
    }
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
    process.exit(1);
  }
}

/**
 * 直接测试知识库API调用逻辑
 */
async function directTestKnowledgeApi(query: string): Promise<{
  success: boolean;
  content: string;
  hasMatch: boolean;
  error?: string;
}> {
  try {
    const apiKey = 'sk-AFVxhsKKYpfMSSIho5hyqskh8Rbd96ZbVytFRy3pan09Vn1g';
    const apiUrl = 'http://136.115.118.154/api/v1/knowledge-chat/d15b185a-a786-4039-b15b-1d6fb4a8d4e3';
    
    console.log(`API URL: ${apiUrl}`);
    console.log(`正在发送请求...`);
    
    const startTime = Date.now();
    
    const response = await axios.post(
      apiUrl,
      { query: query },
      {
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'stream',
        timeout: 15000
      }
    );
    
    const endTime = Date.now();
    console.log(`请求成功，状态码: ${response.status}`);
    console.log(`响应时间: ${endTime - startTime} ms`);
    
    // 处理流式响应
    const fullContent = await processKnowledgeStreamResponse(response.data);
    
    console.log(`原始内容长度: ${fullContent.length} 字符`);
    
    // 检查是否有匹配结果
    const hasMatch = fullContent && !fullContent.includes('NO_MATCH') && 
                    !fullContent.includes('无法作答') && fullContent.trim().length > 10;
    
    // 清理内容
    let cleanedContent = fullContent;
    cleanedContent = cleanedContent.split('```').join('');
    cleanedContent = cleanedContent.split('\</think>').join('');
    cleanedContent = cleanedContent.split('</think>').join('');
    cleanedContent = cleanedContent.split('NO_MATCH').join('');
    cleanedContent = cleanedContent.split('无法作答').join('');
    cleanedContent = cleanedContent.split('未检索到相关信息').join('');
    cleanedContent = cleanedContent.replace(/\s+/g, ' ');
    cleanedContent = cleanedContent.trim();
    
    console.log(`清理后内容长度: ${cleanedContent.length} 字符`);
    console.log(`清理后内容: "${cleanedContent}"`);
    
    return {
      success: true,
      content: cleanedContent,
      hasMatch: hasMatch
    };
    
  } catch (error) {
    console.error('API调用失败:', error);
    return {
      success: false,
      content: '',
      hasMatch: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 处理知识库API的流式响应
 */
async function processKnowledgeStreamResponse(stream: any): Promise<string> {
  return new Promise((resolve) => {
    let fullContent = '';
    
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
      resolve(fullContent);
    });
    
    stream.on('error', () => {
      resolve('');
    });
  });
}

/**
 * 创建简化版的ExecutionAgent用于测试
 */
function createSimplifiedExecutionAgent() {
  return {
    async testFetchKnowledge(query: string) {
      try {
        const apiKey = 'sk-AFVxhsKKYpfMSSIho5hyqskh8Rbd96ZbVytFRy3pan09Vn1g';
        const apiUrl = 'http://136.115.118.154/api/v1/knowledge-chat/d15b185a-a786-4039-b15b-1d6fb4a8d4e3';
        
        console.log(`测试简化版Agent调用API，查询: ${query}`);
        
        const response = await axios.post(
          apiUrl,
          { query: query },
          {
            headers: {
              'X-API-Key': apiKey,
              'Content-Type': 'application/json'
            },
            responseType: 'stream',
            timeout: 15000
          }
        );
        
        const fullContent = await processKnowledgeStreamResponse(response.data);
        
        // 使用与executionAgent相同的清理逻辑
        const cleanedContent = fullContent
          .replace(/```/g, '')
          .replace(/\</think>/g, '')
          .replace(/<\/think>/g, '')
          .replace(/NO_MATCH/g, '')
          .replace(/无法作答/g, '')
          .replace(/未检索到相关信息/g, '')
          .replace(/\s+/g, ' ')  
          .trim();
        
        return {
          success: true,
          content: cleanedContent
        };
        
      } catch (error) {
        return {
          success: false,
          content: '',
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  };
}

// 运行测试
testExecutionAgentKnowledge();