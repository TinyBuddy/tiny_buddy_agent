#!/bin/bash

# 详细的Next.js构建测试脚本

# 进入frontend目录
cd $(dirname $0)/frontend

# 检查目录
echo "当前目录: $(pwd)"

# 检查package.json是否存在
echo "\n=== 检查package.json ==="
if [ -f "package.json" ]; then
  echo "✓ package.json 存在"
  echo "构建命令: $(grep '"build"' package.json)"
else
  echo "✗ 错误: package.json 不存在"
  exit 1
fi

# 检查依赖是否已安装
echo "\n=== 检查node_modules目录 ==="
if [ -d "node_modules" ]; then
  echo "✓ node_modules 存在"
  echo "Next.js版本: $(npm list next | grep next@)"
else
  echo "✗ 警告: node_modules 不存在，需要安装依赖"
  echo "正在安装依赖..."
  npm install
  if [ $? -ne 0 ]; then
    echo "✗ 错误: 依赖安装失败"
    exit 1
  fi
fi

# 清理之前的构建
echo "\n=== 清理之前的构建文件 ==="
if [ -d ".next" ]; then
  echo "删除旧的.next目录..."
  rm -rf .next
fi

# 测试构建命令
echo "\n=== 测试构建命令 ==="
echo "使用标准构建命令(不使用--turbopack)..."
npm run build:test
if [ $? -ne 0 ]; then
  echo "✗ 错误: 标准构建命令失败，尝试移除--turbopack选项..."
  echo "创建临时构建命令..."
  TEMP_BUILD_SCRIPT="$(pwd)/temp_build.js"
  cat > $TEMP_BUILD_SCRIPT << 'EOF'
const { execSync } = require('child_process');
try {
  console.log('执行: next build');
  execSync('next build', { stdio: 'inherit' });
} catch (error) {
  console.error('构建失败:', error);
  process.exit(1);
}
EOF
  node $TEMP_BUILD_SCRIPT
  rm $TEMP_BUILD_SCRIPT
fi

# 检查构建结果
echo "\n=== 检查构建结果 ==="
if [ -d ".next" ]; then
  echo "✓ 构建成功! .next目录已创建"
  echo "目录内容:"
  ls -la .next
  echo "\n构建成功提示:"
  echo "1. 运行: cd $(pwd) && npm run start"
  echo "2. 或者使用临时脚本绕过turbopack问题"
else
  echo "✗ 错误: 构建失败，.next目录未创建"
  echo "可能的解决方案:"
  echo "1. 尝试移除package.json中的--turbopack选项"
  echo "2. 检查Node.js版本是否兼容Next.js 15.5.4"
  echo "3. 尝试使用npx next build直接构建"
fi