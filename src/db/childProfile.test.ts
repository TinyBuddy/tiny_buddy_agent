import { createChildProfile, getChildProfileById, updateChildProfile, deleteChildProfile, listChildProfiles, testDbConnection, db } from './db';
import { createDefaultChildProfile } from '../models/childProfile';

// 创建数据库表
async function createTables() {
  try {
    console.log('正在创建数据库表...');
    
    // 手动创建child_profiles表
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

// 简单的测试函数，不依赖测试框架
async function runTests() {
  let testProfileId = 'test-profile-' + Date.now();
  let testProfile;
  let success = true;

  try {
    console.log('=== 开始测试 ChildProfile 数据库操作 ===');
    
    // 测试数据库连接
    console.log('1. 测试数据库连接...');
    const isConnected = await testDbConnection();
    if (!isConnected) {
      throw new Error('数据库连接失败');
    }
    console.log('✓ 数据库连接成功');
    
    // 创建数据库表
    console.log('2. 创建数据库表...');
    const tablesCreated = await createTables();
    if (!tablesCreated) {
      throw new Error('创建数据库表失败');
    }
    console.log('✓ 数据库表创建成功');

    // 创建测试用的儿童档案
    testProfile = createDefaultChildProfile(testProfileId);
    
    // 测试创建儿童档案
    console.log('2. 测试创建儿童档案...');
    const createdProfile = await createChildProfile(testProfile);
    console.log('创建的档案:', createdProfile);
    if (createdProfile && createdProfile.id === testProfileId) {
      console.log('✓ 创建儿童档案成功');
    } else {
      throw new Error('创建儿童档案失败');
    }

    // 测试获取儿童档案
    console.log('3. 测试获取儿童档案...');
    const retrievedProfile = await getChildProfileById(testProfileId);
    console.log('获取的档案:', retrievedProfile);
    if (retrievedProfile && retrievedProfile.id === testProfileId) {
      console.log('✓ 获取儿童档案成功');
    } else {
      throw new Error('获取儿童档案失败');
    }

    // 测试更新儿童档案
    console.log('4. 测试更新儿童档案...');
    const updateData = {
      name: '更新后的小朋友',
      age: 5,
      interests: ['学习', '画画', '唱歌'],
      languageLevel: 'L3'
    };
    const updatedProfile = await updateChildProfile(testProfileId, updateData);
    console.log('更新的档案:', updatedProfile);
    if (updatedProfile && 
        updatedProfile.name === updateData.name && 
        updatedProfile.age === updateData.age && 
        updatedProfile.languageLevel === updateData.languageLevel) {
      console.log('✓ 更新儿童档案成功');
    } else {
      throw new Error('更新儿童档案失败');
    }

    // 测试列出所有儿童档案
    console.log('5. 测试列出所有儿童档案...');
    const profiles = await listChildProfiles();
    console.log('所有档案数量:', profiles.length);
    if (Array.isArray(profiles) && profiles.length > 0) {
      console.log('✓ 列出儿童档案成功');
    } else {
      throw new Error('列出儿童档案失败');
    }

    // 测试删除儿童档案
    console.log('6. 测试删除儿童档案...');
    const deletedProfile = await deleteChildProfile(testProfileId);
    console.log('删除的档案:', deletedProfile);
    if (deletedProfile && deletedProfile.id === testProfileId) {
      console.log('✓ 删除儿童档案成功');
      
      // 验证删除后确实不存在
      const profileAfterDelete = await getChildProfileById(testProfileId);
      if (profileAfterDelete === null) {
        console.log('✓ 验证删除结果成功：档案已不存在');
      } else {
        throw new Error('验证删除结果失败：档案仍然存在');
      }
    } else {
      throw new Error('删除儿童档案失败');
    }

    console.log('=== 所有测试完成！===');
  } catch (error) {
    console.error('测试失败:', error);
    success = false;
  } finally {
    // 清理测试数据（确保删除）
    try {
      const profileExists = await getChildProfileById(testProfileId);
      if (profileExists) {
        await deleteChildProfile(testProfileId);
        console.log('测试数据已清理');
      }
    } catch (error) {
      console.error('清理测试数据失败:', error);
    }
  }
  
  return success;
}

// 如果直接运行此脚本，则执行测试
if (import.meta.url.startsWith('file:') && process.argv[1] && process.argv[1].endsWith('childProfile.test.ts')) {
  (async () => {
    const success = await runTests();
    process.exit(success ? 0 : 1);
  })();
}