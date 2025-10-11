import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { TinyBuddySDK } from 'src/sdk';

// 创建SDK实例的缓存
let cachedSDK: TinyBuddySDK | null = null;
let isSDKInitialized = false;
let initPromise: Promise<boolean> | null = null;

// 确保SDK已初始化的辅助函数
async function ensureSDKInitialized(): Promise<boolean> {
  if (isSDKInitialized && cachedSDK) {
    return true;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = new Promise(async (resolve) => {
    try {
      if (!cachedSDK) {
        cachedSDK = new TinyBuddySDK('demo_child');
      }
      
      const initResult = await cachedSDK.init();
      isSDKInitialized = initResult.success;
      
      if (!isSDKInitialized) {
        console.error('SDK初始化失败:', initResult.message);
      }
      
      resolve(isSDKInitialized);
    } catch (error) {
      console.error('SDK初始化异常:', error);
      resolve(false);
    } finally {
      initPromise = null;
    }
  });

  return initPromise;
}

interface ChatRequest {
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    // 确保SDK已初始化
    const isInitialized = await ensureSDKInitialized();
    if (!isInitialized || !cachedSDK) {
      return NextResponse.json({
        success: false,
        message: 'TinyBuddy SDK初始化失败，请稍后再试'
      }, { status: 500 });
    }
    
    // 解析请求体
    const requestBody: ChatRequest = await request.json();
    const { message } = requestBody;
    
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json({
        success: false,
        message: '请提供有效的消息内容'
      }, { status: 400 });
    }
    
    // 处理用户输入
    console.log(`用户输入: ${message}`);
    const response = await cachedSDK.processUserInput(message);
    console.log(`TinyBuddy响应: ${response}`);
    
    // 返回响应
    return NextResponse.json({
      success: true,
      response
    }, { status: 200 });
    
  } catch (error) {
    console.error('处理聊天请求错误:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '处理请求时发生错误'
    }, { status: 500 });
  }
}