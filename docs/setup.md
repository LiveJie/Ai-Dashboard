# 安装和设置指南

## 系统要求

### 开发环境
- Node.js 16.0 或更高版本
- MongoDB 4.4 或更高版本
- npm 8.0 或更高版本

### 生产环境
- Node.js 16.0+ (推荐使用 LTS 版本)
- MongoDB 4.4+ (推荐使用副本集)
- Nginx 或其他反向代理
- PM2 或其他进程管理器

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd ai-native-dashboard
```

### 2. 安装依赖

```bash
# 安装所有依赖（包括前后端）
npm run install:all

# 或者分别安装
npm install
cd backend && npm install
cd frontend && npm install
```

### 3. 配置环境变量

#### 后端配置 (`backend/.env`)

```env
# 服务器配置
PORT=3001
NODE_ENV=development

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/ai-native-dashboard

# 跨域配置
FRONTEND_URL=http://localhost:3000

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d

# 其他配置
API_RATE_LIMIT=100
API_RATE_WINDOW=900000
```

#### 前端配置 (`frontend/.env`)

```env
# API 配置
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_ENV=development

# 应用配置
REACT_APP_APP_NAME=AI Native Dashboard
REACT_APP_VERSION=1.0.0
```

### 4. 启动 MongoDB

```bash
# 使用默认配置启动
mongod

# 或者指定配置文件
mongod --config /path/to/mongod.conf
```

### 5. 启动开发服务器

```bash
# 同时启动前后端
npm run dev

# 或者分别启动
npm run dev:backend  # 后端端口: 3001
npm run dev:frontend # 前端端口: 3000
```

### 6. 访问应用

- 前端应用: http://localhost:3000
- 后端 API: http://localhost:3001
- API 文档: http://localhost:3001/api-docs

## 生产环境部署

### 1. 构建项目

```bash
# 构建整个项目
npm run build

# 分别构建
npm run build:backend
npm run build:frontend
```

### 2. 配置生产环境

#### 后端配置

```env
# backend/.env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://your-production-db/ai-native-dashboard
FRONTEND_URL=https://your-domain.com
JWT_SECRET=your-production-secret-key
```

#### 前端配置

```env
# frontend/.env
REACT_APP_API_URL=https://your-api-domain.com/api
REACT_APP_ENV=production
```

### 3. 使用 PM2 部署后端

```bash
# 安装 PM2
npm install -g pm2

# 启动后端服务
cd backend
pm2 start src/index.js --name "ai-dashboard-api"

# 保存 PM2 配置
pm2 save
pm2 startup
```

### 4. 部署前端

```bash
# 构建前端
cd frontend
npm run build

# 使用 Nginx 部署
# 将 build 目录内容复制到 Nginx 网站目录
```

### 5. Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # 前端静态文件
    location / {
        root /path/to/frontend/build;
        try_files $uri $uri/ /index.html;
    }
    
    # 后端 API 代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 数据库设置

### MongoDB 初始化

```bash
# 连接到 MongoDB
mongosh

# 创建数据库
use ai-native-dashboard

# 创建索引
db.ai_models.createIndex({ modelId: 1 }, { unique: true })
db.usage_logs.createIndex({ projectId: 1, timestamp: -1 })
db.usage_logs.createIndex({ aiModelId: 1, timestamp: -1 })
db.usage_logs.createIndex({ timestamp: -1 })
```

### 数据备份

```bash
# 备份数据库
mongodump --db ai-native-dashboard --out /backup/ai-dashboard-$(date +%Y%m%d)

# 恢复数据库
mongorestore --db ai-native-dashboard /backup/ai-dashboard-20231201/ai-native-dashboard
```

## 监控和日志

### 应用监控

```bash
# PM2 监控
pm2 monit

# 查看日志
pm2 logs ai-dashboard-api

# 重启应用
pm2 restart ai-dashboard-api
```

### 日志配置

后端使用 Winston 日志库，配置在 `backend/src/config/logger.js`:

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

## 安全配置

### 1. 环境变量安全

- 确保生产环境的 `JWT_SECRET` 足够复杂
- 不要在代码中硬编码敏感信息
- 定期轮换密钥

### 2. 数据库安全

- 使用强密码
- 启用 MongoDB 认证
- 配置防火墙规则
- 定期备份数据

### 3. API 安全

- 启用速率限制
- 使用 HTTPS
- 配置 CORS 策略
- 输入验证和清理

## 故障排除

### 常见问题

1. **MongoDB 连接失败**
   ```bash
   # 检查 MongoDB 服务状态
   systemctl status mongod
   
   # 检查连接字符串
   echo $MONGODB_URI
   ```

2. **前端构建失败**
   ```bash
   # 清除缓存
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **API 跨域问题**
   ```bash
   # 检查后端 CORS 配置
   # 确保前端 URL 在允许列表中
   ```

### 调试模式

```bash
# 启用调试模式
export DEBUG=ai-dashboard:*

# 查看详细日志
pm2 logs ai-dashboard-api --lines 100
```

## 性能优化

### 1. 数据库优化

- 创建适当的索引
- 定期清理过期数据
- 使用 MongoDB 聚合优化查询

### 2. 前端优化

- 代码分割和懒加载
- 图片优化
- 缓存策略

### 3. 后端优化

- 连接池配置
- 压缩响应
- 静态文件缓存

## 更新和维护

### 1. 更新依赖

```bash
# 更新根依赖
npm update

# 更新后端依赖
cd backend && npm update

# 更新前端依赖
cd frontend && npm update
```

### 2. 安全更新

```bash
# 检查安全漏洞
npm audit

# 自动修复
npm audit fix
```

### 3. 数据库迁移

```bash
# 创建迁移脚本
# 在 backend/src/migrations/ 目录下创建迁移文件

# 运行迁移
node src/migrate.js
```

## 支持

如果遇到问题，请：

1. 查看 [故障排除](#故障排除) 部分
2. 检查 [日志文件](#监控和日志)
3. 查看 [API 文档](http://localhost:3001/api-docs)
4. 创建 Issue 报告问题