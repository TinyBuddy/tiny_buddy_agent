// 知识内容模型
export interface KnowledgeContent {
  id: string;
  type: 'lesson' | 'song' | 'story' | 'game';
  title: string;
  description: string;
  content: string; // 内容主体，可以是文本、歌词等
  language: 'zh' | 'en' | 'mix';
  difficulty: 'easy' | 'medium' | 'hard';
  categories: string[]; // 分类标签
  createdAt: Date;
  updatedAt: Date;
}

// 创建新的知识内容
export const createKnowledgeContent = (
  type: 'lesson' | 'song' | 'story' | 'game',
  title: string,
  description: string,
  content: string,
  language: 'zh' | 'en' | 'mix' = 'mix',
  difficulty: 'easy' | 'medium' | 'hard' = 'easy',
  categories: string[] = []
): KnowledgeContent => ({
  id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  type,
  title,
  description,
  content,
  language,
  difficulty,
  categories,
  createdAt: new Date(),
  updatedAt: new Date(),
});