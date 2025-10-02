#!/bin/bash

# 启动测试环境脚本
# 这个脚本会帮助用户快速设置和测试文件上传和下载功能

# 设置颜色变量
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

# 创建upload目录（如果不存在）
mkdir -p upload

# 安装文件上传服务器依赖
if [ -f "package.json" ]; then
    echo -e "${BLUE}安装文件上传服务器依赖...${NC}"
    npm install
else
    echo -e "${RED}错误: 未找到package.json文件${NC}"
    exit 1
fi

# 启动文件上传服务器
echo -e "${BLUE}启动文件上传服务器...${NC}"
nohup node upload_server.js > upload_server.log 2>&1 &
UPLOAD_SERVER_PID=$!

# 等待上传服务器启动
sleep 2

# 运行Nginx容器
# 首先停止并删除现有的容器（如果存在）
if [ "$(docker ps -q -f name=file-server)" ]; then
    echo -e "${BLUE}停止并删除现有的file-server容器...${NC}"
    docker stop file-server
    docker rm file-server
fi

echo -e "${BLUE}启动Nginx容器...${NC}"
docker run -d --name file-server \
  -p 8080:8080 \
  -v $(pwd):/usr/share/nginx/html \
  -v $(pwd)/nginx.conf:/etc/nginx/nginx.conf \
  nginx

# 等待容器启动
sleep 3

# 显示测试环境信息
clear
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}        文件服务器测试环境已启动！        ${NC}"
echo -e "${GREEN}======================================${NC}"
echo -e "\n${YELLOW}测试组件:${NC}"
echo -e "1. 文件上传服务器: 运行在本地端口8082"
echo -e "2. Nginx文件服务器: 运行在本地端口8080"

echo -e "\n${YELLOW}测试方法:${NC}"
echo -e "1. 使用浏览器访问 文件上传页面: http://localhost:8080"
echo -e "   - 在文件上传区域选择文件"
echo -e "   - 点击开始上传"
echo -e "   - 上传成功后，文件会显示在文件列表中"
echo -e "   - 点击下载按钮可以下载文件"

echo -e "\n${YELLOW}查看日志:${NC}"
echo -e "- 文件上传服务器日志: tail -f upload_server.log"
echo -e "- Nginx容器日志: docker logs file-server"

echo -e "\n${YELLOW}停止测试环境:${NC}"
echo -e "- 停止文件上传服务器: kill $UPLOAD_SERVER_PID"
echo -e "- 停止Nginx容器: docker stop file-server"
echo -e "\n${BLUE}注意：上传的文件保存在 upload 目录中${NC}"
echo -e "\n${BLUE}祝您测试愉快！${NC}"

echo -e "\n${YELLOW}文件上传服务器日志:${NC}"
tail -n 5 upload_server.log

# 检查Nginx容器是否正常运行
if [ "$(docker ps -q -f name=file-server)" ]; then
    echo -e "\n${GREEN}Nginx容器启动成功！${NC}"
else
    echo -e "\n${RED}Nginx容器启动失败！${NC}"
    echo -e "${RED}请查看Docker日志: docker logs file-server${NC}"
    # 停止文件上传服务器
    kill $UPLOAD_SERVER_PID
    exit 1
fi

# 自动打开浏览器
# 在macOS上打开浏览器
if [[ "$(uname)" == "Darwin" ]]; then
    open http://localhost:8080
# 在Linux上打开浏览器
elif [[ "$(uname)" == "Linux" ]]; then
    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:8080
    elif command -v gnome-open &> /dev/null; then
        gnome-open http://localhost:8080
    fi
fi