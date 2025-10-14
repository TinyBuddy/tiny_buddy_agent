// 中文学习级别配置

/**
 * 中文学习级别接口
 */
export interface LearningLevel {
  /** 级别编号 */
  level: string;
  /** 适合年龄范围 */
  age: string;
  /** 儿童能力描述 */
  childAbility: string;
  /** 语言比例 (英文/中文) */
  languageRatio: { english: number; chinese: number };
  /** 学习目标 */
  goal: string;
  /** 教学方法 */
  teachingMethod: {
    keyPoints: string[];
    tone?: string;
    dialogueLength?: string;
  };
  /** 示例行为 */
  exampleBehavior?: string[];
}

/**
 * 中文学习级别配置映射
 * 存储所有中文学习级别的详细信息
 */
export const CHINESE_LEARNING_LEVELS: Record<string, LearningLevel> = {
  L1: {
    level: 'L1',
    age: '~1.5-2.5 years',
    childAbility: 'Notices tones, imitates syllables and sounds, reacts emotionally.',
    languageRatio: { english: 85, chinese: 15 },
    goal: 'Build sound awareness and positive emotional connection with Chinese phonemes.',
    teachingMethod: {
      keyPoints: [
        'Use onomatopoeia, rhythm, repetition, and praise.',
        'Focus on sound imitation ("shui shui", "gē gē gē").',
        'Teacher maintains musical tone and short turns (2-4).'
      ]
    },
    exampleBehavior: [
      'Teacher introduces a sound and explains its meaning gently.',
      'Child repeats tone fragments or reacts with laughter/surprise.'
    ]
  },
  
  L2: {
    level: 'L2',
    age: '~2-3.5 years',
    childAbility: 'Repeats isolated words, recognizes familiar nouns and actions.',
    languageRatio: { english: 70, chinese: 30 },
    goal: 'Build first vocabulary layer (objects, animals, colors, simple verbs).',
    teachingMethod: {
      keyPoints: [
        'Use Identify → Model → Repeat → Praise loop.',
        'Encourage the child to say the word in Chinese after hearing English.',
        'Use visual and emotional reinforcement (e.g., "Panda loves 竹子!")'
      ],
      tone: 'Cheerful, affirming, patient.',
      dialogueLength: '3-5 turns'
    }
  },
  
  L3: {
    level: 'L3',
    age: '~3-4 years',
    childAbility: 'Produces 2-3-word Chinese sentences (我要水, 這是球). May mix English.',
    languageRatio: { english: 65, chinese: 35 },
    goal: 'Encourage formation of short patterned sentences expressing needs or responses.',
    teachingMethod: {
      keyPoints: [
        'Provide fixed sentence frames ("我要...", "這是...").',
        'Gently correct word order by repeating correctly.',
        'Reinforce emotion through play and imagination ("cookies", "happy/sad").',
        'Use 4-6 interactive turns.'
      ],
      tone: 'Warm, playful, emotionally responsive.'
    }
  },
  
  L4: {
    level: 'L4',
    age: '~4-5 years',
    childAbility: 'Understands "what/who/where" questions; answers or asks back.',
    languageRatio: { english: 40, chinese: 60 },
    goal: 'Enable short two-way exchanges in mixed language.',
    teachingMethod: {
      keyPoints: [
        'Alternate questions and answers (6-8 turns).',
        'Gradually increase Chinese dominance.',
        'Encourage creative participation ("我要变猫咪", "恐龙来了!").',
        'Praise curiosity and humor.'
      ],
      tone: 'Encouraging, energetic, game-like.'
    }
  },
  
  L5: {
    level: 'L5',
    age: '~5-6 years',
    childAbility: 'Forms connected sentences (2-3 in sequence); expresses cause, effect, and feelings.',
    languageRatio: { english: 30, chinese: 70 },
    goal: 'Foster storytelling, emotional articulation, and reasoning links (因為...所以...).',
    teachingMethod: {
      keyPoints: [
        'Ask reflective or cause–effect questions ("Why?", "What happened next?").',
        'Mirror and expand the child\'s sentences.',
        'Maintain 6–10-turn dialogues with empathy and imaginative prompts.',
        'End each scene with positive closure or shared feeling.'
      ],
      tone: 'Nurturing, reflective, expressive.'
    }
  }
};

/**
 * 根据年龄段获取推荐的中文学习级别
 * @param age 儿童年龄
 * @returns 推荐的学习级别
 */
export function getRecommendedLevelByAge(age: number): string {
  if (age < 2.5) return 'L1';
  if (age < 3.5) return 'L2';
  if (age < 4) return 'L3';
  if (age < 5) return 'L4';
  return 'L5';
}

/**
 * 获取所有学习级别的列表
 * @returns 学习级别数组
 */
export function getAllLearningLevels(): LearningLevel[] {
  return Object.values(CHINESE_LEARNING_LEVELS);
}

/**
 * 根据级别编号获取级别详情
 * @param level 级别编号 (如 'L1', 'L2' 等)
 * @returns 级别详情或undefined
 */
export function getLevelDetails(level: string): LearningLevel | undefined {
  return CHINESE_LEARNING_LEVELS[level];
}

/**
 * 为指定级别生成完整的描述字符串
 * @param level 级别编号 (如 'L1', 'L2' 等)
 * @returns 包含该级别所有关键信息的完整字符串
 */
export function generateLevelDescription(level: string): string {
  const levelData = CHINESE_LEARNING_LEVELS[level];
  if (!levelData) return `Level ${level} does not exist`;
  
  // For debugging purposes, print the current level's dialogueLength value
  // console.log(`Debug: ${level} dialogue length:`, levelData.teachingMethod.dialogueLength);
  
  const lines: string[] = [];
  lines.push(`Learning Level: ${levelData.level}`);
  lines.push(`Age Range: ${levelData.age}`);
  lines.push(`Child Ability: ${levelData.childAbility}`);
  lines.push(`Language Ratio: English ${levelData.languageRatio.english}%, Chinese ${levelData.languageRatio.chinese}%`);
  lines.push(`Learning Goal: ${levelData.goal}`);
  lines.push(`Teaching Method Key Points: ${levelData.teachingMethod.keyPoints.join('; ')}`);
  
  if (levelData.teachingMethod.tone) {
    lines.push(`Teaching Tone: ${levelData.teachingMethod.tone}`);
  }
  
  // Ensure proper handling of dialogue length, including type checking and non-empty values
  if (levelData.teachingMethod.dialogueLength && 
      typeof levelData.teachingMethod.dialogueLength === 'string' && 
      levelData.teachingMethod.dialogueLength.trim() !== '') {
    lines.push(`Dialogue Length: ${levelData.teachingMethod.dialogueLength}`);
  }
  
  if (levelData.exampleBehavior) {
    lines.push(`Example Behaviors: ${levelData.exampleBehavior.join('; ')}`);
  }
  
  return lines.join('\n');
}

/**
 * 生成所有级别完整描述的对象
 * @returns 包含所有级别完整描述字符串的映射
 */
export function generateAllLevelDescriptions(): Record<string, string> {
  const descriptions: Record<string, string> = {};
  
  Object.keys(CHINESE_LEARNING_LEVELS).forEach(level => {
    descriptions[level] = generateLevelDescription(level);
  });
  
  return descriptions;
}