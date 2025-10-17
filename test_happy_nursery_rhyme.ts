// 测试英文查询"happy nursery rhyme"
import axios from 'axios';
import * as fs from 'fs';

// 定义事件数据的接口
interface ApiEvent {
  id: string;
  response_type: string;
  content: string;
  done: boolean;
  knowledge_references: any;
}

async function testHappyNurseryRhyme() {
  console.log('开始测试英文查询: "happy nursery rhyme"');
  
  const query = 'happy nursery rhyme';
  const API_CONFIG = {
    url: 'http://136.115.118.154/api/v1/knowledge-chat/d15b185a-a786-4039-b15b-1d6fb4a8d4e3',
    headers: {
      'X-API-Key': 'sk-AFVxhsKKYpfMSSIho5hyqskh8Rbd96ZbVytFRy3pan09Vn1g',
      'Content-Type': 'application/json'
    }
  };
  
  try {
    const startTime = Date.now();
    
    const response = await axios.post(
      API_CONFIG.url,
      { query },
      {
        timeout: 20000,
        headers: API_CONFIG.headers,
        responseType: 'stream'
      }
    );
    
    console.log(`\nAPI响应状态码: ${response.status}`);
    console.log('开始接收流式响应...');
    
    const chunks: string[] = [];
    
    await new Promise<void>((resolve) => {
      response.data.on('data', (chunk: Buffer) => {
        chunks.push(chunk.toString('utf-8'));
      });
      
      response.data.on('end', () => {
        const fullResponse = chunks.join('');
        
        // 保存到文件
        fs.writeFileSync('happy_nursery_rhyme_response.log', fullResponse);
        console.log('\n响应已保存到 happy_nursery_rhyme_response.log');
        
        // 提取并显示完整回答
        let fullAnswer = '';
        const events = fullResponse.split('\nevent:message\n');
        
        events.forEach(event => {
          if (event.trim()) {
            const dataMatch = event.match(/data:\s*(\{[^}]*\})/);
            if (dataMatch) {
              try {
                const data = JSON.parse(dataMatch[1]) as ApiEvent;
                if (data.content) {
                  fullAnswer += data.content;
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        });
        
        const endTime = Date.now();
        console.log(`\n======================================`);
        console.log(`          完整API回答内容`);
        console.log(`======================================`);
        console.log(fullAnswer);
        console.log(`======================================`);
        console.log(`\n总字数: ${fullAnswer.length} 字符`);
        console.log(`事件数量: ${events.length} 个`);
        console.log(`响应时间: ${endTime - startTime} ms`);
        
        resolve();
      });
    });
    
  } catch (error: any) {
    console.error('\n测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
    }
  }
}

testHappyNurseryRhyme().catch(console.error);