# Nginx文件服务器

这是一个基于Nginx的简单文件服务器配置，提供文件上传和下载功能。这个文件服务器使用独立目录，不会影响现有代码。

## 目录结构

```
file_server/
├── nginx.conf       # Nginx配置文件
├── index.html       # 文件上传下载页面
└── README.md        # 使用说明文档
```

## 功能特点

- 现代化的文件上传下载界面
- 支持拖放文件上传
- 文件预览和图标显示
- 上传进度显示
- 响应式设计，适配移动设备
- 简洁美观的UI设计

## 配置说明

### Nginx配置

`nginx.conf`文件包含了基本的Nginx配置，设置了：

- 监听端口：8080
- 根目录：`/usr/share/nginx/html`（Docker环境下）
- 最大上传文件大小：500MB
- 自动索引功能，显示目录内容

## 部署方法

### 使用Docker部署（推荐）

使用Docker可以避免在本地安装Nginx，同时提供隔离的运行环境。

1. 确保已安装Docker

2. 运行以下命令启动文件服务器：

```bash
# 导航到file_server目录
cd /path/to/tiny_buddy_agent/file_server

# 启动Nginx容器
# 将当前目录挂载到容器的/usr/share/nginx/html，将配置文件挂载到/etc/nginx/nginx.conf
# -d 表示后台运行
# -p 8080:8080 映射容器端口8080到主机端口8080
docker run -d --name nginx-file-server \
  -p 8080:8080 \
  -v $(pwd):/usr/share/nginx/html \
  -v $(pwd)/nginx.conf:/etc/nginx/nginx.conf \
  nginx:latest
```

3. 访问 `http://localhost:8080` 即可使用文件服务器

### 本地Nginx部署（可选）

如果您已经在本地安装了Nginx，可以直接使用提供的配置文件：

1. 安装Nginx（如果尚未安装）：

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx

# macOS（使用Homebrew）
brew install nginx
```

2. 复制配置文件到Nginx配置目录：

```bash
# Linux
sudo cp nginx.conf /etc/nginx/nginx.conf

# macOS（Homebrew）
cp nginx.conf /usr/local/etc/nginx/nginx.conf
```

3. 复制文件到Nginx根目录：

```bash
# Linux
sudo cp index.html /usr/share/nginx/html/

# macOS（Homebrew）
cp index.html /usr/local/var/www/
```

4. 启动或重启Nginx服务：

```bash
# Ubuntu/Debian
sudo systemctl restart nginx

# CentOS/RHEL
sudo systemctl restart nginx

# macOS（Homebrew）
brew services restart nginx
```

## 使用说明

1. 访问文件服务器页面：`http://localhost:8080`

2. **上传文件**：
   - 点击"浏览文件"按钮选择文件，或直接将文件拖放到上传区域
   - 选择文件后，会显示文件预览列表
   - 点击"开始上传"按钮上传文件
   - 上传过程中会显示进度条

3. **下载文件**：
   - 在文件列表中找到需要下载的文件
   - 点击文件右侧的"下载"按钮开始下载

## 注意事项

1. 此配置为基础版本，适用于开发和测试环境

2. 在生产环境中，建议：
   - 添加访问控制（用户名密码认证）
   - 配置SSL/TLS加密
   - 优化安全设置
   - 调整上传文件大小限制

3. 上传功能在浏览器中是模拟实现的，如果需要真实的文件上传功能，需要配合后端服务（如PHP、Node.js等）

4. 文件存储在您挂载的目录中，请确保有足够的磁盘空间

## 自定义选项

### 修改监听端口

编辑`nginx.conf`文件，更改`listen`指令后的端口号：

```nginx
server {
    listen       8080;  # 更改为您想要的端口号
    ...
}
```

### 修改最大上传文件大小

编辑`nginx.conf`文件，更改`client_max_body_size`指令的值：

```nginx
# 增加或减小文件大小限制
client_max_body_size 500M;  # 可以改为1G、200M等
```

### 修改根目录

编辑`nginx.conf`文件，更改`root`指令的值：

```nginx
server {
    ...
    root /path/to/your/directory;  # 更改为您想要的目录路径
    ...
}
```

## HTTP和WebSocket代理配置

配置文件中已经添加了支持HTTP和WebSocket的代理功能，默认代理路径为`/proxy`，指向`http://localhost:8081`。

### 代理配置说明

```nginx
# HTTP和WebSocket代理配置
location /proxy {
    # 代理到目标服务器地址
    # 请根据实际情况修改目标服务器地址
    proxy_pass http://localhost:8081;
    
    # 必须配置以下参数以支持WebSocket
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # 代理超时设置
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
    proxy_connect_timeout 60s;
}
```

### 修改代理目标服务器

如果您需要更改代理目标服务器，请编辑`nginx.conf`文件中的`proxy_pass`指令：

```nginx
# 将代理目标更改为您实际的服务器地址
proxy_pass http://your-server-address:port;
```

### 更改代理路径

如果您需要更改代理路径（默认为`/proxy`），请修改`location`指令：

```nginx
# 将代理路径从/proxy更改为您想要的路径
location /your-custom-path {
    # 其余配置保持不变
    ...
}
```

## 测试WebSocket代理

我们提供了一个简单的WebSocket测试服务器，用于验证代理配置是否正常工作：

1. 确保已安装Node.js

2. 安装依赖：

```bash
# 在file_server目录下
cd /path/to/tiny_buddy_agent/file_server
npm init -y
npm install ws
```

3. 启动测试服务器：

```bash
node websocket_test_server.js
```

4. 启动Nginx容器（如果尚未启动）：

```bash
docker run -d --name nginx-file-server \
  -p 8080:8080 \
  -v $(pwd):/usr/share/nginx/html \
  -v $(pwd)/nginx.conf:/etc/nginx/nginx.conf \
  nginx:latest
```

5. 使用浏览器或WebSocket客户端测试代理连接：

- HTTP代理测试：访问 `http://localhost:8080/proxy`
- WebSocket代理测试：使用WebSocket客户端连接 `ws://localhost:8080/proxy`

## 代理功能的用途

这个代理配置可以用于以下场景：

- 将静态文件服务与API服务分离
- 实现WebSocket实时通信应用
- 负载均衡（配合upstream配置）
- 解决跨域问题
- 提供统一的访问入口

## 故障排除

1. **无法访问文件服务器**
   - 检查Nginx服务是否正在运行
   - 检查防火墙设置，确保端口已开放
   - 检查Docker容器是否正在运行（使用`docker ps`命令）

2. **上传文件失败**
   - 检查文件大小是否超过了配置的限制
   - 检查磁盘空间是否足够
   - 检查文件权限设置

3. **下载文件失败**
   - 检查文件是否存在
   - 检查文件权限设置

## 停止Docker容器

当您不再需要文件服务器时，可以使用以下命令停止Docker容器：

```bash
docker stop nginx-file-server
```

如果您想完全删除容器：

```bash
docker rm nginx-file-server
```

---

希望这个文件服务器配置能满足您的需求！如有任何问题或改进建议，请随时提出。