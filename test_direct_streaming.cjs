const { exec } = require('child_process');

console.log('开始直接测试流式发送功能...');

// 启动ws-client.ts并进行测试
const clientProcess = exec('node --no-warnings --experimental-specifier-resolution=node ws-client.ts', {
  cwd: __dirname
});

// 捕获输出
let initializationComplete = false;
let streamingResponseComplete = false;

clientProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('客户端输出:', output);
  
  // 检测初始化完成
  if (!initializationComplete && output.includes('儿童档案信息已显示')) {
    initializationComplete = true;
    console.log('\n客户端初始化完成，开始发送流式命令...\n');
    
    // 延迟发送流式命令，确保客户端已准备就绪
    setTimeout(() => {
      clientProcess.stdin.write('stream:你好，TinyBuddy!\n');
      console.log('已发送流式命令: stream:你好，TinyBuddy!');
    }, 1000);
  }
  
  // 检测流式响应完成
  if (output.includes('流式发送完成')) {
    streamingResponseComplete = true;
    console.log('\n流式响应已完成，等待最终结果...\n');
  }
  
  // 当看到最终响应或超时后退出
  if (streamingResponseComplete) {
    setTimeout(() => {
      console.log('测试完成，正在退出...');
      clientProcess.stdin.write('exit\n'); // 发送exit命令让客户端退出
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    }, 5000);
  }
});

clientProcess.stderr.on('data', (data) => {
  console.error('客户端错误:', data.toString());
});

clientProcess.on('close', (code) => {
  console.log(`客户端进程退出，代码: ${code}`);
  process.exit(code);
});

// 设置超时，防止测试无限等待
setTimeout(() => {
  console.error('测试超时');
  clientProcess.kill();
  process.exit(1);
}, 30000); // 30秒超时