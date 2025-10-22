# TinyBuddy SDK Next.js 应用示例

这个项目展示了如何使用 TinyBuddy SDK 和 Next.js 构建一个完整的儿童教育互动助手服务。

## 功能说明

基于 Next.js 的现代化前端界面
- 实时聊天交互功能
- 集成 TinyBuddy SDK 处理用户输入
- 友好的初始化状态显示和错误处理

## 使用步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 开发模式运行

```bash
npm run dev
```

### 3. 构建生产版本

```bash
npm run build
```

### 4. 启动生产服务器

```bash
npm start
```

## 项目结构

- `app/`: Next.js 应用目录
  - `page.tsx`: 聊天界面和 SDK 集成逻辑
  - `layout.tsx`: 应用根布局
  - `globals.css`: 全局样式
- `tsconfig.json`: TypeScript 配置
- `package.json`: 项目配置和依赖管理
- `.gitignore`: Git 忽略文件配置
- `next-env.d.ts`: Next.js TypeScript 类型定义

## 主要流程

1. 应用启动时自动初始化 `TinyBuddySDK` 实例
2. 显示初始化状态和欢迎消息
3. 用户在聊天界面输入问题
4. 调用 SDK 的 `processUserInput()` 方法处理输入
5. 显示 TinyBuddy 的响应

## 注意事项

- 确保正确配置 `.env` 文件以连接到所需的服务
- 首次运行可能需要一定时间进行 SDK 初始化
- 默认使用 `demo_child` 儿童 ID，可根据需要在代码中修改
- 开发模式下支持热重载，适合进行界面和功能调试
- 生产构建会优化性能，适合部署到服务器