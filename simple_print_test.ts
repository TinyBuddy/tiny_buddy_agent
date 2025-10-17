// 简单测试打印完整API响应
import axios from 'axios';

// API配置
const API_CONFIG = {
  url: 'http://136.115.118.154/api/v1/knowledge-chat/d15b185a-a786-4039-b15b-1d6fb4a8d4e3',
  headers: {
    'X-API-Key': 'sk-AFVxhsKKYpfMSSIho5hyqskh8Rbd96ZbVytFRy3pan09Vn1g',
    'Content-Type': 'application/json'
  }
};

async function testHappyMusic() {
  try {
    console.log('开始测试"快乐的音乐"查询...');
    console.log('发送请求到:', API_CONFIG.url);
    
    const response = await axios.post(
      API_CONFIG.url,
      { query: '快乐的音乐' },
      {
        timeout: 20000,
        headers: API_CONFIG.headers,
        responseType: 'stream'
      }
    );
    
    console.log('\nAPI响应状态码:', response.status);
    
    // 收集并打印所有响应数据
    const chunks: string[] = [];
    let fullResponse = '';
    
    await new Promise<void>((resolve, reject) => {
      response.data.on('data', (chunk: Buffer) => {
        const chunkStr = chunk.toString('utf-8');
        chunks.push(chunkStr);
        console.log('\n收到数据块:');
        console.log(chunkStr);
      });
      
      response.data.on('end', () => {
        fullResponse = chunks.join('');
        console.log('\n=== 完整响应内容 ===');
        console.log(fullResponse);
        console.log('=== 响应内容结束 ===');
        resolve();
      });
      
      response.data.on('error', (err: any) => {
        reject(err);
      });
    });
    
    // 尝试解析响应内容
    console.log('\n=== 尝试解析响应内容 ===');
    try {
      const lines = fullResponse.split('\n');
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const jsonStr = line.substring(5).trim();
          if (jsonStr) {
            const data = JSON.parse(jsonStr);
            console.log('解析到数据:', data);
          }
        }
      }
    } catch (parseError) {
      console.log('解析错误:', parseError);
    }
    
  } catch (error: any) {
    console.error('\n测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testHappyMusic();