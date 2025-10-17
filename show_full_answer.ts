// 只显示完整的API回答内容
import * as fs from 'fs';

// 定义事件数据的接口
interface ApiEvent {
  id: string;
  response_type: string;
  content: string;
  done: boolean;
  knowledge_references: any;
}

function showFullAnswer() {
  try {
    const logContent = fs.readFileSync('api_response.log', 'utf-8');
    
    // 提取响应内容
    const responseStart = logContent.indexOf('=== 完整响应内容 ===');
    const responseEnd = logContent.indexOf('=== 响应结束 ===');
    
    if (responseStart !== -1 && responseEnd !== -1) {
      const responseContent = logContent.substring(responseStart + '=== 完整响应内容 ==='.length, responseEnd).trim();
      
      // 只提取所有content内容并拼接
      let fullAnswer = '';
      const events: string[] = responseContent.split('\nevent:message\n');
      
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
      
      console.log('\n\n======================================');
      console.log('          完整API回答内容');
      console.log('======================================');
      console.log(fullAnswer);
      console.log('======================================');
      console.log(`\n总字数: ${fullAnswer.length} 字符`);
      console.log(`事件数量: ${events.length} 个`);
      
    } else {
      console.log('未找到响应内容');
    }
  } catch (error: any) {
    console.error('读取失败:', error);
  }
}

showFullAnswer();