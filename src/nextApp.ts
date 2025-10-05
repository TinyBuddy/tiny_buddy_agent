// 使用Next.js框架创建HTTP服务器
import express from 'express';
import { db } from './db/db';
import { vocabulary } from './db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { z } from 'zod';

// 创建Express应用（集成Next.js功能）
const app = express();
app.use(express.json());

// 定义查询参数验证模式
const querySchema = z.object({
  childId: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

/**
 * 处理GET请求：获取指定儿童ID在指定时间区间内的词汇表列表（去重）
 */
app.get('/api/vocabulary', async (req, res) => {
  try {
    // 解析查询参数
    const queryParams = {
      childId: req.query.childId as string,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined
    };

    // 验证查询参数
    const { childId, startDate, endDate } = querySchema.parse(queryParams);

    console.log(`获取儿童 ${childId} 的词汇表，时间区间: ${startDate || '开始'} 到 ${endDate || '现在'}`);

    // 构建查询条件
    const conditions = [eq(vocabulary.childId, childId)];
    
    // 添加时间区间条件
    if (startDate) {
      conditions.push(gte(vocabulary.createdAt, new Date(startDate)));
    }
    
    if (endDate) {
      conditions.push(lte(vocabulary.createdAt, new Date(endDate)));
    }

    // 查询数据库获取词汇表
    const result = await db
      .select({ word: vocabulary.word })
      .from(vocabulary)
      .where(and(...conditions));

    // 提取词汇并去重
    const words = Array.from(new Set(result.map(item => item.word)));

    // 返回成功响应
    res.json({
      success: true,
      data: {
        words,
        count: words.length,
        childId,
        timeRange: {
          start: startDate || null,
          end: endDate || null
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('获取词汇表时出错:', error);

    // 处理验证错误
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: '参数验证失败',
        details: error.errors
      });
    }

    // 处理其他错误
    return res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 启动HTTP服务器
 */
export const startHttpServer = async () => {
  // 使用不同的端口（3144）以避免与现有服务器冲突
  const port = 3144;

  // 启动服务器
  const server = app.listen(port, () => {
    console.log(`TinyBuddy Next.js HTTP服务器已启动在 http://localhost:${port}`);
    console.log('可用API端点:');
    console.log('GET    /api/vocabulary          - 获取儿童词汇表(支持时间区间筛选)');
    console.log(`示例: http://localhost:${port}/api/vocabulary?childId=test_child&startDate=2023-01-01&endDate=2023-12-31`);
  });

  // 处理进程终止信号
  const handleShutdown = async () => {
    console.log('正在关闭TinyBuddy HTTP服务器...');
    server.close();
    console.log('TinyBuddy HTTP服务器已成功关闭');
  };

  // 监听进程终止信号
  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);

  return server;
};

export default app;