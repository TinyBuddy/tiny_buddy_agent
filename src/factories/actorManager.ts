import type { BaseActor } from "../actors/baseActor";
// Actor管理器
import type { ActorConfig } from "./baseActorFactory";
import type { BaseActorFactory } from "./baseActorFactory";

// Actor管理器类
export class ActorManager {
	// 单例实例
	private static instance: ActorManager;

	// 工厂注册表
	private actorFactories: Map<string, BaseActorFactory> = new Map();

	// Actor实例缓存
	private actorInstances: Map<string, BaseActor> = new Map();

	// 私有构造函数
	private constructor() {}

	// 获取单例实例
	public static getInstance(): ActorManager {
		if (!ActorManager.instance) {
			ActorManager.instance = new ActorManager();
		}
		return ActorManager.instance;
	}

	// 注册Actor工厂
	public registerFactory(factory: BaseActorFactory): void {
		const actorType = factory.getActorType();
		this.actorFactories.set(actorType, factory);
	}

	// 根据类型创建Actor实例
	public async createActor(
		actorType: string,
		config?: ActorConfig,
	): Promise<BaseActor> {
		const factory = this.actorFactories.get(actorType);

		if (!factory) {
			throw new Error(`找不到类型为${actorType}的Actor工厂`);
		}

		// 创建Actor实例
		const actor = await factory.createActor(config);

		// 存储Actor实例
		this.actorInstances.set(actor.id, actor);

		return actor;
	}

	// 获取Actor实例
	public getActor(actorId: string): BaseActor | undefined {
		return this.actorInstances.get(actorId);
	}

	// 根据类型获取Actor实例列表
	public getActorsByType(actorType: string): BaseActor[] {
		const typeLower = actorType.toLowerCase();
		return Array.from(this.actorInstances.values()).filter(
			(actor) => actor.type.toLowerCase() === typeLower,
		);
	}

	// 销毁Actor实例
	public async destroyActor(actorId: string): Promise<boolean> {
		const actor = this.actorInstances.get(actorId);

		if (!actor) {
			return false;
		}

		// 如果Actor有清理方法，调用它
		if ("cleanup" in actor && typeof actor.cleanup === "function") {
			await actor.cleanup();
		}

		// 从缓存中移除
		return this.actorInstances.delete(actorId);
	}

	// 销毁所有Actor实例
	public async destroyAllActors(): Promise<void> {
		const actorIds = Array.from(this.actorInstances.keys());

		for (const actorId of actorIds) {
			await this.destroyActor(actorId);
		}
	}

	// 获取所有Actor类型
	public getRegisteredActorTypes(): string[] {
		return Array.from(this.actorFactories.keys());
	}

	// 检查Actor类型是否已注册
	public isActorTypeRegistered(actorType: string): boolean {
		return this.actorFactories.has(actorType);
	}

	// 获取Actor实例数量
	public getActorCount(): number {
		return this.actorInstances.size;
	}
}
