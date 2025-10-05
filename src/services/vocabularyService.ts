import { db } from '../db/db';
import { vocabulary, vocabularyStats } from '../db/schema';
import { NewVocabulary, NewVocabularyStats } from '../db/schema';
import { eq, and } from 'drizzle-orm';

// 词汇表服务接口
export interface VocabularyService {
  // 添加词汇
  addVocabulary(childId: string, words: string[]): Promise<void>;
  
  // 获取用户的词汇列表
  getVocabularyByChildId(childId: string): Promise<string[]>;
  
  // 获取用户的词汇数量
  getVocabularyCount(childId: string): Promise<number>;
  
  // 检查词汇是否已存在
  isVocabularyExists(childId: string, word: string): Promise<boolean>;
}

// 实现词汇表服务
export class DatabaseVocabularyService implements VocabularyService {
  // 添加词汇到数据库
  async addVocabulary(childId: string, words: string[]): Promise<void> {
    if (!words || words.length === 0) {
      return;
    }

    try {
      // 过滤掉已存在的词汇
      const existingWords = await this.getVocabularyByChildId(childId);
      const newWords = words.filter(word => !existingWords.includes(word));

      if (newWords.length === 0) {
        return;
      }

      // 准备要插入的词汇数据
      const vocabularyData: NewVocabulary[] = newWords.map(word => ({
        id: this.generateUniqueId(),
        childId,
        word
      }));

      // 插入词汇数据
      await db.insert(vocabulary).values(vocabularyData);

      // 更新词汇统计
      const currentCount = await this.getVocabularyCount(childId);
      const newCount = currentCount + newWords.length;

      // 检查是否存在统计记录
      const existingStats = await db.select().from(vocabularyStats).where(eq(vocabularyStats.childId, childId));

      if (existingStats.length > 0) {
        // 更新现有记录
        await db.update(vocabularyStats)
          .set({
            wordCount: newCount,
            lastUpdated: new Date()
          })
          .where(eq(vocabularyStats.childId, childId));
      } else {
        // 创建新记录
        const statsData: NewVocabularyStats = {
          childId,
          wordCount: newCount
        };
        await db.insert(vocabularyStats).values(statsData);
      }

      console.log(`Added ${newWords.length} new vocabulary words for child ${childId}`);
    } catch (error) {
      console.error(`Failed to add vocabulary for child ${childId}:`, error);
      throw error;
    }
  }

  // 获取用户的词汇列表
  async getVocabularyByChildId(childId: string): Promise<string[]> {
    try {
      const result = await db
        .select({ word: vocabulary.word })
        .from(vocabulary)
        .where(eq(vocabulary.childId, childId));
      
      return result.map(item => item.word);
    } catch (error) {
      console.error(`Failed to get vocabulary for child ${childId}:`, error);
      return [];
    }
  }

  // 获取用户的词汇数量
  async getVocabularyCount(childId: string): Promise<number> {
    try {
      const result = await db
        .select({ count: vocabularyStats.wordCount })
        .from(vocabularyStats)
        .where(eq(vocabularyStats.childId, childId));
      
      return result.length > 0 ? result[0].count : 0;
    } catch (error) {
      console.error(`Failed to get vocabulary count for child ${childId}:`, error);
      return 0;
    }
  }

  // 检查词汇是否已存在
  async isVocabularyExists(childId: string, word: string): Promise<boolean> {
    try {
      const result = await db
        .select()
        .from(vocabulary)
        .where(and(
          eq(vocabulary.childId, childId),
          eq(vocabulary.word, word)
        ))
        .limit(1);
      
      return result.length > 0;
    } catch (error) {
      console.error(`Failed to check vocabulary existence for child ${childId}:`, error);
      return false;
    }
  }

  // 生成唯一ID
  private generateUniqueId(): string {
    return `vocab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 创建默认的词汇表服务实例
export const defaultVocabularyService = new DatabaseVocabularyService();