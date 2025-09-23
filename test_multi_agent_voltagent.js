// 测试多Agent系统通过VoltAgent暴露的功能
import axios from 'axios';

async function testMultiAgentThroughVoltAgent() {
  try {
    console.log('开始测试多Agent系统通过VoltAgent暴露的功能...');
    
    // 先查看VoltAgent的API文档或状态
    console.log('\n=== 检查VoltAgent服务器状态 ===');
    try {
      const statusResponse = await axios.get('http://localhost:3142');
      console.log('VoltAgent服务器状态:', statusResponse.status === 200 ? '正常运行中' : '状态码: ' + statusResponse.status);
    } catch (statusError) {
      console.log('VoltAgent服务器状态检查失败:', statusError.message);
    }
    
    // 尝试使用可能的API端点格式
    const possibleEndpoints = [
      'http://localhost:3142/chat',
      'http://localhost:3142/api/chat',
      'http://localhost:3142/v1/chat'
    ];
    
    // 尝试使用不同的端点格式
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`\n=== 尝试使用端点: ${endpoint} ===`);
        
        // 测试多Agent系统
        const response = await axios.post(
          endpoint,
          {
            agent: 'tiny-buddy-multi-agent',
            input: '你好，你能做什么？'
          }
        );
        
        if (response.status === 200) {
          console.log('成功！找到了正确的API端点:', endpoint);
          console.log('多Agent系统响应:', response.data);
          break;
        }
      } catch (error) {
        console.log(`端点 ${endpoint} 测试失败:`, error.message);
      }
    }
    
    console.log('\n测试完成！');
    console.log('提示: 您可以访问 http://localhost:3142/ui 查看Swagger UI，了解正确的API用法');
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

testMultiAgentThroughVoltAgent().catch(console.error);