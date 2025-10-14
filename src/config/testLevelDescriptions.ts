import { generateLevelDescription, generateAllLevelDescriptions } from './levelConfig';

// 测试单个级别描述生成
console.log('=== 单个级别描述测试 ===');
const l1Description = generateLevelDescription('L1');
console.log('L1 级别描述:');
console.log(l1Description);
console.log('\n' + '='.repeat(50) + '\n');

// 测试所有级别描述生成
console.log('=== 所有级别描述测试 ===');
const allDescriptions = generateAllLevelDescriptions();

// 输出每个级别的完整描述
Object.entries(allDescriptions).forEach(([level, description]) => {
  console.log(`\n${level} 级别完整描述:`);
  console.log(description);
  console.log('-' + '='.repeat(48) + '-');
});

// 测试不存在的级别
console.log('\n=== 测试不存在的级别 ===');
const nonExistentLevel = generateLevelDescription('L99');
console.log(nonExistentLevel);