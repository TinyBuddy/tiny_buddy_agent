import { LongtermPlanningAgent } from "../actors/LongtermPlanningAgent";
import type { KnowledgeBaseService } from "../services/knowledgeBaseService";
import type { MemoryService } from "../services/memoryService";
import type { ActorConfig } from "./baseActorFactory";
import type { BaseActorFactory } from "./baseActorFactory";

// 长期规划Agent配置接口
export interface LongtermPlanningAgentConfig extends ActorConfig {
  knowledgeBaseService: KnowledgeBaseService;
  memoryService: MemoryService;
}

// 长期规划Agent工厂实现
export class LongtermPlanningAgentFactory implements BaseActorFactory {
  // 创建长期规划Agent实例
  async createActor(config?: ActorConfig): Promise<any> {
    if (
      !config ||
      !("knowledgeBaseService" in config) ||
      !("memoryService" in config)
    ) {
      throw new Error(
        "创建长期规划Agent需要knowledgeBaseService和memoryService配置",
      );
    }

    const longtermPlanningConfig = config as LongtermPlanningAgentConfig;

    // 创建并返回长期规划Agent实例
    // 从配置中移除已明确设置的属性，避免重复
    const { knowledgeBaseService, memoryService, ...restConfig } = 
      longtermPlanningConfig;
    const agent = new LongtermPlanningAgent({
      knowledgeBaseService,
      memoryService,
      ...restConfig,
    });
    
    // 初始化Agent
    await agent.init();
    
    return agent;
  }

  // 获取Actor类型
  getActorType(): string {
    return "longtermPlanningAgent";
  }
}