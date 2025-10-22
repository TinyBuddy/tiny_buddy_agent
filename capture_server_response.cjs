const { spawn } = require('child_process');

console.log('启动WebSocket客户端并连接到远程服务器47.250.116.113，专门捕获服务器响应...');

// 启动ws-client.ts
const client = spawn('node', ['--no-warnings', '--experimental-specifier-resolution=node', 'ws-client.ts'], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'pipe']
});

let isReady = false;
let responseBuffer = '';

// 捕获客户端输出
client.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write('客户端输出: ' + output);
  
  // 保存输出用于分析服务器响应
  responseBuffer += output;
  
  // 检测初始化完成
  if (output.includes('> ') && !isReady) {
    isReady = true;
    console.log('\n客户端已准备就绪，正在发送测试消息...\n');
    
    // 发送一个简单的测试消息（非流式）
    setTimeout(() => {
      const testMessage = '你好，远程服务器！\n';
      console.log('发送测试消息: ' + testMessage);
      client.stdin.write(testMessage);
      
      // 等待服务器响应
      setTimeout(() => {
        console.log('\n=== 服务器响应分析 ===');
        
        // 查找服务器响应部分
        const responseParts = responseBuffer.split('> ');
        
        if (responseParts.length > 1) {
          console.log('检测到的完整输出：');
          console.log(responseBuffer);
        } else {
          console.log('未检测到明确的服务器响应，以下是完整输出：');
          console.log(responseBuffer);
        }
        
        console.log('\n测试完成，正在退出...');
        client.stdin.write('exit\n');
      }, 10000); // 等待10秒获取服务器响应
    }, 1000);
  }
});

client.stderr.on('data', (data) => {
  console.error('客户端错误: ' + data.toString());
});

client.on('close', (code) => {
  console.log(`客户端进程退出，代码: ${code}`);
  process.exit(code);
});

// 设置超时
setTimeout(() => {
  console.error('测试超时，强制退出');
  console.log('\n=== 超时前捕获的输出 ===');
  console.log(responseBuffer);
  client.kill();
  process.exit(1);
}, 60000); // 60秒超时