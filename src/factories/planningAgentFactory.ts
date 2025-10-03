import type { BaseActor } from "../actors/baseActor";
import { PlanningAgent } from "../actors/planningAgent";
import type { KnowledgeBaseService } from "../services/knowledgeBaseService";
import type { MemoryService } from "../services/memoryService";
// 规划Agent工厂
import type { ActorConfig } from "./baseActorFactory";
import type { BaseActorFactory } from "./baseActorFactory";

// 规划Agent配置接口
export interface PlanningAgentConfig extends ActorConfig {
  knowledgeBaseService: KnowledgeBaseService;
  memoryService: MemoryService;
}

// 规划Agent工厂实现
export class PlanningAgentFactory implements BaseActorFactory {
  // 创建规划Agent实例
  async createActor(config?: ActorConfig): Promise<BaseActor> {
    if (
      !config ||
      !("knowledgeBaseService" in config) ||
      !("memoryService" in config)
    ) {
      throw new Error(
        "创建规划Agent需要knowledgeBaseService和memoryService配置",
      );
    }

    const planningConfig = config as PlanningAgentConfig;

    // 创建并返回规划Agent实例
    // 从配置中移除已明确设置的属性，避免重复
    const { knowledgeBaseService, memoryService, ...restConfig } =
      planningConfig;
    return new PlanningAgent({
      knowledgeBaseService,
      memoryService,
      ...restConfig,
    });
  }

  // 获取Actor类型
  getActorType(): string {
    return "planningAgent";
  }
}
