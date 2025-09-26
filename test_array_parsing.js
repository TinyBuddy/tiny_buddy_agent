// 模拟大模型返回的数组响应
const mockLLMResponse = `[ 
   { 
     "interactionType": "story", 
     "contentId": "content_003", 
     "objectives": [ 
       "通过经典童话故事激发兴趣", 
       "培养安全意识和良好行为习惯", 
       "延续儿童对动物故事的主题偏好" 
     ], 
     "strategy": "先以提问方式回顾《龟兔赛跑》的坚持主题，自然过渡到《小兔子乖乖》故事，通过角色扮演语气增强趣味性，重点强调'不开门'的安全教育点"      
   }, 
   { 
     "interactionType": "song", 
     "contentId": "content_002", 
     "objectives": [ 
       "训练节奏感和语言模仿能力", 
       "舒缓故事后的情绪过渡", 
       "建立音乐与数字的初步联想" 
     ], 
     "strategy": "将《小星星》歌词中的'一闪一闪'与手指动作结合，每唱一句配合手指计数，引导儿童边唱边数手指，为数字认知做铺垫" 
   }, 
   { 
     "interactionType": "lesson", 
     "contentId": "content_001", 
     "objectives": [ 
       "建立1-5的数字概念", 
       "关联数字与实物数量", 
       "巩固故事和儿歌中的动物元素" 
     ], 
     "strategy": "用兔子、乌龟、星星等儿童熟悉的元素作为计数道具，例如'帮小 兔子数一数有几根胡萝卜'，通过触摸实物和跳跃计数游戏保持互动性" 
   }, 
   { 
     "interactionType": "game", 
     "contentId": null, 
     "objectives": [ 
       "综合练习数字识别与动作协调", 
       "强化坚持努力的主题", 
       "释放儿童身体能量" 
     ], 
     "strategy": "设计'乌龟赛跑'体能游戏：设置5步终点线，每步需完成一个数字 指令（如跳3下），模仿乌龟坚持到达终点，及时给予语言鼓励" 
   } 
 ]`;

// 模拟提取后的JSON字符串
const extractedJsonStr = mockLLMResponse.trim();

console.log("提取的原始JSON字符串:", extractedJsonStr);

// 清理JSON字符串
let cleanedJsonStr = extractedJsonStr
  .replace(/\\n/g, "\\\\n")
  .replace(/\\t/g, "\\\\t")
  .replace(/\\\\n\s*\\\\n/g, "\\\\n")
  .trim();

console.log("清理后的JSON字符串:", cleanedJsonStr);

try {
  // 尝试解析JSON
  const parsedJson = JSON.parse(cleanedJsonStr);
  
  // 如果解析结果是数组，取第一个元素
  let llmPlan;
  if (Array.isArray(parsedJson)) {
    console.log("检测到数组响应，使用第一个元素作为规划");
    llmPlan = parsedJson[0];
  } else {
    llmPlan = parsedJson;
  }
  
  console.log("解析成功，第一个元素:", llmPlan);
} catch (error) {
  console.error("解析失败:", error.message);
}