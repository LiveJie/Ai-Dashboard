const fs = require('fs')
const path = require('path')

class ComponentGenerator {
  constructor(specPath, outputPath, options = {}) {
    this.specPath = specPath
    this.outputPath = outputPath
    this.options = options
    this.stats = { created: 0, overwritten: 0, skipped: 0 }
    this.templates = {
      page: this.loadTemplate('page.js'),
      dashboardPage: this.loadTemplate('dashboard-page.js'),
      component: this.loadTemplate('component.js'),
      service: this.loadTemplate('service.js'),
      types: this.loadTemplate('types.ts'),
    }
  }

  loadTemplate(templateName) {
    const templatePath = path.join(__dirname, '../../templates/frontend', templateName)
    if (fs.existsSync(templatePath)) {
      return fs.readFileSync(templatePath, 'utf8')
    }
    return ''
  }

  generatePage(routeConfig, schema, schemaName) {
    const pageName = this.toPascalCase(routeConfig.component.replace('Page', ''))
    const fileName = this.toKebabCase(routeConfig.component)
    const baseModelName = schemaName || this.toKebabCase(schema.title)

    const template =
      routeConfig.component === 'Dashboard' && this.templates.dashboardPage
        ? this.templates.dashboardPage
        : this.templates.page

    // 生成页面组件
    const pageContent = template
      .replace(/{{PAGE_NAME}}/g, pageName)
      .replace(/{{ROUTE_PATH}}/g, routeConfig.path)
      .replace(/{{PAGE_TITLE}}/g, routeConfig.title)
      .replace(/{{SCHEMA_NAME}}/g, schema.title)
      .replace(/{{SCHEMA_PROPERTIES}}/g, this.generateSchemaProperties(schema.properties))
      .replace(/{{TABLE_HEADERS}}/g, this.generateTableHeaders(schema.properties))
      .replace(/{{TABLE_CELLS}}/g, this.generateTableCells(schema.properties))
      .replace(/{{IMPORTS}}/g, this.generateImports(routeConfig))

    // 生成服务
    // 映射逻辑：如果是 analytics 或 usage -> usage-log，其他复数形式
    let apiPath = baseModelName
    if (baseModelName === 'usage-log') {
      apiPath = 'usage' // 后端路由映射为 /api/usage
    } else if (baseModelName === 'ai-model') {
      apiPath = 'ai-models' // 后端路由映射为 /api/ai-models
    } else if (baseModelName === 'project') {
      apiPath = 'projects' // 后端路由映射为 /api/projects
    } else if (!apiPath.endsWith('s')) {
      apiPath += 's'
    }

    const serviceContent = this.templates.service
      .replace(/{{PAGE_NAME}}/g, pageName)
      .replace(/{{MODEL_NAME}}/g, schema.title)
      .replace(/{{MODEL_LOWER}}/g, apiPath)

    // 生成类型定义
    const typesContent = this.templates.types
      .replace(/{{INTERFACE_NAME}}/g, pageName + 'Props')
      .replace(/{{SCHEMA_PROPERTIES}}/g, this.generateTypeProperties(schema.properties))

    return {
      page: {
        fileName: `${fileName}.jsx`,
        content: pageContent,
        directory: path.join(this.outputPath, 'src', 'pages'),
      },
      service: {
        fileName: `${fileName}Service.js`,
        content: serviceContent,
        directory: path.join(this.outputPath, 'src', 'services'),
      },
      types: {
        fileName: `${fileName}Types.ts`,
        content: typesContent,
        directory: path.join(this.outputPath, 'src', 'types'),
      },
    }
  }

  generateComponent(componentConfig, schema) {
    const componentName = this.toPascalCase(componentConfig.name)
    const fileName = this.toKebabCase(componentConfig.name)

    const componentContent = this.templates.component
      .replace(/{{COMPONENT_NAME}}/g, componentName)
      .replace(/{{COMPONENT_TITLE}}/g, componentConfig.title)
      .replace(/{{SCHEMA_PROPERTIES}}/g, this.generateSchemaProperties(schema.properties))
      .replace(/{{PROPS}}/g, this.generateComponentProps(schema.properties))

    return {
      component: {
        fileName: `${fileName}.js`,
        content: componentContent,
        directory: path.join(this.outputPath, 'src', 'components'),
      },
    }
  }

  generateSchemaProperties(properties) {
    let propertiesCode = ''

    const keys = Object.keys(properties).slice(0, 3)
    keys.forEach((key) => {
      const value = properties[key]
      const fieldName = this.toCamelCase(key)
      const fieldLabel = value.title || fieldName

      propertiesCode += `        <Grid item xs={12} md={4}>\n`
      propertiesCode += `          <Card variant="outlined">\n`
      propertiesCode += `            <CardContent>\n`
      propertiesCode += `              <Typography color="text.secondary" variant="overline">\n`
      propertiesCode += `                ${fieldLabel}\n`
      propertiesCode += `              </Typography>\n`
      propertiesCode += `              <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>\n`
      propertiesCode += `                {String((items?.[0]?.${fieldName} ?? '-') )}\n`
      propertiesCode += `              </Typography>\n`
      propertiesCode += `            </CardContent>\n`
      propertiesCode += `          </Card>\n`
      propertiesCode += `        </Grid>\n`
    })

    return propertiesCode
  }

  getRenderableKeys(properties) {
    return Object.entries(properties)
      .filter(([key, value]) => {
        const t = value?.type
        return t === 'string' || t === 'number' || t === 'integer' || t === 'boolean'
      })
      .map(([key]) => key)
      .slice(0, 6)
  }

  generateTableHeaders(properties) {
    const keys = this.getRenderableKeys(properties)
    if (keys.length === 0) {
      return `                  <TableCell>数据</TableCell>\n`
    }

    return keys
      .map((key) => {
        const label = properties[key]?.title || key
        return `                  <TableCell>${label}</TableCell>`
      })
      .join('\n')
  }

  generateTableCells(properties) {
    const keys = this.getRenderableKeys(properties)
    if (keys.length === 0) {
      return `                    <TableCell>{JSON.stringify(row)}</TableCell>\n`
    }

    return keys
      .map((key) => {
        const fieldName = this.toCamelCase(key)
        return `                    <TableCell>{row?.${fieldName} ?? '-'}</TableCell>`
      })
      .join('\n')
  }

  generateTypeProperties(properties) {
    let propertiesCode = ''

    for (const [key, value] of Object.entries(properties)) {
      const fieldName = this.toCamelCase(key)
      const fieldType = this.getTypeScriptType(value.type)

      propertiesCode += `  ${fieldName}: ${fieldType};\n`
    }

    return propertiesCode
  }

  generateComponentProps(properties) {
    let propsCode = ''

    for (const [key, value] of Object.entries(properties)) {
      const fieldName = this.toCamelCase(key)
      const fieldLabel = value.title || fieldName

      propsCode += `  ${fieldName}: data?.${fieldName},\n`
    }

    return propsCode
  }

  generateImports(routeConfig) {
    let imports = `import React, { useState, useEffect } from 'react';\n`
    if (routeConfig.component === 'Dashboard') {
      imports += `import { useMemo } from 'react';\n`
      imports += `import dayjs from 'dayjs';\n`
      imports += `import {\n  ResponsiveContainer,\n  LineChart,\n  Line,\n  XAxis,\n  YAxis,\n  Tooltip,\n  CartesianGrid\n} from 'recharts';\n`
    }
    imports += `import {\n`
    imports += `  Box,\n`
    imports += `  Grid,\n`
    imports += `  Card,\n`
    imports += `  CardContent,\n`
    imports += `  Typography,\n`
    imports += `  CircularProgress,\n`
    imports += `  Alert,\n`
    imports += `  Chip,\n`
    imports += `  FormControl,\n`
    imports += `  InputLabel,\n`
    imports += `  MenuItem,\n`
    imports += `  Select,\n`
    imports += `  Stack,\n`
    imports += `  Table,\n`
    imports += `  TableBody,\n`
    imports += `  TableCell,\n`
    imports += `  TableContainer,\n`
    imports += `  TableHead,\n`
    imports += `  TableRow,\n`
    imports += `} from '@mui/material';\n`
    if (routeConfig.component === 'Dashboard') {
      imports += `import ProjectsService from '../services/projectsService';\n`
      imports += `import AIModelsService from '../services/ai-modelsService';\n`
    }
    imports += `import ${routeConfig.component.replace('Page', '')}Service from '../services/${this.toKebabCase(routeConfig.component)}Service';\n`

    if (routeConfig.meta?.requireAuth) {
      imports += `import { useAuth } from '../hooks/useAuth';\n`
    }

    return imports
  }

  generateFieldOptions(value) {
    let options = ''

    if (value.description) {
      options += `    // ${value.description}\n`
    }

    if (value.required) {
      options += `    required: true,\n`
    }

    if (value.default !== undefined) {
      options += `    default: ${JSON.stringify(value.default)},\n`
    }

    if (value.minLength) {
      options += `    minLength: ${value.minLength},\n`
    }

    if (value.maxLength) {
      options += `    maxLength: ${value.maxLength},\n`
    }

    return options
  }

  getReactType(jsonType) {
    const typeMap = {
      string: 'string',
      number: 'number',
      integer: 'number',
      boolean: 'boolean',
      date: 'Date',
      array: 'Array',
      object: 'Object',
    }

    return typeMap[jsonType] || 'any'
  }

  getTypeScriptType(jsonType) {
    const typeMap = {
      string: 'string',
      number: 'number',
      integer: 'number',
      boolean: 'boolean',
      date: 'Date',
      array: 'any[]',
      object: 'Record<string, any>',
    }

    return typeMap[jsonType] || 'any'
  }

  toPascalCase(str) {
    return str.replace(/(?:^|[\s-_])(\w)/g, (_, c) => c.toUpperCase()).replace(/[\s-_]/g, '')
  }

  toCamelCase(str) {
    return str
      .replace(/(?:^|[\s-_])(\w)/g, (_, c) => c.toUpperCase())
      .replace(/^./, (c) => c.toLowerCase())
  }

  toKebabCase(str) {
    return str
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase()
  }

  writeFiles(files) {
    files.forEach((file) => {
      const fullPath = path.join(file.directory, file.fileName)

      if (this.options && this.options.target) {
        if (this.options.target.startsWith('frontend') === false) return
        const specificTarget = this.options.target.split('/')[1]
        if (specificTarget && file.fileName.indexOf(specificTarget) === -1) {
          return // 跳过非目标
        }
      }

      if (fs.existsSync(fullPath) && (!this.options || !this.options.force)) {
        if (this.stats) this.stats.skipped++
        return
      }

      // 确保目录存在
      if (!fs.existsSync(file.directory)) {
        fs.mkdirSync(file.directory, { recursive: true })
      }

      const isExist = fs.existsSync(fullPath)

      // 写入文件
      fs.writeFileSync(fullPath, file.content, 'utf8')

      if (this.stats) {
        if (isExist) this.stats.overwritten++
        else this.stats.created++
      }
      console.log(`Generated: ${fullPath}`)
    })
  }
}

module.exports = ComponentGenerator
