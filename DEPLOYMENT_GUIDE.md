# TinyBuddy应用部署指南

## 问题分析

当您在云服务器上访问前端时看到"Index of /"页面，这通常意味着：

1. **未构建项目** - Next.js应用需要先构建才能在生产环境中运行
2. **使用了错误的启动命令** - 直接访问文件系统而不是使用Next.js的生产服务器
3. **Web服务器配置问题** - 如果使用Nginx等代理服务器，可能配置不正确

## 前端部署步骤

### 1. 确保依赖安装

```bash
# 进入前端目录
cd /path/to/tiny_buddy_agent/frontend

# 安装依赖
npm install
```

### 2. 构建生产版本

这一步会生成优化后的静态文件和服务器端代码：

```bash
# 构建项目
npm run build
```

构建完成后，会在前端目录中生成`.next`文件夹，包含所有构建好的文件。

### 3. 启动生产服务器

构建完成后，使用以下命令启动Next.js生产服务器：

```bash
# 启动生产服务器
npm run start
```

默认情况下，生产服务器会在端口3000上运行。

### 4. 配置环境变量（可选）

如果需要自定义端口或其他配置，可以设置环境变量：

```bash
# 设置自定义端口
PORT=8080 npm run start

# 或创建.env文件
# .env
PORT=8080
```

## 使用Nginx作为反向代理（推荐）

在生产环境中，建议使用Nginx作为反向代理来处理HTTPS、负载均衡等。

### 基本Nginx配置

创建或编辑Nginx配置文件（如`/etc/nginx/sites-available/tinybuddy`）：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置并重启Nginx：

```bash
# 创建符号链接
ln -s /etc/nginx/sites-available/tinybuddy /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重启Nginx
systemctl restart nginx
```

## 后端部署步骤

### 1. 安装依赖

```bash
# 进入项目根目录
cd /path/to/tiny_buddy_agent

# 安装依赖
npm install
```

### 2. 构建后端

```bash
# 构建TypeScript代码
npx tsc
```

### 3. 启动后端服务

```bash
# 直接启动（开发环境）
npm run dev

# 或使用PM2等进程管理器（生产环境推荐）
npm install -g pm2
pm run build
pm run start
# 或
pm run build
pm run start
```

## 常见问题排查

1. **"Index of /"页面仍然显示**：
   - 确保已经运行了`npm run build`
   - 确保使用`npm run start`而不是`npm run dev`来启动生产服务器
   - 检查服务器上是否存在`.next`目录

2. **WebSocket连接问题**：
   - 确保后端WebSocket服务在端口3143上运行
   - 在Nginx配置中添加WebSocket支持（上面的配置已包含）
   - 检查防火墙设置，确保端口3143已开放

3. **环境变量问题**：
   - 创建`.env`文件来设置必要的环境变量
   - 确保API和WebSocket端点配置正确

## 注意事项

- 在生产环境中，建议使用PM2、SystemD等工具来管理Node.js进程
- 确保定期更新依赖以获取安全修复
- 考虑使用HTTPS证书（如Let's Encrypt）来加密通信
- 对于大规模部署，考虑使用Docker容器化应用