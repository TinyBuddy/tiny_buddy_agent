import type { BaseActor } from "../actors/baseActor";
import { ExecutionAgent } from "../actors/executionAgent";
import type { KnowledgeBaseService } from "../services/knowledgeBaseService";
import type { MemoryService } from "../services/memoryService";
// 执行Agent工厂
import type { ActorConfig } from "./baseActorFactory";
import type { BaseActorFactory } from "./baseActorFactory";

// 执行Agent配置接口
export interface ExecutionAgentConfig extends ActorConfig {
	knowledgeBaseService: KnowledgeBaseService;
	memoryService: MemoryService;
}

// 执行Agent工厂实现
export class ExecutionAgentFactory implements BaseActorFactory {
	// 创建执行Agent实例
	async createActor(config?: ActorConfig): Promise<BaseActor> {
		if (
			!config ||
			!("knowledgeBaseService" in config) ||
			!("memoryService" in config)
		) {
			throw new Error(
				"创建执行Agent需要knowledgeBaseService和memoryService配置",
			);
		}

		const executionConfig = config as ExecutionAgentConfig;

		// 创建并返回执行Agent实例
		// 从配置中移除已明确设置的属性，避免重复
		const { knowledgeBaseService, memoryService, ...restConfig } =
			executionConfig;
		return new ExecutionAgent({
			knowledgeBaseService,
			memoryService,
			...restConfig,
		});
	}

	// 获取Actor类型
	getActorType(): string {
		return "executionAgent";
	}
}
