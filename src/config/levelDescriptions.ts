import { generateAllLevelDescriptions } from './levelConfig';

/**
 * 所有中文学习级别的完整描述字符串
 * 每个级别都包含完整的学习信息，可直接用于提示词
 */
export const ALL_LEVEL_DESCRIPTIONS = generateAllLevelDescriptions();

/**
 * L1级别完整描述字符串
 * 适合年龄: ~1.5-2.5岁
 */
export const L1_DESCRIPTION = ALL_LEVEL_DESCRIPTIONS['L1'];

/**
 * L2级别完整描述字符串
 * 适合年龄: ~2-3.5岁
 */
export const L2_DESCRIPTION = ALL_LEVEL_DESCRIPTIONS['L2'];

/**
 * L3级别完整描述字符串
 * 适合年龄: ~3-4岁
 */
export const L3_DESCRIPTION = ALL_LEVEL_DESCRIPTIONS['L3'];

/**
 * L4级别完整描述字符串
 * 适合年龄: ~4-5岁
 */
export const L4_DESCRIPTION = ALL_LEVEL_DESCRIPTIONS['L4'];

/**
 * L5级别完整描述字符串
 * 适合年龄: ~5-6岁
 */
export const L5_DESCRIPTION = ALL_LEVEL_DESCRIPTIONS['L5'];

// 如果需要，还可以添加一个函数来导出所有级别的描述为一个大字符串
/**
 * 导出所有级别描述为一个连续的字符串
 * @returns 包含所有级别完整描述的字符串
 */
export function exportAllLevelsAsSingleString(): string {
  return Object.entries(ALL_LEVEL_DESCRIPTIONS)
    .map(([level, description]) => `${level} 级别\n${description}`)
    .join('\n\n' + '='.repeat(50) + '\n\n');
}