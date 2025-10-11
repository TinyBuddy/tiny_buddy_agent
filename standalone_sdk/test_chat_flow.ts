// 完整的聊天流程测试脚本
import axios from 'axios';

async function testChatFlow() {
  try {
    console.log('开始测试完整聊天流程...');
    
    // 1. 首先调用初始化API
    console.log('步骤1: 调用初始化API...');
    const initResponse = await axios.get('http://localhost:3000/api/init');
    
    if (!initResponse.data.success) {
      console.error('SDK初始化失败:', initResponse.data.message);
      return;
    }
    
    console.log('SDK初始化成功！');
    
    // 等待SDK完全初始化
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 2. 发送测试消息
    console.log('\n步骤2: 发送聊天消息...');
    const chatResponse = await axios.post('http://localhost:3000/api/chat', {
      message: '你好，我是小朋友',
      userId: 'test_user'
    });
    
    if (!chatResponse.data.success) {
      console.error('聊天请求失败:', chatResponse.data.message);
      return;
    }
    
    console.log('聊天请求成功！');
    console.log('TinyBuddy响应:', chatResponse.data.response);
    
    // 3. 发送第二条测试消息
    console.log('\n步骤3: 发送第二条聊天消息...');
    const secondChatResponse = await axios.post('http://localhost:3000/api/chat', {
      message: '今天天气怎么样？',
      userId: 'test_user'
    });
    
    if (!secondChatResponse.data.success) {
      console.error('第二条聊天请求失败:', secondChatResponse.data.message);
      return;
    }
    
    console.log('第二条聊天请求成功！');
    console.log('TinyBuddy响应:', secondChatResponse.data.response);
    
    console.log('\n✅ 完整聊天流程测试成功！');
    
  } catch (error: any) {
    console.error('测试过程中发生错误:', error);
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误数据:', error.response.data);
    }
  }
}

testChatFlow().then(() => {
  console.log('\n测试完成');
  process.exit(0);
});