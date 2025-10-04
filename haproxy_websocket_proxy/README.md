# HAProxy WebSocket代理测试指南

本指南将帮助您安装和配置HAProxy，以测试WebSocket代理功能。

## 目录结构

- `haproxy.cfg`: HAProxy配置文件
- `haproxy-test.js`: 专门测试HAProxy代理的脚本
- `test-websocket.js`: 通用WebSocket测试脚本（用于Node.js代理）
- `node-proxy.js`: Node.js WebSocket代理服务器（用于本地测试）
- `mock-server.js`: 模拟WebSocket后端服务器（用于本地测试）
- `start_test_env.sh`: 测试环境管理脚本
- `README.md`: 本指南

## 安装HAProxy

### macOS

使用Homebrew安装HAProxy：

```bash
# 安装Homebrew（如果尚未安装）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装HAProxy
brew install haproxy
```

### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install haproxy
```

### CentOS/RHEL

```bash
sudo yum install haproxy
```

## 配置HAProxy

使用提供的`haproxy.cfg`配置文件：

1. 确认配置文件路径：`/Users/harold/webdev/tmp-test/tiny_buddy_agent/haproxy_websocket_proxy/haproxy.cfg`
2. 配置文件主要设置：
   - 监听8081端口
   - 代理WebSocket连接到 `wss://stg.tinybuddy.dev/hardware`
   - 提供统计页面 `/haproxy?stats` (用户名:admin, 密码:admin)

## 启动HAProxy

使用以下命令启动HAProxy服务：

```bash
# 使用指定的配置文件启动HAProxy
haproxy -f /Users/harold/webdev/tmp-test/tiny_buddy_agent/haproxy_websocket_proxy/haproxy.cfg
```

## 测试WebSocket代理功能

### 检查HAProxy是否正常运行

```bash
# 检查8081端口是否被监听
lsof -i :8081

# 访问统计页面（在浏览器中打开）
# http://localhost:8081/haproxy?stats
# 用户名: admin
# 密码: admin
```

### 运行WebSocket测试

使用提供的测试脚本测试HAProxy代理功能：

```bash
# 确保已安装依赖
npm install ws

# 运行HAProxy测试
sudo ./start_test_env.sh --haproxy-test
```

## 本地测试环境（无需真实HAProxy）

如果您不想安装HAProxy，可以使用我们提供的Node.js代理和模拟服务器进行本地测试：

```bash
# 完整测试（启动模拟服务器、代理服务器并运行测试）
./start_test_env.sh --full

# 只启动测试环境
./start_test_env.sh --start

# 只运行测试
./start_test_env.sh --test

# 停止测试环境
./start_test_env.sh --stop
```

## 测试说明

1. 测试脚本会发送包含以下认证数据的JSON对象：
   ```json
   {
     "authToken": "9b4f328f-c427-424c-a549-09674f41af28",
     "deviceId": "94a99031b91c",
     "version": "1.7.7"
   }
   ```

2. 成功的测试结果应该接收到后端服务器返回的包含`success: true`的响应。

## 常见问题排查

1. **连接拒绝错误**
   - 确认HAProxy服务正在运行
   - 检查8081端口是否被其他程序占用
   - 验证配置文件中的后端服务器地址是否正确

2. **SSL/TLS错误**
   - 配置文件中已设置`ssl verify none`以跳过SSL验证
   - 如果需要，可以调整相关SSL配置参数

3. **连接关闭代码1006**
   - 通常表示连接意外关闭
   - 检查网络连接和防火墙设置
   - 验证后端服务器是否可访问

## 注意事项

- 生产环境中应使用更安全的配置，包括：
  - 适当的SSL证书验证
  - 更强的访问控制
  - 调整超时和连接限制参数
  - 配置日志和监控

- 测试脚本设置了10秒后自动关闭连接，您可以根据需要调整这个时间。