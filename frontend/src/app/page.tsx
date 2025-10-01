import Image from "next/image";

import React, { useState, useEffect, useRef } from 'react';
import { Message, WebSocketMessageData } from './types';

export default function ChatInterface() {
  // 状态管理
  const [childID, setChildID] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [chatMessage, setChatMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 初始化WebSocket连接
  useEffect(() => {
    if (childID && prompt) {
      // 创建WebSocket连接
      const ws = new WebSocket(`ws://localhost:8080?childID=${childID}&prompt=${encodeURIComponent(prompt)}`);
      
      // 连接打开时的处理
      ws.onopen = () => {
        console.log('WebSocket连接已建立');
        setIsConnected(true);
        setMessages([{ sender: '系统', content: '连接已建立，可以开始对话了！' }]);
      };

      // 接收消息的处理
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setMessages(prev => [...prev, { sender: 'AI', content: data.content }]);
      };

      // 连接关闭的处理
      ws.onclose = () => {
        console.log('WebSocket连接已关闭');
        setIsConnected(false);
        setMessages(prev => [...prev, { sender: '系统', content: '连接已关闭' }]);
      };

      // 连接错误的处理
      ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
        setMessages(prev => [...prev, { sender: '系统', content: '连接出错，请检查配置后重试' }]);
      };

      setSocket(ws);

      // 组件卸载时关闭连接
      return () => {
        ws.close();
      };
    }
  }, [childID, prompt]);

  // 发送消息
  const sendMessage = () => {
    if (socket && isConnected && chatMessage.trim()) {
      const message = chatMessage.trim();
      
      // 创建符合类型定义的消息对象
      const wsMessage: WebSocketMessageData = { content: message };
      
      // 发送消息到服务器
      socket.send(JSON.stringify(wsMessage));
      
      // 在本地显示用户消息
      setMessages(prev => [...prev, { sender: '用户', content: message }]);
      
      // 清空输入框
      setChatMessage('');
    }
  };

  // 处理输入框回车发送
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="font-sans min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center">TinyBuddy 对话界面</h1>
        
        {/* 上部分区域 - 配置输入 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 md:p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">配置</h2>
          <div className="space-y-4">
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
              <input
                id="prompt"
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="请输入Prompt"
              />
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {isConnected ? 
                <span className="text-green-600 dark:text-green-400">已连接</span> : 
                <span>请输入Child ID和Prompt以建立连接</span>
              }
            </div>
          </div>
        </div>
        
        {/* 下部分区域 - 对话窗口 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 md:p-6 h-[60vh] flex flex-col">
          <h2 className="text-xl font-semibold mb-4">对话</h2>
          
          {/* 对话内容区域 */}
          <div 
            className="flex-1 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded-md mb-4 bg-gray-50 dark:bg-gray-900"
            style={{ maxHeight: 'calc(60vh - 120px)' }}
          >
            {messages.length > 0 ? (
              messages.map((msg, index) => (
                <div key={index} className={`mb-4 ${msg.sender === '用户' ? 'ml-auto' : 'mr-auto'} max-w-[80%]`}>
                  <div className={`p-3 rounded-lg ${msg.sender === '用户' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'}`}>
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
  );
}
