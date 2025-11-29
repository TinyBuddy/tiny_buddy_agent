 /**
 * ChatHistoryQueue - 本地消息队列服务
 * 用于异步处理聊天历史记录，避免阻塞主请求
 */

export interface ChatHistoryMessage {
  childId: string;
  childName: string;
  childAge: number;
  languageLevel: string;
  historyMsgs: Array<{
    child: string;
    AI: string;
  }>;
  timestamp: number;
}

export type ChatHistoryConsumer = (message: ChatHistoryMessage) => Promise<void>;

class ChatHistoryQueue {
  private queue: ChatHistoryMessage[] = [];
  private consumers: ChatHistoryConsumer[] = [];
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    // 自动启动队列处理
    this.startProcessing();
  }

  /**
   * 添加消息到队列（异步，不阻塞）
   */
  async enqueue(message: ChatHistoryMessage): Promise<void> {
    this.queue.push(message);
    console.log(`[ChatHistoryQueue] 消息已加入队列，当前队列长度: ${this.queue.length}`);
    
    // 立即触发一次处理（如果没在处理中）
    if (!this.isProcessing) {
      this.processQueue().catch(err => {
        console.error('[ChatHistoryQueue] 处理队列出错:', err);
      });
    }
  }

  /**
   * 注册消费者
   */
  registerConsumer(consumer: ChatHistoryConsumer): void {
    this.consumers.push(consumer);
    console.log(`[ChatHistoryQueue] 已注册消费者，当前消费者数量: ${this.consumers.length}`);
  }

  /**
   * 启动队列处理（轮询方式）
   */
  private startProcessing(): void {
    if (this.processingInterval) {
      return;
    }

    // 每5秒检查一次队列
    this.processingInterval = setInterval(() => {
      if (!this.isProcessing && this.queue.length > 0) {
        this.processQueue().catch(err => {
          console.error('[ChatHistoryQueue] 定时处理队列出错:', err);
        });
      }
    }, 5000);

    console.log('[ChatHistoryQueue] 队列处理器已启动');
  }

  /**
   * 停止队列处理
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('[ChatHistoryQueue] 队列处理器已停止');
    }
  }

  /**
   * 处理队列中的消息
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        const message = this.queue.shift();
        if (!message) {
          break;
        }

        console.log(`[ChatHistoryQueue] 处理消息: childId=${message.childId}, 队列剩余: ${this.queue.length}`);

        // 并行调用所有消费者
        const consumerPromises = this.consumers.map(async (consumer) => {
          try {
            await consumer(message);
          } catch (err) {
            console.error('[ChatHistoryQueue] 消费者处理失败:', err);
          }
        });

        await Promise.all(consumerPromises);
      }
    } catch (error) {
      console.error('[ChatHistoryQueue] 处理队列时出错:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 获取队列状态
   */
  getStatus(): { queueLength: number; isProcessing: boolean; consumerCount: number } {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      consumerCount: this.consumers.length,
    };
  }
}

// 单例实例
export const chatHistoryQueue = new ChatHistoryQueue();
