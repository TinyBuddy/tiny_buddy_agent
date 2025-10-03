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
}

// 创建默认儿童档案
export const createDefaultChildProfile = (id: string): ChildProfile => ({
  id,
  name: "小朋友",
  age: 4,
  gender: "other",
  preferredLanguage: "zh",
  interests: [],
  dislikes: [],
  learningProgress: {},
  lastInteraction: new Date(),
});
