import { createChildProfile, testDbConnection, db } from './db';
import { createDefaultChildProfile } from '../models/childProfile';

// 创建数据库表
async function createTables() {
  try {
    console.log('正在创建数据库表...');
    
    // 手动创建child_profiles表（如果不存在）
    await db.execute(`
      CREATE TABLE IF NOT EXISTS child_profiles (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        age INTEGER NOT NULL,
        gender VARCHAR(10) NOT NULL,
        preferred_language VARCHAR(10) NOT NULL,
        interests JSONB NOT NULL,
        dislikes JSONB NOT NULL,
        learning_progress JSONB NOT NULL,
        last_interaction TIMESTAMP NOT NULL,
        language_level VARCHAR(10),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    
    console.log('数据库表创建成功');
    return true;
  } catch (error) {
    console.error('创建数据库表失败:', error);
    return false;
  }
}

// 测试插入功能
async function testInsert() {
  try {
    console.log('=== 开始测试 ChildProfile 插入功能 ===');
    
    // 测试数据库连接
    console.log('1. 测试数据库连接...');
    const isConnected = await testDbConnection();
    if (!isConnected) {
      throw new Error('数据库连接失败');
    }
    console.log('✓ 数据库连接成功');
    
    // 创建数据库表
    console.log('2. 创建数据库表（如果不存在）...');
    await createTables();
    
    // 创建测试数据
    const testProfileId = 'insert-test-' + Date.now();
    const testProfile = createDefaultChildProfile(testProfileId);
    console.log('测试数据准备完成:', {
      id: testProfile.id,
      name: testProfile.name,
      age: testProfile.age,
      interests: testProfile.interests
    });
    
    // 执行插入操作
    console.log('3. 执行插入操作...');
    const startTime = Date.now();
    const createdProfile = await createChildProfile(testProfile);
    const endTime = Date.now();
    
    // 验证插入结果
    if (createdProfile && createdProfile.id === testProfileId) {
      console.log('✓ 插入成功! 耗时:', endTime - startTime, 'ms');
      console.log('插入的记录ID:', createdProfile.id);
      console.log('插入的记录详情:', {
        name: createdProfile.name,
        age: createdProfile.age,
        gender: createdProfile.gender,
        preferredLanguage: createdProfile.preferredLanguage,
        interests: createdProfile.interests,
        createdAt: createdProfile.createdAt
      });
      return true;
    } else {
      throw new Error('插入失败: 返回的数据不匹配');
    }
  } catch (error) {
    console.error('测试失败:', error);
    return false;
  }
}

// 执行测试
if (import.meta.url.startsWith('file:') && process.argv[1] && process.argv[1].endsWith('childProfileInsert.test.ts')) {
  (async () => {
    const success = await testInsert();
    process.exit(success ? 0 : 1);
  })();
}