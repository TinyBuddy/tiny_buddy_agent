#!/bin/bash

# 多次运行测试脚本
TEST_COUNT=3
SUCCESS_COUNT=0

# 创建或清空测试结果日志
TEST_LOG="e2e/multiple_test_results.log"
echo "=== 多次测试结果日志 ===" > $TEST_LOG
echo "测试时间: $(date)" >> $TEST_LOG
echo "服务器地址: $(grep SERVER_URL e2e/chat_streaming_test.ts | cut -d'=' -f2 | tr -d "';\n")" >> $TEST_LOG
echo >> $TEST_LOG

for ((i=1; i<=TEST_COUNT; i++)); do
    echo "\n=== 运行测试 $i/$TEST_COUNT ==="
    echo "\n--- 测试 $i ---" >> $TEST_LOG
    
    # 运行测试并捕获输出
    TEST_OUTPUT=$(e2e/run_test.sh 2>&1)
    echo "$TEST_OUTPUT" >> $TEST_LOG
    
    # 检查测试是否成功
    if [[ $? -eq 0 ]]; then
        echo "✅ 测试 $i 成功"
        SUCCESS_COUNT=$((SUCCESS_COUNT+1))
    else
        echo "❌ 测试 $i 失败"
    fi
done

# 显示测试统计结果
echo "\n=== 多次测试统计结果 ==="
echo "总测试次数: $TEST_COUNT"
echo "成功次数: $SUCCESS_COUNT"
echo "失败次数: $((TEST_COUNT-SUCCESS_COUNT))"
echo "成功率: $((SUCCESS_COUNT*100/TEST_COUNT))%"

echo "\n详细测试日志已保存至: $TEST_LOG"