import { TinyBuddySDK } from 'src/sdk';

/**
 * 单独使用TinyBuddy SDK的示例应用
 * 这个应用展示如何通过SDK初始化和使用TinyBuddy系统
 */
async function main() {
  try {
    // 初始化SDK实例，指定儿童ID
    const sdk = new TinyBuddySDK('demo_child');
    
    // 初始化SDK和底层系统
    console.log('正在初始化TinyBuddy SDK...');
    const initResult = await sdk.init();
    
    if (!initResult.success) {
      console.error('SDK初始化失败:', initResult.message);
      return;
    }
    
    console.log('TinyBuddy SDK初始化成功!');
    console.log('\n=======================================');
    console.log('=== TinyBuddy 互动助手已就绪 ===');
    console.log('=======================================\n');
    
    // 示例：处理用户输入
    const testInput = '你好，我想学习中文';
    console.log(`用户输入: ${testInput}`);
    
    const response = await sdk.processUserInput(testInput);
    console.log(`TinyBuddy响应: ${response}`);
    
    console.log('\nSDK示例运行完成');
    
  } catch (error) {
    console.error('应用运行出错:', error);
  }
}

// 启动应用
main().catch(console.error);