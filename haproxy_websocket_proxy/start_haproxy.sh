#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

# 配置文件路径
CONFIG_FILE="/Users/harold/webdev/tmp-test/tiny_buddy_agent/haproxy_websocket_proxy/haproxy_fixed.cfg"
# 当前环境的实际配置文件位置

# 检查HAProxy是否安装
check_haproxy_installed() {
    if ! command -v haproxy &> /dev/null; then
        echo -e "${RED}错误：未安装HAProxy！${NC}"
        echo -e "${YELLOW}请先安装HAProxy：sudo apt-get install haproxy${NC}"
        return 1
    fi
    return 0
}

# 检查配置文件是否存在
check_config_file() {
    if [ ! -f "$CONFIG_FILE" ]; then
        echo -e "${RED}错误：配置文件 $CONFIG_FILE 不存在！${NC}"
        echo -e "${YELLOW}请先创建配置文件，您可以使用提供的haproxy_fixed.cfg${NC}"
        return 1
    fi
    return 0
}

# 检查配置文件语法
check_config_syntax() {
    echo -e "${BLUE}检查HAProxy配置文件语法...${NC}"
    haproxy -c -f "$CONFIG_FILE"
    if [ $? -ne 0 ]; then
        echo -e "${RED}配置文件语法错误，请检查并修复！${NC}"
        return 1
    fi
    echo -e "${GREEN}配置文件语法检查通过！${NC}"
    return 0
}

# 检查端口占用
check_port() {
    local port=$1
    echo -e "${BLUE}检查端口 $port 占用情况...${NC}"
    if lsof -i :$port >/dev/null 2>&1; then
        echo -e "${YELLOW}警告：端口 $port 已被占用！${NC}"
        lsof -i :$port
        echo -e "${YELLOW}按Enter键杀死占用该端口的进程，或按Ctrl+C取消${NC}"
        read -r
        sudo kill -9 $(lsof -t -i :$port)
        sleep 1
    fi
    return 0
}

# 停止现有HAProxy进程
stop_haproxy() {
    echo -e "${BLUE}停止现有HAProxy进程...${NC}"
    sudo systemctl stop haproxy.service >/dev/null 2>&1
    pkill -f haproxy >/dev/null 2>&1
    sleep 2
    return 0
}

# 启动HAProxy服务
start_haproxy_service() {
    echo -e "${BLUE}启动HAProxy服务...${NC}"
    sudo systemctl start haproxy.service
    if [ $? -ne 0 ]; then
        echo -e "${RED}HAProxy服务启动失败！${NC}"
        echo -e "${YELLOW}尝试使用调试模式启动...${NC}"
        echo -e "${YELLOW}sudo haproxy -d -f $CONFIG_FILE${NC}"
        return 1
    fi
    return 0
}

# 检查HAProxy状态
check_haproxy_status() {
    echo -e "${BLUE}检查HAProxy状态...${NC}"
    sudo systemctl status haproxy.service --no-pager
    return 0
}

# 显示使用帮助
show_help() {
    echo -e "${GREEN}HAProxy启动脚本使用帮助${NC}"
    echo -e "${BLUE}用法: $0 [选项]${NC}"
    echo -e "选项:"
    echo -e "  --start     启动HAProxy服务"
    echo -e "  --stop      停止HAProxy服务"
    echo -e "  --restart   重启HAProxy服务"
    echo -e "  --status    查看HAProxy状态"
    echo -e "  --check     检查配置文件语法"
    echo -e "  --debug     以调试模式启动HAProxy（前台运行）"
    echo -e "  --help      显示此帮助信息"
    return 0
}

# 以调试模式启动HAProxy
start_haproxy_debug() {
    echo -e "${BLUE}以调试模式启动HAProxy...${NC}"
    echo -e "${YELLOW}按Ctrl+C停止调试模式${NC}"
    sudo haproxy -d -f "$CONFIG_FILE"
    return 0
}

# 主函数
main() {
    # 如果没有提供参数，显示帮助
    if [ $# -eq 0 ]; then
        show_help
        return 0
    fi

    # 解析命令行参数
    case "$1" in
        --start)
            check_haproxy_installed && \
            check_config_file && \
            check_config_syntax && \
            check_port 8081 && \
            stop_haproxy && \
            start_haproxy_service && \
            check_haproxy_status
            ;;
        --stop)
            stop_haproxy
            ;;
        --restart)
            check_haproxy_installed && \
            check_config_file && \
            check_config_syntax && \
            check_port 8081 && \
            stop_haproxy && \
            start_haproxy_service && \
            check_haproxy_status
            ;;
        --status)
            check_haproxy_status
            ;;
        --check)
            check_haproxy_installed && \
            check_config_file && \
            check_config_syntax
            ;;
        --debug)
            check_haproxy_installed && \
            check_config_file && \
            check_config_syntax && \
            check_port 8081 && \
            stop_haproxy && \
            start_haproxy_debug
            ;;
        --help)
            show_help
            ;;
        *)
            echo -e "${RED}未知选项: $1${NC}"
            show_help
            return 1
            ;;
    esac

    return 0
}

# 调用主函数
main "$@"