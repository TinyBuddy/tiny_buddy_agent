// 极简测试脚本
import axios from 'axios';
import * as fs from 'fs';

async function runTest() {
  const output: string[] = [];
  
  try {
    output.push('开始测试...');
    
    const response = await axios.post(
      'http://136.115.118.154/api/v1/knowledge-chat/d15b185a-a786-4039-b15b-1d6fb4a8d4e3',
      { query: '快乐的音乐' },
      {
        headers: {
          'X-API-Key': 'sk-AFVxhsKKYpfMSSIho5hyqskh8Rbd96ZbVytFRy3pan09Vn1g',
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      }
    );
    
    output.push('\n响应状态码: ' + response.status);
    
    const chunks: string[] = [];
    await new Promise<void>((resolve) => {
      response.data.on('data', (chunk: Buffer) => {
        chunks.push(chunk.toString('utf-8'));
      });
      
      response.data.on('end', () => {
        const fullContent = chunks.join('');
        output.push('\n=== 完整响应内容 ===');
        output.push(fullContent);
        output.push('=== 响应结束 ===');
        resolve();
      });
    });
    
  } catch (error: any) {
    output.push('\n错误: ' + error.message);
  }
  
  // 写入到文件
  fs.writeFileSync('api_response.log', output.join('\n'));
  console.log('输出已保存到 api_response.log');
}

runTest();