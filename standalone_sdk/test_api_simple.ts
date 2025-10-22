// 简化版的API测试脚本，仅测试后端API功能
import axios from 'axios';

async function testSimpleApi() {
  try {
    console.log('开始测试API...');
    
    // 1. 测试初始化API
    console.log('\n1. 测试初始化API...');
    try {
      const initResponse = await axios.get('http://localhost:3000/api/init');
      console.log('初始化API响应:', initResponse.status);
      console.log('初始化数据:', JSON.stringify(initResponse.data));
    } catch (error: any) {
      console.error('初始化API失败:', error.response?.status || error.message);
      if (error.response?.data) {
        console.error('初始化错误数据:', error.response.data);
      }
    }
    
    // 2. 测试聊天API
    console.log('\n2. 测试聊天API...');
    try {
      const chatResponse = await axios.post('http://localhost:3000/api/chat', {
        message: '你好，我是小朋友',
        userId: 'test_user'
      });
      console.log('聊天API响应:', chatResponse.status);
      console.log('聊天数据:', JSON.stringify(chatResponse.data));
    } catch (error: any) {
      console.error('聊天API失败:', error.response?.status || error.message);
      if (error.response?.data) {
        console.error('聊天错误数据:', error.response.data);
      }
    }
    
    console.log('\n测试完成');
  } catch (error: any) {
    console.error('测试过程中发生错误:', error);
  } finally {
    process.exit(0);
  }
}

testSimpleApi();