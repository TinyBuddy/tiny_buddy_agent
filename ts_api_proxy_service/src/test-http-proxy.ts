import axios from 'axios';

/**
 * HTTP代理测试脚本
 * 测试TypeScript API代理服务器的HTTP代理功能
 */
async function testHttpProxy() {
  try {
    console.log('开始测试HTTP代理功能...');
    const proxyUrl = 'http://localhost:8899/api/proxy';
    
    // 测试1: 发送GET请求到代理服务器
    console.log('\n测试1: 发送GET请求');
    try {
      const getResponse = await axios.get(`${proxyUrl}/api/devices`);
      console.log('GET请求成功!');
      console.log('状态码:', getResponse.status);
      console.log('响应数据(前100字符):', JSON.stringify(getResponse.data).substring(0, 100) + '...');
    } catch (getError) {
      console.log('GET请求结果:', 
        getError instanceof Error && 'response' in getError && typeof (getError as any).response === 'object' && (getError as any).response !== null ? 
        `状态码: ${(getError as any).response.status}, 响应: ${JSON.stringify((getError as any).response.data)}` : 
        `错误: ${getError instanceof Error ? getError.message : String(getError)}`);
    }
    
    // 测试2: 发送POST请求到代理服务器
    console.log('\n测试2: 发送POST请求');
    try {
      const postResponse = await axios.post(`${proxyUrl}/api/login`, {
        username: 'testuser',
        password: 'testpassword'
      });
      console.log('POST请求成功!');
      console.log('状态码:', postResponse.status);
      console.log('响应数据:', JSON.stringify(postResponse.data));
    } catch (postError) {
      console.log('POST请求结果:', 
        postError instanceof Error && 'response' in postError && typeof (postError as any).response === 'object' && (postError as any).response !== null ? 
        `状态码: ${(postError as any).response.status}, 响应: ${JSON.stringify((postError as any).response.data)}` : 
        `错误: ${postError instanceof Error ? postError.message : String(postError)}`);
    }
    
    // 测试3: 测试一个不存在的路径
    console.log('\n测试3: 测试不存在的路径');
    try {
      const notFoundResponse = await axios.get(`${proxyUrl}/api/nonexistent-path`);
      console.log('请求成功(不应该发生)!', notFoundResponse.status);
    } catch (notFoundError) {
      console.log('不存在路径测试结果:', 
        notFoundError instanceof Error && 'response' in notFoundError && typeof (notFoundError as any).response === 'object' && (notFoundError as any).response !== null ? 
        `状态码: ${(notFoundError as any).response.status}, 响应: ${JSON.stringify((notFoundError as any).response.data)}` : 
        `错误: ${notFoundError instanceof Error ? notFoundError.message : String(notFoundError)}`);
    }
    
    console.log('\nHTTP代理测试完成!');
  } catch (error) {
    console.error('测试过程中发生错误:', error instanceof Error ? error.message : String(error));
  }
}

// 运行测试
if (import.meta.url === new URL(import.meta.url).href) {
  testHttpProxy();
}

// 导出函数以便在其他地方使用
export default testHttpProxy;