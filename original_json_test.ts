// 直接测试用户提供的原始JSON字符串修复逻辑

// 模拟planningAgent.ts中的核心JSON修复逻辑
function simulateEnhancedJsonFix(jsonStr: string): any {
  console.log(`原始JSON字符串长度: ${jsonStr.length} 字符`);
  console.log(`原始JSON开头: ${jsonStr.substring(0, 100)}...`);
  
  // 尝试解析JSON，如果失败则使用修复措施
  let parsedJson = null;
  let parsingAttempts = 0;
  const maxAttempts = 4;

  while (!parsedJson && parsingAttempts < maxAttempts) {
    parsingAttempts++;
    try {
      if (parsingAttempts === 1) {
        // 第一次尝试直接解析
        parsedJson = JSON.parse(jsonStr);
        console.log('第1次解析成功');
      } else if (parsingAttempts === 2) {
        // 第二次尝试：更激进的修复
        console.log('第1次解析失败，尝试更激进的修复措施');
        const moreFixedJsonStr = jsonStr
          .replace(/[^\x20-\x7E\u4e00-\u9fa5\{\}\[\]\:",]/g, '') // 仅保留基本JSON字符和中文
          .replace(/\s+/g, ' ') // 合并多余空格
          .trim();
        console.log(`第${parsingAttempts}次修复后字符串开头: ${moreFixedJsonStr.substring(0, 100)}...`);
        parsedJson = JSON.parse(moreFixedJsonStr);
      } else if (parsingAttempts === 3) {
        // 第三次尝试：检测并修复不完整的JSON数组和对象
        console.log('第2次解析失败，尝试修复不完整的JSON数组和对象');
        let fixedArrayJsonStr = jsonStr;
        
        // 处理数组情况
        if (jsonStr.trim().startsWith('[')) {
          // 首先清理JSON字符串，移除可能的无效字符，但保留引号
          let cleanJson = jsonStr
            .replace(/[\s\n\r]+/g, ' ') // 标准化空白字符
            .replace(/[^\x20-\x7E\u4e00-\u9fa5\{\}\[\]\:",]/g, '') // 仅保留基本字符
            .trim();
          
          // 确保数组正确闭合
          if (!cleanJson.endsWith(']')) {
            cleanJson = cleanJson + ']';
          }
          
          // 检查并修复每个对象中的缺失字段
          let braceCount = 0;
          let currentObject = '';
          let lastObjectStart = 0;
          let objects: string[] = [];
          let inQuotes = false;
          let escapeNext = false;
           
          for (let i = 0; i < cleanJson.length; i++) {
            const char = cleanJson[i];
            
            if (escapeNext) {
              escapeNext = false;
            } else if (char === '\\') {
              escapeNext = true;
            } else if (char === '"') {
              inQuotes = !inQuotes;
            } else if (!inQuotes) {
              if (char === '{') {
                braceCount++;
                if (braceCount === 1) {
                  lastObjectStart = i;
                  currentObject = '{';
                } else {
                  currentObject += char;
                }
              } else if (char === '}') {
                currentObject += char;
                braceCount--;
                if (braceCount === 0) {
                  // 处理当前完整对象
                  objects.push(currentObject);
                  currentObject = '';
                }
              } else if (braceCount > 0) {
                // 收集对象内容
                currentObject += char;
              }
            } else {
              // 在引号内，直接添加字符
              currentObject += char;
            }
          }
           
          // 处理最后一个可能不完整的对象
          if (braceCount > 0 && lastObjectStart > 0) {
            let incompleteObject = cleanJson.substring(lastObjectStart);
            console.log(`发现不完整对象: ${incompleteObject.substring(0, 100)}...`);
            
            // 确保objectives数组正确闭合 - 增强版
            if (incompleteObject.includes('"objectives":')) {
              const objStart = incompleteObject.indexOf('"objectives":');
              let arrayStart = incompleteObject.indexOf('[', objStart);
              if (arrayStart !== -1) {
                // 计算嵌套数组的括号平衡
                let nestedCount = 1;
                let endIndex = arrayStart + 1;
                let inObjQuotes = false;
                let objEscapeNext = false;
                
                while (endIndex < incompleteObject.length && nestedCount > 0) {
                  const c = incompleteObject[endIndex];
                  if (objEscapeNext) {
                    objEscapeNext = false;
                  } else if (c === '\\') {
                    objEscapeNext = true;
                  } else if (c === '"') {
                    inObjQuotes = !inObjQuotes;
                  } else if (!inObjQuotes) {
                    if (c === '[') nestedCount++;
                    else if (c === ']') nestedCount--;
                  }
                  endIndex++;
                }
                
                // 如果数组未闭合，强制闭合
                if (nestedCount > 0) {
                  // 提取objectives数组部分并闭合
                  const beforeArray = incompleteObject.substring(0, arrayStart);
                  const afterArray = incompleteObject.substring(arrayStart);
                  // 尝试找到最后一个有效的objective元素
                  const lastQuoteIndex = afterArray.lastIndexOf('"');
                  if (lastQuoteIndex !== -1) {
                    // 确保在数组闭合前有逗号
                    let arrayContent = afterArray.substring(0, lastQuoteIndex + 1);
                    if (!arrayContent.endsWith(',')) {
                      arrayContent += ',';
                    }
                    // 闭合数组
                    arrayContent += ']';
                    // 重建对象
                    incompleteObject = beforeArray + arrayContent;
                  } else {
                    // 无法修复，使用默认objectives
                    incompleteObject = beforeArray + '["Default objective"]';
                  }
                }
              }
            }
            
            // 增强的strategy字段添加逻辑 - 确保在正确位置添加
            if (!incompleteObject.includes('"strategy":')) {
              console.log('为不完整对象添加缺失的strategy字段');
              // 检查是否包含objectives数组
              if (incompleteObject.includes('"objectives":')) {
                // 在objectives数组结束后添加strategy
                const objectivesEnd = incompleteObject.lastIndexOf(']');
                if (objectivesEnd !== -1) {
                  // 检查是否需要添加逗号
                  let insertStr = ",\"strategy\":\"Default strategy for this interaction\"";
                  incompleteObject = incompleteObject.substring(0, objectivesEnd + 1) + 
                                   insertStr + 
                                   incompleteObject.substring(objectivesEnd + 1);
                } else {
                  // 在对象末尾添加
                  incompleteObject = incompleteObject.trim();
                  if (incompleteObject.endsWith('}')) {
                    incompleteObject = incompleteObject.slice(0, -1) + ",\"strategy\":\"Default strategy\"}";
                  } else {
                    incompleteObject += ",\"strategy\":\"Default strategy\"";
                  }
                }
              } else {
                // 简单对象，直接添加
                incompleteObject = incompleteObject.trim();
                if (incompleteObject.endsWith('}')) {
                  incompleteObject = incompleteObject.slice(0, -1) + ",\"strategy\":\"Default strategy\"}";
                } else {
                  incompleteObject += ",\"strategy\":\"Default strategy\"";
                }
              }
            }
            
            // 智能闭合对象 - 计算需要的大括号数量
            const openBraceCount = (incompleteObject.match(/\{/g) || []).length;
            const closeBraceCount = (incompleteObject.match(/\}/g) || []).length;
            const missingBraces = openBraceCount - closeBraceCount;
            
            if (missingBraces > 0) {
              console.log(`添加 ${missingBraces} 个缺失的闭合大括号`);
              incompleteObject = incompleteObject + '}'.repeat(missingBraces);
            }
            
            // 清理语法错误
            incompleteObject = incompleteObject
              .replace(/,\s*}/g, '}') // 移除尾部逗号
              .replace(/\}\s*{/g, '},{'); // 修复对象间缺少逗号
            
            objects.push(incompleteObject);
            console.log(`修复后的对象: ${incompleteObject.substring(0, 100)}...`);
          }
           
          // 重建JSON数组
          if (objects.length > 0) {
            // 确保对象间有逗号分隔
            fixedArrayJsonStr = '[' + objects.join(',') + ']';
            
            // 最后检查数组是否闭合
            if (!fixedArrayJsonStr.endsWith(']')) {
              fixedArrayJsonStr = fixedArrayJsonStr + ']';
            }
          } else {
            // 增强兜底方案 - 使用更完整的默认结构
            fixedArrayJsonStr = '[{"interactionType":"chat","contentId":"default_001","objectives":["建立情感连接","鼓励表达"],"strategy":"Default fallback strategy"}]';
          }
        }
        
        console.log(`第${parsingAttempts}次修复后字符串长度: ${fixedArrayJsonStr.length} 字符`);
        parsedJson = JSON.parse(fixedArrayJsonStr);
      } else {
        // 第四次尝试：更激进的修复 - 手动构建包含所有必要字段的JSON
        console.log('第3次解析失败，尝试手动构建有效的JSON对象');
        // 从原始文本中提取可能有用的信息
        let interactionType = "chat";
        let objectives: string[] = ["建立情感连接", "鼓励表达"];
        let contentId = "fallback_001";
        let strategy = "Default emergency fallback strategy";
        
        // 尝试从原始文本中提取互动类型
        const typeRegex = /"interactionType"\s*:\s*"([^"]*)"/i;
        const typeMatch = jsonStr.match(typeRegex);
        if (typeMatch) {
          interactionType = typeMatch[1];
        }
        
        // 尝试从原始文本中提取contentId
        const idRegex = /"contentId"\s*:\s*"([^"]*)"/i;
        const idMatch = jsonStr.match(idRegex);
        if (idMatch) {
          contentId = idMatch[1];
        }
        
        // 尝试从原始文本中提取objectives（简单提取）
        const objRegex = /"objectives"\s*:\s*\[([^\]]*)\]/i;
        const objMatch = jsonStr.match(objRegex);
        if (objMatch) {
          const objContent = objMatch[1];
          const objItems = objContent.match(/"([^"]*)"/g) || [];
          if (objItems.length > 0) {
            objectives = objItems.map(item => item.replace(/"/g, ''));
          }
        }
        
        // 构建完整的JSON字符串
        const emergencyJson = JSON.stringify([{
          interactionType,
          contentId,
          objectives,
          strategy
        }]);
        console.log(`第四次修复后的JSON: ${emergencyJson.substring(0, 150)}...`);
        parsedJson = JSON.parse(emergencyJson);
      }
    } catch (parseError) {
      console.error(`第${parsingAttempts}次解析失败:`, parseError.name);
      // 继续下一次尝试
    }
  }
  
  return parsedJson;
}

// 用户提供的原始JSON字符串（第四个对象缺少strategy字段且未闭合）
const userProvidedJson = `[ 
   { 
     "interactionType": "chat", 
     "contentId": "chat_cat_001", 
     "objectives": [ 
       "Encourage verbal expression", 
       "Build rapport through familiar topics", 
       "Foster a sense of comfort and engagement" 
     ], 
     "strategy": "Begin with simple and enthusiastic greetings, referencing the child's interest in cats. Use short, clear sentences and ask open-ended questions about cats to prompt the child to respond. Gauge the child's mood; since the child has responded minimally, maintain a gentle and inviting tone and avoid overwhelming the child with too many questions at once." 
   }, 
   { 
     "interactionType": "song", 
     "contentId": "song_cat_002", 
     "objectives": [ 
       "Promote language development", 
       "Introduce rhythm and melody", 
       "Strengthen interest in cats" 
     ], 
     "strategy": "Sing a playful and repetitive song about cats, using simple words and actions. Encourage the child to join in by meowing or clapping along. Keep the melody cheerful and the lyrics easy to follow, allowing for pauses so the child can echo sounds or words." 
   }, 
   { 
     "interactionType": "story", 
     "contentId": "story_cat_003", 
     "objectives": [ 
       "Support listening skills", 
       "Stimulate imagination", 
       "Reinforce interest in animals" 
     ], 
     "strategy": "Read a short, illustrated story about a friendly cat. Use expressive voices and gestures to maintain the child's attention. Ask simple questions about the story (e.g., 'What color is the cat?') to encourage interaction. If the child seems disengaged, simplify language further and focus on describing the pictures." 
   }, 
   { 
     "interactionType": "game", 
     "contentId": "game_cat_004", 
     "objectives": [ 
       "Enhance motor skills", 
       "Encourage playful interaction", 
       "Strengthen understanding of animal sounds" 
     ]`;

// 运行测试
function runOriginalJsonTest() {
  console.log('=== 开始测试用户提供的原始JSON字符串 ===');
  
  try {
    const result = simulateEnhancedJsonFix(userProvidedJson);
    
    if (result) {
      console.log('✅ JSON修复成功！');
      console.log(`修复后的JSON包含 ${Array.isArray(result) ? result.length : 1} 个对象`);
      
      if (Array.isArray(result)) {
        console.log('每个对象的验证:');
        result.forEach((obj, index) => {
          const hasStrategy = 'strategy' in obj && typeof obj.strategy === 'string';
          const hasObjectives = 'objectives' in obj && Array.isArray(obj.objectives);
          const hasInteractionType = 'interactionType' in obj && typeof obj.interactionType === 'string';
          
          console.log(`对象 ${index + 1}:`);
          console.log(`  - interactionType: ${obj.interactionType}`);
          console.log(`  - contentId: ${obj.contentId}`);
          console.log(`  - objectives: ${hasObjectives ? obj.objectives.length : 0} 个目标`);
          console.log(`  - strategy: ${hasStrategy ? '✅ (已添加)' : '❌'}`);
        });
        
        // 特别检查第四个对象
        const fourthObject = result[3];
        if (fourthObject) {
          console.log('\n📊 第四个对象详细检查:');
          console.log(`  - 是否包含strategy字段: ${'strategy' in fourthObject ? '✅ 是' : '❌ 否'}`);
          if ('strategy' in fourthObject) {
            console.log(`  - strategy内容长度: ${fourthObject.strategy.length} 字符`);
            console.log(`  - strategy开头: ${fourthObject.strategy.substring(0, 50)}...`);
          }
          console.log(`  - objectives数组完整性: ${Array.isArray(fourthObject.objectives) ? '✅ 完整' : '❌ 不完整'}`);
        }
      }
      
      // 验证最终结果是否有效
      const jsonString = JSON.stringify(result);
      console.log(`\n✅ 修复后的JSON可以被JSON.parse正确解析`);
      console.log(`✅ 修复后的JSON字符串长度: ${jsonString.length} 字符`);
      
      // 验证所有必要字段都存在
      if (Array.isArray(result)) {
        const allHaveStrategy = result.every(obj => 'strategy' in obj && typeof obj.strategy === 'string');
        const allHaveObjectives = result.every(obj => 'objectives' in obj && Array.isArray(obj.objectives));
        const allHaveInteractionType = result.every(obj => 'interactionType' in obj && typeof obj.interactionType === 'string');
        
        console.log(`\n✅ 修复总结:`);
        console.log(`  - 所有对象都包含strategy字段: ${allHaveStrategy ? '✅ 是' : '❌ 否'}`);
        console.log(`  - 所有对象都包含objectives数组: ${allHaveObjectives ? '✅ 是' : '❌ 否'}`);
        console.log(`  - 所有对象都包含interactionType字段: ${allHaveInteractionType ? '✅ 是' : '❌ 否'}`);
        
        if (allHaveStrategy && allHaveObjectives && allHaveInteractionType) {
          console.log('\n🎉 成功修复了用户提供的不完整JSON结构！所有必要字段都已添加且格式正确。');
        }
      }
    } else {
      console.error('❌ JSON修复失败，无法解析');
    }
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
  
  console.log('\n=== 原始JSON字符串测试完成 ===');
}

// 运行测试
runOriginalJsonTest();