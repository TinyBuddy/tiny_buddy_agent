import { pgTable, text, varchar, timestamp, integer } from 'drizzle-orm/pg-core';

// 词汇表模型
export const vocabulary = pgTable('vocabulary', {
  id: text('id').primaryKey(),
  childId: varchar('child_id', { length: 50 }).notNull(),
  word: text('word').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// 词汇统计模型
export const vocabularyStats = pgTable('vocabulary_stats', {
  childId: varchar('child_id', { length: 50 }).primaryKey(),
  wordCount: integer('word_count').default(0).notNull(),
  lastUpdated: timestamp('last_updated').defaultNow().notNull()
});

// 导出类型
export type Vocabulary = typeof vocabulary.$inferSelect;
export type NewVocabulary = typeof vocabulary.$inferInsert;
export type VocabularyStats = typeof vocabularyStats.$inferSelect;
export type NewVocabularyStats = typeof vocabularyStats.$inferInsert;