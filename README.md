<div align="center">
  <h1>🐻 TinyBuddy 儿童智能陪伴助手</h1>
  <p>专为儿童设计的智能陪伴与教育AI助手</p>
  
  <p>
    <a href="https://github.com/TinyBuddy/tiny_buddy_agent"><img src="https://img.shields.io/badge/GitHub-TinyBuddy-blue" alt="GitHub Repository" /></a>
    <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="Node Version" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/typescript-%5E5.0-blue" alt="TypeScript" /></a>
  </p>
</div>

## 📚 项目介绍

TinyBuddy是一款专为儿童设计的智能陪伴助手，旨在提供安全、有趣且富有教育意义的互动体验。通过先进的AI技术，TinyBuddy能够根据儿童的年龄、兴趣和学习进度，提供个性化的陪伴和教育内容。

## 🚀 快速开始

### 前提条件

- Node.js 20+ 
- Git
- OpenAI API Key（可选，可稍后配置）
  - 在[OpenAI平台](https://platform.openai.com/api-keys)获取您的API密钥

### 安装

```bash
# 克隆仓库
git clone https://github.com/TinyBuddy/tiny_buddy_agent.git
cd tiny_buddy_agent

# 安装依赖
npm install

# 复制环境变量文件
cp .env.example .env
```

### 配置

编辑`.env`文件添加您的API密钥：

```env
OPENAI_API_KEY=your-api-key-here
```

### 运行应用

```bash
# 开发模式
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm start
```

## 🎯 核心功能

- **个性化交互**：基于儿童的年龄、兴趣和学习进度提供定制化回应
- **儿童档案管理**：存储和管理儿童的基本信息、兴趣爱好和学习记录
- **对话历史记录**：保存和回顾与儿童的对话内容
- **学习进度跟踪**：记录和分析儿童在各知识点上的学习进展
- **双Agent架构**：使用规划Agent和执行Agent协同工作，提供更智能的回应
- **命令行交互界面**：简单易用的终端交互方式

## 🛠️ 项目架构

TinyBuddy采用模块化的架构设计，包含以下主要组件：

- **应用核心**：`TinyBuddyApp`类管理整个应用的生命周期和服务
- **Actor系统**：包括规划Agent和执行Agent，负责处理用户输入和生成响应
- **记忆服务**：管理儿童档案、对话历史和学习进度
- **知识库服务**：存储和检索教育内容和互动素材

## 📁 项目结构

```
tiny_buddy_agent/
├── src/                      # 源代码目录
│   ├── actors/               # AI智能体实现
│   │   ├── baseActor.ts      # 基础智能体类
│   │   ├── executionAgent.ts # 执行智能体
│   │   └── planningAgent.ts  # 规划智能体
│   ├── app.ts                # 应用核心类
│   ├── factories/            # 智能体工厂
│   │   ├── actorManager.ts         # 智能体管理器
│   │   ├── baseActorFactory.ts     # 基础智能体工厂
│   │   ├── executionAgentFactory.ts # 执行智能体工厂
│   │   └── planningAgentFactory.ts  # 规划智能体工厂
│   ├── index.ts              # 应用入口文件
│   ├── models/               # 数据模型
│   │   ├── childProfile.ts   # 儿童档案模型
│   │   ├── content.ts        # 内容模型
│   │   └── message.ts        # 消息模型
│   ├── services/             # 服务层
│   │   ├── inMemoryKnowledgeBaseService.ts # 内存知识库服务
│   │   ├── knowledgeBaseService.ts  # 知识库服务接口
│   │   └── memoryService.ts  # 记忆服务
│   ├── tools/                # 工具集合
│   │   ├── index.ts          # 工具导出
│   │   └── weather.ts        # 天气工具示例
│   └── workflows/            # 工作流定义
│       └── index.ts          # 工作流导出
├── .env                      # 环境变量配置
├── .gitignore                # Git忽略文件配置
├── Dockerfile                # Docker部署配置
├── package.json              # 项目依赖配置
└── tsconfig.json             # TypeScript配置
```

## 💬 使用指南

启动应用后，您可以通过命令行界面与TinyBuddy进行交互：

```bash
# 启动应用
npm run dev

# 应用启动后，可以直接在命令行中输入内容与TinyBuddy交流
你: 你好，TinyBuddy！
TinyBuddy正在思考...
TinyBuddy: 你好呀，小朋友！今天过得怎么样？

# 特殊命令
你: clear    # 清空对话历史
你: exit     # 退出程序
```

## 🐳 Docker部署

可以使用Docker来容器化部署TinyBuddy：

```bash
# 构建Docker镜像
docker build -t tiny_buddy_agent .

# 运行Docker容器
docker run -p 3141:3141 --env-file .env tiny_buddy_agent
```

## 🧪 开发指南

### 可用脚本

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm start` - 运行生产版本

### 扩展功能

TinyBuddy的模块化设计使其易于扩展。您可以：

1. **添加新工具**：在`src/tools/`目录下创建新的工具模块
2. **扩展智能体能力**：修改`src/actors/`目录下的智能体实现
3. **增强数据模型**：更新`src/models/`目录下的数据结构

## 🔒 安全考虑

TinyBuddy专为儿童设计，我们特别注重以下安全方面：

- 不收集或存储敏感个人信息
- 所有数据默认存储在本地内存中
- 提供适合儿童的内容过滤机制
- 简单易用的家长控制选项

## 🤝 贡献指南

我们欢迎社区贡献！如果您有任何想法或改进，请：

1. Fork项目仓库
2. 创建您的功能分支
3. 提交您的更改
4. 推送到您的分支
5. 提交Pull Request

## 📄 许可证

本项目采用MIT许可证 - 详见LICENSE文件获取详细信息

## 📧 联系我们

如有任何问题或建议，请随时联系我们：

- GitHub Issues: [提交问题](https://github.com/TinyBuddy/tiny_buddy_agent/issues)

---

<div align="center">
  <p>用❤️打造的儿童智能陪伴助手</p>
</div>