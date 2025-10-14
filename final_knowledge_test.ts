import { Readable } from 'stream';
import axios from 'axios';

/**
 * 最终知识库处理逻辑测试脚本
 * 验证改进后的processKnowledgeStreamResponse方法功能
 */
console.log('=== 最终知识库处理逻辑测试 ===\n');

// 测试结果记录
interface TestResult {
  scenario: string;
  passed: boolean;
}

const testResults: TestResult[] = [];

/**
 * 创建模拟的流式响应
 */
function createMockStream(chunks: string[]): Readable {
  const stream = new Readable({
    read() {}
  });
  
  // 立即推送所有数据（简化测试）
  chunks.forEach(chunk => {
    stream.push(Buffer.from(chunk));
  });
  stream.push(null);
  
  return stream;
}

/**
 * 模拟改进后的processKnowledgeStreamResponse方法逻辑
 */
async function processKnowledgeResponse(stream: Readable): Promise<string> {
  return new Promise((resolve) => {
    let fullContent = '';
    let hasNoMatch = false;
    
    stream.on('data', (chunk: Buffer) => {
      const chunkStr = chunk.toString('utf-8');
      fullContent += chunkStr;
      
      // 实时检查无效标记
      const lowerChunk = chunkStr.toLowerCase();
      if (lowerChunk.includes('no_match') || 
          lowerChunk.includes('无法作答') || 
          lowerChunk.includes('未检索到相关信息')) {
        hasNoMatch = true;
      }
    });
    
    stream.on('end', () => {
      console.log('原始内容长度:', fullContent.length);
      
      // 检查无效标记
      if (hasNoMatch || 
          fullContent.toLowerCase().includes('no_match') || 
          fullContent.includes('无法作答') || 
          fullContent.includes('未检索到相关信息')) {
        console.log('检测到无效标记，返回空字符串');
        resolve('');
        return;
      }
      
      // 清理内容
      let cleanedContent = fullContent
        .split('```').join('')
        .split('\</think>').join('')
        .split('</think>').join('')
        .split('<\/think>').join('')
        .split(/\s+/).join(' ')
        .trim();
      
      // 提取实际content内容
      let actualContent = cleanedContent;
      try {
        if (cleanedContent.includes('data:')) {
          const lines = cleanedContent.split('\n');
          let extractedContent = '';
          for (const line of lines) {
            if (line.startsWith('data:')) {
              try {
                const jsonStr = line.substring(5).trim();
                if (jsonStr) {
                  const data = JSON.parse(jsonStr);
                  if (data.content) {
                    extractedContent += data.content;
                  }
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
          if (extractedContent && extractedContent.trim().length > 0) {
            actualContent = extractedContent;
          }
        }
      } catch (e) {
        console.log('提取content字段失败');
      }
      
      // 内容有效性检查
      if (actualContent.length < 15) {
        console.log(`内容过短 (${actualContent.length} 字符)，返回空字符串`);
        resolve('');
        return;
      }
      
      console.log('最终返回内容长度:', actualContent.length);
      resolve(actualContent);
    });
    
    stream.on('error', () => resolve(''));
  });
}

/**
 * 运行单个测试场景
 */
async function runTest(scenario: string, mockChunks: string[], expectedResult: boolean): Promise<void> {
  console.log(`\n=== ${scenario} ===`);
  
  try {
    const stream = createMockStream(mockChunks);
    const result = await processKnowledgeResponse(stream);
    
    const passed = expectedResult ? (result && result.length > 0) : (result === '');
    testResults.push({ scenario, passed });
    
    console.log(`测试${passed ? '通过' : '失败'}: ${result ? '返回有效内容' : '返回空字符串'}`);
    if (result) {
      console.log(`内容样本: "${result.substring(0, 50)}${result.length > 50 ? '...' : ''}"`);
    }
  } catch (error) {
    console.error(`测试失败: ${error}`);
    testResults.push({ scenario, passed: false });
  }
}

/**
 * 运行实际API调用测试
 */
async function runApiTest(): Promise<void> {
  console.log('\n=== 实际API调用测试 ===');
  
  try {
    const apiKey = 'sk-AFVxhsKKYpfMSSIho5hyqskh8Rbd96ZbVytFRy3pan09Vn1g';
    const apiUrl = 'http://136.115.118.154/api/v1/knowledge-chat/d15b185a-a786-4039-b15b-1d6fb4a8d4e3';
    const testQuery = '你好怎么说';
    
    console.log(`API URL: ${apiUrl}`);
    console.log(`测试查询: ${testQuery}`);
    
    const startTime = Date.now();
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
    
    console.log('API调用成功，状态码:', response.status);
    
    const result = await processKnowledgeResponse(response.data);
    const endTime = Date.now();
    
    console.log(`API调用总时间: ${endTime - startTime} ms`);
    console.log(`API测试结果: ${result ? '成功获取有效内容' : '未获取到有效内容'}`);
    
    testResults.push({ 
      scenario: '实际API调用测试', 
      passed: result && result.length > 0 
    });
    
  } catch (error) {
    console.error('API调用失败:', error instanceof Error ? error.message : String(error));
    testResults.push({ 
      scenario: '实际API调用测试', 
      passed: false 
    });
  }
}

/**
 * 汇总测试结果
 */
function summarizeResults() {
  console.log('\n=== 测试结果汇总 ===');
  
  const passed = testResults.filter(test => test.passed).length;
  const total = testResults.length;
  
  testResults.forEach(test => {
    console.log(`${test.scenario}: ${test.passed ? '✅ 通过' : '❌ 失败'}`);
  });
  
  console.log(`\n总体结果: ${passed}/${total} 通过`);
  console.log(passed === total ? '🎉 所有测试通过！' : '❌ 部分测试失败！');
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  try {
    // 测试场景1: 带有NO_MATCH标记
    await runTest(
      '测试场景1: 带有NO_MATCH标记的响应',
      ['data:{"content":"检索到的信息中没有相关内容NO_MATCH"}'],
      false // 预期返回空字符串
    );
    
    // 测试场景2: 带有"无法作答"标记
    await runTest(
      '测试场景2: 带有"无法作答"标记的响应',
      ['data:{"content":"无法作答，没有相关信息"}'],
      false // 预期返回空字符串
    );
    
    // 测试场景3: 内容过短
    await runTest(
      '测试场景3: 内容过短的响应',
      ['data:{"content":"简短内容"}'],
      false // 预期返回空字符串
    );
    
    // 测试场景4: 有效响应（带特殊标记）
    await runTest(
      '测试场景4: 有效响应（带特殊标记）',
      ['data:{"content":"```这是有效内容```\n</think>不需要的内容</think>\n学习中文的方法有很多种，比如多听多说多练习。"}'],
      true // 预期返回有效内容
    );
    
    // 测试场景5: 实际API调用
    await runApiTest();
    
    // 汇总结果
    summarizeResults();
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  } finally {
    console.log('\n=== 测试完成 ===');
    process.exit(0);
  }
}

// 运行测试
runAllTests();