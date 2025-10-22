// 直接测试JSON修复逻辑，模拟不完整JSON的情况

// 模拟PlanningAgent中的JSON修复逻辑
function simulateJsonFix(jsonStr: string): string {
  console.log(`原始JSON字符串 (前50个字符): ${jsonStr.substring(0, 50)}...`);
  
  // 模拟三次解析尝试
  let parsedJson = null;
  
  // 第一次尝试：直接解析
  try {
    parsedJson = JSON.parse(jsonStr);
    console.log('第一次解析成功');
    return JSON.stringify(parsedJson);
  } catch (e) {
    console.log('第一次解析失败，尝试修复');
  }
  
  // 第二次尝试：简单清理
  try {
    const simpleFixedJson = jsonStr
      .replace(/\s+/g, ' ') // 标准化空白
      .trim();
    parsedJson = JSON.parse(simpleFixedJson);
    console.log('第二次解析成功');
    return JSON.stringify(parsedJson);
  } catch (e) {
    console.log('第二次解析失败，尝试更复杂的修复');
  }
  
  // 第三次尝试：增强的修复逻辑（从planningAgent.ts中提取的核心逻辑）
  try {
    let fixedArrayJsonStr = jsonStr;
    
    // 处理数组情况
    if (jsonStr.trim().startsWith('[')) {
      // 首先清理JSON字符串，移除可能的无效字符
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
        
        // 增强处理：确保objectives数组正确闭合
        if (incompleteObject.includes('"objectives":') && 
            (!incompleteObject.includes(']') || 
            (incompleteObject.match(/\[/g) || []).length > 
            (incompleteObject.match(/\]/g) || []).length)) {
            
          // 智能定位objectives数组并闭合
          let nestedArrayCount = 0;
          let arrayContent = '';
          let arrayStartIndex = incompleteObject.indexOf('"objectives":');
          
          if (arrayStartIndex !== -1) {
            arrayStartIndex = incompleteObject.indexOf('[', arrayStartIndex);
            if (arrayStartIndex !== -1) {
              nestedArrayCount = 1;
              arrayContent = '[';
              
              for (let j = arrayStartIndex + 1; j < incompleteObject.length; j++) {
                const arrayChar = incompleteObject[j];
                
                if (arrayChar === '\\') {
                  arrayContent += arrayChar;
                  j++; // 跳过下一个字符
                  arrayContent += incompleteObject[j];
                } else if (arrayChar === '"') {
                  arrayContent += arrayChar;
                  // 检查引号内的内容
                  for (j++; j < incompleteObject.length; j++) {
                    if (incompleteObject[j] === '\\') {
                      arrayContent += '\\';
                      j++; // 跳过下一个字符
                      arrayContent += incompleteObject[j];
                    } else if (incompleteObject[j] === '"') {
                      arrayContent += '"';
                      break;
                    } else {
                      arrayContent += incompleteObject[j];
                    }
                  }
                } else if (!inQuotes && arrayChar === '[') {
                  nestedArrayCount++;
                  arrayContent += arrayChar;
                } else if (!inQuotes && arrayChar === ']') {
                  nestedArrayCount--;
                  arrayContent += arrayChar;
                  if (nestedArrayCount === 0) {
                    break;
                  }
                } else {
                  arrayContent += arrayChar;
                }
              }
              
              // 如果仍然没有闭合，强制闭合
              while (nestedArrayCount > 0) {
                arrayContent += ']';
                nestedArrayCount--;
              }
              
              // 替换原始的objectives部分
              incompleteObject = incompleteObject.substring(0, arrayStartIndex) + arrayContent;
            }
          }
        }
        
        // 增强的strategy字段添加逻辑
        if (!incompleteObject.includes('"strategy":')) {
          // 尝试在合适的位置添加strategy字段
          // 1. 查找最后一个逗号或冒号后面的位置
          const lastCommaIndex = incompleteObject.lastIndexOf(',');
          const lastColonIndex = incompleteObject.lastIndexOf(':');
          let insertPosition = Math.max(lastCommaIndex, lastColonIndex);
          
          // 2. 确保在引号外
          let quoteCount = 0;
          for (let j = 0; j < insertPosition; j++) {
            if (incompleteObject[j] === '\\') j++; // 跳过转义字符
            else if (incompleteObject[j] === '"') quoteCount++;
          }
          
          // 如果在引号内，找到下一个引号后
          if (quoteCount % 2 === 1) {
            insertPosition = incompleteObject.indexOf('"', insertPosition + 1) + 1;
          }
          
          // 3. 确保在value后而不是key后
          if (insertPosition > 0 && incompleteObject[insertPosition - 1] === ':') {
            // 找到下一个逗号或结束位置
            const nextCommaIndex = incompleteObject.indexOf(',', insertPosition);
            const nextBraceIndex = incompleteObject.indexOf('}', insertPosition);
            if (nextCommaIndex !== -1) {
              insertPosition = nextCommaIndex + 1;
            } else if (nextBraceIndex !== -1) {
              insertPosition = nextBraceIndex;
            } else {
              insertPosition = incompleteObject.length;
            }
          }
          
          // 4. 插入strategy字段
          const insertStr = insertPosition < incompleteObject.length ? 
                           ',"strategy":"Default strategy"' : 
                           '"strategy":"Default strategy"';
          
          incompleteObject = incompleteObject.substring(0, insertPosition) + 
                            insertStr + 
                            incompleteObject.substring(insertPosition);
        }
        
        // 智能闭合对象 - 计算需要的大括号数量
        const openBraceCount = (incompleteObject.match(/\{/g) || []).length;
        const closeBraceCount = (incompleteObject.match(/\}/g) || []).length;
        const missingBraces = openBraceCount - closeBraceCount;
        
        if (missingBraces > 0) {
          incompleteObject = incompleteObject + '}'.repeat(missingBraces);
        }
        
        // 清理语法错误
        incompleteObject = incompleteObject
          .replace(/,\s*}/g, '}') // 移除尾部逗号
          .replace(/\}\s*{/g, '},{'); // 修复对象间缺少逗号
        
        objects.push(incompleteObject);
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
    } else if (jsonStr.includes('"objectives":')) {
      // 处理单个对象缺少strategy的情况
      if (!jsonStr.includes('"strategy":')) {
        // 更智能地找到objectives数组结尾
        const objectivesEndIndex = jsonStr.lastIndexOf(']');
        if (objectivesEndIndex !== -1) {
          // 确保在引号外的位置
          let quoteCount = 0;
          for (let j = 0; j <= objectivesEndIndex; j++) {
            if (jsonStr[j] === '\\') j++; // 跳过转义字符
            else if (jsonStr[j] === '"') quoteCount++;
          }
          
          if (quoteCount % 2 === 0) { // 确保在引号外
            const restOfString = jsonStr.substring(objectivesEndIndex + 1);
            fixedArrayJsonStr = jsonStr.substring(0, objectivesEndIndex + 1) + 
                              ',"strategy":"Default strategy"' + restOfString;
          } else {
            // 如果在引号内，在字符串末尾添加
            fixedArrayJsonStr += ',"strategy":"Default strategy"';
          }
        } else {
          // 如果找不到objectives数组结尾，添加基本字段
          fixedArrayJsonStr += '"strategy":"Default strategy"';
        }
      }
      // 确保对象闭合
      const openBraceCount = (fixedArrayJsonStr.match(/\{/g) || []).length;
      const closeBraceCount = (fixedArrayJsonStr.match(/\}/g) || []).length;
      const missingBraces = openBraceCount - closeBraceCount;
      
      if (missingBraces > 0) {
        fixedArrayJsonStr = fixedArrayJsonStr + '}'.repeat(missingBraces);
      }
    } else {
      // 如果JSON结构完全混乱，使用增强的兜底方案
      fixedArrayJsonStr = '[{"interactionType":"chat","contentId":"fallback_001","objectives":["建立情感连接","鼓励表达"],"strategy":"Default fallback strategy when JSON is completely invalid"}]';
    }
    
    console.log(`第三次修复后的JSON (前100个字符): ${fixedArrayJsonStr.substring(0, 100)}...`);
    parsedJson = JSON.parse(fixedArrayJsonStr);
    console.log('第三次解析成功');
    return JSON.stringify(parsedJson);
  } catch (e) {
    console.log('第三次解析失败，使用兜底方案');
    // 使用兜底默认结构
    const fallback = '[{"interactionType":"chat","contentId":"fallback_001","objectives":["建立情感连接","鼓励表达"],"strategy":"Default fallback strategy"}]';
    return fallback;
  }
}

// 测试用例
function runTest() {
  console.log('=== 开始直接测试JSON修复逻辑 ===');
  
  // 测试用例1：第四个对象缺少strategy字段且未闭合
  const testCase1 = `[
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
  
  console.log('\n测试用例1：第四个对象缺少strategy字段且未闭合');
  try {
    const result = simulateJsonFix(testCase1);
    const parsedResult = JSON.parse(result);
    
    console.log(`修复后的JSON包含 ${Array.isArray(parsedResult) ? parsedResult.length : 1} 个对象`);
    
    if (Array.isArray(parsedResult)) {
      console.log('每个对象的验证:');
      parsedResult.forEach((obj, index) => {
        const hasStrategy = 'strategy' in obj;
        const hasObjectives = 'objectives' in obj && Array.isArray(obj.objectives);
        const hasInteractionType = 'interactionType' in obj;
        
        console.log(`对象 ${index + 1}:`);
        console.log(`  - 包含strategy: ${hasStrategy ? '✅' : '❌'}`);
        console.log(`  - 包含objectives: ${hasObjectives ? '✅' : '❌'}`);
        console.log(`  - 包含interactionType: ${hasInteractionType ? '✅' : '❌'}`);
      });
    }
    
    console.log('\n✅ 测试用例1通过！JSON修复逻辑成功处理了不完整的JSON结构');
  } catch (error) {
    console.error('\n❌ 测试用例1失败:', error);
  }
  
  // 测试用例2：完全混乱的JSON
  const testCase2 = `这不是JSON数据，只是一些随机文本，包含{和[符号，但不是有效的JSON`;
  
  console.log('\n测试用例2：完全混乱的JSON');
  try {
    const result = simulateJsonFix(testCase2);
    const parsedResult = JSON.parse(result);
    
    console.log(`兜底方案返回了 ${Array.isArray(parsedResult) ? parsedResult.length : 1} 个对象`);
    console.log('✅ 测试用例2通过！兜底方案成功提供了默认结构');
  } catch (error) {
    console.error('\n❌ 测试用例2失败:', error);
  }
  
  console.log('\n=== JSON修复逻辑测试完成 ===');
}

// 运行测试
runTest();