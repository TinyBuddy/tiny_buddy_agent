import axios from "axios";

/**
 * 测试语言分级API端点
 * 这个测试文件用于验证/api/test-language-level接口是否正常工作
 */
async function testLanguageLevelApi() {
    try {
        // 定义测试参数
        const BASE_URL = "http://localhost:3142/api";

        console.log("开始测试语言分级API...");

        // 1. 测试必填参数验证 - 缺少年龄
        console.log("测试1: 缺少年龄参数");
        try {
            const response = await axios.post(`${BASE_URL}/test-language-level`, {
                messages: [{ content: "Hello, how are you?" }]
            });
            console.log("❌ 测试失败: 应该返回400错误，但得到了成功响应");
        } catch (error: any) {
            if (error.response?.status === 400) {
                console.log("✅ 测试成功: 正确验证了缺少的年龄参数");
                console.log("错误信息:", error.response.data.error);
            } else {
                console.log(
                    "❌ 测试失败: 返回了非预期的错误状态码",
                    error.response?.status,
                );
            }
        }

        // 2. 测试基本查询
        console.log("\n测试2: 使用有效参数计算语言分级");
        try {
            const response = await axios.post(`${BASE_URL}/test-language-level`, {
                age: 5,
                messages: [
                    { content: "Hello, my name is Jack." },
                    { content: "I like playing with my toys." },
                    { content: "Can we go to the park today?" }
                ]
            });
            console.log("✅ 测试成功: 成功计算语言分级");
            console.log("返回数据:", {
                level: response.data.data.level,
                confidence: response.data.data.confidence,
                age: response.data.data.age
            });
        } catch (error: any) {
            console.log("❌ 测试失败: 计算语言分级失败", error.message);
        }

        // 3. 测试不同年龄段
        console.log("\n测试3: 测试不同年龄段的语言分级");
        try {
            const ages = [3, 7, 10];
            for (const age of ages) {
                const response = await axios.post(`${BASE_URL}/test-language-level`, {
                    age,
                    messages: [{ content: "This is a test message for age " + age }]
                });
                console.log(`✅ ${age}岁儿童的语言分级:`, response.data.data.level);
            }
        } catch (error: any) {
            console.log("❌ 测试失败: 不同年龄段测试失败", error.message);
        }

        console.log("\n语言分级API测试完成");
    } catch (error) {
        console.error("测试过程中出现错误:", error);
    }
}

// 运行测试
if (require.main === module) {
    testLanguageLevelApi();
}

export default testLanguageLevelApi;