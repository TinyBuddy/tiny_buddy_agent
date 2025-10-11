const { spawn } = require('child_process');

console.log('启动WebSocket客户端并连接到远程服务器47.250.116.113...');

// 启动ws-client.ts
const client = spawn('node', ['--no-warnings', '--experimental-specifier-resolution=node', 'ws-client.ts'], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'pipe']
});

// 捕获客户端输出
client.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write('客户端输出: ' + output);
  
  // 检测初始化完成
  if (output.includes('> ')) {
    console.log('\n客户端已准备就绪，正在发送流式消息命令...\n');
    
    // 发送流式消息命令
    setTimeout(() => {
      const streamingCommand = 'stream:你好，远程服务器！\n';
      console.log('发送命令: ' + streamingCommand);
      client.stdin.write(streamingCommand);
      
      // 等待5秒后退出
      setTimeout(() => {
        console.log('\n测试完成，正在退出...');
        client.stdin.write('exit\n');
      }, 5000);
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
  console.error('测试超时');
  client.kill();
  process.exit(1);
}, 30000); // 30秒超时