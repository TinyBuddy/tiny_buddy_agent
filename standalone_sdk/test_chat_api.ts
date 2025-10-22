// 测试聊天API的脚本
import axios from 'axios';

async function testChatApi() {
  try {
    console.log('开始测试聊天API...');
    
    // 等待SDK完全初始化
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 发送测试消息
    const response = await axios.post('http://localhost:3000/api/chat', {
      message: '你好，我是小朋友',
      userId: 'test_user'
    });
    
    console.log('API调用成功！');
    console.log('响应内容:', response.data);
    console.log('聊天响应:', response.data.response);
    
  } catch (error: any) {
    console.error('测试过程中发生错误:', error);
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误数据:', error.response.data);
    }
  }
}

testChatApi().then(() => {
  console.log('测试完成');
  process.exit(0);
});