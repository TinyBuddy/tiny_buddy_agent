import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import { childProfiles, chineseLearningProgress } from "./schema";

// 加载环境变量
config();

// 获取数据库连接URL
const DATABASE_URL =
	process.env.DATABASE_URL ||
	"postgresql://neondb_owner:npg_OI4tyxhqgLC2@ep-round-wildflower-afnhrojq-pooler.c-2.us-west-2.aws.neon.tech/tinybuddy-agent?sslmode=require&channel_binding=require";

// 创建数据库连接池
const pool = new Pool({
	connectionString: DATABASE_URL,
	ssl: {
		rejectUnauthorized: false, // 对于Neon数据库可能需要这个设置
	},
});

// 创建Drizzle ORM实例
export const db = drizzle(pool);

// 测试数据库连接
export async function testDbConnection() {
	try {
		const client = await pool.connect();
		console.log("Database connection successful");
		client.release();
		return true;
	} catch (error) {
		console.error("Database connection failed:", error);
		return false;
	}
}

// 儿童档案相关操作

// 创建儿童档案
export async function createChildProfile(profile: any) {
	try {
		// 确保所有必填字段都有值
		if (!profile.id || !profile.name || !profile.age || !profile.gender || !profile.preferredLanguage) {
			throw new Error("Missing required fields for child profile");
		}

		// 处理数组类型的字段，确保它们是数组
		const interests = Array.isArray(profile.interests) ? profile.interests : [];
		const dislikes = Array.isArray(profile.dislikes) ? profile.dislikes : [];
		const learningProgress = typeof profile.learningProgress === 'object' ? profile.learningProgress : {};

		const result = await db.insert(childProfiles).values({
			...profile,
			interests,
			dislikes,
			learningProgress,
			lastInteraction: profile.lastInteraction || new Date(),
		}).returning();

		return result[0];
	} catch (error) {
		console.error("Error creating child profile:", error);
		throw error;
	}
}

// 获取儿童档案
export async function getChildProfileById(id: string) {
	try {
		const result = await db.select().from(childProfiles).where(eq(childProfiles.id, id));
		return result.length > 0 ? result[0] : null;
	} catch (error) {
		console.error(`Error getting child profile with id ${id}`, error);
		throw error;
	}
}

// 更新儿童档案
export async function updateChildProfile(id: string, profileData: any) {
	try {
		// 处理数组和对象类型的字段
		const updateData: any = { ...profileData };

		if (updateData.interests && !Array.isArray(updateData.interests)) {
			updateData.interests = [];
		}

		if (updateData.dislikes && !Array.isArray(updateData.dislikes)) {
			updateData.dislikes = [];
		}

		if (updateData.learningProgress && typeof updateData.learningProgress !== 'object') {
			updateData.learningProgress = {};
		}

		// 更新lastInteraction为当前时间
		updateData.lastInteraction = new Date();
		updateData.updatedAt = new Date();

		const result = await db.update(childProfiles).set(updateData).where(eq(childProfiles.id, id)).returning();

		return result.length > 0 ? result[0] : null;
	} catch (error) {
		console.error(`Error updating child profile with id ${id}`, error);
		throw error;
	}
}

// 删除儿童档案
export async function deleteChildProfile(id: string) {
	try {
		const result = await db.delete(childProfiles).where(eq(childProfiles.id, id)).returning();

		return result.length > 0 ? result[0] : null;
	} catch (error) {
		console.error(`Error deleting child profile with id ${id}`, error);
		throw error;
	}
}

// 列出所有儿童档案
export async function listChildProfiles() {
	try {
		const result = await db.select().from(childProfiles);
		return result;
	} catch (error) {
		console.error("Error listing child profiles", error);
		throw error;
	}
}

// 中文学习进度相关操作

// 获取儿童的中文学习进度
export async function getChineseLearningProgress(childId: string) {
	try {
		const result = await db.select().from(chineseLearningProgress).where(eq(chineseLearningProgress.childId, childId));
		return result.length > 0 ? result[0] : null;
	} catch (error) {
		console.error(`Error getting chinese learning progress for child ${childId}`, error);
		throw error;
	}
}

// 创建或更新儿童的中文学习进度
export async function upsertChineseLearningProgress(childId: string, progressData: Partial<typeof chineseLearningProgress.$inferInsert>) {
	try {
		const existing = await getChineseLearningProgress(childId);
		
		if (existing) {
			// 更新现有记录
			const result = await db
				.update(chineseLearningProgress)
				.set({
					...progressData,
					updatedAt: new Date(),
				})
				.where(eq(chineseLearningProgress.childId, childId))
				.returning();
			return result[0];
		} else {
			// 创建新记录
			const result = await db
				.insert(chineseLearningProgress)
				.values({
					childId,
					sparkyTaughtWords: progressData.sparkyTaughtWords || {},
					taughtCount: progressData.taughtCount || {},
					childSpokenWords: progressData.childSpokenWords || {},
					wordLearnCount: progressData.wordLearnCount || {},
					nextLearningSuggestion: progressData.nextLearningSuggestion || '',
				})
				.returning();
			return result[0];
		}
	} catch (error) {
		console.error(`Error upserting chinese learning progress for child ${childId}`, error);
		throw error;
	}
}
