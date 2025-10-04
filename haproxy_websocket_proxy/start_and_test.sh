#!/bin/bash

# 启动和测试HAProxy WebSocket代理的脚本

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # 无颜色

# 确保脚本在haproxy_websocket_proxy目录下运行
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 检查端口是否被占用
check_port() {
  local port=8081
  if lsof -i :$port >/dev/null 2>&1; then
    echo -e "${RED}错误：端口 $port 已被占用！${NC}"
    echo -e "${YELLOW}请先关闭占用该端口的程序，或修改haproxy.cfg中的监听端口。${NC}"
    exit 1
  fi
}

# 检查Node.js是否安装
check_node() {
  if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}未找到Node.js，请先安装Node.js。${NC}"
    echo -e "${YELLOW}安装方法：${NC}"
    echo -e "  MacOS: brew install node"
    echo -e "  Ubuntu/Debian: sudo apt install nodejs"
    echo -e "  CentOS/RHEL: sudo yum install nodejs"
    exit 1
  fi
}

# 停止已运行的HAProxy进程
stop_haproxy() {
  local haproxy_pid=$(ps aux | grep 'haproxy -f' | grep -v grep | awk '{print $2}')
  if [ ! -z "$haproxy_pid" ]; then
    echo -e "${YELLOW}发现已运行的HAProxy进程，正在停止...${NC}"
    kill -TERM $haproxy_pid >/dev/null 2>&1
    sleep 2
  fi
}

# 使用Docker方式启动
start_with_docker() {
  echo -e "${GREEN}=== 使用Docker方式启动HAProxy ===${NC}"
  
  # 检查Docker是否安装
  if ! command -v docker >/dev/null 2>&1; then
    echo -e "${RED}未找到Docker，请先安装Docker。${NC}"
    echo -e "${YELLOW}或者选择手动安装方式。${NC}"
    return 1
  fi
  
  # 检查端口
  check_port
  
  # 构建Docker镜像
  echo -e "${GREEN}正在构建HAProxy Docker镜像...${NC}"
  if ! docker build -t haproxy-websocket-proxy .; then
    echo -e "${RED}构建镜像失败！${NC}"
    echo -e "${YELLOW}提示：如果遇到403 Forbidden错误，请修改Docker镜像源配置。${NC}"
    echo -e "${YELLOW}参考README.md中的Docker镜像源配置说明。${NC}"
    return 1
  fi
  
  echo -e "${GREEN}镜像构建成功！${NC}"
  
  # 检查是否已存在同名容器并停止
  EXISTING_CONTAINER=$(docker ps -a -q -f "name=haproxy-websocket")
  if [ ! -z "$EXISTING_CONTAINER" ]; then
    echo -e "${GREEN}停止并移除已存在的容器...${NC}"
    docker rm -f haproxy-websocket > /dev/null
  fi
  
  # 运行Docker容器
  echo -e "${GREEN}启动HAProxy容器...${NC}"
  if ! docker run -d --name haproxy-websocket -p 8081:8081 haproxy-websocket-proxy; then
    echo -e "${RED}启动容器失败！${NC}"
    return 1
  fi
  
  echo -e "${GREEN}容器已启动！${NC}"
  echo -e "${GREEN}HAProxy监听端口: 8081${NC}"
  echo -e "${GREEN}统计页面: http://localhost:8081/haproxy?stats (用户名:admin, 密码:admin)${NC}"
  
  # 等待HAProxy启动
  echo -e "${GREEN}等待HAProxy服务启动...${NC}"
  sleep 3
  
  return 0
}

# 使用手动方式启动
start_manually() {
  echo -e "${GREEN}=== 使用手动方式启动HAProxy ===${NC}"
  
  # 检查HAProxy是否安装
  if ! command -v haproxy >/dev/null 2>&1; then
    echo -e "${RED}未找到HAProxy，请先安装HAProxy。${NC}"
    echo -e "${YELLOW}安装方法：${NC}"
    echo -e "  MacOS: brew install haproxy"
    echo -e "  Ubuntu/Debian: sudo apt install haproxy"
    echo -e "  CentOS/RHEL: sudo yum install haproxy"
    return 1
  fi
  
  # 检查端口
  check_port
  
  # 停止已运行的HAProxy
  stop_haproxy
  
  # 启动HAProxy
  echo -e "${GREEN}启动HAProxy服务...${NC}"
  haproxy -f haproxy.cfg -d > haproxy.log 2>&1 &
  
  # 记录PID便于后续停止
  HAPROXY_PID=$!
  echo $HAPROXY_PID > haproxy.pid
  
  echo -e "${GREEN}HAProxy服务已启动！${NC}"
  echo -e "${GREEN}HAProxy监听端口: 8081${NC}"
  echo -e "${GREEN}统计页面: http://localhost:8081/haproxy?stats (用户名:admin, 密码:admin)${NC}"
  echo -e "${GREEN}日志文件: haproxy.log${NC}"
  
  # 等待HAProxy启动
  echo -e "${GREEN}等待HAProxy服务启动...${NC}"
  sleep 3
  
  return 0
}

# 测试WebSocket连接
test_websocket() {
  echo -e "${GREEN}=== 开始测试WebSocket代理连接 ===${NC}"
  
  # 检查Node.js
  check_node
  
  # 运行测试脚本
  node test-websocket.js
}

# 显示帮助信息
show_help() {
  echo "使用方法: $0 [选项]"
  echo "选项:"
  echo "  -d, --docker     使用Docker方式启动（默认）"
  echo "  -m, --manual     使用手动方式启动"
  echo "  -t, --test       仅运行测试（不启动服务）"
  echo "  -s, --stop       停止正在运行的HAProxy服务"
  echo "  -h, --help       显示帮助信息"
  echo ""
  echo "示例:"
  echo "  $0 --docker      # 使用Docker方式启动并测试"
  echo "  $0 --manual      # 使用手动方式启动并测试"
}

# 停止服务
stop_service() {
  echo -e "${GREEN}=== 停止HAProxy服务 ===${NC}"
  
  # 停止Docker容器
  EXISTING_CONTAINER=$(docker ps -a -q -f "name=haproxy-websocket")
  if [ ! -z "$EXISTING_CONTAINER" ]; then
    echo -e "${GREEN}停止并移除Docker容器...${NC}"
    docker rm -f haproxy-websocket > /dev/null
  fi
  
  # 停止手动启动的进程
  if [ -f haproxy.pid ]; then
    HAPROXY_PID=$(cat haproxy.pid)
    if ps -p $HAPROXY_PID >/dev/null 2>&1; then
      echo -e "${GREEN}停止手动启动的HAProxy进程...${NC}"
      kill -TERM $HAPROXY_PID >/dev/null 2>&1
    fi
    rm -f haproxy.pid
  fi
  
  # 确保所有HAProxy进程都已停止
  stop_haproxy
  
  echo -e "${GREEN}HAProxy服务已停止！${NC}"
}

# 主函数
main() {
  # 解析命令行参数
  case "$1" in
    -h|--help)
      show_help
      exit 0
      ;;
    -t|--test)
      test_websocket
      exit 0
      ;;
    -s|--stop)
      stop_service
      exit 0
      ;;
    -m|--manual)
      if start_manually; then
        test_websocket
        echo -e "\n${GREEN}测试完成！要停止HAProxy服务，请运行: $0 --stop${NC}"
      fi
      ;;
    -d|--docker|*) # 默认使用Docker
      if start_with_docker; then
        test_websocket
        echo -e "\n${GREEN}测试完成！要停止Docker容器，请运行: $0 --stop${NC}"
      fi
      ;;
  esac
}

# 运行主函数
main "$@"