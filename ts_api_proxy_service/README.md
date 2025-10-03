# TypeScript API代理服务器

这是一个用TypeScript编写的API代理服务器，专门用于代理访问`https://stg.tinybuddy.dev`的API，并避免返回302重定向响应。

## 特性

- 支持代理访问`https://stg.tinybuddy.dev`下的所有API路径（动态URL支持）
- 自动处理并跟随302重定向，返回最终内容而非重定向响应
- 保留原始请求的重要头信息
- 支持所有HTTP方法（GET, POST, PUT, PATCH, DELETE等）
- 提供详细的请求和错误日志
- 使用TypeScript确保类型安全

## 环境要求

- Node.js 14.x或更高版本
- npm 6.x或更高版本

## 安装

1. 克隆或下载此项目

2. 安装依赖：

```bash
cd ts_api_proxy_service
npm install
```

## 使用方法

### 开发模式

在开发模式下运行（使用nodemon自动重启）：

```bash
npm run dev
```

### 生产模式

1. 首先构建项目：

```bash
npm run build
```

2. 然后运行构建后的应用：

```bash
npm start
```

服务器将在端口3000上启动，您可以通过环境变量`PORT`来自定义端口。

## API使用格式

代理服务器提供以下端点：

- `GET http://localhost:3000/` - 查看服务信息
- `ALL http://localhost:3000/api/proxy/{target-path}` - 代理请求到目标服务器

### 示例

要代理访问`https://stg.tinybuddy.dev/api/devices/94a99031b91c/check-upgrade`，您可以发送请求到：

```
http://localhost:3000/api/proxy/api/devices/94a99031b91c/check-upgrade
```

## 环境变量

- `PORT` - 服务器监听端口（默认：3000）

## 项目结构

```
ts_api_proxy_service/
├── src/
│   └── index.ts       # 主入口文件
├── dist/              # 编译后的JavaScript文件
├── package.json       # 项目配置和依赖
├── tsconfig.json      # TypeScript配置
└── README.md          # 项目说明文档
```

## 注意事项

1. 此代理服务器仅用于开发和测试目的
2. 对于生产环境，请确保添加适当的身份验证和授权机制
3. 大量请求可能会导致目标服务器限制访问，请合理使用
4. 服务器会自动处理302重定向，始终返回最终内容而非重定向响应

## 常见问题

**Q: 为什么我收到了500错误？**
A: 请检查服务器日志以获取详细错误信息。常见原因包括目标服务器不可用、网络问题或请求格式不正确。

**Q: 如何自定义代理的目标服务器？**
A: 您需要修改`index.ts`文件中的`targetUrl`构建逻辑。

**Q: 代理服务器是否支持HTTPS？**
A: 默认情况下，代理服务器以HTTP方式运行。要启用HTTPS，您需要在`index.ts`中配置SSL证书。

## License

MIT