// 直接测试"快乐的音乐"查询
import axios from 'axios';

// 从executionAgent.ts中提取的正确知识库API配置
const API_CONFIG = {
  url: 'http://136.115.118.154/api/v1/knowledge-chat/d15b185a-a786-4039-b15b-1d6fb4a8d4e3',
  apiKey: 'sk-AFVxhsKKYpfMSSIho5hyqskh8Rbd96ZbVytFRy3pan09Vn1g',
  timeout: 15000,
  headers: {
    'X-API-Key': 'sk-AFVxhsKKYpfMSSIho5hyqskh8Rbd96ZbVytFRy3pan09Vn1g',
    'Content-Type': 'application/json'
  }
};

// 处理流式响应的函数
async function processStreamResponse(stream: any): Promise<string> {
  return new Promise((resolve) => {
    let fullContent = '';
    let hasNoMatch = false;
    let receivedChunks = [];
    
    stream.on('data', (chunk: Buffer) => {
      const chunkStr = chunk.toString('utf-8');
      receivedChunks.push(chunkStr);
      console.log('收到数据块:', chunkStr); // 打印每个接收到的数据块
      
      const lines = chunkStr.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data:')) {
          try {
            const jsonStr = line.substring(5).trim();
            if (jsonStr) {
              const data = JSON.parse(jsonStr);
              fullContent += data.content || '';
            }
          } catch (e) {
            // 处理无效的JSON
            fullContent += line.substring(5).trim();
          }
        }
      }
    });
    
    stream.on('end', () => {
      console.log('\n所有接收到的数据块:');
      receivedChunks.forEach((chunk, index) => {
        console.log(`块 ${index + 1}: ${chunk}`);
      });
      resolve(fullContent);
    });
    
    stream.on('error', (err: any) => {
      console.error('流式处理错误:', err);
      resolve(fullContent);
    });
  });
}

// 处理知识库响应的函数
function processKnowledgeResponse(content: string): { hasMatch: boolean; content: string } {
  console.log('\n=== 完整原始知识库响应内容 ===');
  console.log(content);
  console.log('=== 原始响应内容结束 ===');
  
  // 检查无效标记
  if (content.includes('NO_MATCH') || 
      content.includes('无法作答') || 
      content.includes('没有相关答案')) {
    console.log('检测到无效标记，没有找到匹配的知识');
    return { hasMatch: false, content: '' };
  }
  
  // 提取真实内容（移除</think>标记）
  let cleanContent = content;
  if (content.includes('</think>')) {
    const startMatch = content.indexOf('</think>');
    const endMatch = content.lastIndexOf('</think>');
    if (startMatch !== -1 && endMatch !== -1 && startMatch !== endMatch) {
      cleanContent = content.substring(startMatch + 3, endMatch).trim();
    }
  }
  
  // 移除代码块标记
  cleanContent = cleanContent.replace(/```[^`]*```/g, '');
  
  // 合并空白字符
  cleanContent = cleanContent.replace(/\s+/g, ' ').trim();
  
  // 内容过短时视为无匹配
  if (cleanContent.length < 10) {
    return { hasMatch: false, content: '' };
  }
  
  return { hasMatch: true, content: cleanContent };
}

// 测试函数
async function testHappyMusicDirect() {
  console.log('=== 直接测试"快乐的音乐"查询 ===\n');
  
  const query = '快乐的音乐';
  console.log(`测试查询: "${query}"`);
  console.log('----------------------------------------');
  
  const startTime = Date.now();
  try {
    // 发送API请求，使用正确的配置
    const response = await axios.post(
      API_CONFIG.url,
      { query },
      {
        timeout: API_CONFIG.timeout,
        headers: API_CONFIG.headers,
        responseType: 'stream' // 设置为流式响应
      }
    );
    
    console.log('API连接成功，HTTP状态码:', response.status);
    console.log('响应头信息:');
    Object.entries(response.headers).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log('开始处理流式响应...');
    
    // 处理流式响应
    const fullContent = await processStreamResponse(response.data);
    const endTime = Date.now();
    
    console.log(`\n响应处理完成，耗时: ${endTime - startTime} ms`);
    console.log(`原始内容长度: ${fullContent.length}`);
    
    // 处理响应内容
    const result = processKnowledgeResponse(fullContent);
    
    console.log(`\nhasMatch: ${result.hasMatch}`);
    console.log(`内容长度: ${result.content.length} 字符`);
    
    if (result.hasMatch && result.content) {
      console.log('\n查询结果:');
      console.log('----------------------------------------');
      console.log(result.content);
      console.log('----------------------------------------');
    } else {
      console.log('\n查询结果: 无匹配内容');
    }
    
  } catch (error: any) {
    console.error('\n查询出错:');
    if (error.response) {
      console.error('  状态码:', error.response.status);
      console.error('  响应数据:', error.response.data);
      console.error('  响应头:', error.response.headers);
    } else if (error.request) {
      console.error('  请求已发送但未收到响应:', error.request);
    } else {
      console.error('  错误信息:', error.message);
    }
    console.error('  配置:', error.config);
  }
  
  console.log('\n=== 测试完成 ===');
}

// 运行测试
testHappyMusicDirect().catch(console.error);