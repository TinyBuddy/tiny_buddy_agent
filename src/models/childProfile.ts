// 儿童档案模型
export interface ChildProfile {
	id: string;
	name: string;
	age: number;
	gender: "male" | "female" | "other";
	preferredLanguage: string;
	interests: string[];
	dislikes: string[];
	learningProgress: Record<string, number>; // 各知识点的学习进度
	lastInteraction: Date;
	languageLevel?: string; // 语言水平 (L1-L5)
}

// 创建默认儿童档案
export const createDefaultChildProfile = (id: string): ChildProfile => ({
	id,
	name: "小朋友",
	age: 4,
	gender: "other",
	preferredLanguage: "zh",
	interests: ["游戏", "运动"],
	dislikes: ["危险物品"],
	learningProgress: {},
	lastInteraction: new Date(),
	languageLevel: "L2", // 默认语言水平为L2
});
