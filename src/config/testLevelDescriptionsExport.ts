import { 
  ALL_LEVEL_DESCRIPTIONS, 
  L1_DESCRIPTION, 
  L2_DESCRIPTION, 
  L3_DESCRIPTION, 
  L4_DESCRIPTION, 
  L5_DESCRIPTION,
  exportAllLevelsAsSingleString 
} from './levelDescriptions';

// 测试单个级别描述导出
console.log('=== 单个级别描述导出测试 ===');
console.log('L2_DESCRIPTION:');
console.log(L2_DESCRIPTION);
console.log('\n' + '='.repeat(50) + '\n');

// 测试所有级别描述映射
console.log('=== 所有级别描述映射测试 ===');
console.log('包含的级别:', Object.keys(ALL_LEVEL_DESCRIPTIONS));
console.log('\n' + '='.repeat(50) + '\n');

// 测试导出所有级别为单个字符串
console.log('=== 导出所有级别为单个字符串测试 ===');
const allLevelsString = exportAllLevelsAsSingleString();
console.log(allLevelsString);