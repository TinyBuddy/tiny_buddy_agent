// Actor工厂基础接口
import type { BaseActor } from "../actors/baseActor";

// Actor配置接口
export interface ActorConfig {
	[key: string]: unknown;
}

// Actor工厂基础接口
export interface BaseActorFactory {
	// 创建Actor实例
	createActor(config?: ActorConfig): Promise<BaseActor>;

	// 获取Actor类型
	getActorType(): string;
}
