// 记忆服务工厂
import type { MemoryService } from './memoryService';
import { InMemoryMemoryService } from './memoryService';
import { Mem0MemoryService } from './mem0MemoryService';
import { isMem0Available } from '../config/mem0Config';
import { getMem0Service } from './mem0Service';

// 记忆服务类型
export type MemoryServiceType = 'in-memory' | 'mem0' | 'auto';

// 记忆服务工厂类
export class MemoryServiceFactory {
  private static instance: MemoryService | null = null;

  /**
   * 创建记忆服务实例
   * @param type 记忆服务类型
   * @returns 记忆服务实例
   */
  static async createMemoryService(type: MemoryServiceType = 'auto'): Promise<MemoryService> {
    if (this.instance) {
      return this.instance;
    }

    let service: MemoryService;

    switch (type) {
      case 'mem0':
        service = new Mem0MemoryService();
        console.log('使用mem0记忆服务');
        break;
      
      case 'in-memory':
        service = new InMemoryMemoryService();
        console.log('使用内存记忆服务');
        break;
      
      case 'auto':
      default:
        // 自动选择：如果mem0可用则使用mem0，否则使用内存服务
        if (isMem0Available()) {
          service = new Mem0MemoryService();
          console.log('自动选择：使用mem0记忆服务');
        } else {
          service = new InMemoryMemoryService();
          console.log('自动选择：mem0不可用，使用内存记忆服务');
        }
        break;
    }

    // 初始化服务
    await service.init();
    
    this.instance = service;
    return service;
  }

  /**
   * 获取当前记忆服务实例
   * @returns 当前记忆服务实例
   */
  static getCurrentMemoryService(): MemoryService | null {
    return this.instance;
  }

  /**
   * 重置记忆服务实例（用于测试或重新配置）
   */
  static reset(): void {
    this.instance = null;
    console.log('记忆服务实例已重置');
  }

  /**
   * 获取当前使用的记忆服务类型
   * @returns 记忆服务类型描述
   */
  static getCurrentServiceType(): string {
    if (!this.instance) {
      return '未初始化';
    }

    if (this.instance instanceof Mem0MemoryService) {
      return 'mem0';
    } else if (this.instance instanceof InMemoryMemoryService) {
      return 'in-memory';
    } else {
      return 'unknown';
    }
  }

  /**
   * 获取mem0服务实例（如果可用）
   * @returns mem0服务实例或null
   */
  static getMem0Service(): any {
    if (isMem0Available()) {
      return getMem0Service();
    }
    return null;
  }
}

// 默认导出工厂实例
export default MemoryServiceFactory;