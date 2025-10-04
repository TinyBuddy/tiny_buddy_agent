#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

# 检查端口占用情况
check_port() {
  local port=$1
  if lsof -i :$port >/dev/null 2>&1; then
    echo -e "${RED}错误：端口 $port 已被占用！${NC}"
    echo -e "${YELLOW}请先关闭占用该端口的程序。${NC}"
    return 1
  fi
  return 0
}

# 停止所有相关进程
stop_processes() {
  echo -e "${BLUE}正在停止所有相关进程...${NC}"
  
  # 停止模拟服务器
  MOCK_PID=$(ps aux | grep 'node mock-server.js' | grep -v grep | awk '{print $2}')
  if [ ! -z "$MOCK_PID" ]; then
    kill -TERM $MOCK_PID >/dev/null 2>&1
  fi
  
  # 停止代理服务器
  PROXY_PID=$(ps aux | grep 'node node-proxy.js' | grep -v grep | awk '{print $2}')
  if [ ! -z "$PROXY_PID" ]; then
    kill -TERM $PROXY_PID >/dev/null 2>&1
  fi
  
  # 等待进程停止
  sleep 2
  echo -e "${GREEN}所有进程已停止！${NC}"
}

# 显示帮助信息
show_help() {
  echo "使用方法: $0 [选项]"
  echo "选项:"
  echo "  --start          启动测试环境（Node.js代理和模拟服务器）"
  echo "  --stop           停止测试环境"
  echo "  --test           运行测试脚本（使用Node.js代理）"
  echo "  --full           完整测试（启动环境并运行测试）"
  echo "  --haproxy-test   运行HAProxy代理测试"
  echo "  --help           显示帮助信息"
  exit 0
}

# 启动测试环境
start_environment() {
  echo -e "${GREEN}=== 启动WebSocket测试环境 ===${NC}"
  
  # 检查端口
  if ! check_port 8081 || ! check_port 8082; then
    return 1
  fi
  
  # 检查Node.js是否安装
  if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}未找到Node.js，请先安装Node.js。${NC}"
    return 1
  fi
  
  # 检查ws包是否安装
  if ! npm list ws >/dev/null 2>&1; then
    echo -e "${YELLOW}未找到ws包，正在安装...${NC}"
    npm install ws
  fi
  
  # 启动模拟服务器
  echo -e "${BLUE}启动模拟WebSocket服务器...${NC}"
  node mock-server.js > mock-server.log 2>&1 &
  MOCK_SERVER_PID=$!
  echo $MOCK_SERVER_PID > mock-server.pid
  
  # 等待模拟服务器启动
  sleep 2
  
  # 启动代理服务器
  echo -e "${BLUE}启动Node.js代理服务器...${NC}"
  node node-proxy.js > node-proxy.log 2>&1 &
  PROXY_SERVER_PID=$!
  echo $PROXY_SERVER_PID > node-proxy.pid
  
  # 等待代理服务器启动
  sleep 2
  
  echo -e "${GREEN}✅ 测试环境已成功启动！${NC}"
  echo -e "${GREEN}模拟服务器日志: mock-server.log${NC}"
  echo -e "${GREEN}代理服务器日志: node-proxy.log${NC}"
  echo -e "${YELLOW}运行测试: $0 --test${NC}"
  echo -e "${YELLOW}停止测试环境: $0 --stop${NC}"
}

# 运行测试
run_test() {
  echo -e "${GREEN}=== 运行WebSocket代理测试 ===${NC}"
  
  # 检查测试脚本是否存在
  if [ ! -f test-websocket.js ]; then
    echo -e "${RED}未找到test-websocket.js文件！${NC}"
    return 1
  fi
  
  # 运行测试脚本
  echo -e "${BLUE}正在运行测试脚本...${NC}"
  node test-websocket.js
  
  echo -e "${GREEN}测试完成！${NC}"
}

# 运行HAProxy测试
run_haproxy_test() {
  echo -e "${GREEN}=== 运行HAProxy WebSocket代理测试 ===${NC}"
  
  # 检查HAProxy测试脚本是否存在
  if [ ! -f haproxy-test.js ]; then
    echo -e "${RED}未找到haproxy-test.js文件！${NC}"
    return 1
  fi
  
  # 检查HAProxy是否运行在8081端口
  if ! lsof -i :8081 >/dev/null 2>&1; then
    echo -e "${YELLOW}警告：未检测到HAProxy服务在8081端口运行。${NC}"
    echo -e "${YELLOW}请确保HAProxy服务已启动且配置正确。${NC}"
  fi
  
  # 运行HAProxy测试脚本
  echo -e "${BLUE}正在运行HAProxy测试脚本...${NC}"
  node haproxy-test.js
  
  echo -e "${GREEN}HAProxy测试完成！${NC}"
}

# 完整测试
full_test() {
  # 先停止现有进程
  stop_processes
  
  # 启动环境
  if start_environment; then
    # 运行测试
    run_test
  fi
}

# 解析命令行参数
if [ $# -eq 0 ]; then
  show_help
fi

case "$1" in
  --start)
    start_environment
    ;;
  --stop)
    stop_processes
    ;;
  --test)
    run_test
    ;;
  --full)
    full_test
    ;;
  --haproxy-test)
    run_haproxy_test
    ;;
  --help)
    show_help
    ;;
  *)
    echo -e "${RED}未知选项: $1${NC}"
    show_help
    ;;
esac