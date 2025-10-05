import { db, testDbConnection } from './db';
import { vocabulary, vocabularyStats } from './schema';
import { DatabaseVocabularyService } from '../services/vocabularyService';
import { eq } from 'drizzle-orm';

// 测试用户ID
const TEST_CHILD_ID = 'test_child_id_' + Date.now();
const TEST_WORDS = ['你好', '世界', '测试', '数据库', '验证'];

// 清理测试数据
async function cleanupTestData() {
  try {
    // 删除测试词汇
    await db.delete(vocabulary).where(eq(vocabulary.childId, TEST_CHILD_ID));
    // 删除测试统计数据
    await db.delete(vocabularyStats).where(eq(vocabularyStats.childId, TEST_CHILD_ID));
    console.log('测试数据已清理');
  } catch (error) {
    console.error('清理测试数据失败:', error);
  }
}

// 创建数据库表
async function createTables() {
  try {
    console.log('正在创建数据库表...');
    // 尝试直接使用原始SQL创建表
    // 手动创建vocabulary表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS vocabulary (
        id TEXT PRIMARY KEY,
        child_id VARCHAR(50) NOT NULL,
        word TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    
    // 手动创建vocabulary_stats表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS vocabulary_stats (
        child_id VARCHAR(50) PRIMARY KEY,
        word_count INTEGER DEFAULT 0 NOT NULL,
        last_updated TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('数据库表创建成功');
    return true;
  } catch (error) {
    console.error('创建数据库表失败:', error);
    return false;
  }
}

// 主测试函数
async function runDbTests() {
  console.log('开始数据库测试...');
  
  try {
    // 1. 测试数据库连接
    console.log('步骤1: 测试数据库连接');
    const isConnected = await testDbConnection();
    if (!isConnected) {
      console.error('数据库连接失败，测试中止');
      return;
    }
    
    // 2. 创建数据库表
    console.log('步骤2: 创建数据库表');
    const tablesCreated = await createTables();
    if (!tablesCreated) {
      console.error('创建数据库表失败，测试中止');
      return;
    }
    
    // 3. 初始化词汇表服务
    console.log('步骤3: 初始化词汇表服务');
    const vocabularyService = new DatabaseVocabularyService();
    
    // 4. 清理可能存在的旧测试数据
    console.log('步骤4: 清理可能存在的旧测试数据');
    await cleanupTestData();
    
    // 4. 测试添加词汇
    console.log('步骤4: 测试添加词汇');
    await vocabularyService.addVocabulary(TEST_CHILD_ID, TEST_WORDS);
    console.log(`成功添加 ${TEST_WORDS.length} 个测试词汇`);
    
    // 5. 测试获取词汇列表
    console.log('步骤5: 测试获取词汇列表');
    const storedWords = await vocabularyService.getVocabularyByChildId(TEST_CHILD_ID);
    console.log(`从数据库获取到 ${storedWords.length} 个词汇:`, storedWords);
    
    // 验证获取的词汇是否与添加的一致
    const wordsMatch = TEST_WORDS.every(word => storedWords.includes(word));
    console.log(`词汇匹配验证: ${wordsMatch ? '通过' : '失败'}`);
    
    // 6. 测试获取词汇数量
    console.log('步骤6: 测试获取词汇数量');
    const wordCount = await vocabularyService.getVocabularyCount(TEST_CHILD_ID);
    console.log(`数据库中词汇数量: ${wordCount}`);
    console.log(`数量验证: ${wordCount === TEST_WORDS.length ? '通过' : '失败'}`);
    
    // 7. 测试词汇是否存在
    console.log('步骤7: 测试词汇是否存在');
    for (const word of TEST_WORDS) {
      const exists = await vocabularyService.isVocabularyExists(TEST_CHILD_ID, word);
      console.log(`词汇 '${word}' 存在检查: ${exists ? '通过' : '失败'}`);
    }
    
    // 测试不存在的词汇
    const notExists = await vocabularyService.isVocabularyExists(TEST_CHILD_ID, '不存在的词汇');
    console.log(`不存在词汇检查: ${!notExists ? '通过' : '失败'}`);
    
    // 8. 测试添加重复词汇
    console.log('步骤8: 测试添加重复词汇');
    await vocabularyService.addVocabulary(TEST_CHILD_ID, TEST_WORDS.slice(0, 2)); // 只添加前两个词汇
    const updatedCount = await vocabularyService.getVocabularyCount(TEST_CHILD_ID);
    console.log(`添加重复词汇后数量: ${updatedCount}`);
    console.log(`重复添加测试: ${updatedCount === TEST_WORDS.length ? '通过' : '失败'}`);
    
    // 9. 测试直接使用Drizzle ORM操作数据库
    console.log('步骤9: 测试直接使用Drizzle ORM操作数据库');
    const directQueryResult = await db
      .select()
      .from(vocabulary)
      .where(eq(vocabulary.childId, TEST_CHILD_ID));
    console.log(`直接查询结果: ${directQueryResult.length} 条记录`);
    
    // 10. 测试词汇统计数据
    console.log('步骤10: 测试词汇统计数据');
    const statsResult = await db
      .select()
      .from(vocabularyStats)
      .where(eq(vocabularyStats.childId, TEST_CHILD_ID));
    if (statsResult.length > 0) {
      console.log(`统计数据: 词汇数量=${statsResult[0].wordCount}, 最后更新=${statsResult[0].lastUpdated}`);
      console.log(`统计数据验证: ${statsResult[0].wordCount === TEST_WORDS.length ? '通过' : '失败'}`);
    } else {
      console.log('统计数据验证: 失败（未找到统计记录）');
    }
    
    console.log('\n数据库测试完成!');
    
  } catch (error) {
    console.error('数据库测试失败:', error);
  } finally {
    // 清理测试数据
    console.log('\n清理测试数据...');
    await cleanupTestData();
  }
}

// 运行测试
runDbTests().catch(err => {
  console.error('测试执行失败:', err);
  process.exit(1);
});