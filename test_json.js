const jsonString = `{
  "interactionType": "story",
  "contentId": "content_003",
  "objectives": ["培养坚持和努力的品质", "增强语言理解和想象力", " 延续儿童对动物故事的兴趣"],
  "strategy": "基于儿童最近对龟兔赛跑故事的请 求，结合知识库中的《小兔子乖乖》故事进行改编，融入坚持和努力的主题。通过生 动模仿动物声音和互动提问（如'小兔子这次有没有坚持到底呀？'），保持4岁儿童的注意力。"
}`;

console.log('JSON字符串:', jsonString);

try {
  const parsed = JSON.parse(jsonString);
  console.log('解析成功:', parsed);
} catch (error) {
  console.error('解析失败:', error.message);
  // 尝试找出具体问题
  for (let i = 0; i < jsonString.length; i++) {
    try {
      const substr = jsonString.substring(0, i+1);
      JSON.parse(substr);
    } catch (e) {
      if (e.message !== 'Unexpected end of JSON input') {
        console.log('错误位置附近的内容:', jsonString.substring(Math.max(0, i-10), i+10));
        console.log('错误位置的字符码:', jsonString.charCodeAt(i));
        break;
      }
    }
  }
}