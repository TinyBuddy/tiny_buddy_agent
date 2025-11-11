import MemoryClient from 'mem0ai';
import OpenAI from 'openai';

// OpenAI客户端配置
let openaiClient: OpenAI | null = null;

// 获取OpenAI客户端实例的函数
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    // 验证必要的配置
    if (!OPENAI_API_KEY) {
      console.error('警告: 未配置OpenAI API密钥，请检查OPENAI_API_KEY环境变量');
    }
    
    openaiClient = new OpenAI({
      apiKey: OPENAI_API_KEY || ''
    });
  }
  return openaiClient;
}

// mem0 API配置 - 在类内部动态获取
let mem0Client: MemoryClient | null = null;

// 获取mem0客户端实例的函数
function getMem0Client(): MemoryClient {
  if (!mem0Client) {
    const MEM0_API_KEY = process.env.MEM0_API_KEY;
    const MEM0_ENABLED = process.env.MEM0_ENABLED === 'true';
    
    // 验证必要的配置
    if (MEM0_ENABLED && !MEM0_API_KEY) {
      console.error('警告: mem0已启用但未配置API密钥，请检查MEM0_API_KEY环境变量');
    }
    
    mem0Client = new MemoryClient({ 
      apiKey: MEM0_API_KEY || '' 
    });
  }
  return mem0Client;
}

// 应用ID配置
const APP_ID = process.env.MEM0_APP_ID || 'tiny_buddy_agent';

// 第三方系统接口请求定义
export interface UpdateImportantMemoriesRequest {
  child_id: string;
  chat_history: string[]; // Array of historical conversation records
  memoryClassificationStrategy?: 'cognitive_psychology' | 'traditional'; // Memory classification strategy, default is cognitive psychology model (facts, perceptions, instructions)
}
  
  // 3D Memory Classification Interface
export interface MemoryByType {
  facts: string[];          // Factual memories - objective information about the child (name, family, friends, birthday, etc.)
  perceptions: string[];    // Perceptual memories - child's experiences and feelings (interests, dreams, important events, etc.)
  instructions: string[];   // Instructional memories - system instructions and task guidance (learning goals, preferences, etc.)
}

export interface ImportantInfo {
  // Using 3D memory classification as the primary structure
  memoryByType: MemoryByType;
}

// 扩展关键信息提取正则表达式 - English patterns
const INTEREST_PATTERNS = [
  // 改进的模式：支持更灵活的自然语言表达
  /I like(?:s)?\s+(.+?)(?:\s+and\s+|\s*$)/gi,  // "I like drawing and playing soccer"
  /like(?:s)?\s+(?:movies|music|games|toys|colors|food|activities|animals):?\s*([^,.;!\n]+)/gi,
  /interested in:?\s*([^,.;!\n]+)/gi,
  /want(?:s)?\s+to\s+([^,.;!\n]+)/gi,
  /hobby(?:ies)?:?\s*([^,.;!\n]+)/gi,
  /favorite(?:s)?(?:\s+thing)?:?\s*([^,.;!\n]+)/gi,
  /enjoy(?:s)?\s+([^,.;!\n]+)/gi,
  /I enjoy(?:s)?\s+(.+?)(?:\s+and\s+|\s*$)/gi,  // "I enjoy reading books"
];

// 兴趣类别提取正则表达式
const CATEGORY_SPECIFIC_PATTERNS = {
  animals: [
    /I like(?:s)?\s+(dogs|cats|birds|fish|tigers|lions|elephants|monkeys|dolphins|penguins|pandas|zebras|giraffes|horses|cows|sheep|rabbits|foxes|bears|koalas)/gi,
    /favorite\s+animal(?:s)?:?\s*([^,.;!\n]+)/gi,
    /like(?:s)?\s+(?:pet|animal)s?:?\s*([^,.;!\n]+)/gi,
    /love\s+(?:pet|animal)s?:?\s*([^,.;!\n]+)/gi,
    /interested in\s+(?:pet|animal)s?:?\s*([^,.;!\n]+)/gi,
  ],
  sports: [
    /I like(?:s)?\s+(soccer|football|basketball|baseball|tennis|swimming|running|cycling|dancing|gymnastics)/gi,
    /favorite\s+sport(?:s)?:?\s*([^,.;!\n]+)/gi,
    /like(?:s)?\s+playing\s+([^,.;!\n]+)/gi,
    /love\s+playing\s+([^,.;!\n]+)/gi,
    /enjoy\s+playing\s+([^,.;!\n]+)/gi,
  ],
  games: [
    /I like(?:s)?\s+(video games|board games|card games|puzzles|hide and seek|tag|chess|checkers)/gi,
    /favorite\s+game(?:s)?:?\s*([^,.;!\n]+)/gi,
    /like(?:s)?\s+playing\s+(?:video|computer)\s*games?:?\s*([^,.;!\n]+)?/gi,
    /love\s+playing\s+(?:video|computer)\s*games?:?\s*([^,.;!\n]+)?/gi,
  ],
  activities: [
    /I like(?:s)?\s+(drawing|painting|singing|dancing|reading|writing|cooking|crafts|hiking|camping)/gi,
    /favorite\s+activity(?:ies)?:?\s*([^,.;!\n]+)/gi,
    /like(?:s)?\s+to\s+([^,.;!\n]+)/gi,
    /enjoy\s+([^,.;!\n]+)/gi,
  ],
  foods: [
    /I like(?:s)?\s+(pizza|ice cream|chocolate|cake|fruits|vegetables|cookies|burgers|pasta)/gi,
    /favorite\s+food(?:s)?:?\s*([^,.;!\n]+)/gi,
    /like(?:s)?\s+to\s+eat\s+([^,.;!\n]+)/gi,
    /love\s+([^,.;!\n]+)/gi,
  ]
};

// 常见兴趣词汇列表
const COMMON_INTERESTS = {
  animals: [
    'dog', 'cat', 'bird', 'fish', 'tiger', 'lion', 'elephant', 'monkey', 'dolphin', 'penguin',
    'panda', 'zebra', 'giraffe', 'horse', 'cow', 'sheep', 'rabbit', 'fox', 'bear', 'koala',
    'doggy', 'puppy', 'kitten', 'kitty', 'bunny', 'puppies', 'kittens', 'dogs', 'cats', 'birds', 'dinosaur'
  ],
  sports: [
    'soccer', 'football', 'basketball', 'baseball', 'tennis', 'swimming', 'running', 'cycling', 
    'dancing', 'gymnastics', 'volleyball', 'hockey', 'golf', 'martial arts', 'yoga', 'karate',
    'basketball', 'baseballs', 'footballs', 'soccer balls'
  ],
  games: [
    'video game', 'board game', 'card game', 'puzzle', 'hide and seek', 'tag', 'chess', 'checkers',
    'minecraft', 'roblox', 'legos', 'lego', 'blocks', 'puzzles', 'board games', 'video games'
  ],
  activities: [
    'drawing', 'painting', 'singing', 'dancing', 'reading', 'writing', 'cooking', 'crafts', 
    'hiking', 'camping', 'swimming', 'biking', 'skating', 'skiing', 'drawing pictures', 'coloring'
  ],
  foods: [
    'pizza', 'ice cream', 'chocolate', 'cake', 'fruit', 'vegetable', 'cookie', 'burger', 'pasta',
    'apples', 'bananas', 'oranges', 'strawberries', 'chicken', 'rice', 'noodles', 'soup'
  ]
};

// 需要跳过的通用类别
const GENERIC_CATEGORIES = [
  'animals', 'animal', 'sports', 'sport', 'games', 'game', 
  'activities', 'activity', 'foods', 'food'
];

const IMPORTANT_EVENT_PATTERNS = [
  // 改进的模式：支持自然语言表达
  /(?:Today is|my|I have a)\s+birthday\s*(.+)?/gi,  // "Today is my birthday"
  /birthday:?\s*([^,.;!\n]+)/gi,
  /exam(?:s)?:?\s*([^,.;!\n]+)/gi,
  /got(?:\s+a)?\s+([^,.;!\n]+)/gi,
  /received(?:\s+a)?\s+([^,.;!\n]+)/gi,
  /first time([^,.;!\n]+)/gi,
  /important:?\s*([^,.;!\n]+)/gi,
  /memorable experience([^,.;!\n]+)/gi,
  /participated in([^,.;!\n]+)/gi,
  /took part in([^,.;!\n]+)/gi,
];

const FAMILY_PATTERNS = [
  /dad:?\s*([^,.;!\n]+)/gi,
  /mom:?\s*([^,.;!\n]+)/gi,
  /brother(?:s)?|sister(?:s)?:?\s*([^,.;!\n]+)/gi,
  /family:?\s*([^,.;!\n]+)/gi,
  /parents:?\s*([^,.;!\n]+)/gi,
];

const FRIEND_PATTERNS = [
  // 改进的模式：支持自然语言表达
  /(?:My|I have a)\s+best friend(?: is)?\s+(.+?)(?:\s+from|\s*$)/gi,  // "My best friend is Tom"
  /friend(?:s)?:?\s*([^,.;!\n]+)/gi,
  /play(?:s)?\s+with\s+([^,.;!\n]+)/gi,
  /study(?:s)?\s+with\s+([^,.;!\n]+)/gi,
  /best friend:?\s*([^,.;!\n]+)/gi,
];

const DREAM_PATTERNS = [
  /want(?:s)?\s+to\s+be\s+([^,.;!\n]+)/gi,
  /when I grow up:?\s*([^,.;!\n]+)/gi,
  /dream:?\s*([^,.;!\n]+)/gi,
  /future:?\s*([^,.;!\n]+)/gi,
  /ambition:?\s*([^,.;!\n]+)/gi,
];

// 名字提取正则表达式模式
const NAME_PATTERNS = [
  /My name is\s+([^,.;!\n]+)/gi,
  /I am\s+([^,.;!\n]+)/gi,
  /I'm\s+([^,.;!\n]+)/gi,
  /call me\s+([^,.;!\n]+)/gi,
  /my name's\s+([^,.;!\n]+)/gi,
  /name:?\s*([^,.;!\n]+)/gi,
];

// 第三方系统接口请求定义


// 重要记忆信息接口已在文件顶部定义

// 记忆存储接口
export interface ImportantMemory {
  id: string;
  content: string;
  metadata: {
    child_id: string;
    important_info: ImportantInfo;
    created_at: string;
    updated_at: string;
  };
}

// 提取文本中的关键信息
// 无效词汇列表 - 需要排除的单个字符、标点和无意义词汇
const INVALID_WORDS = [
  '?', '!', '.', ',', ';', ':', '-', '_', '+', '=', '*', '/', '\\',
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'with', 'by', 'from', 'of', 'is', 'are', 'was', 'were', 'be', 'been',
  'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'all', 'most', 'my',
  'your', 'his', 'her', 'its', 'our', 'their', 'this', 'that', 'these',
  'those', 'there', 'here', 'Oh', 'Sparky:', 'too', 'too?', 'yummy', 'fun', 
  'things', 'making', 'happy', 'sounds', 'hear', 'fun', 'song', 'rain', 'about'
];

// 过滤掉emoji的正则表达式
const EMOJI_REGEX = /[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]/gu;

// 检查词汇是否有效
function isValidInterest(word: string): boolean {
  // 移除emoji
  word = word.replace(EMOJI_REGEX, '').trim();
  
  // 排除空字符串、单个字符、无效词汇和标点符号
  if (!word || word.length <= 1 || INVALID_WORDS.includes(word.toLowerCase()) || /^[?.,!;:]$/.test(word)) {
    return false;
  }
  // 排除纯数字
  if (/^\d+$/.test(word)) {
    return false;
  }
  // 排除包含特殊字符的词汇
  if (/[?.,!;:]$/.test(word)) {
    return false;
  }
  return true;
}

// 清理词汇 - 移除末尾标点符号、emoji等
function cleanWord(word: string): string {
  return word.replace(EMOJI_REGEX, '').replace(/[?.,!;:]$/, '').trim();
}

// 使用OpenAI API提取重要信息的异步函数 - 基于认知心理学记忆分类模型
async function extractImportantInfoWithAI(texts: string[], memoryClassificationStrategy: 'cognitive_psychology' | 'traditional' = 'cognitive_psychology'): Promise<ImportantInfo> {
  try {
    const combinedText = texts.join('\n');
    
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content: `You are a Memory Classification Specialist trained in cognitive psychology principles. Your task is to analyze children's conversations and extract important information for long-term memory storage.\n\n${memoryClassificationStrategy === 'cognitive_psychology' ? `## Memory Categories Based on Cognitive Psychology

1. SEMANTIC MEMORY: Objective, factual information that can be verified. This includes:
   - Personal identifiers: names, age, birthday, gender
   - Relationships: family members, friends, classmates
   - Concrete facts: dates, locations, events with specific details
   - Verifiable information about the world

2. EPISODIC MEMORY: Subjective experiences and personal perspectives. This includes:
   - Feelings and emotions about specific experiences
   - Preferences and interests (likes/dislikes)
   - Personal opinions and attitudes
   - Memories of past events with emotional significance
   - Dreams, aspirations, and future goals
   - Sensory experiences and perceptions

3. PROCEDURAL MEMORY: Rules, instructions, and behavioral guidance. This includes:
   - Learning objectives and educational goals
   - Behavioral expectations and guidelines
   - Preferences for interaction styles
   - Specific instructions or requests from the child
   - How-to knowledge relevant to the child's needs` : `## Traditional Memory Categories

Focus on extracting the following traditional categories of information:
- Basic personal information: names, age, etc.
- Interests and preferences
- Important life events
- Family relationships
- Friendships
- Dreams and aspirations`}

## Analysis Task

Analyze the following conversation history and extract important information about the child that should be stored in long-term memory. ${memoryClassificationStrategy === 'cognitive_psychology' ? 'Focus particularly on categorizing information into the three memory types above.' : 'Focus on extracting the traditional categories of information.'}

## Memory Categories Based on Cognitive Psychology

1. SEMANTIC MEMORY: Objective, factual information that can be verified. This includes:
   - Personal identifiers: names, age, birthday, gender
   - Relationships: family members, friends, classmates
   - Concrete facts: dates, locations, events with specific details
   - Verifiable information about the world

2. EPISODIC MEMORY: Subjective experiences and personal perspectives. This includes:
   - Feelings and emotions about specific experiences
   - Preferences and interests (likes/dislikes)
   - Personal opinions and attitudes
   - Memories of past events with emotional significance
   - Dreams, aspirations, and future goals
   - Sensory experiences and perceptions

3. PROCEDURAL MEMORY: Rules, instructions, and behavioral guidance. This includes:
   - Learning objectives and educational goals
   - Behavioral expectations and guidelines
   - Preferences for interaction styles
   - Specific instructions or requests from the child
   - How-to knowledge relevant to the child's needs

## Analysis Task

Analyze the following conversation history and extract important information about the child that should be stored in long-term memory. Focus particularly on categorizing information into the three memory types above.

- Be specific and concise in your extractions
- Ensure proper categorization according to the cognitive psychology model
- Include both traditional fields for backward compatibility and the three-dimensional memory classification

CONVERSATION HISTORY TO ANALYZE:
${combinedText}

## Response Format
Please structure your response as a JSON object following this exact format:
{
  "name": "child's name if mentioned",
  "interests": ["list of interests"],
  "importantEvents": ["list of important events"],
  "familyMembers": ["list of family members"],
  "friends": ["list of friends"],
  "dreams": ["list of dreams or ambitions"],
  "memoryByType": {
    "facts": ["factual information - SEMANTIC MEMORY"],
    "perceptions": ["personal experiences and feelings - EPISODIC MEMORY"],
    "instructions": ["rules, preferences and guidance - PROCEDURAL MEMORY"]
  }
}

IMPORTANT INSTRUCTIONS:
- Extract SPECIFIC details, not general terms
- For each memory type, provide distinct, meaningful entries that are clearly categorized
- For birthdays and dates, include the exact date if mentioned
- Ensure each item is a discrete, meaningful piece of information
- Include proper nouns, specific dates, and concrete activities
- Exclude emojis, articles, and meaningless words
- PRIORITIZE the three-dimensional classification (memoryByType) and make it comprehensive
- Ensure traditional fields are still populated for backward compatibility
- Each memory entry should be a complete, standalone piece of information
- Avoid redundant information across different memory categories
- For facts category, focus on objective, verifiable information that can be confirmed
- For perceptions category, emphasize subjective experiences, feelings, and personal perspectives
- For instructions category, capture guidance, preferences, and behavioral expectations

Return ONLY a valid JSON object with all required fields. Do not include any explanations or additional text outside the JSON.`
        },
        {
          role: 'user',
          content: `Extract detailed information about the child from the following conversation, carefully categorizing into semantic (facts), episodic (perceptions), and procedural (instructions) memory types:\n${combinedText}`
        }
      ],
      response_format: { type: 'json_object' }
    });
    
    // Parse AI response JSON
    const aiResult = JSON.parse(completion.choices[0].message.content || '{}');
    
    // Filter traditional fields
    const filteredInterests = aiResult.interests?.filter((item: string) => {
      if (!item || typeof item !== 'string' || item.trim().length < 2) return false;
      const cleanedItem = item.trim().toLowerCase();
      const withoutEmoji = cleanedItem.replace(EMOJI_REGEX, '').trim();
      const words = withoutEmoji.split(/\s+/);
      return words.some(word => !INVALID_WORDS.includes(word.toLowerCase()));
    }) || [];
    
    const filteredImportantEvents = aiResult.importantEvents?.filter((item: string) => {
      if (!item || typeof item !== 'string') return false;
      const cleanedItem = item.trim();
      return cleanedItem.length > 2 || /\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}/.test(cleanedItem);
    }) || [];
    
    const filteredFamilyMembers = aiResult.familyMembers?.filter((item: string) => {
      if (!item || typeof item !== 'string') return false;
      return item.trim().length > 1;
    }) || [];
    
    const filteredFriends = aiResult.friends?.filter((item: string) => {
      if (!item || typeof item !== 'string') return false;
      const cleanedItem = item.trim();
      return cleanedItem.length > 1 && !INVALID_WORDS.includes(cleanedItem.toLowerCase());
    }) || [];
    
    const filteredDreams = aiResult.dreams?.filter((item: string) => {
      if (!item || typeof item !== 'string') return false;
      return item.trim().length > 2;
    }) || [];
    
    // Filter three-dimensional memory classification
    const filteredFacts = aiResult.memoryByType?.facts?.filter((item: string) => {
      if (!item || typeof item !== 'string') return false;
      return item.trim().length > 2;
    }) || [];
    
    const filteredPerceptions = aiResult.memoryByType?.perceptions?.filter((item: string) => {
      if (!item || typeof item !== 'string') return false;
      return item.trim().length > 2;
    }) || [];
    
    const filteredInstructions = aiResult.memoryByType?.instructions?.filter((item: string) => {
      if (!item || typeof item !== 'string') return false;
      return item.trim().length > 2;
    }) || [];
    
    // Smart processing of three-dimensional classification to ensure sufficient content in each category
    let finalFacts = filteredFacts;
    let finalPerceptions = filteredPerceptions;
    let finalInstructions = filteredInstructions;
    
    // Optimize automatic population of factual memories (semantic memory)
    if (finalFacts.length === 0 || finalFacts.length < 3) {
      // Ensure basic personal information is captured
      const factsSet: Set<string> = new Set(finalFacts);
      
      if (aiResult.name && !Array.from(factsSet).some(f => f.includes(aiResult.name))) {
        factsSet.add(`Child's name is ${aiResult.name}`);
      }
      
      // Add family relationship information
      filteredFamilyMembers.forEach((member: string) => {
        const factEntry = `Family member: ${member}`;
        if (!Array.from(factsSet).some(f => f.includes(member))) {
          factsSet.add(factEntry);
        }
      });
      
      // Add friend relationship information
      filteredFriends.forEach((friend: string) => {
        const factEntry = `Friend: ${friend}`;
        if (!Array.from(factsSet).some(f => f.includes(friend))) {
          factsSet.add(factEntry);
        }
      });
      
      // Extract objective facts from important events (events with dates)
      filteredImportantEvents.forEach((event: string) => {
        if (event.match(/\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}/)) {
          const factEntry = `Event on ${event}`;
          factsSet.add(factEntry);
        }
      });
      
      finalFacts = Array.from(factsSet);
    }
    
    // Optimize automatic population of perceptual memories (episodic memory)
    if (finalPerceptions.length === 0 || finalPerceptions.length < 3) {
      const perceptionsSet: Set<string> = new Set(finalPerceptions);
      
      // Add interests using more descriptive format
      filteredInterests.forEach((interest: string) => {
        const perceptionEntry = `Enjoys ${interest}`;
        if (!Array.from(perceptionsSet).some((p: string) => p.includes(interest))) {
          perceptionsSet.add(perceptionEntry);
        }
      });
      
      // Add dreams and aspirations
      filteredDreams.forEach((dream: string) => {
        const perceptionEntry = `Aspires to ${dream}`;
        if (!Array.from(perceptionsSet).some((p: string) => p.includes(dream))) {
          perceptionsSet.add(perceptionEntry);
        }
      });
      
      // Extract subjective perceptions from important events (events without dates)
      filteredImportantEvents.forEach((event: string) => {
        if (!event.match(/\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}/)) {
          const perceptionEntry = `Had important experience: ${event}`;
          perceptionsSet.add(perceptionEntry);
        }
      });
      
      finalPerceptions = Array.from(perceptionsSet);
    }
    
    // Optimize automatic population of instructional memories (procedural memory)
    if (finalInstructions.length === 0) {
      finalInstructions = [
        "Interact with the child in a friendly and supportive manner",
        "Adapt conversation to the child's age and language level",
        "Encourage the child to share more about their interests and experiences"
      ];
      
      // Try to extract any form of preferences or guidance from the conversation
      const instructionPatterns = [
        /(?:I prefer|I like it when|I want you to)\s+([^,.;!\n]+)/gi,
        /(?:please|can you)\s+([^,.;!\n]+)/gi,
        /(?:don't|do not)\s+([^,.;!\n]+)/gi
      ];
      
      combinedText.split('\n').forEach(line => {
        instructionPatterns.forEach(pattern => {
          const match = pattern.exec(line);
          if (match && match[1]) {
            const instruction = `Child requested: ${match[1].trim()}`;
            if (!finalInstructions.includes(instruction)) {
              finalInstructions.push(instruction);
            }
          }
        });
      });
    }
    
    return {
      memoryByType: {
        facts: finalFacts,
        perceptions: finalPerceptions,
        instructions: finalInstructions
      }
    };
  } catch (error) {
    console.error('OpenAI API调用失败，将回退到正则表达式提取:', error);
    // 回退到传统的正则表达式提取方法
    return extractImportantInfoWithRegex(texts);
  }
}

// 使用正则表达式提取重要信息的备用函数
function extractImportantInfoWithRegex(texts: string[]): ImportantInfo {
  const combinedText = texts.join('\n');
  let name: string | undefined;
  const interests: string[] = [];
  const importantEvents: string[] = [];
  const familyMembers: string[] = [];
  const friends: string[] = [];
  const dreams: string[] = [];
  
  // Extract name
  NAME_PATTERNS.forEach(pattern => {
    let match;
    while ((match = pattern.exec(combinedText)) !== null) {
      if (match[1]) {
        // Take only the first matched name
        name = match[1].trim();
        return;
      }
    }
  });
  
  // Extract interests
  INTEREST_PATTERNS.forEach(pattern => {
    let match;
    while ((match = pattern.exec(combinedText)) !== null) {
      if (match[1]) {
        const interestText = match[1].trim();
        // Skip if interest text is a generic category, extract specific content later through specialized patterns
        if (GENERIC_CATEGORIES.includes(interestText.toLowerCase())) {
          continue;
        }
        // Only add valid interests
        if (isValidInterest(interestText)) {
          interests.push(interestText);
        }
      }
    }
  });
  
  // Specifically extract concrete content for each category
  const lowerText = combinedText.toLowerCase();
  
  // Process each interest category
  Object.entries(CATEGORY_SPECIFIC_PATTERNS).forEach(([category, patterns]) => {
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(combinedText)) !== null) {
        if (match[1]) {
          const text = match[1].trim();
          // Split text that may contain multiple items
          const parts = text.split(/[,;\s]+/);
          parts.forEach(part => {
            const cleanedPart = cleanWord(part.trim());
            if (cleanedPart && !GENERIC_CATEGORIES.includes(cleanedPart.toLowerCase()) && 
                isValidInterest(cleanedPart)) {
              interests.push(cleanedPart);
            }
          });
        }
      }
    });
  });
  
  // Additional check: Extract common interest words from text
  const allCommonInterests = Object.values(COMMON_INTERESTS).flat();
  allCommonInterests.forEach(interest => {
    // Use boundary matching to ensure we find complete interest words
    const regex = new RegExp(`\\b${interest}\\b`, 'i');
    if (regex.test(lowerText)) {
      // Convert to singular form (simple processing)
      let singularInterest = interest;
      if (interest.endsWith('ies')) {
        singularInterest = interest.slice(0, -3) + 'y'; // Convert kitties to kitty
      } else if (interest.endsWith('s') && !['fish', 'sheep', 'sports'].includes(interest)) {
        singularInterest = interest.slice(0, -1); // Convert dogs to dog
      }
      // Only add valid interests
      if (isValidInterest(singularInterest)) {
        interests.push(singularInterest);
      }
    }
  });
  
  // Special processing: Extract specific interests from "I like ..." patterns
  const likePattern = /I like(?:s)?\s+([^,.;!\n]+)/gi;
  let likeMatch;
  while ((likeMatch = likePattern.exec(combinedText)) !== null) {
    if (likeMatch[1]) {
      const likes = likeMatch[1].trim();
      // Process "I like A and B" or "I like A, B" formats
      const items = likes.split(/\s+and\s+|[,;\s]+/);
      items.forEach(item => {
        const cleanedItem = cleanWord(item.trim());
        if (cleanedItem && !GENERIC_CATEGORIES.includes(cleanedItem.toLowerCase()) && 
            isValidInterest(cleanedItem)) {
          interests.push(cleanedItem);
        }
      });
    }
  };
  
  // Extract important events
  IMPORTANT_EVENT_PATTERNS.forEach(pattern => {
    let match;
    while ((match = pattern.exec(combinedText)) !== null) {
      if (match[1]) {
        const eventText = match[1].trim();
        if (eventText && eventText.length > 2) {
          importantEvents.push(eventText);
        }
      }
    }
  });
  
  // Extract family members
  FAMILY_PATTERNS.forEach(pattern => {
    let match;
    while ((match = pattern.exec(combinedText)) !== null) {
      if (match[1]) {
        const familyText = match[1].trim();
        if (familyText && familyText.length > 1) {
          familyMembers.push(familyText);
        }
      }
    }
  });
  
  // Extract friends - stricter filtering, only accept names
  FRIEND_PATTERNS.forEach(pattern => {
    let match;
    while ((match = pattern.exec(combinedText)) !== null) {
      if (match[1]) {
        const friendText = match[1].trim();
        // Stricter filtering: exclude phrases and descriptions, only accept possible names
        if (friendText && friendText.length > 2 && 
            !INVALID_WORDS.some(invalid => friendText.toLowerCase().includes(invalid)) &&
            /^[a-zA-Z]+(?:\s+[a-zA-Z]+)?$/.test(friendText)) {
          friends.push(friendText);
        }
      }
    }
  });
  
  // Extract dreams and aspirations
  DREAM_PATTERNS.forEach(pattern => {
    let match;
    while ((match = pattern.exec(combinedText)) !== null) {
      if (match[1]) {
        const dreamText = match[1].trim();
        if (dreamText && dreamText.length > 2) {
          dreams.push(dreamText);
        }
      }
    }
  });
  
  // Build three-dimensional memory structure
  const facts: string[] = [...new Set([...familyMembers, ...friends])];
  // Add name to facts if available
  if (name) {
    facts.push(`name: ${name}`);
  }
  
  const memoryByType: MemoryByType = {
    facts,
    perceptions: [...new Set([...interests, ...dreams, ...importantEvents])],
    instructions: []
  };

  return {
    memoryByType
  };
}

// 主提取函数 - 默认使用AI提取
async function extractImportantInfo(texts: string[], memoryClassificationStrategy: 'cognitive_psychology' | 'traditional' = 'cognitive_psychology'): Promise<ImportantInfo> {
  // 首先尝试使用AI提取
  return await extractImportantInfoWithAI(texts, memoryClassificationStrategy);
}

// 检查是否包含重要信息
function hasImportantInfo(info: ImportantInfo): boolean {
  // Check if there's any important information in the memoryByType structure
  return info.memoryByType.facts.length > 0 || 
         info.memoryByType.perceptions.length > 0 || 
         info.memoryByType.instructions.length > 0;
}

// 默认配置常量
const AGENT_ID = 'tiny_buddy_agent';
const USER_ID = 'tiny_buddy_user';

// mem0服务类 - 使用官方mem0ai SDK重写
export class Mem0Service {
  // 添加记忆 - 使用官方SDK的add方法
  async add(messages: Array<{ role: "user" | "assistant"; content: string }>, options: {
    user_id?: string;
    app_id?: string;
    metadata?: any;
  } = {}): Promise<any[]> {
    try {
      const result = await getMem0Client().add(messages, {
        app_id: options.app_id || APP_ID,
        user_id: options.user_id || USER_ID,
        metadata: {
          agent_id: AGENT_ID,
          child_id: options.metadata?.child_id,
          ...options.metadata
        }
      });
      
      // 处理数组格式响应
      if (Array.isArray(result)) {
        return result;
      }
      return [result];
    } catch (error) {
      console.error('添加记忆失败:', error);
      throw error;
    }
  }
  
  // 搜索记忆 - 使用官方SDK的search方法
  async search(query: string, options: {
    limit?: number;
    user_id?: string;
    app_id?: string;
    metadata?: any;
  } = {}): Promise<any[]> {
    try {
      const result = await getMem0Client().search(query, {
        limit: options.limit || 10,
        app_id: options.app_id || APP_ID,
        user_id: options.user_id || USER_ID,
        metadata: {
          agent_id: AGENT_ID,
          child_id: options.metadata?.child_id,
          ...options.metadata
        }
      });
      
      // 处理数组格式响应
      if (Array.isArray(result)) {
        return result;
      }
      return [result];
    } catch (error) {
      console.error('搜索记忆失败:', error);
      throw error;
    }
  }
  
  // 获取所有记忆 - 使用官方SDK的search方法（使用通配符查询获取全部）
  async getAll(options: {
    user_id?: string;
    app_id?: string;
    limit?: number;
    metadata?: any;
  } = {}): Promise<any[]> {
    try {
      const result = await getMem0Client().search('*', {
        limit: options.limit || 100,
        app_id: options.app_id || APP_ID,
        user_id: options.user_id || USER_ID,
        metadata: {
          agent_id: AGENT_ID,
          child_id: options.metadata?.child_id,
          ...options.metadata
        }
      });
      
      // 处理数组格式响应
      if (Array.isArray(result)) {
        return result;
      }
      return [result];
    } catch (error) {
      console.error('获取所有记忆失败:', error);
      throw error;
    }
  }
  
  // 更新记忆 - 使用官方SDK的update方法
  async update(memoryId: string, data: {
    metadata?: any;
    text?: string;
  }): Promise<any> {
    try {
      const result = await getMem0Client().update(memoryId, {
        metadata: data.metadata
      });
      
      // 处理数组格式响应
      if (Array.isArray(result) && result.length > 0) {
        return result[0];
      }
      return result;
    } catch (error) {
      console.error(`更新记忆失败 (ID: ${memoryId}):`, error);
      throw error;
    }
  }
  
  // 删除记忆 - 使用官方SDK的delete方法
  async delete(memoryId: string): Promise<any> {
    try {
      const result = await getMem0Client().delete(memoryId);
      return result;
    } catch (error) {
      console.error(`删除记忆失败 (ID: ${memoryId}):`, error);
      throw error;
    }
  }
  
  // 获取特定记忆 - 使用官方SDK的get方法
  async get(memoryId: string): Promise<any> {
    try {
      const result = await getMem0Client().get(memoryId);
      
      // 处理数组格式响应
      if (Array.isArray(result) && result.length > 0) {
        return result[0];
      }
      return result;
    } catch (error) {
      console.error(`获取记忆失败 (ID: ${memoryId}):`, error);
      throw error;
    }
  }
  
  // 获取特定孩子的所有重要记忆 - 公共方法
  async getImportantMemoriesByChildId(child_id: string): Promise<ImportantMemory[]> {
    try {
      console.log(`获取child_id: ${child_id} 的所有重要记忆`);
      
      // 使用search方法搜索特定child_id的所有记忆
      const memories = await this.search('*', {
        user_id: child_id,
        limit: 100,
        metadata: {
          agent_id: AGENT_ID,
          child_id: child_id
        }
      });
      
      console.log(`总共搜索到 ${memories.length} 个记忆项`);
      
      // 转换并过滤记忆，只返回包含important_info的记忆
      const importantMemories = memories.map((item: any) => ({
        id: item.id,
        content: item.memory || item.text || item.content || '',
        metadata: item.metadata || {}
      })).filter((mem: ImportantMemory) => 
        mem.metadata && mem.metadata.important_info
      );
      
      console.log(`其中包含重要记忆的有 ${importantMemories.length} 个`);
      return importantMemories;
    } catch (error) {
      console.error(`获取孩子重要记忆失败 (child_id: ${child_id}):`, error);
      return [];
    }
  }
  
  // Get child important information
  async getChildImportantInfo(childId: string): Promise<ImportantInfo> {
    try {
      const memories = await this.getImportantMemoriesByChildId(childId);
      
      if (memories.length === 0) {
        return {
          memoryByType: {
            facts: [],
            perceptions: [],
            instructions: []
          }
        };
      }
      
      // Merge important information from all memories
      const importantInfos = memories.map(mem => mem.metadata.important_info);
      return this.mergeImportantInfo(importantInfos);
    } catch (error) {
      console.error(`Error getting child important information: ${error instanceof Error ? error.message : String(error)}`);
      return {
        memoryByType: {
          facts: [],
          perceptions: [],
          instructions: []
        }
      };
    }
  }
  
  // 根据记忆类型获取儿童记忆 - 基于认知心理学分类模型（事实、感知、指令三维度）
  async getChildMemoryByType(childId: string, memoryType: 'semantic' | 'episodic' | 'procedural' | 'facts' | 'perceptions' | 'instructions' | 'all'): Promise<string[]> {
    try {
      const info = await this.getChildImportantInfo(childId);
      
      if (!info.memoryByType) {
        // If no memoryByType information, create an empty structure
        info.memoryByType = this.createEmptyMemoryByType();
      }
      
      // 映射新的认知心理学术语到现有的字段名称（保持向后兼容性）
      const memoryTypeMap: { [key: string]: string } = {
        'semantic': 'facts',      // 语义记忆 = 事实记忆
        'episodic': 'perceptions', // 情景记忆 = 感知记忆
        'procedural': 'instructions' // 程序记忆 = 指令记忆
      };
      
      // 处理映射或直接使用原始类型
      const actualType = memoryTypeMap[memoryType] || memoryType;
      
      // English type labels for intuitive output
      const typeLabels: Record<string, string> = {
        'facts': 'Factual Memory',
        'perceptions': 'Perceptual Memory',
        'instructions': 'Instructional Memory'
      };

      // Cognitive psychology terminology mapping
      const psychologyLabels: Record<string, string> = {
        'facts': 'Semantic Memory',
        'perceptions': 'Episodic Memory',
        'instructions': 'Procedural Memory'
      };
      
      switch (actualType) {
        case 'facts':
          // Return factual memories with dual labels (description and psychological classification)
          return (info.memoryByType.facts || []).map(mem => `[${typeLabels.facts}] [${psychologyLabels.facts}] ${mem}`);
        case 'perceptions':
          // Return perceptual memories with dual labels
          return (info.memoryByType.perceptions || []).map(mem => `[${typeLabels.perceptions}] [${psychologyLabels.perceptions}] ${mem}`);
        case 'instructions':
          // Return instructional memories with dual labels
          return (info.memoryByType.instructions || []).map(mem => `[${typeLabels.instructions}] [${psychologyLabels.instructions}] ${mem}`);
        case 'all':
          // Return all types of memories with dual labels for enhanced readability and academic accuracy
          const factMemories = (info.memoryByType.facts || []).map(mem => `[${typeLabels.facts}] [${psychologyLabels.facts}] ${mem}`);
          const perceptionMemories = (info.memoryByType.perceptions || []).map(mem => `[${typeLabels.perceptions}] [${psychologyLabels.perceptions}] ${mem}`);
          const instructionMemories = (info.memoryByType.instructions || []).map(mem => `[${typeLabels.instructions}] [${psychologyLabels.instructions}] ${mem}`);
          
          return [...factMemories, ...perceptionMemories, ...instructionMemories];
        default:
          return [];
      }
    } catch (error) {
      console.error(`获取儿童记忆时出错: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  // 从传统字段构建三维记忆分类结构
  // Helper method to create an empty MemoryByType structure
  private createEmptyMemoryByType(): MemoryByType {
    return {
      facts: [],
      perceptions: [],
      instructions: []
    };
  }
  
  // 搜索特定类型的记忆 - 基于认知心理学分类模型（事实、感知、指令三维度）
  async searchMemory(childId: string, query: string, memoryType?: 'semantic' | 'episodic' | 'procedural' | 'facts' | 'perceptions' | 'instructions' | 'all'): Promise<string[]> {
    try {
      // Get child's important information
      const info = await this.getChildImportantInfo(childId);
      
      // Ensure memoryByType exists, create empty structure if not
      if (!info.memoryByType) {
        info.memoryByType = this.createEmptyMemoryByType();
      }
      
      // 映射新的认知心理学术语到现有的字段名称（保持向后兼容性）
      const memoryTypeMap: { [key: string]: string } = {
        'semantic': 'facts',      // 语义记忆 = 事实记忆
        'episodic': 'perceptions', // 情景记忆 = 感知记忆
        'procedural': 'instructions' // 程序记忆 = 指令记忆
      };
      
      // 处理映射或直接使用原始类型
      const actualType = memoryTypeMap[memoryType || 'all'] || (memoryType || 'all');
      
      // English type labels
      const typeLabels: Record<string, string> = {
        'facts': 'Factual Memory',
        'perceptions': 'Perceptual Memory',
        'instructions': 'Instructional Memory'
      };

      // Cognitive psychology terminology mapping
      const psychologyLabels: Record<string, string> = {
        'facts': 'Semantic Memory',
        'perceptions': 'Episodic Memory',
        'instructions': 'Procedural Memory'
      };
      
      // 收集需要搜索的记忆，同时保留其类型信息
      let memoriesToSearch: Array<{content: string, type: string}> = [];
      
      if (actualType === 'all' || actualType === 'facts') {
        (info.memoryByType.facts || []).forEach(mem => {
          memoriesToSearch.push({content: mem, type: 'facts'});
        });
      }
      
      if (actualType === 'all' || actualType === 'perceptions') {
        (info.memoryByType.perceptions || []).forEach(mem => {
          memoriesToSearch.push({content: mem, type: 'perceptions'});
        });
      }
      
      if (actualType === 'all' || actualType === 'instructions') {
        (info.memoryByType.instructions || []).forEach(mem => {
          memoriesToSearch.push({content: mem, type: 'instructions'});
        });
      }
      
      // 尝试使用OpenAI进行语义搜索，考虑记忆类型的相关性
      try {
        // 首先分析查询类型，优化搜索策略
        const queryType = this.analyzeQueryType(query);
        console.log(`搜索查询类型: ${queryType}, 记忆类型过滤: ${actualType}`);
        
        // 根据查询类型可以在必要时调整搜索范围或权重
        return await this.performEnhancedSemanticSearch(query, memoriesToSearch, typeLabels);
      } catch (aiSearchError) {
        console.warn('增强语义搜索失败，回退到传统搜索方法:', aiSearchError);
        
        // 使用改进的关键词搜索作为回退方案，基于认知心理学模型优化
        const lowerQuery = query.toLowerCase();
        const queryWords = lowerQuery.split(/\s+/).filter(word => word.length > 1);
        
        // 计算每个记忆的匹配分数，并考虑记忆类型的相关性
        const scoredMemories = memoriesToSearch.map(memory => {
          const lowerMemory = memory.content.toLowerCase();
          let score = 0;
          
          // 完全匹配给高分
          if (lowerMemory.includes(lowerQuery)) {
            score += 15; // 提高完全匹配权重
          }
          
          // 部分匹配给分，考虑词频和位置
          queryWords.forEach((word, index) => {
            if (lowerMemory.includes(word)) {
              // 核心词权重更高
              const isCoreWord = index === 0 || index === queryWords.length - 1;
              score += isCoreWord ? 5 : 3;
            }
          });
          
          // 计算关键词覆盖率
          const coverage = queryWords.filter(word => lowerMemory.includes(word)).length / queryWords.length;
          if (coverage > 0.7) {
            score += 8; // 高覆盖率奖励
          } else if (coverage > 0.4) {
            score += 4; // 中等覆盖率奖励
          }
          
          // 根据查询类型调整不同记忆类型的权重
          const queryFeatures = {
            isFactual: /what|when|where|who|which|how many|how much|facts|information|details/.test(lowerQuery),
            isExperiential: /like|love|enjoy|feel|experience|remember|favorite|hate|dislike|happy|sad/.test(lowerQuery),
            isInstructional: /should|must|need to|how to|remember to|don't|shouldn't|avoid|tips|guide/.test(lowerQuery)
          };
          
          // 基于认知心理学模型的权重调整
          if (queryFeatures.isFactual && memory.type === 'facts') {
            score *= 2.0; // Factual queries prioritize factual memories (semantic memory)
          } else if (queryFeatures.isExperiential && memory.type === 'perceptions') {
            score *= 2.0; // Experiential queries prioritize perceptual memories (episodic memory)
          } else if (queryFeatures.isInstructional && memory.type === 'instructions') {
            score *= 2.0; // Instructional queries prioritize instructional memories (procedural memory)
          }
          
          // Penalty for incorrect matching
          if ((queryFeatures.isFactual && memory.type === 'instructions') ||
              (queryFeatures.isExperiential && memory.type === 'facts') ||
              (queryFeatures.isInstructional && memory.type === 'perceptions')) {
            score *= 0.6; // Type mismatch penalty
          }
          
          return { ...memory, score };
        }).filter(memory => memory.score > 0);
        
        // 按分数排序并添加双标签（中文描述和心理学分类）
        return scoredMemories
          .sort((a, b) => b.score - a.score)
          .map(memory => `[${typeLabels[memory.type]}] [${psychologyLabels[memory.type]}] ${memory.content}`);
      }
    } catch (error) {
      console.error(`搜索记忆时出错: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  // 分析查询类型 - 基于认知心理学模型
  private analyzeQueryType(query: string): 'factual' | 'experiential' | 'instructional' | 'mixed' {
    const lowerQuery = query.toLowerCase();
    
    // 事实性查询模式
    const factualPatterns = /what|when|where|who|which|how many|how much|facts|information|details/;
    // 体验性查询模式
    const experientialPatterns = /like|love|enjoy|feel|experience|remember|favorite|hate|dislike|happy|sad/;
    // 指令性查询模式
    const instructionalPatterns = /should|must|need to|how to|remember to|don't|shouldn't|avoid|tips|guide/;
    
    const isFactual = factualPatterns.test(lowerQuery);
    const isExperiential = experientialPatterns.test(lowerQuery);
    const isInstructional = instructionalPatterns.test(lowerQuery);
    
    // 统计匹配的类型数量
    const matchCount = [isFactual, isExperiential, isInstructional].filter(Boolean).length;
    
    // 如果只匹配一种类型，返回该类型
    if (matchCount === 1) {
      if (isFactual) return 'factual';
      if (isExperiential) return 'experiential';
      if (isInstructional) return 'instructional';
    }
    
    // 多种类型匹配，返回混合类型
    return 'mixed';
  }
  
  // 使用OpenAI API进行增强的语义搜索，考虑记忆类型的相关性
  private async performEnhancedSemanticSearch(
    query: string, 
    memories: Array<{content: string, type: string}>,
    typeLabels: Record<string, string>
  ): Promise<string[]> {
    try {
      // Build a prompt for enhanced semantic search that explicitly considers memory type relevance
      const systemMessage = `You are a professional memory retrieval assistant specializing in semantic search based on cognitive psychology's memory classification model. Your task is to analyze the relevance of each memory to the query, considering both content similarity and the suitability of memory types to the query context.

Memory Types and Relevance Guidelines:
- Facts/Semantic Memory: Stores objective facts and verifiable information such as names, dates, places, events, etc. Best suited for answering factual questions like "who", "what", "when", "where".
- Perceptions/Episodic Memory: Stores personal experiences, emotions, preferences, and subjective feelings. Best suited for answering questions about feelings, preferences, and experiences.
- Instructions/Procedural Memory: Stores behavioral guidance, rules, preference settings, and task instructions. Best suited for answering "how" and "should" guidance questions.

Query Analysis Principles:
1. Factual queries (containing question words like what, when, where, who, which) should prioritize matching with factual memories
2. Experiential queries (containing words like like, love, enjoy, feel, experience, remember, favorite) should prioritize matching with perceptual memories
3. Instructional queries (containing words like should, must, need to, how to, remember to, don't) should prioritize matching with instructional memories

For each query, first analyze the query type, then determine the most relevant memory type based on the above principles, and finally comprehensively evaluate content similarity and type suitability to rank the memories. Return the most relevant memories, sorted by overall relevance.`;
      
      const userMessage = `Query: ${query}\n\nMemories to evaluate (format: Index: [Type] Content):\n${memories.map((mem, idx) => `${idx}: [${typeLabels[mem.type]}] ${mem.content}`).join('\n')}\n\nInstructions:\n1. First analyze the query type (factual, experiential, or instructional)\n2. Determine the most relevant memory type based on the query type\n3. Evaluate the semantic relevance of each memory content to the query\n4. Calculate a comprehensive score combining memory type suitability and content relevance\n5. Sort the memories, prioritizing those with matching types and relevant content\n6. Return only the indices of relevant memories as a JSON array, sorted by overall relevance (most relevant first)\n7. Ensure the returned memories are truly relevant and avoid including irrelevant information`;
      
      const response = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ],
        response_format: { type: 'json_object' }
      });
      
      // Parse the response
      const result = JSON.parse(response.choices[0].message.content || '[]');
      
      // Get relevant memories by index and add type labels
      return result
        .map((index: number) => {
          const memory = memories[index];
          return memory ? `[${typeLabels[memory.type]}] ${memory.content}` : null;
        })
        .filter(Boolean);
    } catch (error) {
      console.error("增强语义搜索失败:", error);
      throw error; // 重新抛出错误，让调用者处理回退逻辑
    }
  }

  // 统一接口：更新重要记忆 - 使用新的官方SDK方法
  async updateImportantMemories(req: UpdateImportantMemoriesRequest): Promise<{
    success: boolean;
    message: string;
    important_info?: ImportantInfo;
    stored_memory?: ImportantMemory;
    error_code?: string;
    error_details?: string;
  }> {
    const MEM0_ENABLED = process.env.MEM0_ENABLED === 'true';
    if (!MEM0_ENABLED) {
      console.log('mem0 service is disabled');
      return {
        success: false,
        message: 'mem0 service is disabled'
      };
    }
    
    try {
      const { child_id, chat_history, memoryClassificationStrategy = 'cognitive_psychology' } = req;
      
      console.log(`开始更新孩子 ${child_id} 的重要记忆`);
      
      // 1. 提取新的重要信息 - 使用异步方法，并传递记忆分类策略
      const newImportantInfo = await extractImportantInfo(chat_history, memoryClassificationStrategy);
      console.log('提取到的重要信息:', JSON.stringify(newImportantInfo));
      
      // 如果没有提取到重要信息，尝试返回历史重要信息
      if (!hasImportantInfo(newImportantInfo)) {
        // 查找现有的重要记忆
        const existingMemories = await this.search('*', {
          user_id: child_id,
          limit: 10
        });
        
        if (existingMemories.length > 0) {
          // 从现有记忆中提取重要信息
          const existingImportantInfos = existingMemories
            .filter(mem => mem.metadata && mem.metadata.important_info)
            .map(mem => mem.metadata.important_info);
          
          if (existingImportantInfos.length > 0) {
            const historicalInfo = this.mergeImportantInfo(existingImportantInfos);
            return {
              success: true,
              message: 'No new important information extracted, returning historical data',
              important_info: historicalInfo
            };
          }
        }
        
        return {
          success: true,
          message: 'No important information extracted',
          important_info: newImportantInfo
        };
      }
      
      // 2. 查找现有的重要记忆 - 使用新的search方法
      const existingMemories = await this.search('*', {
        user_id: child_id,
        limit: 10
      });
      
      // 3. 合并新旧重要信息（如果有现有记忆）
      let finalImportantInfo = newImportantInfo;
      if (existingMemories.length > 0) {
        // 从现有记忆中提取重要信息
        const existingImportantInfos = existingMemories
          .filter(mem => mem.metadata && mem.metadata.important_info)
          .map(mem => mem.metadata.important_info);
        
        if (existingImportantInfos.length > 0) {
          finalImportantInfo = this.mergeImportantInfo(existingImportantInfos);
          
          // 合并新的重要信息
          finalImportantInfo = this.mergeImportantInfo([
            finalImportantInfo,
            newImportantInfo
          ]);
        }
        
        // 生成重要记忆内容
        const memoryContent = this.generateMemoryContent(finalImportantInfo);
        
        // 更新现有的第一个记忆（如果存在），而不是删除重建
        const timestamp = new Date().toISOString();
        const metadata = {
          ...existingMemories[0].metadata,
          important_info: finalImportantInfo,
          created_at: existingMemories[0].metadata?.created_at || timestamp,
          updated_at: timestamp,
          child_id: child_id
        };
        
        // 使用新的update接口更新记忆
        const updatedMemory = await this.update(existingMemories[0].id, {
          metadata: metadata
        });
        
        // 删除其他可能存在的旧记忆（如果有多个）
        for (const memory of existingMemories.slice(1)) {
          await this.delete(memory.id);
        }
        
        return {
          success: true,
          message: 'Important memories updated successfully',
          important_info: finalImportantInfo,
          stored_memory: {
            id: updatedMemory.id,
            content: memoryContent,
            metadata
          }
        };
      }
      
      // 4. 如果没有现有记忆，创建新的重要记忆 - 使用新的add方法
      const memoryContent = this.generateMemoryContent(finalImportantInfo);
      
      const timestamp = new Date().toISOString();
      const metadata = {
        child_id: child_id,
        important_info: finalImportantInfo,
        created_at: timestamp,
        updated_at: timestamp,
        agent_id: AGENT_ID
      };
      
      // 使用新的add方法创建记忆
      const messages = [
        { role: 'user' as const, content: memoryContent }
      ];
      
      console.log('创建新记忆数据:', { child_id, memoryContent_length: memoryContent.length, hasImportantInfo: hasImportantInfo(finalImportantInfo) });
      const addResult = await this.add(messages, {
        user_id: child_id,
        metadata: metadata
      });
      
      const memoryId = addResult[0]?.id;
      console.log('创建记忆成功:', memoryId);
      
      return {
        success: true,
        message: 'Important memories created successfully',
        important_info: finalImportantInfo,
        stored_memory: {
          id: memoryId,
          content: memoryContent,
          metadata
        }
      };
    } catch (error: any) {
      console.error('Failed to update important memories:', error);
      
      // 详细的错误日志
      if (error.response) {
        console.error('mem0 API错误状态:', error.response.status);
        console.error('mem0 API错误数据:', JSON.stringify(error.response.data, null, 2));
        
        // 根据错误类型提供更具体的错误信息
        if (error.response.status === 401) {
          return {
            success: false,
            message: 'Authentication failed: Invalid or expired API key',
            error_code: 'AUTHENTICATION_FAILED'
          };
        } else if (error.response.status === 400) {
          return {
            success: false,
            message: 'Invalid request parameters',
            error_code: 'INVALID_PARAMETERS'
          };
        } else if (error.response.status === 404) {
          return {
            success: false,
            message: 'mem0 API endpoint not found',
            error_code: 'ENDPOINT_NOT_FOUND'
          };
        }
      } else if (error.request) {
        console.error('无法连接到mem0服务:', error.request);
        return {
          success: false,
          message: 'Failed to connect to mem0 service',
          error_code: 'CONNECTION_ERROR'
        };
      }
      
      return {
        success: false,
        message: 'Failed to update important memories',
        error_code: 'UNKNOWN_ERROR',
        error_details: error.message
      };
    }
  }
  
  // 合并多个重要信息对象
  private mergeImportantInfo(infoList: ImportantInfo[]): ImportantInfo {
    // Initialize with empty memoryByType structure
    const merged: ImportantInfo = {
      memoryByType: {
        facts: [],
        perceptions: [],
        instructions: []
      }
    };
    
    infoList.forEach(info => {
      // Merge 3D memory structure
      if (info.memoryByType) {
        // Merge factual memories
        const validFacts = info.memoryByType.facts?.filter(item => 
          item && item.trim().length > 2 && item.trim() !== 'null' && item.trim() !== 'undefined'
        ) || [];
        merged.memoryByType.facts.push(...validFacts);
        
        // Merge perceptual memories
        const validPerceptions = info.memoryByType.perceptions?.filter(item => 
          item && item.trim().length > 2 && item.trim() !== 'null' && item.trim() !== 'undefined'
        ) || [];
        merged.memoryByType.perceptions.push(...validPerceptions);
        
        // Merge instructional memories
        const validInstructions = info.memoryByType.instructions?.filter(item => 
          item && item.trim().length > 2 && item.trim() !== 'null' && item.trim() !== 'undefined'
        ) || [];
        merged.memoryByType.instructions.push(...validInstructions);
      }
    });
    
    // Deduplicate memory arrays
    merged.memoryByType.facts = [...new Set(merged.memoryByType.facts)];
    merged.memoryByType.perceptions = [...new Set(merged.memoryByType.perceptions)];
    merged.memoryByType.instructions = [...new Set(merged.memoryByType.instructions)];
    
    return merged;
  }
  
  // 生成记忆内容文本 - 基于认知心理学的记忆分类模型
  private generateMemoryContent(info: ImportantInfo): string {
    // Primary structure using 3D memory classification (based on cognitive psychology principles)
    let content = `# Child Memory Profile (Cognitive Psychology Model)\n\n`;
    content += `This profile organizes memories according to established cognitive psychology categories:\n\n`;
    
    // 3D memory classification section
    if (info.memoryByType) {
      // 1. Semantic Memory (Facts) - objective knowledge
      if (info.memoryByType.facts.length > 0) {
        content += `## 1. Semantic Memory\n`;
        content += `Objective factual information that can be verified:\n`;
        content += `${info.memoryByType.facts.map(item => `- ${item}`).join('\n')}\n\n`;
      }
      
      // 2. Episodic Memory (Perceptions) - subjective experiences
      if (info.memoryByType.perceptions.length > 0) {
        content += `## 2. Episodic Memory\n`;
        content += `Subjective experiences and personal perspectives:\n`;
        content += `${info.memoryByType.perceptions.map(item => `- ${item}`).join('\n')}\n\n`;
      }
      
      // 3. Procedural Memory (Instructions) - guidance rules
      if (info.memoryByType.instructions.length > 0) {
        content += `## 3. Procedural Memory\n`;
        content += `Rules, instructions, and behavioral guidance:\n`;
        content += `${info.memoryByType.instructions.map(item => `- ${item}`).join('\n')}\n\n`;
      }
    }
    
    // Add timestamp
    content += `\nGenerated on: ${new Date().toISOString()}`;
    
    return content.trim();
  }

  // 将重要信息保存到mem0 - 基于认知心理学的三维记忆分类模型
  public async storeImportantInfo(userId: string, importantInfo: ImportantInfo): Promise<void> {
    try {
      // Build array of information to store
      const infoToStore: Array<{content: string; metadata: {type: string; memory_category: string; timestamp: string; memory_type: string}}> = [];
      const currentTimestamp = new Date().toISOString();
      
      // Store three-dimensional memory classification information
      if (importantInfo.memoryByType) {
        // Store factual memories (semantic memory)
        importantInfo.memoryByType.facts?.forEach(fact => {
          infoToStore.push({
            content: fact,
            metadata: {
              type: 'important_info',
              memory_category: 'fact',
              memory_type: 'semantic',
              timestamp: currentTimestamp
            }
          });
        });
        
        // Store perceptual memories (episodic memory)
        importantInfo.memoryByType.perceptions?.forEach(perception => {
          infoToStore.push({
            content: perception,
            metadata: {
              type: 'important_info',
              memory_category: 'perception',
              memory_type: 'episodic',
              timestamp: currentTimestamp
            }
          });
        });
        
        // Store instructional memories (procedural memory)
        importantInfo.memoryByType.instructions?.forEach(instruction => {
          infoToStore.push({
            content: instruction,
            metadata: {
              type: 'important_info',
              memory_category: 'instruction',
              memory_type: 'procedural',
              timestamp: currentTimestamp
            }
          });
        });
      }
      
      // Batch store to mem0
      if (infoToStore.length > 0) {
        const promises = infoToStore.map(info => {
          const messages = [{ role: 'user' as const, content: info.content }];
          return this.add(messages, {
            user_id: userId,
            metadata: info.metadata
          });
        });
        
        await Promise.all(promises);
      }
    } catch (error) {
      console.error(`Error storing important info to mem0: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

// 创建单例实例
export const mem0Service = new Mem0Service();