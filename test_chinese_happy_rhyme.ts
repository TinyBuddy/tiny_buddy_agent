import axios from 'axios';
import * as fs from 'fs';
import { Readable } from 'stream';

interface ApiEvent {
  content: string;
  role?: string;
  event?: string;
}

const apiKey = 'your-api-key'; // 请替换为实际的API密钥
const query = '快乐的儿歌';
const logFilePath = 'chinese_happy_rhyme_response.log';

async function testKnowledgeApi() {
  try {
    console.log(`正在测试中文查询: "${query}"`);
    const startTime = Date.now();
    
    // 创建日志文件
    const logStream = fs.createWriteStream(logFilePath);
    logStream.write(`测试查询: ${query}\n`);
    logStream.write(`开始时间: ${new Date().toISOString()}\n\n`);
    
    // 发起流式请求
    const response = await axios.post(
      'https://api.dify.ai/v1/chat-messages',
      {
        inputs: {},
        query: query,
        response_mode: 'streaming',
        user: 'test_user'
      },
      {
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      }
    );
    
    const stream = response.data as Readable;
    const events: string[] = [];
    let fullContent = '';
    
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        const chunkStr = chunk.toString();
        logStream.write(chunkStr);
        
        // 分割并处理SSE事件
        const chunkEvents = chunkStr.split('\n\n');
        chunkEvents.forEach(event => {
          if (event.trim()) {
            events.push(event.trim());
            const dataMatch = event.match(/data:\s*(\{[^}]*\})/);
            if (dataMatch && dataMatch[1]) {
              try {
                const data = JSON.parse(dataMatch[1]) as ApiEvent;
                if (data.content) {
                  fullContent += data.content;
                }
              } catch (parseError) {
                console.error('解析事件数据时出错:', parseError);
              }
            }
          }
        });
      });
      
      stream.on('end', () => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log('\n=== API响应结果 ===');
        console.log('完整回答内容:');
        console.log(fullContent);
        console.log('\n=== 统计信息 ===');
        console.log(`总字数: ${fullContent.length} 字符`);
        console.log(`事件数量: ${events.length} 个`);
        console.log(`响应时间: ${duration} ms`);
        console.log(`日志已保存至: ${logFilePath}`);
        
        logStream.write(`\n\n=== 统计信息 ===\n`);
        logStream.write(`总字数: ${fullContent.length} 字符\n`);
        logStream.write(`事件数量: ${events.length} 个\n`);
        logStream.write(`响应时间: ${duration} ms\n`);
        logStream.write(`结束时间: ${new Date().toISOString()}\n`);
        logStream.end();
        
        resolve();
      });
      
      stream.on('error', (error: any) => {
        logStream.end();
        reject(error);
      });
    });
    
  } catch (error: any) {
    console.error('测试过程中发生错误:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testKnowledgeApi();