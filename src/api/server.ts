// API服务器实现
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import app from '../app';
import { config } from 'dotenv';
import { z } from 'zod';
import { type InMemoryMemoryService } from '../services/memoryService';

// 加载环境变量
config();

// 创建API应用实例
const apiApp = new Hono();

// 定义请求验证模式
const chatRequestSchema = z.object({
  childId: z.string().optional(),
  message: z.string().min(1)
});

// 创建默认儿童ID（与app.ts保持一致）
const DEFAULT_CHILD_ID = 'default_child';

// 初始化应用函数
const initializeApp = async () => {
  try {
    console.log('正在初始化TinyBuddy API服务...');
    await app.init();
    console.log('TinyBuddy API服务初始化完成！');
  } catch (error) {
    console.error('TinyBuddy API服务初始化失败:', error);
    process.exit(1);
  }
};

// API端点定义

// 1. 健康检查端点
apiApp.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    version: '0.1.0',
    timestamp: new Date().toISOString()
  });
});

// 2. 处理聊天消息端点
apiApp.post('/api/chat', async (c) => {
  try {
    // 验证请求体
    const requestBody = await c.req.json();
    const { childId = DEFAULT_CHILD_ID, message } = chatRequestSchema.parse(requestBody);
    
    console.log(`接收到来自儿童 ${childId} 的消息: ${message}`);
    
    // 处理用户消息
    const response = await app.processUserInput(childId, message);
    
    console.log(`生成响应: ${response}`);
    
    return c.json({
      success: true,
      data: {
        message: response,
        childId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('处理聊天请求时出错:', error);
    
    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: '请求格式错误',
        details: error.errors
      }, 400);
    }
    
    return c.json({
      success: false,
      error: '服务器内部错误'
    }, 500);
  }
});

// 3. 获取对话历史端点
apiApp.get('/api/history/:childId?', async (c) => {
  try {
    const childId = c.req.param('childId') || DEFAULT_CHILD_ID;
    
    console.log(`获取儿童 ${childId} 的对话历史`);
    
    const history = await app.getConversationHistory(childId);
    
    return c.json({
      success: true,
      data: {
        history,
        childId,
        totalMessages: history.length
      }
    });
  } catch (error) {
    console.error('获取对话历史时出错:', error);
    return c.json({
      success: false,
      error: '服务器内部错误'
    }, 500);
  }
});

// 4. 清空对话历史端点
apiApp.post('/api/clear-history/:childId?', async (c) => {
  try {
    const childId = c.req.param('childId') || DEFAULT_CHILD_ID;
    
    console.log(`清空儿童 ${childId} 的对话历史`);
    
    await app.memoryService.clearConversationHistory(childId);
    
    return c.json({
      success: true,
      message: '对话历史已清空',
      childId
    });
  } catch (error) {
    console.error('清空对话历史时出错:', error);
    return c.json({
      success: false,
      error: '服务器内部错误'
    }, 500);
  }
});

// 5. 获取儿童档案端点
apiApp.get('/api/profile/:childId?', async (c) => {
  try {
    const childId = c.req.param('childId') || DEFAULT_CHILD_ID;
    
    console.log(`获取儿童 ${childId} 的档案信息`);
    
    const profile = await app.getChildProfile(childId);
    
    return c.json({
      success: true,
      data: {
        profile,
        childId
      }
    });
  } catch (error) {
    console.error('获取儿童档案时出错:', error);
    return c.json({
      success: false,
      error: '服务器内部错误'
    }, 500);
  }
});

// 6. 更新儿童档案端点
apiApp.post('/api/profile/:childId?', async (c) => {
  try {
    const childId = c.req.param('childId') || DEFAULT_CHILD_ID;
    const profileData = await c.req.json();
    
    console.log(`更新儿童 ${childId} 的档案信息`);
    
    const updatedProfile = await app.updateChildProfile(childId, profileData);
    
    return c.json({
      success: true,
      data: {
        profile: updatedProfile,
        childId
      }
    });
  } catch (error) {
    console.error('更新儿童档案时出错:', error);
    return c.json({
      success: false,
      error: '服务器内部错误'
    }, 500);
  }
});

// 7. 分析儿童兴趣端点
apiApp.get('/api/interests/:childId?', async (c) => {
  try {
    const childId = c.req.param('childId') || DEFAULT_CHILD_ID;
    
    console.log(`分析儿童 ${childId} 的兴趣爱好`);
    
    const interests = await app.analyzeChildInterests(childId);
    
    return c.json({
      success: true,
      data: {
        interests,
        childId
      }
    });
  } catch (error) {
    console.error('分析儿童兴趣时出错:', error);
    return c.json({
      success: false,
      error: '服务器内部错误'
    }, 500);
  }
});

// 启动服务器函数
export const startServer = async () => {
  // 初始化应用
  await initializeApp();
  
  // 定义服务器端口
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3141;
  
  // 启动服务器
  const server = serve({
    fetch: apiApp.fetch,
    port
  });
  
  console.log(`TinyBuddy API服务器已启动在 http://localhost:${port}`);
  console.log('可用API端点:');
  console.log('GET    /api/health              - 健康检查');
  console.log('POST   /api/chat                - 发送聊天消息');
  console.log('GET    /api/history/:childId?   - 获取对话历史');
  console.log('POST   /api/clear-history/:childId? - 清空对话历史');
  console.log('GET    /api/profile/:childId?   - 获取儿童档案');
  console.log('POST   /api/profile/:childId?   - 更新儿童档案');
  console.log('GET    /api/interests/:childId? - 分析儿童兴趣');
  
  // 处理进程终止信号
  const handleShutdown = async () => {
    console.log('正在关闭TinyBuddy API服务器...');
    server.close();
    await app.shutdown();
    console.log('TinyBuddy API服务器已成功关闭');
    process.exit(0);
  };
  
  // 监听进程终止信号
  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);
  
  return server;
};

export default apiApp;