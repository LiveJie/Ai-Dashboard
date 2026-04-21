# API 文档

## 概述

AI 原生开发仪表板提供 RESTful API 接口，用于管理 AI 模型、项目和监控使用情况。所有 API 响应都使用 JSON 格式。

## 基础信息

- **基础 URL**: `http://localhost:3001/api`
- **认证方式**: Bearer Token (JWT)
- **内容类型**: `application/json`
- **响应格式**: JSON

## 认证

大多数 API 端点需要认证。在请求头中包含 JWT token：

```
Authorization: Bearer <your-jwt-token>
```

## 响应格式

### 成功响应

```json
{
  "success": true,
  "data": {
    // 响应数据
  },
  "message": "操作成功"
}
```

### 错误响应

```json
{
  "success": false,
  "error": "错误类型",
  "message": "错误详情",
  "details": [] // 可选，错误详情数组
}
```

## API 端点

### AI 模型管理

#### 获取模型列表

```
GET /api/ai-models
```

**参数**:

- `page` (int): 页码，默认 1
- `limit` (int): 每页数量，默认 10
- `provider` (string): 过滤提供商
- `status` (string): 过滤状态

**响应**:

```json
{
  "models": [
    {
      "_id": "64f8a8b3c8f3b8f3b8f3b8f3",
      "name": "GPT-4",
      "modelId": "gpt-4",
      "provider": "OpenAI",
      "version": "1.0.0",
      "description": "强大的语言模型",
      "capabilities": ["text-generation", "analysis"],
      "parameters": {
        "maxTokens": 4096,
        "temperature": 0.7
      },
      "pricing": {
        "inputTokenPrice": 0.03,
        "outputTokenPrice": 0.06,
        "currency": "USD"
      },
      "status": "active",
      "usageStats": {
        "totalRequests": 1500,
        "totalTokens": 500000,
        "lastUsed": "2023-12-01T10:00:00Z"
      },
      "createdAt": "2023-12-01T10:00:00Z",
      "updatedAt": "2023-12-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

#### 获取模型详情

```
GET /api/ai-models/:id
```

**响应**: 单个模型的详细信息

#### 创建模型

```
POST /api/ai-models
```

**请求体**:

```json
{
  "name": "GPT-4",
  "modelId": "gpt-4",
  "provider": "OpenAI",
  "version": "1.0.0",
  "description": "强大的语言模型",
  "capabilities": ["text-generation", "analysis"],
  "parameters": {
    "maxTokens": 4096,
    "temperature": 0.7
  },
  "pricing": {
    "inputTokenPrice": 0.03,
    "outputTokenPrice": 0.06,
    "currency": "USD"
  },
  "status": "active"
}
```

#### 更新模型

```
PUT /api/ai-models/:id
```

**请求体**: 与创建类似，所有字段都是可选的

#### 删除模型

```
DELETE /api/ai-models/:id
```

### 项目管理

#### 获取项目列表

```
GET /api/projects
```

**参数**:

- `page` (int): 页码，默认 1
- `limit` (int): 每页数量，默认 10
- `status` (string): 过滤状态
- `priority` (string): 过滤优先级

**响应**:

```json
{
  "projects": [
    {
      "_id": "64f8a8b3c8f3b8f3b8f3b8f4",
      "name": "智能客服系统",
      "description": "基于 AI 的智能客服解决方案",
      "status": "development",
      "priority": "high",
      "aiModels": [
        {
          "_id": "64f8a8b3c8f3b8f3b8f3b8f3",
          "name": "GPT-4",
          "modelId": "gpt-4",
          "provider": "OpenAI",
          "status": "active"
        }
      ],
      "teamMembers": [
        {
          "userId": "64f8a8b3c8f3b8f3b8f3b8f5",
          "role": "owner"
        }
      ],
      "metrics": {
        "accuracy": 0.95,
        "performance": 0.88,
        "cost": 1250.5,
        "developmentTime": 45
      },
      "createdAt": "2023-12-01T10:00:00Z",
      "updatedAt": "2023-12-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "pages": 2
  }
}
```

#### 获取项目详情

```
GET /api/projects/:id
```

#### 创建项目

```
POST /api/projects
```

**请求体**:

```json
{
  "name": "智能客服系统",
  "description": "基于 AI 的智能客服解决方案",
  "status": "development",
  "priority": "high",
  "aiModels": ["64f8a8b3c8f3b8f3b8f3b8f3"],
  "metrics": {
    "accuracy": 0.95,
    "performance": 0.88,
    "cost": 1250.5,
    "developmentTime": 45
  }
}
```

#### 更新项目

```
PUT /api/projects/:id
```

#### 删除项目

```
DELETE /api/projects/:id
```

### 使用统计

#### 获取使用日志

```
GET /api/usage
```

**参数**:

- `projectId` (string): 项目 ID 过滤
- `aiModelId` (string): AI 模型 ID 过滤
- `startDate` (string): 开始日期 (ISO 8601)
- `endDate` (string): 结束日期 (ISO 8601)
- `page` (int): 页码，默认 1
- `limit` (int): 每页数量，默认 50

**响应**:

```json
{
  "logs": [
    {
      "_id": "64f8a8b3c8f3b8f3b8f3b8f6",
      "projectId": "64f8a8b3c8f3b8f3b8f3b8f4",
      "aiModelId": "64f8a8b3c8f3b8f3b8f3b8f3",
      "requestType": "text-generation",
      "inputTokens": 150,
      "outputTokens": 300,
      "responseTime": 1200,
      "cost": 0.015,
      "success": true,
      "timestamp": "2023-12-01T10:00:00Z",
      "userId": "64f8a8b3c8f3b8f3b8f3b8f5"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1000,
    "pages": 20
  }
}
```

#### 获取使用统计

```
GET /api/usage/stats
```

**参数**: 与获取使用日志相同

**响应**:

```json
{
  "overall": {
    "totalRequests": 1000,
    "totalInputTokens": 50000,
    "totalOutputTokens": 75000,
    "totalCost": 150.0,
    "averageResponseTime": 1200,
    "successRate": 0.98
  },
  "requestTypes": [
    {
      "_id": "text-generation",
      "count": 800,
      "totalCost": 120.0
    },
    {
      "_id": "analysis",
      "count": 200,
      "totalCost": 30.0
    }
  ],
  "dailyStats": [
    {
      "_id": {
        "year": 2023,
        "month": 12,
        "day": 1
      },
      "count": 50,
      "totalCost": 7.5
    }
  ]
}
```

#### 创建使用日志

```
POST /api/usage
```

**请求体**:

```json
{
  "projectId": "64f8a8b3c8f3b8f3b8f3b8f4",
  "aiModelId": "64f8a8b3c8f3b8f3b8f3b8f3",
  "requestType": "text-generation",
  "inputTokens": 150,
  "outputTokens": 300,
  "responseTime": 1200,
  "cost": 0.015,
  "success": true,
  "userId": "64f8a8b3c8f3b8f3b8f3b8f5"
}
```

### 数据分析

#### 获取概览数据

```
GET /api/analytics/overview
```

**参数**:

- `days` (int): 统计天数，默认 30

**响应**:

```json
{
  "models": {
    "total": 25,
    "active": 20
  },
  "projects": {
    "total": 15
  },
  "recent": {
    "totalRequests": 1000,
    "totalCost": 150.0,
    "averageResponseTime": 1200,
    "successRate": 0.98
  },
  "recentUsage": [
    {
      "_id": "64f8a8b3c8f3b8f3b8f3b8f6",
      "model": {
        "name": "GPT-4",
        "modelId": "gpt-4",
        "provider": "OpenAI"
      },
      "timestamp": "2023-12-01T10:00:00Z",
      "cost": 0.015
    }
  ]
}
```

#### 获取模型性能分析

```
GET /api/analytics/model-performance
```

**参数**:

- `days` (int): 统计天数，默认 30

**响应**:

```json
[
  {
    "_id": "GPT-4",
    "modelId": "gpt-4",
    "provider": "OpenAI",
    "totalRequests": 800,
    "totalInputTokens": 40000,
    "totalOutputTokens": 60000,
    "totalCost": 120.0,
    "averageResponseTime": 1100,
    "successRate": 0.98
  }
]
```

#### 获取成本趋势

```
GET /api/analytics/cost-trends
```

**参数**:

- `days` (int): 统计天数，默认 30

**响应**:

```json
[
  {
    "_id": {
      "date": "2023-12-01"
    },
    "dailyCost": 5.0,
    "dailyRequests": 50,
    "dailyTokens": 10000
  }
]
```

#### 获取请求类型分布

```
GET /api/analytics/request-types
```

**参数**:

- `days` (int): 统计天数，默认 30

**响应**:

```json
[
  {
    "_id": "text-generation",
    "count": 800,
    "totalCost": 120.0
  },
  {
    "_id": "analysis",
    "count": 200,
    "totalCost": 30.0
  }
]
```

#### 获取项目指标

```
GET /api/analytics/project-metrics
```

**响应**:

```json
[
  {
    "_id": "64f8a8b3c8f3b8f3b8f3b8f4",
    "name": "智能客服系统",
    "status": "development",
    "usageCount": 100,
    "totalCost": 1250.5,
    "averageResponseTime": 1150,
    "successRate": 0.96
  }
]
```

### 系统端点

#### 健康检查

```
GET /api/health
```

**响应**:

```json
{
  "status": "OK",
  "timestamp": "2023-12-01T10:00:00Z",
  "uptime": 3600,
  "environment": "development"
}
```

## 错误代码

| 代码 | 描述       |
| ---- | ---------- |
| 200  | 成功       |
| 400  | 请求错误   |
| 401  | 未授权     |
| 403  | 禁止访问   |
| 404  | 未找到     |
| 429  | 请求过多   |
| 500  | 服务器错误 |

## 速率限制

- 默认限制: 每分钟 100 个请求
- 超出限制时返回 429 状态码
- 响应头包含 `X-RateLimit-Limit` 和 `X-RateLimit-Remaining`

## 数据模型

### AI 模型

```typescript
interface AIModel {
  _id: string
  name: string
  modelId: string
  provider: 'OpenAI' | 'Anthropic' | 'Google' | 'Meta' | 'Custom'
  version: string
  description?: string
  capabilities: string[]
  parameters: {
    maxTokens?: number
    temperature?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number
  }
  pricing: {
    inputTokenPrice: number
    outputTokenPrice: number
    currency: string
  }
  status: 'active' | 'inactive' | 'deprecated'
  usageStats: {
    totalRequests: number
    totalTokens: number
    lastUsed: Date
  }
  createdAt: Date
  updatedAt: Date
}
```

### 项目

```typescript
interface Project {
  _id: string
  name: string
  description?: string
  status: 'planning' | 'development' | 'testing' | 'deployment' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  aiModels: mongoose.Types.ObjectId[]
  teamMembers: Array<{
    userId: mongoose.Types.ObjectId
    role: 'owner' | 'developer' | 'reviewer' | 'viewer'
  }>
  metrics: {
    accuracy?: number
    performance?: number
    cost?: number
    developmentTime?: number
  }
  createdAt: Date
  updatedAt: Date
}
```

### 使用日志

```typescript
interface UsageLog {
  _id: string
  projectId: mongoose.Types.ObjectId
  aiModelId: mongoose.Types.ObjectId
  requestType:
    | 'text-generation'
    | 'image-generation'
    | 'code-generation'
    | 'analysis'
    | 'translation'
    | 'summarization'
  inputTokens: number
  outputTokens: number
  responseTime: number
  cost: number
  success: boolean
  errorMessage?: string
  timestamp: Date
  userId?: mongoose.Types.ObjectId
}
```

## WebSocket 支持

实时数据更新通过 WebSocket 提供：

```
ws://localhost:3001
```

事件类型：

- `model:updated` - 模型更新
- `project:updated` - 项目更新
- `usage:created` - 新的使用记录
- `stats:updated` - 统计数据更新
