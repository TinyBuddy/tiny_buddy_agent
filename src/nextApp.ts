import { and, eq, gte, lte } from "drizzle-orm";
// 使用Next.js框架创建HTTP服务器
import express from "express";
import { z, ZodError } from "zod";
import { db } from "./db/db";
import { vocabulary } from "./db/schema";
import { PlanningAgent } from "./actors/planningAgent";
import { InMemoryMemoryService } from "./services/memoryService";
import { InMemoryKnowledgeBaseService } from "./services/inMemoryKnowledgeBaseService";
import { createDefaultChildProfile } from "./models/childProfile";
import { createMessage } from "./models/message";
import { getFullSystemPrompt } from "./config/agentConfig";
import { mem0Service } from "./services/mem0Service";

// 创建Express应用（集成Next.js功能）
const app = express();
app.use(express.json());

// 定义请求体参数验证模式
const generatePromptSchema = z.object({
  childID: z.string(),
  gender: z.enum(["male", "female", "other"]),
  interests: z.array(z.string()),
  languageLevel: z.string().regex(/^L[1-5]$/i),
  childAge: z.number().min(0).max(100),
  historyMsgs: z.array(
    z.object({
      child: z.string(),
      AI: z.string(),
    })
  ),
});

// 定义查询参数验证模式
const querySchema = z.object({
	childId: z.string(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
});

/**
 * 处理GET请求：获取指定儿童ID在指定时间区间内的词汇表列表（去重）
 */
app.get("/api/vocabulary", async (req, res) => {
	try {
		// 解析查询参数
		const queryParams = {
			childId: req.query.childId as string,
			startDate: req.query.startDate as string | undefined,
			endDate: req.query.endDate as string | undefined,
		};

		// 验证查询参数
		const { childId, startDate, endDate } = querySchema.parse(queryParams);

		console.log(
			`获取儿童 ${childId} 的词汇表，时间区间: ${startDate || "开始"} 到 ${endDate || "现在"}`,
		);

		// 构建查询条件
		const conditions = [eq(vocabulary.childId, childId)];

		// 添加时间区间条件
		if (startDate) {
			conditions.push(gte(vocabulary.createdAt, new Date(startDate)));
		}

		if (endDate) {
			conditions.push(lte(vocabulary.createdAt, new Date(endDate)));
		}

		// 查询数据库获取词汇表
		const result = await db
			.select({ word: vocabulary.word })
			.from(vocabulary)
			.where(and(...conditions));

		// 提取词汇并去重
		const words = Array.from(new Set(result.map((item) => item.word)));

		// 返回成功响应
		res.json({
			success: true,
			data: {
				words,
				count: words.length,
				childId,
				timeRange: {
					start: startDate || null,
					end: endDate || null,
				},
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("获取词汇表时出错:", error);

		// 处理验证错误
		if (error instanceof z.ZodError) {
			return res.status(400).json({
				success: false,
				error: "参数验证失败",
				details: error.errors,
			});
		}

		// 处理其他错误
		return res.status(500).json({
			success: false,
			error: "服务器内部错误",
			message: error instanceof Error ? error.message : "未知错误",
		});
	}
});

// 全局服务实例，避免每次请求都重新创建
let globalMemoryService: InMemoryMemoryService | null = null;
let globalKnowledgeBaseService: InMemoryKnowledgeBaseService | null = null;
let globalPlanningAgent: PlanningAgent | null = null;

// 服务初始化完成标志
let globalServicesInitialized = false;

// 初始化全局服务
const initGlobalServices = async () => {
  if (!globalServicesInitialized) {
    if (!globalMemoryService) {
      globalMemoryService = new InMemoryMemoryService();
      await globalMemoryService.init();
    }
    if (!globalKnowledgeBaseService) {
      globalKnowledgeBaseService = new InMemoryKnowledgeBaseService();
      await globalKnowledgeBaseService.init();
    }
    if (!globalPlanningAgent) {
      globalPlanningAgent = new PlanningAgent({
        knowledgeBaseService: globalKnowledgeBaseService,
        memoryService: globalMemoryService,
      });
      // 只初始化一次Agent
      await globalPlanningAgent.init();
    }
    globalServicesInitialized = true;
  }
  return { 
    memoryService: globalMemoryService, 
    knowledgeBaseService: globalKnowledgeBaseService,
    planningAgent: globalPlanningAgent
  };
};

/**
 * 简单的LRU缓存实现
 */
class LRUCache {
  private cache: Map<string, { value: any, timestamp: number }>;
  private maxSize: number;
  private maxAge: number;

  constructor(options: { max: number, maxAge: number }) {
    this.cache = new Map();
    this.maxSize = options.max;
    this.maxAge = options.maxAge;
  }

  get(key: string): any | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // 检查是否过期
    if (Date.now() - item.timestamp > this.maxAge) {
      this.cache.delete(key);
      return undefined;
    }

    // 移动到Map的末尾（最近使用）
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key: string, value: any): void {
    // 如果达到最大容量，删除最旧的项
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKeyResult = this.cache.keys().next();
      if (!oldestKeyResult.done && oldestKeyResult.value) {
        this.cache.delete(oldestKeyResult.value);
      }
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }
}

// 创建prompt缓存，缓存100条记录，有效期1分钟
const promptCache = new LRUCache({ max: 100, maxAge: 1000 * 6 * 1 });

/**
 * 生成prompt内容的API端点
 */
app.post("/api/agent/generate-prompt", async (req, res) => {
  try {
    const startTime = Date.now();
    const parseStart = Date.now();
    
    // 验证请求参数
    const { childID, gender, interests, languageLevel, childAge, historyMsgs } = generatePromptSchema.parse(req.body);
    console.log(`[API_PERF] 参数解析与验证耗时: ${Date.now() - parseStart}ms`);
    console.log("params languageLevel is ", languageLevel)
    
    // 生成缓存键
    const lastChildMsg = historyMsgs.length > 0 ? historyMsgs[historyMsgs.length - 1].child : "Hello";
    const cacheKey = JSON.stringify({
      childID,
      gender,
      interests: interests.sort(), // 排序确保相同兴趣但顺序不同的请求能命中缓存
      languageLevel,
      childAge,
      lastChildMessage: lastChildMsg
    });
    
    // 检查缓存
    if (promptCache.has(cacheKey)) {
      const cachedResult = promptCache.get(cacheKey);
      console.log(`[API_PERF] 缓存命中，跳过处理，总耗时: ${Date.now() - startTime}ms`);
      // 定义function call结构，供客户端使用，包含API端点和密钥信息
      const functions = [
        {
          name: 'fetch_knowledge_from_api',
          description: 'Fetch relevant nursery rhymes and stories from the knowledge base based on query content',
          apiEndpoint: 'http://136.115.118.154/api/v1/knowledge-chat/d15b185a-a786-4039-b15b-1d6fb4a8d4e3',
          apiKey: 'sk-AFVxhsKKYpfMSSIho5hyqskh8Rbd96ZbVytFRy3pan09Vn1g',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Query content used to search for relevant nursery rhymes and stories',
              },
            },
            required: ['query'],
          },
        },
      ];

      return res.json({
        success: true,
        code: 0,
        msg: "提示生成成功(来自缓存)",
        data: {
          prompt: cachedResult,
          functions,
          childID,
          fromCache: true
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    console.log(`生成prompt请求: 儿童ID=${childID}, 语言级别=${languageLevel}`);
    
    // 使用全局服务实例
    const serviceStart = Date.now();
    const { memoryService, knowledgeBaseService, planningAgent } = await initGlobalServices();
    console.log(`[API_PERF] 服务初始化耗时: ${Date.now() - serviceStart}ms`);
    
    // 创建儿童档案
    const profileStart = Date.now();
    const childProfile = {
      ...createDefaultChildProfile(childID),
      id: childID,
      name: childID, // 使用ID作为名称
      gender,
      interests,
      languageLevel: languageLevel.toUpperCase(),
      age: childAge,
    };
    console.log(`[API_PERF] 创建儿童档案耗时: ${Date.now() - profileStart}ms`);
    
    // 转换历史消息格式
    const historyStart = Date.now();
    const conversationHistory = historyMsgs.flatMap((msg: { child: string; AI: string }) => [
      createMessage({
        type: "user",
        content: msg.child,
        sender: childID,
      }),
      createMessage({
        type: "agent",
        content: msg.AI,
        sender: "assistant",
      }),
    ]);
    console.log(`[API_PERF] 转换历史消息耗时: ${Date.now() - historyStart}ms`);
    
    // 获取最后一条儿童消息作为输入
    const lastChildMessage = historyMsgs.length > 0 ? historyMsgs[historyMsgs.length - 1].child : "Hello";
    
    // 将所有历史消息格式化为更适合PlanningAgent处理的格式
    const allChildMessages = historyMsgs.map(msg => msg.child);
    
    // 从历史消息中提取重要记忆并写入mem0 - 使用三维记忆分类模型
    try {
      // 转换为mem0所需的chat_history格式（包含孩子和助手的对话，以便更完整地提取上下文）
      const chatHistoryForMem0 = historyMsgs.flatMap(msg => [
        `Child: ${msg.child}`,
        msg.AI ? `Sparky: ${msg.AI}` : ''
      ]).filter(text => text.trim());
      
      console.log(`处理儿童 ${childID} 的历史记忆，准备提取重要信息`);
      
      // 调用mem0服务更新重要记忆，使用三维记忆分类模型
      const mem0Result = await mem0Service.updateImportantMemories({  
        child_id: childID,  
        chat_history: chatHistoryForMem0,  
        // 添加记忆分类策略参数，使用认知心理学模型（事实、感知、指令）
        memoryClassificationStrategy: 'cognitive_psychology',
        // 添加includeSummary参数以生成并存储摘要信息
        includeSummary: true  
      });
      
      console.log(`mem0处理结果: ${mem0Result.success ? '成功' : '失败'} - ${mem0Result.message}`);
      
      // 额外获取按类型分类的记忆，以验证三维分类效果
      try {
        const factualMemories = await mem0Service.getChildMemoryByType(childID, 'facts');
        const perceptionMemories = await mem0Service.getChildMemoryByType(childID, 'perceptions');
        const instructionMemories = await mem0Service.getChildMemoryByType(childID, 'instructions');
        
        console.log(`三维分类记忆统计 - 事实记忆: ${factualMemories.length}, 感知记忆: ${perceptionMemories.length}, 指令记忆: ${instructionMemories.length}`);
      } catch (typeError) {
        console.warn(`获取分类记忆统计时出错:`, typeError);
      }
    } catch (error) {
      console.error(`更新mem0重要记忆时出错:`, error);
      // 继续执行，不中断流程
    }
    
    // 调用规划Agent的process方法生成计划，传递所有历史消息
    const planStart = Date.now();
    if (!planningAgent) {
      throw new Error('PlanningAgent未初始化');
    }
    const planResult = await planningAgent.process({
      input: allChildMessages.length > 0 ? allChildMessages.join(" ") : lastChildMessage,
      context: {
        childProfile,
        conversationHistory,
        knowledgeBase: [] // 添加必要的knowledgeBase属性
      },
    });
    console.log(`[API_PERF] 生成规划耗时: ${Date.now() - planStart}ms`);
    
    // 解析规划结果
    const parsePlanStart = Date.now();
    let parsedPlanResult;
    if (planResult && planResult.output) {
      try {
        parsedPlanResult = typeof planResult.output === 'string' ? JSON.parse(planResult.output) : planResult.output;
      } catch (parseError) {
        console.warn("解析规划结果失败，使用降级方案:", parseError);
        parsedPlanResult = {
          type: "chat",
          interactionType: "chat",
          strategy: "Chat with the child as a friend using simple and easy-to-understand language",
        };
      }
    } else {
      // 如果没有有效的规划结果，使用降级方案
      parsedPlanResult = {
        type: "chat",
        interactionType: "chat",
        strategy: "Chat with the child as a friend using simple and easy-to-understand language",
      };
    }
    console.log(`[API_PERF] 解析规划结果耗时: ${Date.now() - parsePlanStart}ms`);
    
    console.log("规划结果:", parsedPlanResult);
    
    // 实现简化版的prompt生成函数
    const generatePrompt = async (message: string) => {
      const recentMessages = conversationHistory.slice(-20); // 获取最近20条消息
      const chatHistory = recentMessages
        .map((m) => `${m.type === "user" ? "Child" : "Sparky"}: ${m.content}`)
        .join("\n");

      // 从全局配置获取系统提示词，确保使用正确的儿童年龄
      let systemPrompt = getFullSystemPrompt(childProfile);
      
      // Retrieve important memories from mem0 and add to prompt - optimized based on three-dimensional memory classification model
      try {
        console.log(`Retrieving important memories for child ${childID} from mem0`);
        
        // Use enhanced semantic search to get relevant memories
        // Intelligently determine which types of memories are needed based on current input and history
        const lastChildMessage = historyMsgs.length > 0 ? historyMsgs[historyMsgs.length - 1].child : "Hello";
        
        // Get current query type - local implementation of analysis logic, consistent with mem0Service
         const analyzeQueryType = (query: string): 'factual' | 'experiential' | 'instructional' | 'mixed' => {
           const lowerQuery = query.toLowerCase();
           
           // Factual query patterns
           const factualPatterns = /what|when|where|who|which|how many|how much|facts|information|details/;
           // Experiential query patterns
           const experientialPatterns = /like|love|enjoy|feel|experience|remember|favorite|hate|dislike|happy|sad/;
           // Instructional query patterns
           const instructionalPatterns = /should|must|need to|how to|remember to|don't|shouldn't|avoid|tips|guide/;
           
           const isFactual = factualPatterns.test(lowerQuery);
           const isExperiential = experientialPatterns.test(lowerQuery);
           const isInstructional = instructionalPatterns.test(lowerQuery);
           
           // Count the number of matching types
           const matchCount = [isFactual, isExperiential, isInstructional].filter(Boolean).length;
           
           // If only one type matches, return that type
           if (matchCount === 1) {
             if (isFactual) return 'factual';
             if (isExperiential) return 'experiential';
             if (isInstructional) return 'instructional';
           }
           
           // Multiple types match, return mixed type
           return 'mixed';
         };
         
         const queryType = analyzeQueryType(lastChildMessage);
          
        console.log(`Query type analysis result: ${queryType}`);
        
        // Determine which types of memories to retrieve based on query type
        let memoryTypeToFetch: 'all' | 'facts' | 'perceptions' | 'instructions' = 'all';
        
        // Intelligent filtering based on query type
        if (queryType === 'factual') {
          memoryTypeToFetch = 'facts';
        } else if (queryType === 'experiential') {
          memoryTypeToFetch = 'perceptions';
        } else if (queryType === 'instructional') {
          memoryTypeToFetch = 'instructions';
        }
        
        // Use the API to get memories by type, which will automatically apply the three-dimensional classification model
        // Add maxResults parameter to limit the number of memories
        // Add summarize: true to use stored summaries when available, reducing GPT-4.1 calls
        const memories = await mem0Service.getChildMemoryByType(childID, memoryTypeToFetch, { maxResults: 5, summarize: true });
        
        let importantMemoriesText = "\n\n# Child's Important Memories (Based on Cognitive Psychology Classification)\n";
        importantMemoriesText += "\n> The following memories are classified according to cognitive psychology model: Semantic Memory (Facts), Episodic Memory (Perceptions), Procedural Memory (Instructions)\n";
        
        // Group memories by their type tags
        const memoryGroups: Record<string, string[]> = {
          'Factual Memory': [],
          'Perceptual Memory': [],
          'Instructional Memory': []
        };
        
        // Group memories by type and ensure they are in English
        memories.forEach(mem => {
          // Ensure memory content is in English
          const englishMem = mem; // Assuming memories are already in English from mem0Service
          
          if (englishMem.includes('[Factual Memory]')) {
            memoryGroups['Factual Memory'].push(englishMem.replace(/\[Factual Memory\]\s*\[Semantic Memory\]\s*/, ''));
          } else if (englishMem.includes('[Perceptual Memory]')) {
            memoryGroups['Perceptual Memory'].push(englishMem.replace(/\[Perceptual Memory\]\s*\[Episodic Memory\]\s*/, ''));
          } else if (englishMem.includes('[Instructional Memory]')) {
            memoryGroups['Instructional Memory'].push(englishMem.replace(/\[Instructional Memory\]\s*\[Procedural Memory\]\s*/, ''));
          } else {
            // If no clear type tag, add to unclassified group
            if (!memoryGroups['Other']) memoryGroups['Other'] = [];
            memoryGroups['Other'].push(englishMem);
          }
        });
        
        // Function to summarize memories to prevent prompt explosion
        const summarizeMemories = (memories: string[], maxLengthPerMemory: number = 100): string[] => {
          return memories.map(mem => {
            // Simple summarization: truncate if too long
            if (mem.length > maxLengthPerMemory) {
              return mem.substring(0, maxLengthPerMemory - 3) + '...';
            }
            return mem;
          });
        };
        
        // Summarize each type of memory
        memoryGroups['Factual Memory'] = summarizeMemories(memoryGroups['Factual Memory']);
        memoryGroups['Perceptual Memory'] = summarizeMemories(memoryGroups['Perceptual Memory']);
        memoryGroups['Instructional Memory'] = summarizeMemories(memoryGroups['Instructional Memory']);
        if (memoryGroups['Other']) {
          memoryGroups['Other'] = summarizeMemories(memoryGroups['Other']);
        }
        
        // Add concise cognitive psychology explanation
        importantMemoriesText += "\n\n## Memory Classification\n";
        importantMemoriesText += "- **Semantic (Factual)**: Objective knowledge and facts\n";
        importantMemoriesText += "- **Episodic (Perceptual)**: Personal experiences and feelings\n";
        importantMemoriesText += "- **Procedural (Instructional)**: Operation steps and guidance\n";
        
        // Add memories grouped by type
        if (memoryGroups['Factual Memory'].length > 0) {
          importantMemoriesText += "\n\n## Semantic Memory - Factual Information\n";
          importantMemoriesText += memoryGroups['Factual Memory'].map(item => `- ${item}`).join('\n');
        }
        
        if (memoryGroups['Perceptual Memory'].length > 0) {
          importantMemoriesText += "\n\n## Episodic Memory - Experiential Feelings\n";
          importantMemoriesText += memoryGroups['Perceptual Memory'].map(item => `- ${item}`).join('\n');
        }
        
        if (memoryGroups['Instructional Memory'].length > 0) {
          importantMemoriesText += "\n\n## Procedural Memory - Operational Guidance\n";
          importantMemoriesText += memoryGroups['Instructional Memory'].map(item => `- ${item}`).join('\n');
        }
        
        // Add unclassified memories (if any)
        if (memoryGroups['Other'] && memoryGroups['Other'].length > 0) {
          importantMemoriesText += "\n\n## Other Memory Information\n";
          importantMemoriesText += memoryGroups['Other'].map(item => `- ${item}`).join('\n');
        }
        
        // Add memory type statistics
        importantMemoriesText += "\n\n## Memory Type Statistics\n";
        importantMemoriesText += `- Semantic Memory (Factual Memory): ${memoryGroups['Factual Memory'].length} items\n`;
        importantMemoriesText += `- Episodic Memory (Perceptual Memory): ${memoryGroups['Perceptual Memory'].length} items\n`;
        importantMemoriesText += `- Procedural Memory (Instructional Memory): ${memoryGroups['Instructional Memory'].length} items\n`;
        
        // For compatibility, also try to retrieve complete memory objects
        try {
          const fullMemory = await mem0Service.search('*', {
            user_id: childID,
            limit: 1
          });
          
          if (fullMemory.length > 0 && fullMemory[0].metadata && fullMemory[0].metadata.important_info) {
            const importantInfo = fullMemory[0].metadata.important_info;
            
            // Fallback to traditional fields if 3D classification is incomplete, ensuring no information loss
            let hasTraditionalFields = false;
            
            if (importantInfo.name || 
                (importantInfo.familyMembers && importantInfo.familyMembers.length > 0) ||
                (importantInfo.friends && importantInfo.friends.length > 0)) {
                
                importantMemoriesText += "\n\n## Basic Information Supplement\n";
                hasTraditionalFields = true;
                
                if (importantInfo.name) {
                  importantMemoriesText += `\n- Child's name: ${importantInfo.name}`;
                }
                
                if (importantInfo.familyMembers && importantInfo.familyMembers.length > 0) {
                  importantMemoriesText += `\n\n- Family members: ${importantInfo.familyMembers.join(', ')}`;
                }
                
                if (importantInfo.friends && importantInfo.friends.length > 0) {
                  importantMemoriesText += `\n\n- Friends: ${importantInfo.friends.join(', ')}`;
                }
            }
            
            // Add original memory content as reference
            if (fullMemory[0].content) {
              importantMemoriesText += "\n\n## Original Memory Reference\n";
              importantMemoriesText += `${fullMemory[0].content.substring(0, 500)}${fullMemory[0].content.length > 500 ? '...' : ''}`;
            }
          }
        } catch (legacyError) {
          console.warn("Error retrieving traditional memory format:", legacyError);
        }
        
        systemPrompt += importantMemoriesText;
        console.log(`成功添加三维分类记忆到提示词中 - 总计 ${memories.length} 条记忆`);
      } catch (error) {
        console.error("读取mem0重要记忆时出错:", error);
        // 继续执行，不中断流程
      }

      // 添加教学内容，整合strategy和teachingFocus
      systemPrompt += `

# Teaching Guidance
`;
      
      // 添加教学策略
      systemPrompt += `Teaching strategy: ${parsedPlanResult.strategy}\n`;
      
      // 添加教学重点（如果有）
      if (parsedPlanResult?.teachingFocus) {
        console.log("prompt add teaching focus:", parsedPlanResult);
        systemPrompt += `Teaching focus: ${parsedPlanResult.teachingFocus}\n`;
      }
      
      // 构建包含function call的提示词部分
      const functionCallInstruction = `

# Tool Call Instructions
When you need to play nursery rhymes or tell stories, please use the following tool call format to get relevant content:\n\`\`\`json
{
  "name": "fetch_knowledge_from_api",
  "parameters": {
    "query": "keywords for the nursery rhyme or story you want to search"
  }
}
\`\`\`

Applicable scenarios:
- When the child requests nursery rhymes, music, or wants to hear a story
- When the interaction plan suggests using songs or stories
- When songs or stories can enhance learning outcomes
`;

      // 构建完整的prompt
      const prompt = `
${systemPrompt}
${functionCallInstruction}

# history conversations

` + chatHistory;

console.log(`[DEBUG] 生成的prompt: ${prompt}`);
      
      return prompt;
    };
    
    // 生成最终的prompt
    const promptStart = Date.now();
    const prompt = await generatePrompt(lastChildMessage);
    console.log(`[API_PERF] 生成prompt耗时: ${Date.now() - promptStart}ms`);
    
    // 存入缓存
    if (cacheKey && prompt) {
      promptCache.set(cacheKey, prompt);
    }
    
    // 返回标准的JSON响应格式，包含function call定义
    const responseStart = Date.now();
    
    // 定义function call结构，供客户端使用，包含API端点和密钥信息
    const functions = [
      {
        name: 'fetch_knowledge_from_api',
        description: 'Fetch relevant nursery rhymes and stories from the knowledge base based on query content',
        apiEndpoint: 'http://136.115.118.154/api/v1/knowledge-chat/d15b185a-a786-4039-b15b-1d6fb4a8d4e3',
        apiKey: 'sk-AFVxhsKKYpfMSSIho5hyqskh8Rbd96ZbVytFRy3pan09Vn1g',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Query content used to search for relevant nursery rhymes and stories',
            },
          },
          required: ['query'],
        },
      },
    ];
    
    res.json({
      success: true,
      code: 0,
      msg: "提示生成成功",
      data: {
        prompt,
        functions, // 添加functions字段，包含function call定义
        childID,
        fromCache: false
      },
      timestamp: new Date().toISOString(),
    });
    console.log(`[API_PERF] 发送响应耗时: ${Date.now() - responseStart}ms`);
    
    console.log(`[API_PERF] 请求总耗时: ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error("生成prompt时发生错误:", error);
    
    // 统一的错误处理
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        code: 400,
        msg: "请求参数验证失败",
        error: {
          type: "validation_error",
          message: "请求参数验证失败",
          details: error.errors,
        },
      });
    }
    // 服务器内部错误
    console.error('API请求处理错误:', error);
    return res.status(500).json({
        success: false,
        code: 500,
        msg: "服务器内部错误",
        error: {
          type: "internal_error",
          message: "服务器内部错误",
        },
      });
  }
});

/**
 * 启动HTTP服务器
 */
export const startHttpServer = async () => {
	// 使用不同的端口（3144）以避免与现有服务器冲突
	const port = 3144;

	// 启动服务器
	const server = app.listen(port, () => {
		console.log(
			`TinyBuddy Next.js HTTP服务器已启动在 http://localhost:${port}`,
		);
		console.log("可用API端点:");
		console.log(
			"GET    /api/vocabulary          - 获取儿童词汇表(支持时间区间筛选)",
		);
		console.log(
		"POST   /api/agent/generate-prompt     - 生成prompt内容",
	);
		console.log(
			`示例: http://localhost:${port}/api/vocabulary?childId=test_child&startDate=2023-01-01&endDate=2023-12-31`,
		);
		console.log(
		`示例: POST http://localhost:${port}/api/agent/generate-prompt`,
	);
	});

	// 处理进程终止信号
	const handleShutdown = async () => {
		console.log("正在关闭TinyBuddy HTTP服务器...");
		server.close();
		console.log("TinyBuddy HTTP服务器已成功关闭");
	};

	// 监听进程终止信号
	process.on("SIGINT", handleShutdown);
	process.on("SIGTERM", handleShutdown);

	return server;
};

export default app;
