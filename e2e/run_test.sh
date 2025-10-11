#!/bin/bash

# 运行服务器聊天流式输出测试

# 检查是否有正在运行的服务器实例
if lsof -i :3143 | grep -q LISTEN; then
  echo "✅ 检测到端口3143有程序在运行，继续测试"
else
  echo "❌ 未检测到运行中的服务器，请先启动TinyBuddy服务器"
  echo "提示：可以使用 'npm run dev' 命令启动开发服务器"
  exit 1
fi

# 使用tsx运行TypeScript测试文件
npx tsx e2e/chat_streaming_test.ts