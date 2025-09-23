import "dotenv/config";

// 应用入口文件
import app from './app';
import { config } from 'dotenv';
import { startServer } from './api/server';

// 加载环境变量
config();

// 调试日志
console.log('Node.js 版本:', process.version);
console.log('环境变量 NODE_ENV:', process.env.NODE_ENV);
console.log('环境变量 DEVELOPMENT_MODE:', process.env.DEVELOPMENT_MODE);
console.log('应用入口文件已加载');

// 启动API服务器
async function startApplication() {
  try {
    console.log('开始启动TinyBuddy应用...');
    await startServer();
    console.log('TinyBuddy应用已成功启动');
  } catch (error) {
    console.error('应用启动失败:', error);
    process.exit(1);
  }
}

// 导出应用实例和启动函数
export { app, startServer };

// 直接启动应用
startApplication();
