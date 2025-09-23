import "dotenv/config";

// 应用入口文件
import app from './app';
import { InMemoryMemoryService } from './services/memoryService';

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
  try {
    console.log('欢迎使用TinyBuddy儿童智能陪伴助手！');
    
    // 初始化应用
    await app.init();
    
    // 默认儿童ID
    const defaultChildId = 'default_child';
    
    // 获取儿童档案
    const childProfile = await app.getChildProfile(defaultChildId);
    console.log(`\n当前用户: ${childProfile.name} (${childProfile.age}岁)`);
    console.log('兴趣爱好:', childProfile.interests.join(', '));
    console.log('\n输入"exit"退出程序，输入"clear"清空对话历史');
    console.log('==============================================');
    
    // 设置输入监听
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const askQuestion = () => {
      readline.question('你: ', async (userInput: string) => {
        try {
          // 处理特殊命令
          if (userInput.toLowerCase() === 'exit') {
            console.log('再见！');
            await app.shutdown();
            readline.close();
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

// 如果直接运行此文件，则启动命令行接口
if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  startCLI();
}
