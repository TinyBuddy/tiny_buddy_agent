'use client'
import { useState, useEffect, useRef } from 'react';

interface ChatMessage {
  type: 'user' | 'buddy';
  content: string;
}

export default function Home() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  // 初始化SDK（通过API调用）
  useEffect(() => {
    async function initSDK() {
      setIsInitializing(true);
      setIsReady(false);
      setError(null);
      
      try {
        console.log('正在初始化TinyBuddy SDK...');
        const response = await fetch('/api/init');
        const data = await response.json();
        
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'SDK初始化失败');
        }
        
        console.log('TinyBuddy SDK初始化成功!');
        setIsReady(true);
        
        // 添加欢迎消息
        setMessages([
          { 
            type: 'buddy', 
            content: '你好！我是TinyBuddy，很高兴见到你。有什么我可以帮你的吗？' 
          }
        ]);
        
      } catch (err) {
        console.error('SDK初始化错误:', err);
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setIsInitializing(false);
      }
    }

    initSDK();
  }, []);

  // 自动滚动到最新消息
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

  // 处理用户输入提交
  const handleSubmit = async () => {
    if (!userInput.trim() || isProcessing || !isReady) {
      return;
    }

    // 添加用户消息
    const userMessage = userInput.trim();
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setUserInput('');
    setIsProcessing(true);

    try {
      console.log(`用户输入: ${userMessage}`);
      
      // 通过API调用处理用户输入
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || '处理消息失败');
      }
      
      console.log(`TinyBuddy响应: ${data.response}`);
      
      // 添加TinyBuddy的响应
      setMessages(prev => [...prev, { type: 'buddy', content: data.response }]);
      
    } catch (err) {
      console.error('处理用户输入错误:', err);
      setMessages(prev => [...prev, {
        type: 'buddy', 
        content: '抱歉，我现在无法回答你的问题。请稍后再试。'
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理键盘回车事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <main>
      <header>
        <h1>TinyBuddy 互动助手</h1>
        <p>基于TinyBuddy SDK的儿童教育智能助手</p>
      </header>

      {isInitializing && (
        <div className="status status-initializing">
          TinyBuddy正在初始化，请稍候...
        </div>
      )}

      {!isInitializing && error && (
        <div className="status status-error">
          初始化失败: {error}
        </div>
      )}

      {!isInitializing && isReady && (
        <div className="status status-ready">
          TinyBuddy已准备就绪，可以开始对话了！
        </div>
      )}

      <div className="chat-container">
        <div className="chat-history" ref={chatHistoryRef}>
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`chat-message ${message.type === 'user' ? 'user-message' : 'buddy-message'}`}
            >
              {message.content}
            </div>
          ))}
          
          {isProcessing && (
            <div className="chat-message buddy-message loading">
              TinyBuddy正在思考...
            </div>
          )}
        </div>
        
        <div className="input-container">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入你想说的话..."
            disabled={isProcessing || !isReady}
          />
          <button 
            onClick={handleSubmit} 
            disabled={isProcessing || !isReady || !userInput.trim()}
          >
            {isProcessing ? '发送中...' : '发送'}
          </button>
        </div>
      </div>
    </main>
  );
}