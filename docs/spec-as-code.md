# Spec as Code 工作流程指南

## 📋 概述

本项目采用 **Spec as Code** (规范即代码) 的架构设计，通过 `spec/` 目录定义系统规范，自动生成完整的前后端代码。这种架构确保了系统设计的一致性，并大大提高了开发效率。

## 🏗️ 架构设计

```
ai-native-dashboard/
├── spec/                          # 🎯 规范定义 (核心)
│   ├── config/                   # 系统配置
│   │   └── system.json           # 系统级配置
│   ├── schemas/                  # 数据模型规范
│   │   ├── ai-model.schema.json  # AI模型规范
│   │   ├── project.schema.json   # 项目规范
│   │   └── usage-log.schema.json # 使用日志规范
│   ├── types/                    # 类型定义
│   │   ├── api.types.ts          # API类型
│   │   └── frontend.types.ts     # 前端类型
│   ├── routes/                   # 路由规范
│   │   ├── api.routes.json       # API路由
│   │   └── frontend.routes.json  # 前端路由
│   ├── generators/               # 代码生成器
│   │   ├── backend/              # 后端生成器
│   │   └── frontend/             # 前端生成器
│   └── templates/                # 代码模板
│       ├── backend/              # 后端模板
│       └── frontend/             # 前端模板
├── backend/                       # 🚀 生成的后端代码
├── frontend/                      # 🎨 生成的前端代码
└── generate.js                    # 🛠️ 代码生成脚本
```

## 🎯 核心概念

### 1. 规范驱动 (Spec-Driven)
- 所有系统功能都通过规范文件定义
- 代码生成器读取规范并生成对应代码
- 确保前后端一致性

### 2. 模板化生成 (Template-Based)
- 使用预定义的代码模板
- 根据规范自动填充模板变量
- 支持自定义模板扩展

### 3. 类型安全 (Type-Safe)
- JSON Schema 定义数据结构
- TypeScript 类型定义
- 自动生成验证逻辑

## 📝 规范文件详解

### 系统配置 (`spec/config/system.json`)

定义整个系统的基础配置：

```json
{
  "name": "AI Native Development Dashboard",
  "version": "1.0.0",
  "framework": {
    "backend": {
      "runtime": "Node.js",
      "framework": "Express.js",
      "orm": "Mongoose"
    },
    "frontend": {
      "runtime": "React",
      "ui": "Ant Design",
      "charts": ["ECharts"]
    }
  }
}
```

### 数据模型规范 (`spec/schemas/`)

使用 JSON Schema 定义数据结构：

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AI Model Schema",
  "type": "object",
  "required": ["name", "modelId", "provider", "version"],
  "properties": {
    "name": {
      "type": "string",
      "description": "模型名称",
      "minLength": 1,
      "maxLength": 100
    },
    "provider": {
      "type": "string",
      "enum": ["OpenAI", "Anthropic", "Google", "Meta"]
    }
  }
}
```

### API 路由规范 (`spec/routes/api.routes.json`)

定义 RESTful API 接口：

```json
{
  "path": "/api/ai-models",
  "method": "GET",
  "description": "获取AI模型列表",
  "parameters": [
    {
      "name": "page",
      "in": "query",
      "type": "integer",
      "default": 1
    }
  ]
}
```

### 前端路由规范 (`spec/routes/frontend.routes.json`)

定义前端页面路由：

```json
{
  "path": "/ai-models",
  "component": "AIModelsPage",
  "title": "AI模型管理",
  "icon": "ApiOutlined",
  "meta": {
    "requireAuth": true,
    "permission": "write"
  }
}
```

## 🛠️ 代码生成流程

### 1. 运行代码生成器

```bash
# 生成完整项目
node generate.js

# 或者直接运行
npm run generate
```

### 2. 生成过程

代码生成器会执行以下步骤：

1. **读取规范文件**
   - 解析系统配置
   - 加载数据模型规范
   - 读取路由配置

2. **生成后端代码**
   - Mongoose 数据模型
   - Express 控制器
   - API 路由
   - 验证中间件

3. **生成前端代码**
   - React 页面组件
   - API 服务层
   - TypeScript 类型定义
   - 路由配置

4. **生成项目文件**
   - package.json
   - README.md
   - 配置文件

### 3. 生成的文件结构

```
backend/
├── src/
│   ├── models/
│   │   ├── ai-model.js          # AI模型数据模型
│   │   ├── project.js          # 项目数据模型
│   │   └── usage-log.js        # 使用日志数据模型
│   ├── controllers/
│   │   ├── ai-model.js         # AI模型控制器
│   │   ├── project.js          # 项目控制器
│   │   └── usage-log.js        # 使用日志控制器
│   ├── routes/
│   │   ├── ai-model.js         # AI模型路由
│   │   ├── project.js          # 项目路由
│   │   ├── usage-log.js        # 使用日志路由
│   │   └── index.js           # 路由聚合
│   ├── middleware/
│   │   ├── validation.js       # 验证中间件
│   │   └── index.js           # 中间件聚合
│   └── index.js               # 应用入口
└── package.json

frontend/
├── src/
│   ├── pages/
│   │   ├── ai-models.js       # AI模型管理页面
│   │   ├── projects.js        # 项目管理页面
│   │   ├── analytics.js       # 数据分析页面
│   │   └── dashboard.js       # 仪表板页面
│   ├── services/
│   │   ├── ai-models-service.js # AI模型API服务
│   │   ├── projects-service.js  # 项目API服务
│   │   └── analytics-service.js # 分析API服务
│   ├── types/
│   │   ├── ai-models-types.ts # AI模型类型定义
│   │   ├── projects-types.ts  # 项目类型定义
│   │   └── analytics-types.ts # 分析类型定义
│   └── App.js                 # 应用入口
└── package.json
```

## 🔧 扩展和定制

### 1. 添加新的数据模型

1. 在 `spec/schemas/` 创建新的 schema 文件
2. 在 `spec/routes/api.routes.json` 添加对应的 API 路由
3. 在 `spec/routes/frontend.routes.json` 添加前端路由
4. 运行 `node generate.js` 生成代码

### 2. 自定义代码模板

修改 `spec/templates/` 目录下的模板文件：

- **后端模板**: `spec/templates/backend/`
- **前端模板**: `spec/templates/frontend/`

模板变量：
- `{{MODEL_NAME}}` - 模型名称（大驼峰）
- `{{MODEL_LOWER}}` - 模型名称（小驼峰）
- `{{SCHEMA_PROPERTIES}}` - Schema 属性定义
- `{{SCHEMA_METHODS}}` - Schema 方法定义

### 3. 添加新的功能模块

1. 在 `spec/config/system.json` 中添加功能配置
2. 创建对应的 schema 文件
3. 定义 API 和前端路由
4. 生成代码并实现业务逻辑

## 📊 优势特点

### 1. 一致性保证
- 前后端数据结构一致
- API 接口规范统一
- 类型安全验证

### 2. 开发效率
- 减少重复编码
- 自动生成 CRUD 操作
- 快速原型开发

### 3. 可维护性
- 规范文件集中管理
- 代码生成可复用
- 易于扩展和修改

### 4. 团队协作
- 统一的开发标准
- 清晰的接口定义
- 减少沟通成本

## 🚀 最佳实践

### 1. 规范设计原则
- 保持 schema 简单明了
- 使用有意义的字段名
- 定义合理的验证规则

### 2. 代码生成策略
- 定期运行生成器
- 版本控制规范文件
- 备份重要模板

### 3. 项目维护
- 定期更新依赖
- 检查生成的代码质量
- 优化模板性能

## 🆘 故障排除

### 常见问题

1. **生成失败**
   - 检查 JSON 文件格式
   - 确认路径配置正确
   - 查看错误日志

2. **代码不完整**
   - 确认所有规范文件存在
   - 检查模板文件完整性
   - 验证生成器权限

3. **类型错误**
   - 检查 TypeScript 类型定义
   - 确认类型映射正确
   - 验证接口一致性

### 调试技巧

1. **启用详细日志**
   ```bash
   DEBUG=spec-code-generator* node generate.js
   ```

2. **逐步生成**
   ```bash
   # 只生成后端
   node generate.js backend-only
   
   # 只生成前端
   node generate.js frontend-only
   ```

3. **验证生成结果**
   ```bash
   # 检查生成的文件
   find backend -name "*.js" | head -10
   find frontend -name "*.js" | head -10
   ```

## 📈 未来规划

1. **增强功能**
   - 支持 GraphQL 生成
   - 添加数据库迁移
   - 集成测试生成

2. **工具改进**
   - 可视化规范编辑器
   - 实时预览功能
   - 代码质量检查

3. **生态扩展**
   - 支持更多框架
   - 插件系统
   - 云端生成服务

---

**Spec as Code** 让系统设计变得简单、一致且可维护。通过规范定义驱动代码生成，您可以专注于业务逻辑，而将繁琐的代码编写工作交给自动化工具。