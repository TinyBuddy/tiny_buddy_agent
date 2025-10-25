import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// 加载环境变量
dotenv.config();

// API配置
const API_BASE_URL = 'http://localhost:3142'; // 实际运行的HTTP API端口
const TEST_CHILD_ID = 'test_child_001'; // 测试用的孩子ID

// 模拟的聊天历史数据（包含重要信息）
const mockChatHistory = [
  "I like playing soccer and reading books",
  "My birthday is on June 15th",
  "I have a brother named Tommy and a sister named Lily",
  "My best friend is Sarah from school",
  "When I grow up, I want to be an astronaut and explore space",
  "I recently got a new bicycle as a gift",
  "My favorite color is blue and I love pizza"
];

// 测试重要记忆API
async function testImportantMemoriesAPI() {
  console.log('=== 测试重要记忆API ===');
  console.log(`使用服务器: ${API_BASE_URL}`);
  console.log(`测试孩子ID: ${TEST_CHILD_ID}`);
  console.log('\n--- 1. 测试更新重要记忆 ---');
  
  try {
    // 1. 测试更新重要记忆接口
    const updateResponse = await axios.post(
      `${API_BASE_URL}/api/important-memories`,
      {
        child_id: TEST_CHILD_ID,
        chat_history: mockChatHistory
      }
    );
    
    console.log('更新重要记忆请求完成!');
    console.log('响应状态:', updateResponse.status);
    console.log('响应成功标志:', updateResponse.data.success);
    console.log('响应消息:', updateResponse.data.message);
    
    // 检查响应中的错误信息
    if (!updateResponse.data.success) {
      console.log('\n⚠️  操作未成功:');
      console.log('错误代码:', updateResponse.data.error_code || '无错误代码');
      console.log('错误详情:', updateResponse.data.error_details || '无详细信息');
    }
    
    // 安全地访问重要信息
    console.log('\n重要信息提取结果:');
    if (updateResponse.data.data && updateResponse.data.data.important_info) {
      console.log(JSON.stringify(updateResponse.data.data.important_info, null, 2));
    } else {
      console.log('未提取到重要信息或数据格式不正确');
      console.log('完整响应数据结构:');
      console.log(Object.keys(updateResponse.data));
    }
    
    // 保存响应结果用于分析
    const outputDir = path.join(process.cwd(), 'test_results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(outputDir, 'important_memories_response.json'),
      JSON.stringify(updateResponse.data, null, 2)
    );
    console.log('\n完整响应数据已保存到 test_results/important_memories_response.json');
    
    // 2. 验证mem0服务状态
    console.log('\n--- 2. 验证mem0服务状态 ---');
    const mem0Status = await checkMem0Status();
    console.log('mem0服务状态:', mem0Status);
    
    if (mem0Status.includes('连接异常') || mem0Status.includes('无法连接')) {
      console.log('⚠️  警告: mem0服务连接问题可能导致API调用失败');
    }
    
    // 3. 检查环境变量配置
  console.log('\n--- 3. 检查环境变量配置 ---');
  const envConfig = {
    MEM0_ENABLED: process.env.MEM0_ENABLED,
    MEM0_API_URL: process.env.MEM0_API_URL ? '已设置 (内容隐藏)' : '未设置',
    MEM0_API_KEY: process.env.MEM0_API_KEY ? `已设置 (${process.env.MEM0_API_KEY ? process.env.MEM0_API_KEY.length : 0}字符)` : '未设置'
  };
  console.log('mem0环境配置:', JSON.stringify(envConfig, null, 2));
  
  // 详细的环境变量诊断
  console.log('\n环境变量详细诊断:');
  if (!process.env.MEM0_API_KEY) {
    console.log('❌ 错误: MEM0_API_KEY 环境变量未设置，请在.env文件中设置有效的API密钥');
  } else if (process.env.MEM0_API_KEY.length < 20) {
    console.log('❌ 错误: MEM0_API_KEY 长度异常 (' + process.env.MEM0_API_KEY.length + '字符)，可能是无效的密钥格式');
  } else {
    console.log('🔑 API密钥格式检查: 长度 ' + process.env.MEM0_API_KEY.length + '字符，格式似乎有效');
    console.log('   密钥前缀: ' + process.env.MEM0_API_KEY.substring(0, 8) + '...');
  }
  
  if (!process.env.MEM0_API_URL) {
    console.log('❌ 错误: MEM0_API_URL 环境变量未设置，请在.env文件中设置');
  } else {
    console.log('🌐 API URL: ' + process.env.MEM0_API_URL);
  }
  
  if (process.env.MEM0_ENABLED !== 'true') {
    console.log('⚠️  警告: MEM0_ENABLED 未设置为true，mem0功能可能已禁用');
  }
  
  console.log('\n🔧 解决建议:');
  console.log('1. 访问 https://mem0.ai 注册或登录获取有效的API密钥');
  console.log('2. 在.env文件中更新 MEM0_API_KEY=your_valid_key');
  console.log('3. 确保 MEM0_API_URL 设置为 https://api.mem0.ai');
  console.log('4. 重启服务器后重新运行测试');
    
    // 4. 测试错误场景 - 缺少必要参数
    console.log('\n--- 4. 测试错误场景：缺少必要参数 ---');
    try {
      await axios.post(`${API_BASE_URL}/api/important-memories`, {
        chat_history: mockChatHistory // 故意缺少child_id
      });
    } catch (error: any) {
      console.log('预期的错误捕获成功!');
      console.log('错误状态码:', error.response?.status);
      console.log('错误信息:', error.response?.data);
    }
    
    console.log('\n=== 测试完成 ===');
    
  } catch (error: any) {
    console.error('\n测试失败!');
    console.error('错误详情:', error.message);
    
    if (error.response) {
      // 服务器返回了错误响应
      console.error('\n服务器响应错误:');
      console.error('状态码:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
      
      // 特定错误诊断
      if (error.response.status === 401) {
        console.error('\n🔴 关键问题: 认证失败，可能的原因:');
        console.error('  - mem0 API Key无效或已过期');
        console.error('  - API Key格式错误');
        console.error('  - 请检查 .env 文件中的 MEM0_API_KEY 设置');
      } else if (error.response.status === 400) {
        console.error('\n🔴 关键问题: 请求参数错误');
        console.error('  - 请检查请求格式是否正确');
        console.error('  - 确保所有必需参数都已提供');
      }
    } else if (error.request) {
      // 请求已发出但未收到响应
      console.error('\n网络连接错误: 无法连接到服务器');
      console.error('请确认服务器是否在运行:', API_BASE_URL);
    } else {
      // 请求配置出错
      console.error('\n请求配置错误:', error.config);
    }
    
    // 诊断mem0相关错误
    console.error('\n诊断信息:');
    console.error('- mem0启用状态:', process.env.MEM0_ENABLED === 'true' ? '✅ 已启用' : '❌ 未启用');
    console.error('- API Key配置:', process.env.MEM0_API_KEY ? '✅ 已设置' : '❌ 未设置');
    console.error('- API URL配置:', process.env.MEM0_API_URL ? '✅ 已设置' : '❌ 未设置');
    
    if (process.env.MEM0_API_KEY && process.env.MEM0_API_KEY.length > 10) {
      console.error('- API Key长度检查: ✅ 有效长度');
      console.error('- 前10个字符:', process.env.MEM0_API_KEY.substring(0, 10) + '...');
    }
  }
}

// 检查mem0服务状态（通过尝试访问服务但不发送实际请求）
async function checkMem0Status() {
  try {
    if (!process.env.MEM0_API_URL) {
      return '未配置MEM0_API_URL';
    }
    
    // 这不是真正的mem0健康检查端点，但可以检测基本连接
    // 实际项目中可能需要根据mem0 API文档调整
    const response = await axios.get(
      `${process.env.MEM0_API_URL}/health`, 
      { timeout: 5000, validateStatus: () => true }
    );
    
    return response.status === 200 ? '连接正常' : `连接异常 (状态码: ${response.status})`;
  } catch (error) {
    return `无法连接到mem0服务: ${error instanceof Error ? error.message : '未知错误'}`;
  }
}

// 运行测试
await testImportantMemoriesAPI();

export { testImportantMemoriesAPI };