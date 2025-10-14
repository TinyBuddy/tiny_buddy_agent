import { generateAllLevelDescriptions } from './levelConfig';

// 获取所有级别描述
const allDescriptions = generateAllLevelDescriptions();

// 简单输出每个级别的对话长度部分
console.log('=== 每个级别的对话长度字段 ===');
Object.entries(allDescriptions).forEach(([level, description]) => {
  console.log(`\n${level} 级别:`);
  
  // 分割描述并查找对话长度行
  const lines = description.split('\n');
  const dialogueLine = lines.find(line => line.startsWith('对话长度:'));
  
  if (dialogueLine) {
    console.log(dialogueLine);
    // 显示该行的实际字符内容（包括不可见字符）
    console.log('实际字符:', JSON.stringify(dialogueLine));
    console.log('字符长度:', dialogueLine.length);
  } else {
    console.log('没有对话长度字段');
  }
});