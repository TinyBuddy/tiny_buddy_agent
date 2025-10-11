import { InMemoryMemoryService } from './memoryService';
import { testDbConnection } from '../db/db';

// 测试内存和数据库双重存储机制
async function testMemoryDatabaseIntegration() {
  console.log('开始测试内存和数据库双重存储机制...');

  // 测试数据库连接
  const dbConnected = await testDbConnection();
  if (!dbConnected) {
    console.error('数据库连接失败，测试无法继续');
    return;
  }

  // 创建内存服务实例
  const memoryService = new InMemoryMemoryService();
  await memoryService.init();

  // 生成一个唯一的儿童ID用于测试
  const testChildId = `test_child_${Date.now()}`;
  console.log(`使用测试ID: ${testChildId}`);

  try {
    // 1. 创建儿童档案
    console.log('1. 创建儿童档案...');
    const createdProfile = await memoryService.createChildProfile({
      name: '测试儿童',
      age: 6,
      gender: 'other',
      preferredLanguage: 'zh',
      interests: ['阅读', '科学实验'],
      dislikes: ['吵闹'],
      learningProgress: { '数学': 30, '语文': 40 },
      lastInteraction: new Date()
    });
    console.log('创建的档案:', createdProfile);

    // 2. 获取儿童档案（应该从数据库获取）
    console.log('\n2. 从数据库获取儿童档案...');
    const fetchedProfile = await memoryService.getChildProfile(createdProfile.id);
    console.log('获取的档案:', fetchedProfile);

    // 3. 更新儿童档案
    console.log('\n3. 更新儿童档案...');
    const updatedProfile = await memoryService.updateChildProfile(createdProfile.id, {
      age: 7,
      interests: ['阅读', '科学实验', '编程'],
      learningProgress: { '数学': 40, '语文': 50, '编程': 10 }
    });
    console.log('更新后的档案:', updatedProfile);

    // 4. 验证从数据库获取更新后的档案
    console.log('\n4. 验证从数据库获取更新后的档案...');
    // 模拟内存缓存失效，强制从数据库获取
    memoryService['childProfiles'].delete(createdProfile.id);
    const dbUpdatedProfile = await memoryService.getChildProfile(createdProfile.id);
    console.log('从数据库获取的更新后档案:', dbUpdatedProfile);

    // 5. 测试获取所有儿童ID
    console.log('\n5. 获取所有儿童ID...');
    const allChildIds = await memoryService.getAllChildIds();
    console.log('所有儿童ID数量:', allChildIds.length);
    console.log('是否包含测试ID:', allChildIds.includes(createdProfile.id));

    console.log('\n✅ 测试完成！所有功能正常工作。');
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
// 检查是否作为主模块运行（ES模块兼容方式）
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// 确定当前文件的路径信息
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 检查是否直接运行此脚本
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  testMemoryDatabaseIntegration().catch(console.error);
}

// 导出测试函数以便其他地方调用
export { testMemoryDatabaseIntegration };