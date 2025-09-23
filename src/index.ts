import "dotenv/config";

// 应用入口文件
import app from './app';
import { InMemoryMemoryService } from './services/memoryService';
import { config } from 'dotenv';
import * as readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';

// 加载环境变量
config();

console.log('Node.js 版本:', process.version);
console.log('环境变量 NODE_ENV:', process.env.NODE_ENV);
console.log('环境变量 DEVELOPMENT_MODE:', process.env.DEVELOPMENT_MODE);
console.log('应用入口文件已加载');

// 扩展app接口以提供对服务的访问
declare module './app' {
  interface TinyBuddyApp {
    getMemoryService(): InMemoryMemoryService;
  }
}

// 添加getMemoryService方法
Object.defineProperty(app, 'getMemoryService', {
  value: function(): InMemoryMemoryService {
    return this.memoryService;
  },
  writable: true,
  configurable: true
});

// 简单的命令行接口
async function startCLI() {
  console.log('startCLI函数开始执行');
  try {
    console.log('准备初始化应用');
    console.log('欢迎使用TinyBuddy儿童智能陪伴助手！');
    
    // 初始化应用
    console.log('开始调用app.init()');
    await app.init();
    console.log('app.init()调用完成');
    
    // 默认儿童ID
    const defaultChildId = 'default_child';
    
    // 获取儿童档案
    console.log('开始调用app.getChildProfile()');
    const childProfile = await app.getChildProfile(defaultChildId);
    console.log('app.getChildProfile()调用完成');
    console.log(`\n当前用户: ${childProfile.name} (${childProfile.age}岁)`);
    console.log('兴趣爱好:', childProfile.interests.join(', '));
    console.log('\n输入"exit"退出程序，输入"clear"清空对话历史');
    console.log('==============================================');
    
    // 设置输入监听
    const rl = readline.createInterface({
      input,
      output
    });
    
    const askQuestion = () => {
      rl.question('你: ', async (userInput: string) => {
        try {
          // 处理特殊命令
          if (userInput.toLowerCase() === 'exit') {
            console.log('再见！');
            await app.shutdown();
            rl.close();
            return;
          }
          
          if (userInput.toLowerCase() === 'clear') {
            await app.getMemoryService().clearConversationHistory(defaultChildId);
            console.log('对话历史已清空');
            askQuestion();
            return;
          }
          
          // 处理用户输入
          console.log('TinyBuddy正在思考...');
          const response = await app.processUserInput(defaultChildId, userInput);
          console.log(`TinyBuddy: ${response}`);
          
          // 继续提问
          askQuestion();
        } catch (error) {
          console.error('发生错误:', error);
          askQuestion();
        }
      });
    };
    
    // 开始对话
    askQuestion();
    
  } catch (error) {
    console.error('应用启动失败:', error);
    process.exit(1);
  }
}

// 导出应用实例和启动函数
export { app, startCLI };

// 直接启动命令行接口
startCLI();
