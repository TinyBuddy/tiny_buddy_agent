/**
 * ChineseVocabularyWorker - 中文词汇学习分析 Worker
 * 消费 chatHistoryQueue 中的消息，提取和分析中文词汇学习进度
 */

import OpenAI from 'openai';
import { getChineseLearningProgress, upsertChineseLearningProgress } from '../db/db';
import type { ChatHistoryMessage } from './chatHistoryQueue';

// OpenAI 客户端配置（与 mem0Service 保持一致）
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      console.error('警告: 未配置OpenAI API密钥，请检查OPENAI_API_KEY环境变量');
    }
    
    openaiClient = new OpenAI({
      apiKey: OPENAI_API_KEY || ''
    });
  }
  return openaiClient;
}

/**
 * 提取文本中的中文字符（汉字、词组、句子）
 */
function extractChineseText(text: string): string[] {
  // 匹配中文字符（包括标点符号）
  const chineseRegex = /[\u4e00-\u9fa5]+/g;
  const matches = text.match(chineseRegex);
  return matches || [];
}

/**
 * 分析聊天历史，提取 Sparky 和 Child 说过的中文内容
 */
function analyzeChatHistory(historyMsgs: Array<{ child: string; AI: string }>) {
  const sparkyWords: string[] = [];
  const childWords: string[] = [];

  for (const msg of historyMsgs) {
    // 提取 Sparky 说的中文
    const aiChinese = extractChineseText(msg.AI);
    sparkyWords.push(...aiChinese);

    // 提取 Child 说的中文
    const childChinese = extractChineseText(msg.child);
    childWords.push(...childChinese);
  }

  return { sparkyWords, childWords };
}

/**
 * 统计词频
 */
function countWordFrequency(words: string[]): Record<string, number> {
  const frequency: Record<string, number> = {};
  
  for (const word of words) {
    if (word.trim()) {
      frequency[word] = (frequency[word] || 0) + 1;
    }
  }
  
  return frequency;
}

/**
 * 合并词频统计（将新的统计合并到旧的统计中）
 */
function mergeWordFrequency(
  oldFreq: Record<string, number>,
  newFreq: Record<string, number>
): Record<string, number> {
  const merged = { ...oldFreq };
  
  for (const [word, count] of Object.entries(newFreq)) {
    merged[word] = (merged[word] || 0) + count;
  }
  
  return merged;
}

/**
 * 分析词汇学习状态
 */
function analyzeWordLearnStatus(
  sparkyTaughtWords: Record<string, number>,
  childSpokenWords: Record<string, number>
): Record<string, { learned: number; reviewed: number; mastered: boolean }> {
  const wordLearnCount: Record<string, { learned: number; reviewed: number; mastered: boolean }> = {};

  // 分析 Sparky 教过的词
  for (const [word, taughtCount] of Object.entries(sparkyTaughtWords)) {
    const spokenCount = childSpokenWords[word] || 0;
    
    wordLearnCount[word] = {
      learned: taughtCount, // Sparky 教了多少次
      reviewed: spokenCount, // Child 复习/使用了多少次
      mastered: spokenCount >= 3 && taughtCount >= 2, // 定义：Sparky教>=2次，Child说>=3次算掌握
    };
  }

  return wordLearnCount;
}

/**
 * 调用大模型生成学习建议
 */
async function generateLearningSuggestion(
  childName: string,
  childAge: number,
  languageLevel: string,
  wordLearnCount: Record<string, { learned: number; reviewed: number; mastered: boolean }>,
  sparkyTaughtWords: Record<string, number>,
  childSpokenWords: Record<string, number>
): Promise<string> {
  // 分类词汇
  const learnedOnce: string[] = [];
  const learnedMultiple: string[] = [];
  const reviewedOnce: string[] = [];
  const reviewedMultiple: string[] = [];
  const mastered: string[] = [];

  for (const [word, status] of Object.entries(wordLearnCount)) {
    if (status.mastered) {
      mastered.push(word);
    } else if (status.reviewed >= 2) {
      reviewedMultiple.push(word);
    } else if (status.reviewed === 1) {
      reviewedOnce.push(word);
    } else if (status.learned >= 2) {
      learnedMultiple.push(word);
    } else {
      learnedOnce.push(word);
    }
  }

  const prompt = `You are an expert in early childhood Chinese language education. Based on the following learning progress data for a child, generate a concise learning suggestion prompt (in English) for the AI assistant (Sparky) to use in the next conversation.

Child Information:
- Name: ${childName}
- Age: ${childAge} years old
- Language Level: ${languageLevel}

Vocabulary Learning Progress:
- Mastered words (taught ≥2 times, child used ≥3 times): ${mastered.length > 0 ? mastered.join(', ') : 'None yet'}
- Words learned multiple times but not mastered: ${learnedMultiple.length > 0 ? learnedMultiple.join(', ') : 'None'}
- Words learned once: ${learnedOnce.length > 0 ? learnedOnce.join(', ') : 'None'}
- Words child reviewed multiple times: ${reviewedMultiple.length > 0 ? reviewedMultiple.join(', ') : 'None'}
- Words child reviewed once: ${reviewedOnce.length > 0 ? reviewedOnce.join(', ') : 'None'}

Total Chinese words Sparky taught: ${Object.keys(sparkyTaughtWords).length}
Total Chinese words child spoke: ${Object.keys(childSpokenWords).length}

Please generate a clear, actionable learning suggestion prompt (2-3 sentences, in English) that:
1. Identifies which words need more practice or review
2. Suggests new vocabulary that would be appropriate for this child's age and level
3. Recommends teaching strategies (e.g., repetition, context usage, games)

The prompt should be directly usable by Sparky AI in the next conversation. Keep it concise and focused on the next learning step.`;

  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o', // 使用 GPT-4o（与 mem0 的 gpt-4.1 类似，更稳定）
      messages: [
        {
          role: 'system',
          content: 'You are an expert in early childhood Chinese language education.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const text = completion.choices[0]?.message?.content || '';
    return text.trim();
  } catch (error) {
    console.error('[ChineseVocabularyWorker] 调用 OpenAI GPT 生成学习建议失败:', error);
    // 返回默认建议
    return `Focus on reviewing the ${learnedOnce.length + learnedMultiple.length} words already introduced. Encourage the child to use these words in simple sentences. Introduce 1-2 new age-appropriate Chinese words related to their interests.`;
  }
}

/**
 * Worker 主函数：处理单个消息
 */
export async function processChineseVocabulary(message: ChatHistoryMessage): Promise<void> {
  const { childId, childName, childAge, languageLevel, historyMsgs } = message;

  try {
    console.log(`[ChineseVocabularyWorker] 开始处理 childId=${childId} 的中文词汇分析`);

    // 1. 从数据库获取现有学习进度
    const existingProgress = await getChineseLearningProgress(childId);

    // 2. 分析当前聊天历史中的中文词汇
    const { sparkyWords, childWords } = analyzeChatHistory(historyMsgs);
    
    // 3. 统计新的词频
    const newSparkyFreq = countWordFrequency(sparkyWords);
    const newChildFreq = countWordFrequency(childWords);

    // 4. 合并到现有统计中
    const oldSparkyFreq = existingProgress?.sparkyTaughtWords || {};
    const oldChildFreq = existingProgress?.childSpokenWords || {};

    const mergedSparkyFreq = mergeWordFrequency(oldSparkyFreq as any, newSparkyFreq);
    const mergedChildFreq = mergeWordFrequency(oldChildFreq as any, newChildFreq);

    // 5. 分析词汇学习状态
    const wordLearnCount = analyzeWordLearnStatus(mergedSparkyFreq, mergedChildFreq);

    console.log(`[ChineseVocabularyWorker] Sparky教了 ${Object.keys(mergedSparkyFreq).length} 个中文词, Child说了 ${Object.keys(mergedChildFreq).length} 个中文词`);

    // 6. 调用大模型生成学习建议
    const learningSuggestion = await generateLearningSuggestion(
      childName,
      childAge,
      languageLevel,
      wordLearnCount,
      mergedSparkyFreq,
      mergedChildFreq
    );

    console.log(`[ChineseVocabularyWorker] 生成的学习建议: ${learningSuggestion.substring(0, 100)}...`);

    // 7. 更新数据库
    await upsertChineseLearningProgress(childId, {
      sparkyTaughtWords: mergedSparkyFreq as any,
      taughtCount: mergedSparkyFreq as any, // 与 sparkyTaughtWords 相同
      childSpokenWords: mergedChildFreq as any,
      wordLearnCount: wordLearnCount as any,
      nextLearningSuggestion: learningSuggestion,
    });

    console.log(`[ChineseVocabularyWorker] childId=${childId} 的中文词汇分析完成并已更新数据库`);
  } catch (error) {
    console.error(`[ChineseVocabularyWorker] 处理 childId=${childId} 时出错:`, error);
    throw error;
  }
}
