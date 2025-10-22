import { TinyBuddySDK } from 'src/sdk';
import { NextResponse } from 'next/server';

// 在开发环境中，使用模块级变量来共享SDK实例
// 注意：在生产环境中，可能需要使用更持久的存储方式

// 使用缓存对象来存储SDK实例，提高在Next.js中的稳定性
const sdkCache: {
  instance: TinyBuddySDK | null;
  initialized: boolean;
  initPromise: Promise<{ success: boolean; message?: string }> | null;
} = {
  instance: null,
  initialized: false,
  initPromise: null
};

// 初始化SDK的函数
async function initializeSDK(): Promise<{ success: boolean; message?: string }> {
  // 检查是否已经初始化成功
  if (sdkCache.initialized && sdkCache.instance) {
    return { success: true };
  }

  // 如果已经有初始化过程在进行中，等待其完成
  if (sdkCache.initPromise) {
    return sdkCache.initPromise;
  }

  // 创建新的初始化Promise
  sdkCache.initPromise = new Promise(async (resolve) => {
    try {
      console.log('正在初始化TinyBuddy SDK...');
      
      // 初始化SDK实例，指定儿童ID
      sdkCache.instance = new TinyBuddySDK('demo_child');
      
      // 初始化SDK和底层系统
      const initResult = await sdkCache.instance.init();
      
      if (!initResult.success) {
        console.error('SDK初始化失败:', initResult.message);
        resolve({ success: false, message: initResult.message });
        return;
      }
      
      sdkCache.initialized = true;
      console.log('TinyBuddy SDK初始化成功!');
      resolve({ success: true });
      
    } catch (error) {
      console.error('SDK初始化异常:', error);
      resolve({
        success: false,
        message: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      sdkCache.initPromise = null;
    }
  });

  return sdkCache.initPromise;
}

export async function GET() {
  try {
    const result = await initializeSDK();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'TinyBuddy SDK初始化成功'
      }, { status: 200 });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message || 'SDK初始化失败'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('处理初始化请求错误:', error);
    return NextResponse.json({
      success: false,
      message: '处理初始化请求时发生错误'
    }, { status: 500 });
  }
}

// 注意：在Next.js的App Router中，API路由文件不应导出除HTTP方法外的函数
// 其他路由需要自己实现SDK初始化逻辑