import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from 'dotenv';

// 加载环境变量
config();

// 获取数据库连接URL
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_OI4tyxhqgLC2@ep-round-wildflower-afnhrojq-pooler.c-2.us-west-2.aws.neon.tech/tinybuddy-agent?sslmode=require&channel_binding=require';

// 创建数据库连接池
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // 对于Neon数据库可能需要这个设置
  }
});

// 创建Drizzle ORM实例
export const db = drizzle(pool);

// 测试数据库连接
export async function testDbConnection() {
  try {
    const client = await pool.connect();
    console.log('Database connection successful');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}