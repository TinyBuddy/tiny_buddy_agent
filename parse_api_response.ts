// 解析并完整显示API响应
import * as fs from 'fs';

// 定义事件数据的接口
interface ApiEvent {
  id: string;
  response_type: string;
  content: string;
  done: boolean;
  knowledge_references: any;
}

// 读取并解析日志文件
function parseAndDisplayResponse() {
  try {
    // 读取日志文件内容
    const logContent = fs.readFileSync('api_response.log', 'utf-8');
    
    console.log('\n\n======================================');
    console.log('        完整API响应分析');
    console.log('======================================\n');
    
    // 提取响应内容部分
    const responseStart = logContent.indexOf('=== 完整响应内容 ===');
    const responseEnd = logContent.indexOf('=== 响应结束 ===');
    
    if (responseStart !== -1 && responseEnd !== -1) {
      const responseContent = logContent.substring(responseStart + '=== 完整响应内容 ==='.length, responseEnd).trim();
      
      console.log('响应内容格式: Server-Sent Events (SSE)');
      console.log('--------------------------------------\n');
      
      // 解析每个事件
      const events = responseContent.split('\nevent:message\n');
      console.log(`总共收到 ${events.length} 个事件`);
      
      // 提取所有content内容
      let fullAnswer = '';
      const parsedEvents: ApiEvent[] = [];
      
      events.forEach((event, index) => {
        if (event.trim()) {
          const dataMatch = event.match(/data:\s*(\{[^}]*\})/);
          if (dataMatch) {
            try {
              const data = JSON.parse(dataMatch[1]) as ApiEvent;
              parsedEvents.push(data);
              if (data.content) {
                fullAnswer += data.content;
              }
            } catch (e) {
              console.error(`事件 ${index} 解析错误:`, e);
            }
          }
        }
      });
      
      console.log('\n--------------------------------------');
      console.log('完整回答内容:');
      console.log('--------------------------------------');
      console.log(fullAnswer);
      console.log('--------------------------------------\n');
      
      console.log('每个事件的详细信息:');
      parsedEvents.forEach((event: ApiEvent, index) => {
        console.log(`\n事件 ${index + 1}:`);
        console.log(`  ID: ${event.id}`);
        console.log(`  类型: ${event.response_type}`);
        console.log(`  内容: "${event.content || ''}"`);
        console.log(`  完成状态: ${event.done}`);
        console.log(`  知识引用: ${event.knowledge_references ? '有' : '无'}`);
      });
      
    } else {
      console.log('未找到响应内容');
    }
    
  } catch (error: any) {
    console.error('解析失败:', error);
  }
}

parseAndDisplayResponse();