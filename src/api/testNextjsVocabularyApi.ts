import axios from 'axios';

/**
 * 测试Next.js HTTP服务器上的词汇表API端点
 * 这个测试文件用于验证3144端口上的/api/vocabulary接口是否正常工作
 */
async function testNextjsVocabularyApi() {
  try {
    // 定义测试参数
    const TEST_CHILD_ID = 'test_child_123';
    const BASE_URL = 'http://localhost:3144/api'; // 使用新的Next.js服务器端口
    
    console.log('开始测试Next.js HTTP服务器上的词汇表API...');
    
    // 1. 测试必填参数验证
    console.log('测试1: 缺少childId参数');
    try {
      const response = await axios.get(`${BASE_URL}/vocabulary`);
      console.log('❌ 测试失败: 应该返回400错误，但得到了成功响应');
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.log('✅ 测试成功: 正确验证了缺少的childId参数');
        console.log('错误信息:', error.response.data.error);
      } else {
        console.log('❌ 测试失败: 返回了非预期的错误状态码', error.response?.status);
      }
    }
    
    // 2. 测试基本查询（只有childId）
    console.log('\n测试2: 使用有效childId查询词汇表');
    try {
      const response = await axios.get(`${BASE_URL}/vocabulary`, {
        params: {
          childId: TEST_CHILD_ID
        }
      });
      console.log('✅ 测试成功: 成功获取词汇表数据');
      console.log('返回数据:', {
        words: response.data.data.words,
        count: response.data.data.count,
        childId: response.data.data.childId
      });
    } catch (error: any) {
      console.log('❌ 测试失败: 查询失败', error.message);
    }
    
    // 3. 测试带时间区间的查询
    console.log('\n测试3: 使用时间区间查询词汇表');
    try {
      // 设置一个合理的时间区间（例如过去一个月到现在）
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      const response = await axios.get(`${BASE_URL}/vocabulary`, {
        params: {
          childId: TEST_CHILD_ID,
          startDate: oneMonthAgo.toISOString().split('T')[0], // YYYY-MM-DD格式
          endDate: new Date().toISOString().split('T')[0]      // YYYY-MM-DD格式
        }
      });
      console.log('✅ 测试成功: 成功获取指定时间区间的词汇表数据');
      console.log('返回数据:', {
        words: response.data.data.words,
        count: response.data.data.count,
        timeRange: response.data.data.timeRange
      });
    } catch (error: any) {
      console.log('❌ 测试失败: 带时间区间的查询失败', error.message);
    }
    
    console.log('\nNext.js词汇表API测试完成');
    
  } catch (error) {
    console.error('测试过程中出现错误:', error);
  }
}

// 运行测试
if (require.main === module) {
  testNextjsVocabularyApi();
}

export default testNextjsVocabularyApi;