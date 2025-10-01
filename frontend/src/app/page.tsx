'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Message, WebSocketMessageData, UpdatePromptMessageData } from './types';

export default function ChatInterface() {
  // 状态管理
  const [childID, setChildID] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [chatMessage, setChatMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected'); // disconnected, connecting, connected
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初始化WebSocket连接
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10; // 增加重连次数上限
    const baseReconnectInterval = 3000; // 基础重连间隔
    let heartbeatInterval: NodeJS.Timeout | null = null;
    let heartbeatTimeout: NodeJS.Timeout | null = null;
    let isAlive = false;
    
    // 创建连接函数
    const createConnection = () => {
      if (!childID || !prompt) return;
      
      // 设置连接状态为连接中
      setConnectionStatus('connecting');
      
      try {
        // 创建WebSocket连接
        ws = new WebSocket(`ws://localhost:3143?childID=${childID}&prompt=${encodeURIComponent(prompt)}`);
        
        // 连接打开时的处理
        ws.onopen = () => {
          console.log('WebSocket连接已建立');
          setIsConnected(true);
          setConnectionStatus('connected');
          reconnectAttempts = 0;
          isAlive = true;
          
          // 如果是重连，不重置消息列表
          if (messages.length === 0) {
            setMessages([{ sender: '系统', content: '连接已建立，可以开始对话了！' }]);
          } else {
            setMessages(prev => [...prev, { sender: '系统', content: '连接已恢复' }]);
          }
          
          // 启动心跳机制
          startHeartbeat();
          
          // 发送初始化消息
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'initialize', childProfileId: childID }));
          }
        };

        // 接收消息的处理
          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              
              // 处理心跳响应
          if (data.type === 'pong') {
            isAlive = true;
            console.log('接收到心跳响应');
            return;
          }
          
          // 处理提示词更新成功消息
          if (data.type === 'prompt_updated') {
            setMessages(prev => [...prev, { sender: '系统', content: data.message }]);
            return;
          }
        
        // 处理其他消息类型
        if (data.type === 'error') {
              setMessages(prev => [...prev, { sender: '系统', content: `错误: ${data.message}` }]);
            } else if (data.type === 'processing') {
              setMessages(prev => [...prev, { sender: '系统', content: data.message }]);
            } else {
              // 根据消息类型和字段选择合适的内容
              const content = data.content || data.message || '未知消息';
              setMessages(prev => [...prev, { sender: 'AI', content: content }]);
            }
          } catch (error) {
            console.error('解析WebSocket消息失败:', error);
            setMessages(prev => [...prev, { sender: '系统', content: '接收消息格式错误' }]);
          }
        };

        // 连接关闭的处理
          ws.onclose = (event) => {
            console.log('WebSocket连接已关闭:', event.code, event.reason);
            setIsConnected(false);
            setConnectionStatus('disconnected');
            
            // 停止心跳
            stopHeartbeat();
            
            // 如果不是主动关闭连接（code !== 1000），尝试重连
            if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
              reconnectAttempts++;
              const statusMessage = `连接断开，正在尝试第${reconnectAttempts}次重连...`;
              console.log(statusMessage);
              setMessages(prev => [...prev, { sender: '系统', content: statusMessage }]);
              
              // 改进的指数退避重连策略，增加随机抖动避免重连风暴
              const jitter = Math.random() * 1000; // 0-1秒的随机抖动
              const backoffTime = baseReconnectInterval * Math.pow(2, reconnectAttempts - 1) + jitter;
              const waitTime = Math.min(backoffTime, 30000); // 最大等待30秒
              console.log(`计划在${waitTime}ms后进行第${reconnectAttempts}次重连`);
              
              setTimeout(() => {
                if (childID && prompt) { // 确保重连时配置仍然有效
                  createConnection();
                }
              }, waitTime);
            } else if (reconnectAttempts >= maxReconnectAttempts) {
              setMessages(prev => [...prev, { sender: '系统', content: '重连失败，请检查服务器状态或刷新页面重试' }]);
            }
        };

        // 连接错误的处理
        ws.onerror = (error) => {
          // 增强错误信息提取和显示
          // 增强的错误处理逻辑
          let errorMessage = 'WebSocket连接错误';
          let detailedError = '';
          
          // 尝试获取更详细的错误信息
          if (error instanceof Error) {
            detailedError = `错误: ${error.message}\n堆栈: ${error.stack || '无堆栈信息'}`;
            // 根据错误消息内容提供更具体的提示
            if (error.message.includes('Connection refused')) {
              errorMessage = '服务器连接被拒绝，请检查服务器是否正在运行';
            } else if (error.message.includes('Failed to connect')) {
              errorMessage = '无法连接到服务器，请检查网络连接';
            } else if (error.message.includes('NetworkError')) {
              errorMessage = '网络连接错误，请检查您的网络设置';
            } else {
              errorMessage = error.message || 'WebSocket连接错误';
            }
          } else if (typeof error === 'object' && error !== null) {
            // 处理非Error类型的错误对象
            // 先转换为unknown类型，再转换为Record<string, unknown>以避免类型错误
            const errorObj = error as unknown as Record<string, unknown>;
            const errorObjKeys = Object.keys(errorObj);
            const errorDetails = JSON.stringify(errorObj, errorObjKeys);
            detailedError = `错误对象: ${errorDetails}\n属性: ${errorObjKeys.join(', ')}`;
            
            // 提供更友好的错误提示
            if (errorObj.code === 1006 || errorDetails.includes('1006')) {
              errorMessage = '连接意外断开，请检查服务器状态';
            } else if (errorDetails.includes('ECONNREFUSED')) {
              errorMessage = '服务器未启动或无法访问';
            } else if (errorDetails.includes('isTrusted":true')) {
              // 针对移动设备上常见的Event类型错误
              // 尝试推断更具体的错误原因
              if (navigator.userAgent.match(/mobile/i)) {
                errorMessage = '移动设备连接不稳定，请检查网络连接或尝试切换网络';
              } else {
                errorMessage = 'WebSocket连接发生错误，正在尝试重连';
              }
            } else if (errorObjKeys.length === 0 || (errorObjKeys.length === 1 && errorObjKeys[0] === 'isTrusted')) {
              // 处理只有isTrusted属性的情况
              errorMessage = '连接中断，请检查您的网络连接状态';
            } else {
              errorMessage = 'WebSocket连接发生错误';
            }
          } else {
            detailedError = `未知错误类型: ${String(error)}`;
            errorMessage = '发生未知的WebSocket错误';
          }
          
          // 在控制台输出详细错误信息以便调试
          console.error('WebSocket错误详情:', detailedError);
          console.error('用户代理信息:', navigator.userAgent);
          
          // 显示用户友好的错误消息
          setMessages(prev => {
            // 避免重复添加相同的错误消息
            const lastMessage = prev[prev.length - 1];
            if (!lastMessage || lastMessage.content !== errorMessage) {
              return [...prev, { sender: '系统', content: errorMessage }];
            }
            return prev;
          });
          // 错误会触发onclose，由重连机制处理
        };
        
        setSocket(ws);
      } catch (error) {
        console.error('创建WebSocket连接失败:', error);
        setMessages(prev => [...prev, { sender: '系统', content: '创建连接失败，请检查配置后重试' }]);
      }
    };
    
    // 启动心跳
        const startHeartbeat = () => {
          stopHeartbeat(); // 确保之前的心跳已经停止
          
          // 设置心跳间隔为30秒
          heartbeatInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              // 检查上次心跳响应是否超时
              if (!isAlive) {
                console.warn('心跳超时，关闭连接并尝试重连');
                ws.close(1008, '心跳超时');
                return;
              }
              
              // 重置心跳状态并发送ping
              isAlive = false;
              try {
                ws.send(JSON.stringify({ type: 'ping' }));
                console.log('发送心跳ping');
                
                // 设置心跳超时检测
                heartbeatTimeout = setTimeout(() => {
                  if (!isAlive && ws && ws.readyState === WebSocket.OPEN) {
                    console.warn('心跳响应超时，关闭连接');
                    ws.close(1008, '心跳响应超时');
                  }
                }, 15000); // 15秒内没有收到pong则认为超时
              } catch (error) {
                console.error('发送心跳消息失败:', error);
              }
            }
          }, 30000); // 每30秒发送一次心跳
        };
    
    // 停止心跳
        const stopHeartbeat = () => {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }
          if (heartbeatTimeout) {
            clearTimeout(heartbeatTimeout);
            heartbeatTimeout = null;
          }
          isAlive = false;
        };
    
    // 创建连接
    createConnection();

    // 监听配置变化，断开旧连接
      const cleanup = () => {
        stopHeartbeat();
        if (ws) {
          try {
            ws.close(1000, 'Component cleanup or config changed');
          } catch (error) {
            console.error('关闭WebSocket连接时出错:', error);
          }
          ws = null;
          setSocket(null);
          setIsConnected(false);
          setConnectionStatus('disconnected');
        }
      };
      
      // 组件卸载时关闭连接
      return () => {
        cleanup();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [childID, prompt]); // 注意：不包含messages.length作为依赖，因为它会导致消息变化时重新创建连接

  // 发送消息
  const sendMessage = () => {
    if (socket && isConnected && chatMessage.trim()) {
      const message = chatMessage.trim();
      
      // 创建符合类型定义的消息对象
      const wsMessage: WebSocketMessageData = { type: 'user_input', userInput: message, childProfileId: childID };
      
      // 发送消息到服务器（带错误处理）
      try {
        socket.send(JSON.stringify(wsMessage));
        
        // 在本地显示用户消息，关联Child ID
        const userSender = childID ? `用户(${childID})` : '用户';
        setMessages(prev => [...prev, { sender: userSender, content: message }]);
        
        // 清空输入框
        setChatMessage('');
      } catch (error) {
        console.error('发送消息失败:', error);
        setMessages(prev => [...prev, { sender: '系统', content: '发送消息失败，请检查连接状态' }]);
      }
    }
  }

  // 更新提示词
  const updatePrompt = () => {
    if (socket && isConnected && prompt.trim()) {
      try {
        const updateMessage: UpdatePromptMessageData = { type: 'update_prompt', prompt: prompt };
        socket.send(JSON.stringify(updateMessage));
        setMessages(prev => [...prev, { sender: '系统', content: '正在更新系统提示词...' }]);
      } catch (error) {
        console.error('更新提示词失败:', error);
        setMessages(prev => [...prev, { sender: '系统', content: '更新提示词失败，请检查连接状态' }]);
      }
    }
  };

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 当消息列表更新时，自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 处理输入框回车发送
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="font-sans min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center">TinyBuddy 对话界面</h1>
        
        {/* 左右布局容器 */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* 左侧区域 - 配置输入 */}
          <div className="md:w-1/3 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 md:p-6 h-[calc(100vh-100px)] flex flex-col">
            <h2 className="text-xl font-semibold mb-4">配置</h2>
            <div className="space-y-4 flex-grow">
              <div>
                <label htmlFor="childID" className="block text-sm font-medium mb-1">Child ID</label>
                <input
                  id="childID"
                  type="text"
                  value={childID}
                  onChange={(e) => setChildID(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="请输入Child ID"
                />
              </div>
              <div>
                <label htmlFor="prompt" className="block text-sm font-medium mb-1">Prompt</label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="请输入Prompt"
                  rows={6}
                />
              </div>
              <div className="space-y-4 mt-auto">
                <button
                  onClick={updatePrompt}
                  disabled={!isConnected || !prompt.trim()}
                  className={`w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors ${(!isConnected || !prompt.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  更新系统提示词
                </button>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {connectionStatus === 'connected' ? 
                    <span className="text-green-600 dark:text-green-400">已连接</span> : 
                    connectionStatus === 'connecting' ? 
                    <span className="text-yellow-600 dark:text-yellow-400">正在连接...</span> : 
                    <span>请输入Child ID和Prompt以建立连接</span>
                  }
                </div>
              </div>
            </div>
          </div>
          
          {/* 右侧区域 - 对话窗口 */}
          <div className="md:w-2/3 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 md:p-6 h-[calc(100vh-100px)] flex flex-col">
            <h2 className="text-xl font-semibold mb-4">对话</h2>
            
            {/* 对话内容区域 */}
            <div 
              className="flex-1 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded-md mb-4 bg-gray-50 dark:bg-gray-900"
            >
              {messages.length > 0 ? (
                messages.map((msg, index) => (
                  <div key={index} className={`mb-4 ${msg.sender.startsWith('用户') ? 'ml-auto' : 'mr-auto'} max-w-[80%]`}>
                    <div className={`p-3 rounded-lg ${msg.sender.startsWith('用户') ? 'bg-blue-500 text-white' : 'bg-green-100 dark:bg-green-900 text-gray-900 dark:text-gray-100'}`}>
                      <div className="font-semibold mb-1">{msg.sender}</div>
                      <div>{msg.content}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  暂无消息
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* 对话输入区域 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={!isConnected}
                className={`flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder={isConnected ? "请输入消息..." : "请先建立连接"}
              />
              <button
                onClick={sendMessage}
                disabled={!isConnected || !chatMessage.trim()}
                className={`px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors ${(!isConnected || !chatMessage.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                发送
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
