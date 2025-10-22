import {
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";

// 儿童档案模型
export const childProfiles = pgTable("child_profiles", {
	id: varchar("id", { length: 50 }).primaryKey(),
	name: varchar("name", { length: 100 }).notNull(),
	age: integer("age").notNull(),
	gender: varchar("gender", { length: 10 }).notNull(),
	preferredLanguage: varchar("preferred_language", { length: 10 }).notNull(),
	interests: jsonb("interests").notNull(),
	dislikes: jsonb("dislikes").notNull(),
	learningProgress: jsonb("learning_progress").notNull(),
	lastInteraction: timestamp("last_interaction").notNull(),
	languageLevel: varchar("language_level", { length: 10 }),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 词汇表模型
export const vocabulary = pgTable("vocabulary", {
	id: text("id").primaryKey(),
	childId: varchar("child_id", { length: 50 }).notNull(),
	word: text("word").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 词汇统计模型
export const vocabularyStats = pgTable("vocabulary_stats", {
	childId: varchar("child_id", { length: 50 }).primaryKey(),
	wordCount: integer("word_count").default(0).notNull(),
	lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

// 导出类型
export type ChildProfile = typeof childProfiles.$inferSelect;
export type NewChildProfile = typeof childProfiles.$inferInsert;
export type Vocabulary = typeof vocabulary.$inferSelect;
export type NewVocabulary = typeof vocabulary.$inferInsert;
export type VocabularyStats = typeof vocabularyStats.$inferSelect;
export type NewVocabularyStats = typeof vocabularyStats.$inferInsert;
