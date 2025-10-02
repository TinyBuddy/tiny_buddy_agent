#!/bin/bash

# 启动WebSocket代理测试环境脚本
# 这个脚本会：
# 1. 安装必要的Node.js依赖
# 2. 在后台启动WebSocket测试服务器
# 3. 启动Nginx容器
# 4. 显示测试说明

# 设置颜色变量
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

# 检查当前目录
if [ ! -f "websocket_test_server.js" ]; then
    echo -e "${RED}错误: 请在file_server目录下运行此脚本${NC}"
    exit 1
fi

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: 未找到Node.js。请先安装Node.js。${NC}"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo -e "${RED}错误: 未找到npm。请先安装npm。${NC}"
    exit 1
fi

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: 未找到Docker。请先安装Docker。${NC}"
    exit 1
fi

# 检查Docker服务是否运行
if ! docker info &> /dev/null; then
    echo -e "${RED}错误: Docker服务未运行。请先启动Docker服务。${NC}"
    exit 1
fi

# 创建package.json文件（如果不存在）
if [ ! -f "package.json" ]; then
    echo -e "${BLUE}创建package.json文件...${NC}"
    cat > package.json << EOL
{
  "name": "websocket-test-server",
  "version": "1.0.0",
  "description": "简单的WebSocket测试服务器",
  "main": "websocket_test_server.js",
  "scripts": {
    "start": "node websocket_test_server.js"
  },
  "dependencies": {
    "ws": "^8.18.0"
  }
}
EOL
fi

# 安装依赖
echo -e "${BLUE}安装Node.js依赖...${NC}"
npm install

# 停止并删除已存在的Nginx容器
if [ "$(docker ps -aq -f name=nginx-file-server)" ]; then
    echo -e "${YELLOW}停止并删除已存在的Nginx容器...${NC}"
    docker stop nginx-file-server > /dev/null
    docker rm nginx-file-server > /dev/null
fi

# 在后台启动WebSocket测试服务器
echo -e "${BLUE}启动WebSocket测试服务器...${NC}"
nohup node websocket_test_server.js > websocket_server.log 2>&1 &

# 等待WebSocket服务器启动
sleep 2

# 启动Nginx容器
echo -e "${BLUE}启动Nginx容器...${NC}"
docker run -d --name nginx-file-server \
  -p 8080:8080 \
  -v "$(pwd)":/usr/share/nginx/html \
  -v "$(pwd)/nginx.conf":/etc/nginx/nginx.conf \
  nginx:latest > /dev/null

# 等待Nginx容器启动
sleep 2

# 显示测试说明
clear
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  WebSocket代理测试环境已启动！  ${NC}"
echo -e "${GREEN}======================================${NC}"
echo -e "\n${YELLOW}测试组件:${NC}"
echo -e "1. WebSocket测试服务器: 运行在本地端口8081"
echo -e "2. Nginx代理服务器: 运行在本地端口8080"
echo -e "3. WebSocket代理路径: http://localhost:8080/proxy"

echo -e "\n${YELLOW}测试方法:${NC}"
echo -e "1. 使用浏览器访问 WebSocket测试页面: http://localhost:8080/websocket_test.html"
echo -e "   - 默认WebSocket URL: ws://localhost:8080/proxy"
echo -e "   - 点击'连接'按钮测试WebSocket代理连接"
echo -e "   - 连接成功后，可以发送消息测试双向通信"

echo -e "2. 直接测试HTTP代理: http://localhost:8080/proxy"

echo -e "\n${YELLOW}查看日志:${NC}"
echo -e "- WebSocket服务器日志: tail -f websocket_server.log"
echo -e "- Nginx容器日志: docker logs nginx-file-server"

echo -e "\n${YELLOW}停止测试环境:${NC}"
echo -e "- 停止WebSocket服务器: pkill -f websocket_test_server.js"
echo -e "- 停止Nginx容器: docker stop nginx-file-server"
echo -e "\n${BLUE}祝您测试愉快！${NC}"

# 显示WebSocket服务器日志的最后几行
echo -e "\n${YELLOW}WebSocket服务器日志:${NC}"
tail -n 5 websocket_server.log

# 检查Nginx容器是否正常运行
if [ "$(docker ps -q -f name=nginx-file-server)" ]; then
    echo -e "\n${GREEN}Nginx容器启动成功！${NC}"
else
    echo -e "\n${RED}Nginx容器启动失败，请检查配置。${NC}"
    echo -e "${RED}查看错误日志: docker logs nginx-file-server${NC}"
fi

# 提示用户可以访问测试页面
read -p "\n按Enter键在浏览器中打开测试页面..." open_browser

# 在macOS上打开浏览器
if [[ "$(uname)" == "Darwin" ]]; then
    open http://localhost:8080/websocket_test.html
# 在Linux上打开浏览器
elif [[ "$(uname)" == "Linux" ]]; then
    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:8080/websocket_test.html
    elif command -v gnome-open &> /dev/null; then
        gnome-open http://localhost:8080/websocket_test.html
    fi
fi