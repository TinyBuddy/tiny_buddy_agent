import { CHINESE_LEARNING_LEVELS } from './levelConfig';

// 直接打印L2级别的所有属性
console.log('=== L2级别完整数据 ===');
const l2Data = CHINESE_LEARNING_LEVELS['L2'];
console.log(JSON.stringify(l2Data, null, 2));

// 特别检查dialogueLength属性
console.log('\n=== 对话长度属性检查 ===');
const dialogueLength = l2Data.teachingMethod.dialogueLength;
console.log('dialogueLength:', dialogueLength);
console.log('类型:', typeof dialogueLength);
console.log('是否为空字符串:', dialogueLength !== undefined && dialogueLength === '');
console.log('trim后长度:', dialogueLength !== undefined ? dialogueLength.trim().length : 0);

// 尝试直接访问并格式化
console.log('\n=== 格式化输出 ===');
console.log(`对话长度: ${dialogueLength || 'undefined'}`);
console.log(`对话长度(trim后): ${dialogueLength !== undefined ? dialogueLength.trim() : 'undefined'}`);