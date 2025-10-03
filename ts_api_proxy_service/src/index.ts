import express, { Request, Response, NextFunction } from 'express';
import fetch from 'node-fetch';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';

const app = express();
const PORT = process.env.PORT || 8899;

// 创建HTTP服务器
const server = http.createServer(app);

// 创建WebSocket服务器
const wss = new WebSocketServer({ server });

// 中间件：记录请求日志
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 解析JSON请求体
app.use(express.json());

/**
 * 代理处理函数
 * 处理所有指向/api/proxy/*的请求
 */
async function handleProxyRequest(req: Request, res: Response): Promise<void> {
  try {
    // 从请求路径中提取目标URL的路径部分（去掉/api/proxy前缀）
    const targetPath = req.path.replace('/api/proxy', '');
    // 构建完整的目标URL
    const targetUrl = `https://stg.tinybuddy.dev${targetPath}`;
    
    console.log(`代理请求到: ${targetUrl}`);
    
    // 准备请求头，保留原始请求的重要头信息
    const headers: Record<string, string> = {};
    
    // 复制原始请求头，但排除host和content-length等不需要的头
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value && typeof value === 'string') {
        // 不复制host头，让fetch自己处理
        if (!['host', 'content-length', 'connection'].includes(key.toLowerCase())) {
          headers[key] = value;
        }
      }
    });
    
    // 添加额外的请求头
    headers['User-Agent'] = headers['User-Agent'] || 'TS-API-Proxy-Service/1.0';
    headers['Accept-Encoding'] = 'gzip, deflate, br';
    
    // 准备fetch选项 - 使用any类型解决类型不兼容问题
    const fetchOptions: any = {
      method: req.method,
      headers,
      redirect: 'manual', // 手动处理重定向，避免自动跟随302
    };
    
    // 如果有请求体，添加到fetch选项
    if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      fetchOptions.body = JSON.stringify(req.body);
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }
    
    // 发送请求到目标服务器
    const response = await fetch(targetUrl, fetchOptions);
    
    // 处理响应
    if (response.status === 302) {
      // 检测到302重定向，手动跟随重定向并获取最终内容
      console.log(`检测到302重定向，位置: ${response.headers.get('location')}`);
      
      // 获取重定向URL
      const redirectUrl = response.headers.get('location');
      if (redirectUrl) {
        // 跟随重定向，但保持手动重定向处理
        const finalResponse = await fetch(redirectUrl, {
          method: req.method,
          headers,
          redirect: 'manual',
          ...(fetchOptions.body ? { body: fetchOptions.body } : {})
        } as any);
        
        // 设置响应头
        finalResponse.headers.forEach((value: string, key: string) => {
          // 排除可能导致问题的头
          if (!['transfer-encoding', 'connection', 'content-encoding'].includes(key.toLowerCase())) {
            res.setHeader(key, value);
          }
        });
        
        // 设置状态码为200，避免返回302
        res.status(200);
        
        // 流式传输响应体
        const body = await finalResponse.buffer();
        res.send(body);
      } else {
        throw new Error('302重定向缺少location头');
      }
    } else {
      // 非重定向响应，直接转发
      // 设置响应头
      response.headers.forEach((value: string, key: string) => {
        // 排除可能导致问题的头
        if (!['transfer-encoding', 'connection', 'content-encoding'].includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });
      
      // 设置状态码
      res.status(response.status);
      
      // 使用buffer替代流式传输，解决类型问题
      const body = await response.buffer();
      res.send(body);
    }
  } catch (error) {
    console.error('代理请求失败:', error);
    res.status(500).json({
      error: '代理请求失败',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * 确保WebSocket错误代码有效
 */
function getValidErrorCode(code: number | undefined): number {
  // 检查是否为有效数字且在合理范围内
  if (typeof code === 'number' && !isNaN(code) && isFinite(code) && code >= 1000 && code <= 4999) {
    return code;
  }
  // 默认使用正常关闭代码
  return 1000;
}

/**
 * 安全地关闭WebSocket连接
 */
function safelyCloseWebSocket(ws: WebSocket, code?: number, reason?: string | Buffer<ArrayBufferLike>): void {
  try {
    // 只有当连接处于打开或连接中状态时才尝试关闭
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      // 确保使用有效的关闭代码 - 直接使用默认值1000避免任何代码验证问题
      const validCode = 1000;
      // 安全地处理reason参数
      const safeReason = reason ? String(reason) : undefined;
      
      // 尝试关闭连接，但捕获可能的错误
      try {
        ws.close(validCode, safeReason);
      } catch (innerError) {
        console.warn('关闭WebSocket连接时发生错误(内部捕获):', innerError);
        // 忽略内部错误，继续执行
      }
    }
  } catch (error) {
    console.error('安全关闭WebSocket连接时发生错误:', error);
    // 忽略错误，继续执行
  }
}

/**
 * 处理WebSocket连接
 * 代理wss://stg.tinybuddy.dev/hardware
 */
function handleWebSocketConnection(ws: WebSocket, req: Request) {
  console.log(`[${new Date().toISOString()}] WebSocket连接建立: ${req.url}`);
  
  // 构建目标WebSocket URL
  const targetUrl = 'wss://stg.tinybuddy.dev/hardware';
  
  console.log(`WebSocket代理连接到: ${targetUrl}`);
  
  // 连接到目标WebSocket服务器 - 简化配置以匹配直接测试成功的配置
  const targetWs = new WebSocket(targetUrl);
  
  // 处理目标服务器消息
  targetWs.on('message', (data) => {
    // 将目标服务器的消息转发给客户端
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    } catch (error) {
      console.error('转发目标服务器消息失败:', error);
    }
  });
  
  // 处理客户端消息
  ws.on('message', (data) => {
    // 将客户端的消息转发给目标服务器
    try {
      if (targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(data);
      }
    } catch (error) {
      console.error('转发客户端消息失败:', error);
    }
  });
  
  // 处理连接关闭
  ws.on('close', (code, reason) => {
    console.log(`[${new Date().toISOString()}] WebSocket客户端连接关闭: ${code}, ${reason}`);
    // 使用安全关闭函数关闭目标服务器连接
    safelyCloseWebSocket(targetWs, code);
  });
  
  // 处理目标服务器连接关闭
  targetWs.on('close', (code, reason) => {
    console.log(`[${new Date().toISOString()}] WebSocket目标服务器连接关闭: ${code}, ${reason}`);
    // 使用安全关闭函数关闭客户端连接
    safelyCloseWebSocket(ws, code, reason);
  });
  
  // 处理错误
  ws.on('error', (error) => {
    console.error('[WebSocket客户端错误]:', error);
  });
  
  targetWs.on('error', (error) => {
    console.error('[WebSocket目标服务器错误]:', error);
    // 尝试向客户端发送错误信息
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: '无法连接到目标WebSocket服务器',
          details: error instanceof Error ? error.message : String(error)
        }));
      }
    } catch (sendError) {
      console.error('发送错误消息失败:', sendError);
    }
    // 确保错误后关闭连接
    safelyCloseWebSocket(ws, 1000, '连接到目标服务器失败');
  });
}

// WebSocket服务器监听连接事件
wss.on('connection', (ws: WebSocket, req: Request) => {
  // 检查请求路径是否匹配WebSocket代理路径
  if (req.url === '/ws/proxy/hardware') {
    handleWebSocketConnection(ws, req);
  } else {
    // 关闭不匹配的连接
    console.log(`[${new Date().toISOString()}] 拒绝WebSocket连接: 不支持的路径 ${req.url}`);
    try {
      ws.close(1000, '不支持的WebSocket路径');
    } catch (error) {
      console.error('关闭不支持的WebSocket连接时出错:', error);
    }
  }
});

// 代理路由：处理所有以/api/proxy开头的请求
app.all('/api/proxy/*', handleProxyRequest);

// 根路由：提供服务信息
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'TS API Proxy Service',
    version: '1.0.0',
    description: 'TypeScript API代理服务器，支持HTTP请求和WebSocket连接',
    httpUsage: 'POST/GET/PUT/PATCH/DELETE http://localhost:3000/api/proxy/{target-path}',
    httpExample: 'http://localhost:3000/api/proxy/api/devices/94a99031b91c/check-upgrade',
    wsUsage: 'ws://localhost:3000/ws/proxy/hardware',
    wsExample: 'WebSocket连接到 ws://localhost:3000/ws/proxy/hardware'
  });
});

// 404处理
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path
  });
});

// 启动服务器
server.listen(PORT, () => {
  console.log(`TypeScript API代理服务器已启动在端口 ${PORT}`);
  console.log(`访问 http://localhost:${PORT} 查看服务信息`);
  console.log(`HTTP代理使用格式: http://localhost:${PORT}/api/proxy/{target-path}`);
  console.log(`HTTP代理示例: http://localhost:${PORT}/api/proxy/api/devices/94a99031b91c/check-upgrade`);
  console.log(`WebSocket代理地址: ws://localhost:${PORT}/ws/proxy/hardware`);
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});