#!/bin/bash

# TinyBuddy前端构建测试脚本

# 检查Node.js是否安装
if ! command -v node &> /dev/null
then
    echo "错误: 未安装Node.js，请先安装Node.js"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null
then
    echo "错误: 未安装npm，请先安装npm"
    exit 1
fi

# 进入前端目录
cd $(dirname "$0")/frontend

# 打印当前目录
echo "当前目录: $(pwd)"

# 安装依赖
echo "正在安装依赖..."
npm install

# 检查依赖安装是否成功
if [ $? -ne 0 ]
then
    echo "错误: 依赖安装失败"
    exit 1
fi

# 构建项目
echo "正在构建项目..."
npm run build

# 检查构建是否成功
if [ $? -ne 0 ]
then
    echo "错误: 项目构建失败"
    exit 1
fi

# 检查是否生成了.next目录
if [ ! -d ".next" ]
then
    echo "错误: 构建完成但未生成.next目录"
    exit 1
fi

# 显示.next目录内容
echo "构建成功! .next目录内容:"
ls -la .next

echo "\n测试完成! 项目可以成功构建。部署时请确保："
echo "1. 在云服务器上运行 npm run build"
echo "2. 使用 npm run start 启动生产服务器"
echo "3. 或配置Nginx反向代理指向生产服务器"

exit 0