const fs = require('fs')
const path = require('path')
const ModelGenerator = require('./backend/model-generator')
const ComponentGenerator = require('./frontend/component-generator')
const SqlGenerator = require('./backend/sql-generator')

class SpecCodeGenerator {
  constructor(specPath, outputPath, options = {}) {
    this.specPath = specPath
    this.outputPath = outputPath
    this.options = {
      force: options.force || false,
      target: options.target || null, // 比如 'frontend', 'backend', 'frontend/dashboard'
      ...options,
    }
    this.stats = { created: 0, overwritten: 0, skipped: 0 }

    // 初始化生成器时传入 options 让他们知道是否要跳过文件
    this.modelGenerator = new ModelGenerator(
      specPath,
      path.join(outputPath, 'backend'),
      {},
      this.options,
    )
    this.componentGenerator = new ComponentGenerator(
      specPath,
      path.join(outputPath, 'frontend'),
      this.options,
    )
    this.sqlGenerator = new SqlGenerator(
      specPath,
      path.join(outputPath, 'backend', 'sql'),
      this.options,
    )
  }

  async generate() {
    try {
      console.log('开始生成代码...')

      // 读取系统配置
      const systemConfig = this.loadJsonFile(path.join(this.specPath, 'config', 'system.json'))

      // 读取 OpenAPI 3.0 规范
      const openapi = this.loadJsonFile(path.join(this.specPath, 'openapi.json'))

      // 重新初始化生成器，传入配置
      this.modelGenerator = new ModelGenerator(
        this.specPath,
        path.join(this.outputPath, 'backend'),
        systemConfig,
        this.options,
      )

      // 共享 stats
      this.modelGenerator.stats = this.stats
      this.componentGenerator.stats = this.stats
      this.sqlGenerator.stats = this.stats

      // 从 OpenAPI 规范中提取 schemas
      const schemas = this.extractSchemasFromOpenApi(openapi)

      // 从 OpenAPI 规范中提取路由
      const apiRoutes = this.extractApiRoutesFromOpenApi(openapi)
      const frontendRoutes = this.extractFrontendRoutesFromOpenApi(openapi)

      // 生成后端代码
      await this.generateBackend(schemas, apiRoutes, systemConfig)

      // 生成前端代码
      await this.generateFrontend(schemas, frontendRoutes)

      // 生成主入口文件
      await this.generateMainFiles(systemConfig)

      console.log('代码生成完成！')
      return this.stats
    } catch (error) {
      console.error('代码生成失败:', error)
      throw error
    }
  }

  extractSchemasFromOpenApi(openapi) {
    const schemas = {}
    const componentsSchemas = openapi.components?.schemas || {}

    // 过滤掉分页响应等辅助 schema，只保留核心模型
    for (const [name, schema] of Object.entries(componentsSchemas)) {
      if (!name.startsWith('Paginated') && !name.endsWith('Response') && !name.endsWith('Input')) {
        // 转换名称为 kebab-case 以匹配现有逻辑 (e.g. AIModel -> ai-model)
        const kebabName = name
          .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
          .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
          .toLowerCase()
        schemas[kebabName] = schema
      }
    }
    return schemas
  }

  extractApiRoutesFromOpenApi(openapi) {
    const apiRoutes = {
      base: openapi.servers?.[0]?.url || '/api',
      routes: [],
    }

    for (const [path, methods] of Object.entries(openapi.paths)) {
      // 转换为 Express 格式的路径 (e.g. /users/{id} -> /users/:id)
      const expressPath = path.replace(/\{(\w+)\}/g, ':$1')

      for (const [method, detail] of Object.entries(methods)) {
        if (method.startsWith('x-')) continue // 跳过扩展属性

        apiRoutes.routes.push({
          path: expressPath,
          method: method.toUpperCase(),
          description: detail.summary || detail.description,
          tags: detail.tags || [],
        })
      }
    }
    return apiRoutes
  }

  extractFrontendRoutesFromOpenApi(openapi) {
    const frontendRoutes = {
      routes: [],
    }

    for (const [path, methods] of Object.entries(openapi.paths)) {
      // 检查是否有 GET 方法包含 x-metadata
      if (methods.get && methods.get['x-metadata']) {
        const metadata = methods.get['x-metadata']
        let uiPath = metadata.route || path
        if (uiPath === '/usage') uiPath = '/'
        if (uiPath.startsWith('/analytics')) uiPath = '/analytics'

        frontendRoutes.routes.push({
          path: uiPath,
          component: metadata.component,
          title: metadata.title,
          icon: metadata.icon,
          meta: methods.get.security ? { requireAuth: true } : {},
        })
      }
    }

    frontendRoutes.routes = frontendRoutes.routes
      .filter((r, idx, arr) => arr.findIndex((x) => x.path === r.path) === idx)
      .sort((a, b) => (a.path === '/' ? -1 : b.path === '/' ? 1 : 0))

    return frontendRoutes
  }

  loadJsonFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      return JSON.parse(content)
    } catch (error) {
      console.error(`读取文件失败: ${filePath}`, error)
      return {}
    }
  }

  async generateBackend(schemas, apiRoutes, systemConfig) {
    console.log('生成后端代码...')

    // 生成模型文件
    for (const [schemaName, schema] of Object.entries(schemas)) {
      console.log(`生成模型: ${schemaName}`)
      const files = this.modelGenerator.generateModel(schemaName, schema)
      console.log('生成的后端文件:', files)
      this.modelGenerator.writeFiles(Object.values(files))
    }

    // 生成路由聚合文件
    await this.generateBackendRoutes(apiRoutes, schemas)

    // 生成数据库配置
    await this.generateBackendDbConfig()

    // 如果是 MySQL，生成初始化 SQL
    if (systemConfig.framework?.backend?.database === 'MySQL') {
      this.sqlGenerator.generateInitSql(schemas, systemConfig)
    }

    // 生成环境变量示例
    await this.generateBackendEnv(systemConfig)

    // 生成工具类
    await this.generateBackendUtils()

    // 生成通用中间件
    await this.generateBackendMiddleware()

    // 生成示例数据脚本
    await this.generateBackendSeed(systemConfig)

    // 生成主应用文件
    await this.generateBackendApp(systemConfig)
  }

  async generateBackendSeed(systemConfig) {
    const isSequelize = systemConfig.framework?.backend?.orm === 'Sequelize'
    if (!isSequelize) return

    const seedContent = `\nconst { sequelize } = require('../config/db');\nconst AiModel = require('../models/ai-model');\nconst Project = require('../models/project');\nconst UsageLog = require('../models/usage-log');\n\nconst rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;\nconst pick = (arr) => arr[rand(0, arr.length - 1)];\n\nconst seed = async () => {\n  await sequelize.authenticate();\n\n  const modelCount = await AiModel.count();\n  const projectCount = await Project.count();\n  const usageCount = await UsageLog.count();\n\n  if (modelCount > 0 && projectCount > 0 && usageCount > 0) {\n    return { seeded: false };\n  }\n\n  const models = await AiModel.bulkCreate([\n    {\n      name: 'GPT-4o',\n      modelId: 'gpt-4o',\n      provider: 'OpenAI',\n      version: '2025-01',\n      description: '通用多模态模型',\n      status: 'active',\n      pricing: { inputTokenPrice: 0.005, outputTokenPrice: 0.015, currency: 'USD' }\n    },\n    {\n      name: 'Claude 3.5',\n      modelId: 'claude-3.5',\n      provider: 'Anthropic',\n      version: '2025-01',\n      description: '高质量文本生成',\n      status: 'active',\n      pricing: { inputTokenPrice: 0.004, outputTokenPrice: 0.012, currency: 'USD' }\n    },\n    {\n      name: 'Gemini',\n      modelId: 'gemini-1.5',\n      provider: 'Google',\n      version: '2025-01',\n      description: '快速与低成本',\n      status: 'beta',\n      pricing: { inputTokenPrice: 0.002, outputTokenPrice: 0.006, currency: 'USD' }\n    }\n  ]);\n\n  const projects = await Project.bulkCreate([\n    { name: 'AI Copilot', description: '研发助手', status: 'development', priority: 'high' },\n    { name: 'Chat Analytics', description: '对话数据分析', status: 'testing', priority: 'medium' },\n    { name: 'Prompt Lab', description: '提示词实验平台', status: 'planning', priority: 'medium' }\n  ]);\n\n  const requestTypes = ['text-generation', 'analysis', 'summarization', 'translation', 'code-generation'];\n\n  const now = Date.now();\n  const logs = [];\n  for (let i = 0; i < 220; i++) {\n    const daysAgo = rand(0, 29);\n    const ts = new Date(now - daysAgo * 24 * 60 * 60 * 1000 - rand(0, 6) * 60 * 60 * 1000);\n\n    const inputTokens = rand(50, 2200);\n    const outputTokens = rand(30, 1800);\n    const responseTime = rand(120, 1800);\n    const cost = Number(((inputTokens * 0.000002) + (outputTokens * 0.000006)).toFixed(4));\n\n    logs.push({\n      projectId: String(pick(projects).id),\n      aiModelId: String(pick(models).id),\n      requestType: pick(requestTypes),\n      inputTokens,\n      outputTokens,\n      responseTime,\n      cost,\n      success: Math.random() > 0.06,\n      errorMessage: null,\n      timestamp: ts\n    });\n  }\n\n  await UsageLog.bulkCreate(logs);\n\n  return { seeded: true };\n};\n\nmodule.exports = seed;\n`

    const outputPath = path.join(this.outputPath, 'backend', 'src', 'seed', 'seed.js')
    this.ensureDirectoryExists(outputPath)
    fs.writeFileSync(outputPath, seedContent)
    console.log(`生成后端示例数据脚本: ${outputPath}`)
  }

  async generateBackendDbConfig() {
    const dbContent = this.modelGenerator.templates.db
    const outputPath = path.join(this.outputPath, 'backend', 'src', 'config', 'db.js')
    this.ensureDirectoryExists(outputPath)
    fs.writeFileSync(outputPath, dbContent)
    console.log(`生成后端数据库配置: ${outputPath}`)
  }

  async generateBackendEnv(systemConfig) {
    const isSequelize = systemConfig.framework?.backend?.orm === 'Sequelize'
    let envContent = `PORT=3010
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here
`
    if (isSequelize) {
      envContent += `DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=ai_dashboard
AUTO_SEED=true
`
    } else {
      envContent += `MONGODB_URI=mongodb://localhost:27017/ai_dashboard
`
    }

    const envPath = path.join(this.outputPath, 'backend', '.env')
    this.ensureDirectoryExists(envPath)
    if (!fs.existsSync(envPath)) {
      fs.writeFileSync(envPath, envContent)
      console.log(`生成后端环境变量文件: ${envPath}`)
    } else {
      console.log(`跳过生成后端环境变量文件 (已存在): ${envPath}`)
    }

    const envExamplePath = path.join(this.outputPath, 'backend', '.env.example')
    fs.writeFileSync(envExamplePath, envContent)
    console.log(`生成后端环境变量示例文件: ${envExamplePath}`)
  }

  async generateBackendMiddleware() {
    const validationContent = `
const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

module.exports = validate;
`
    const outputPath = path.join(this.outputPath, 'backend', 'src', 'middleware', 'validation.js')
    this.ensureDirectoryExists(outputPath)
    fs.writeFileSync(outputPath, validationContent)
    console.log(`生成后端中间件: ${outputPath}`)
  }

  async generateBackendUtils() {
    const asyncHandlerContent = `
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
`
    const outputPath = path.join(this.outputPath, 'backend', 'src', 'utils', 'asyncHandler.js')
    this.ensureDirectoryExists(outputPath)
    fs.writeFileSync(outputPath, asyncHandlerContent)
    console.log(`生成后端工具类: ${outputPath}`)
  }

  async generateFrontend(schemas, frontendRoutes) {
    console.log('生成前端代码...')

    // 生成页面组件
    for (const route of frontendRoutes.routes) {
      const { schemaName, schema } = this.findSchemaForRoute(route, schemas)
      if (schema) {
        console.log(`生成页面: ${route.component} (Schema: ${schemaName})`)
        const files = this.componentGenerator.generatePage(route, schema, schemaName)
        this.componentGenerator.writeFiles(Object.values(files))
      }
    }

    // 生成路由配置
    await this.generateFrontendRoutes(frontendRoutes)

    // 生成 API 基础配置
    await this.generateFrontendApi()

    // 生成 Auth Hook
    await this.generateFrontendAuth()

    // 生成 MUI Theme 与布局
    await this.generateFrontendUi(frontendRoutes)

    // 生成主应用文件
    await this.generateFrontendApp()
  }

  async generateFrontendApi() {
    const apiContent = `import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = \`Bearer \${token}\`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const { response } = error;
    if (response) {
      console.error('API Error:', response.status, response.data);
    } else {
      console.error('Network Error:', error);
    }
    return Promise.reject(error);
  }
);

export default api;
`

    const outputPath = path.join(this.outputPath, 'frontend', 'src', 'services', 'api.js')
    this.ensureDirectoryExists(outputPath)
    fs.writeFileSync(outputPath, apiContent)
    console.log(`生成前端 API 文件: ${outputPath}`)
  }

  async generateFrontendAuth() {
    const authContent = `import { useState, useEffect, createContext, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟检查本地 token
    const token = localStorage.getItem('token');
    if (token) {
      setUser({ name: 'Admin', role: 'admin' });
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    // 模拟登录
    localStorage.setItem('token', 'fake-jwt-token');
    setUser({ name: 'Admin', role: 'admin' });
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
`

    const outputPath = path.join(this.outputPath, 'frontend', 'src', 'hooks', 'useAuth.jsx')
    this.ensureDirectoryExists(outputPath)
    fs.writeFileSync(outputPath, authContent)
    console.log(`生成前端 Auth Hook: ${outputPath}`)
  }

  async generateFrontendUi(frontendRoutes) {
    const routes = frontendRoutes.routes || []
    const uniqueIcons = Array.from(
      new Set(routes.map((r) => r.icon).filter((x) => typeof x === 'string' && x.length > 0)),
    )

    const iconsImport = uniqueIcons.length
      ? `import {\n  ${uniqueIcons.join(',\n  ')}\n} from '@mui/icons-material';\n`
      : ``

    const themeContent = `import { createTheme } from '@mui/material/styles';\n\nconst theme = createTheme({\n  palette: {\n    mode: 'light',\n    background: {\n      default: '#F8FAFC',\n      paper: '#FFFFFF'\n    },\n    primary: {\n      main: '#6366F1'\n    },\n    text: {\n      primary: '#111827',\n      secondary: '#6B7280'\n    },\n    divider: '#E5E7EB'\n  },\n  shape: {\n    borderRadius: 12\n  },\n  typography: {\n    fontFamily: [\n      'Inter',\n      '-apple-system',\n      'BlinkMacSystemFont',\n      'Segoe UI',\n      'Roboto',\n      'Helvetica',\n      'Arial',\n      'sans-serif'\n    ].join(',')\n  },\n  components: {\n    MuiCard: {\n      styleOverrides: {\n        root: {\n          borderRadius: 16\n        }\n      }\n    },\n    MuiButton: {\n      styleOverrides: {\n        root: {\n          textTransform: 'none',\n          borderRadius: 12\n        }\n      }\n    }\n  }\n});\n\nexport default theme;\n`

    const themePath = path.join(this.outputPath, 'frontend', 'src', 'theme', 'index.js')
    this.ensureDirectoryExists(themePath)
    fs.writeFileSync(themePath, themeContent)
    console.log(`生成前端 Theme 文件: ${themePath}`)

    const drawerWidth = 280
    const navItemsLiteral = routes
      .map((r) => `{ path: '${r.path}', title: '${r.title}', icon: '${r.icon || ''}' }`)
      .join(',\n  ')

    const layoutContent = `import React, { useMemo, useState } from 'react';\nimport { NavLink, useLocation } from 'react-router-dom';\nimport {\n  AppBar,\n  Box,\n  CssBaseline,\n  Divider,\n  Drawer,\n  IconButton,\n  List,\n  ListItemButton,\n  ListItemIcon,\n  ListItemText,\n  Toolbar,\n  Typography\n} from '@mui/material';\nimport MenuIcon from '@mui/icons-material/Menu';\n${iconsImport}\n\nconst drawerWidth = ${drawerWidth};\n\nconst navItems = [\n  ${navItemsLiteral}\n];\n\nconst iconMap = {\n${uniqueIcons.map((name) => `  ${name}: ${name}`).join(',\n')}\n};\n\nconst NavItem = ({ item }) => {\n  const Icon = iconMap[item.icon];\n  return (\n    <ListItemButton\n      component={NavLink}\n      to={item.path}\n      sx={{\n        borderRadius: 2,\n        mx: 1,\n        my: 0.5,\n        '&.active': {\n          bgcolor: 'rgba(99, 102, 241, 0.10)',\n          color: 'primary.main'\n        }\n      }}\n    >\n      <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>{Icon ? <Icon /> : null}</ListItemIcon>\n      <ListItemText primary={item.title} primaryTypographyProps={{ fontWeight: 600 }} />\n    </ListItemButton>\n  );\n};\n\nconst MainLayout = ({ children }) => {\n  const [mobileOpen, setMobileOpen] = useState(false);\n  const location = useLocation();\n\n  const title = useMemo(() => {\n    const match = navItems.find((i) => i.path === location.pathname);\n    return match?.title || 'Dashboard';\n  }, [location.pathname]);\n\n  const drawer = (\n    <Box sx={{ height: '100%', bgcolor: '#111827', color: '#E5E7EB' }}>\n      <Toolbar sx={{ px: 3, minHeight: 72 }}>\n        <Typography variant=\"h6\" sx={{ fontWeight: 800, letterSpacing: 0.5 }}>\n          AI Dashboard\n        </Typography>\n      </Toolbar>\n      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />\n      <List sx={{ mt: 1 }}>\n        {navItems.map((item) => (\n          <NavItem key={item.path} item={item} />\n        ))}\n      </List>\n    </Box>\n  );\n\n  return (\n    <Box sx={{ display: 'flex' }}>\n      <CssBaseline />\n      <AppBar\n        position=\"fixed\"\n        elevation={0}\n        sx={{\n          width: { sm: 'calc(100% - ' + drawerWidth + 'px)' },\n          ml: { sm: drawerWidth + 'px' },\n          bgcolor: 'background.paper',\n          color: 'text.primary',\n          borderBottom: '1px solid',\n          borderColor: 'divider'\n        }}\n      >\n        <Toolbar sx={{ minHeight: 72 }}>\n          <IconButton\n            color=\"inherit\"\n            edge=\"start\"\n            onClick={() => setMobileOpen(!mobileOpen)}\n            sx={{ mr: 2, display: { sm: 'none' } }}\n          >\n            <MenuIcon />\n          </IconButton>\n          <Typography variant=\"h6\" sx={{ fontWeight: 800 }}>\n            {title}\n          </Typography>\n        </Toolbar>\n      </AppBar>\n\n      <Box component=\"nav\" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>\n        <Drawer\n          variant=\"temporary\"\n          open={mobileOpen}\n          onClose={() => setMobileOpen(!mobileOpen)}\n          ModalProps={{ keepMounted: true }}\n          sx={{\n            display: { xs: 'block', sm: 'none' },\n            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }\n          }}\n        >\n          {drawer}\n        </Drawer>\n        <Drawer\n          variant=\"permanent\"\n          sx={{\n            display: { xs: 'none', sm: 'block' },\n            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 0 }\n          }}\n          open\n        >\n          {drawer}\n        </Drawer>\n      </Box>\n\n      <Box\n        component=\"main\"\n        sx={{\n          flexGrow: 1,\n          width: { sm: 'calc(100% - ' + drawerWidth + 'px)' },\n          bgcolor: 'background.default',\n          minHeight: '100vh',\n          px: { xs: 2, sm: 4 },\n          py: 4\n        }}\n      >\n        <Toolbar sx={{ minHeight: 72 }} />\n        {children}\n      </Box>\n    </Box>\n  );\n};\n\nexport default MainLayout;\n`

    const layoutPath = path.join(this.outputPath, 'frontend', 'src', 'layout', 'MainLayout.jsx')
    this.ensureDirectoryExists(layoutPath)
    fs.writeFileSync(layoutPath, layoutContent)
    console.log(`生成前端布局文件: ${layoutPath}`)
  }

  findSchemaForRoute(route, schemas) {
    const component = route.component.toLowerCase()
    const schemaNames = Object.keys(schemas)

    // 精确匹配逻辑
    if (component.includes('aimodel'))
      return { schemaName: 'ai-model', schema: schemas['ai-model'] }
    if (component.includes('project')) return { schemaName: 'project', schema: schemas['project'] }
    if (
      component.includes('analytics') ||
      component.includes('usage') ||
      component.includes('dashboard')
    ) {
      return { schemaName: 'usage-log', schema: schemas['usage-log'] }
    }

    // 模糊匹配逻辑
    for (const schemaName of schemaNames) {
      if (schemaName.toLowerCase().replace(/-/g, '').includes(component)) {
        return { schemaName, schema: schemas[schemaName] }
      }
    }

    // 默认返回第一个
    const firstSchemaName = schemaNames[0]
    return { schemaName: firstSchemaName, schema: schemas[firstSchemaName] }
  }

  async generateBackendRoutes(apiRoutes, schemas) {
    // 按路径分组路由
    const routeGroups = {}
    apiRoutes.routes.forEach((route) => {
      if (!routeGroups[route.path]) {
        routeGroups[route.path] = []
      }
      routeGroups[route.path].push(route)
    })

    // 获取所有生成的模型文件名
    const schemaNames = Object.keys(schemas) // [ai-model, project, usage-log]

    const routesContent = `
const express = require('express');
const router = express.Router();

// 导入所有路由（排除健康检查）
${Object.keys(routeGroups)
  .filter((routePath) => routePath !== '/health')
  .map((routePath) => {
    // 寻找匹配的 schema
    let fileName = ''
    const cleanPath = routePath.replace('/api/', '').replace(/^\//, '').toLowerCase()

    // 1. 尝试完全匹配
    if (schemaNames.includes(cleanPath)) {
      fileName = cleanPath
    } else if (schemaNames.includes(cleanPath.replace(/s$/, ''))) {
      // 2. 尝试单数匹配 (ai-models -> ai-model)
      fileName = cleanPath.replace(/s$/, '')
    } else if (cleanPath.startsWith('analytics') || cleanPath.startsWith('usage')) {
      // 3. 特殊处理 analytics 和 usage -> usage-log
      fileName = 'usage-log'
    } else {
      // 4. 模糊匹配
      const match = schemaNames.find((name) => cleanPath.includes(name) || name.includes(cleanPath))
      fileName = match || schemaNames[0]
    }

    const modelName = this.toCamelCase(fileName)
    return `const ${modelName}Routes = require('./${fileName}');`
  })
  .filter((line, index, arr) => arr.indexOf(line) === index)
  .join('\n')}

// 注册路由（排除健康检查）
${Object.entries(routeGroups)
  .filter(([routePath, routes]) => routePath !== '/health')
  .map(([routePath, routes]) => {
    // 再次使用相同的逻辑找到对应的路由模块变量名
    let fileName = ''
    const cleanPath = routePath.replace('/api/', '').replace(/^\//, '').toLowerCase()

    if (schemaNames.includes(cleanPath)) {
      fileName = cleanPath
    } else if (schemaNames.includes(cleanPath.replace(/s$/, ''))) {
      fileName = cleanPath.replace(/s$/, '')
    } else if (cleanPath.startsWith('analytics') || cleanPath.startsWith('usage')) {
      fileName = 'usage-log'
    } else {
      const match = schemaNames.find((name) => cleanPath.includes(name) || name.includes(cleanPath))
      fileName = match || schemaNames[0]
    }

    const modelName = this.toCamelCase(fileName)
    return `router.use('${routePath}', ${modelName}Routes);`
  })
  .join('\n')}

module.exports = router;
`

    const outputPath = path.join(this.outputPath, 'backend', 'src', 'routes', 'index.js')
    this.ensureDirectoryExists(outputPath)
    fs.writeFileSync(outputPath, routesContent)
    console.log(`生成后端路由文件: ${outputPath}`)
  }

  async generateBackendApp(systemConfig) {
    const isSequelize = systemConfig.framework?.backend?.orm === 'Sequelize'
    const dbImport = isSequelize
      ? "const { connectDB, sequelize } = require('./config/db');"
      : "const mongoose = require('mongoose');"

    const dbConnect = isSequelize
      ? `// 连接数据库
connectDB();

// 同步数据库模型 (开发环境下使用)
if (process.env.NODE_ENV !== 'production') {
  sequelize.sync({ alter: true }).then(async () => {
    console.log('Database synced');
    try {
      if (process.env.AUTO_SEED !== 'false') {
        const seed = require('./seed/seed');
        const result = await seed();
        if (result?.seeded) {
          console.log('Seed data inserted');
        }
      }
    } catch (e) {
      console.error('Seed error:', e);
    }
  });
}`
      : `// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_dashboard', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected...'))
  .catch(err => console.error('MongoDB Connection Error:', err));`

    const appContent = `
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
${dbImport}
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3010;

${dbConnect}

// 中间件
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// 路由
const routes = require('./routes');
app.use('/api', routes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`

    const outputPath = path.join(this.outputPath, 'backend', 'src', 'index.js')
    this.ensureDirectoryExists(outputPath)
    fs.writeFileSync(outputPath, appContent)
    console.log(`生成后端主文件: ${outputPath}`)
  }

  async generateFrontendRoutes(frontendRoutes) {
    const routesContent = `
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './layout/MainLayout';

${frontendRoutes.routes
  .map((route) => {
    const component = route.component
    // 修复导入路径：对应 ComponentGenerator 生成的 kebab-case 文件名
    const fileName = component
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase()
    return `import ${component} from './pages/${fileName}';`
  })
  .join('\n')}

function App() {
  return (
    <MainLayout>
      <Routes>
${frontendRoutes.routes
  .map((route) => {
    const component = route.component
    const path = route.path
    return `        <Route path="${path}" element={<${component} />} />`
  })
  .join('\n')}
      </Routes>
    </MainLayout>
  );
}

export default App;
`

    const outputPath = path.join(this.outputPath, 'frontend', 'src', 'App.jsx')
    this.ensureDirectoryExists(outputPath)
    fs.writeFileSync(outputPath, routesContent)
    console.log(`生成前端路由文件: ${outputPath}`)
  }

  async generateFrontendApp() {
    const appContent = `import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './hooks/useAuth';
import App from './App';
import theme from './theme';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <App />
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
`

    const outputPath = path.join(this.outputPath, 'frontend', 'src', 'index.jsx')
    this.ensureDirectoryExists(outputPath)
    fs.writeFileSync(outputPath, appContent)
    console.log(`生成前端主文件: ${outputPath}`)
  }

  async generateMainFiles(systemConfig) {
    // 生成根 package.json
    const rootPackageJson = systemConfig.packageJson?.main || {
      name: systemConfig.name || 'ai-native-dashboard',
      version: systemConfig.version || '1.0.0',
      description: systemConfig.description || 'AI Native Development Dashboard',
      scripts: {
        dev: 'concurrently "npm run dev:backend" "npm run dev:frontend"',
        'dev:backend': 'cd backend && npm run dev',
        'dev:frontend': 'cd frontend && npm run dev',
        build: 'npm run build:backend && npm run build:frontend',
        'build:backend': 'cd backend && npm run build',
        'build:frontend': 'cd frontend && npm run build',
        'install:all': 'npm install && cd backend && npm install && cd ../frontend && npm install',
        start: 'cd backend && npm start',
      },
      keywords: systemConfig.keywords || ['ai', 'dashboard', 'react', 'nodejs'],
      author: systemConfig.author || 'AI Development Team',
      license: systemConfig.license || 'MIT',
      devDependencies: {
        concurrently: '^8.2.2',
      },
    }

    const rootPackagePath = path.join(this.outputPath, 'package.json')
    this.ensureDirectoryExists(rootPackagePath)
    fs.writeFileSync(rootPackagePath, JSON.stringify(rootPackageJson, null, 2))
    console.log(`生成根 package.json: ${rootPackagePath}`)

    // 生成后端 package.json
    const backendPackageJson = systemConfig.packageJson?.backend || {
      name: 'ai-dashboard-backend',
      version: '1.0.0',
      description: 'AI Native Development Dashboard Backend',
      main: 'src/index.js',
      scripts: {
        dev: 'nodemon src/index.js',
        start: 'node src/index.js',
        build: 'echo "No build step required for Node.js backend"',
      },
      dependencies: {
        express: '^4.18.2',
        cors: '^2.8.5',
        helmet: '^7.0.0',
        morgan: '^1.10.0',
        compression: '^1.7.4',
        'express-rate-limit': '^6.8.1',
        dotenv: '^16.3.1',
        mongoose: '^7.5.0',
        joi: '^17.9.2',
        'express-validator': '^7.0.1',
        bcryptjs: '^2.4.3',
        jsonwebtoken: '^9.0.2',
      },
      devDependencies: {
        nodemon: '^3.0.1',
      },
      keywords: ['ai', 'dashboard', 'nodejs', 'express'],
      author: systemConfig.author || 'AI Development Team',
      license: systemConfig.license || 'MIT',
    }

    const backendPackagePath = path.join(this.outputPath, 'backend', 'package.json')
    this.ensureDirectoryExists(backendPackagePath)
    fs.writeFileSync(backendPackagePath, JSON.stringify(backendPackageJson, null, 2))
    console.log(`生成后端 package.json: ${backendPackagePath}`)

    // 生成前端 package.json
    const frontendPackageJson = systemConfig.packageJson?.frontend || {
      name: 'ai-dashboard-frontend',
      version: '1.0.0',
      description: 'AI Native Development Dashboard Frontend',
      private: true,
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
        start: 'npm run dev',
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        'react-router-dom': '^6.14.1',
        antd: '^5.8.6',
        echarts: '^5.4.3',
        recharts: '^2.7.2',
        'react-query': '^3.39.3',
        zustand: '^4.4.1',
        axios: '^1.4.0',
        dayjs: '^1.11.9',
      },
      devDependencies: {
        '@vitejs/plugin-react': '^4.0.3',
        vite: '^4.4.5',
        nodemon: '^3.0.1',
      },
      keywords: ['ai', 'dashboard', 'react', 'antd'],
      author: systemConfig.author || 'AI Development Team',
      license: systemConfig.license || 'MIT',
    }

    const frontendPackagePath = path.join(this.outputPath, 'frontend', 'package.json')
    this.ensureDirectoryExists(frontendPackagePath)
    fs.writeFileSync(frontendPackagePath, JSON.stringify(frontendPackageJson, null, 2))
    console.log(`生成前端 package.json: ${frontendPackagePath}`)

    // 生成前端 Vite 配置
    const viteConfigContent = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3010',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
`

    const viteConfigPath = path.join(this.outputPath, 'frontend', 'vite.config.js')
    this.ensureDirectoryExists(viteConfigPath)
    fs.writeFileSync(viteConfigPath, viteConfigContent)
    console.log(`生成前端 Vite 配置: ${viteConfigPath}`)

    // 生成前端入口 HTML
    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI Native Development Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.jsx"></script>
  </body>
</html>
`

    const htmlPath = path.join(this.outputPath, 'frontend', 'index.html')
    this.ensureDirectoryExists(htmlPath)
    fs.writeFileSync(htmlPath, htmlContent)
    console.log(`生成前端入口 HTML: ${htmlPath}`)

    // 生成前端 CSS
    const cssContent = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}
`

    const cssPath = path.join(this.outputPath, 'frontend', 'src', 'index.css')
    this.ensureDirectoryExists(cssPath)
    fs.writeFileSync(cssPath, cssContent)
    console.log(`生成前端 CSS: ${cssPath}`)

    const isSequelize = systemConfig.framework?.backend?.orm === 'Sequelize'
    const dbInfo = isSequelize
      ? 'MySQL (Sequelize) - 请在 .env 文件中配置数据库连接信息'
      : 'MongoDB (Mongoose)'

    const readmeContent = `
# AI Native Development Dashboard

${systemConfig.description || '一个为 AI 原生开发设计的专业仪表板系统'}

## 技术栈
- 后端: ${systemConfig.framework?.backend?.runtime || 'Node.js'} (${systemConfig.framework?.backend?.framework || 'Express'})
- 数据库: ${dbInfo}
- 前端: ${systemConfig.framework?.frontend?.runtime || 'React'} (${systemConfig.framework?.frontend?.ui || 'Ant Design'})

## 快速开始
1. 安装依赖: \`npm run install:all\`
2. 配置环境变量: 在 \`backend/.env\` 中设置数据库连接
3. 启动开发服务器: \`npm run dev\`
`

    const readmePath = path.join(this.outputPath, 'README.md')
    this.ensureDirectoryExists(readmePath)
    fs.writeFileSync(readmePath, readmeContent)
    console.log(`生成 README.md: ${readmePath}`)
  }

  extractModelNameFromPath(path) {
    // 从路径中提取模型名称，例如 /api/ai-models -> aiModels
    const cleanPath = path.replace('/api/', '').replace(/^\//, '').replace(/\/.*$/, '')
    return this.toCamelCase(cleanPath)
  }

  toPascalCase(str) {
    return str.replace(/(?:^|[\s-_])(\w)/g, (_, c) => c.toUpperCase()).replace(/[\s-_]/g, '')
  }

  toCamelCase(str) {
    return str
      .replace(/(?:^|[\s-_])(\w)/g, (_, c) => c.toUpperCase())
      .replace(/^./, (c) => c.toLowerCase())
  }

  writeFile(directory, fileName, content, type = '') {
    // 检查是否在目标范围
    if (this.options && this.options.target) {
      const isFrontendTarget =
        this.options.target.startsWith('frontend') && directory.includes('frontend')
      const isBackendTarget =
        this.options.target.startsWith('backend') && directory.includes('backend')
      const specificTarget = this.options.target.split('/')[1]

      if (!isFrontendTarget && !isBackendTarget) {
        return // 完全不在大类目标里
      }

      // 如果指定了具体文件(如 dashboard)
      if (
        specificTarget &&
        fileName.indexOf(specificTarget) === -1 &&
        directory.indexOf(specificTarget) === -1
      ) {
        return
      }
    }

    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true })
    }
    const filePath = path.join(directory, fileName)

    // 安全模式检查
    if (fs.existsSync(filePath) && (!this.options || !this.options.force)) {
      if (this.stats) this.stats.skipped++
      return // 存在则跳过
    }

    fs.writeFileSync(filePath, content, 'utf8')

    if (this.stats) {
      if (fs.existsSync(filePath)) this.stats.overwritten++
      else this.stats.created++
    }

    console.log(`✓ 生成文件: ${path.relative(path.join(this.outputPath, '..'), filePath)}`)
  }

  ensureDirectoryExists(filePath) {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
}

// 命令行接口
if (require.main === module) {
  const specPath = process.argv[2] || path.join(__dirname, '../spec')
  const outputPath = process.argv[3] || path.join(__dirname, '../../')

  console.log(`Spec 路径: ${specPath}`)
  console.log(`输出路径: ${outputPath}`)

  const generator = new SpecCodeGenerator(specPath, outputPath)
  generator.generate().catch(console.error)
}

module.exports = SpecCodeGenerator
