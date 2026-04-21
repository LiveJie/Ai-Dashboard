const fs = require('fs')
const path = require('path')

class ModelGenerator {
  constructor(specPath, outputPath, config) {
    this.specPath = specPath
    this.outputPath = outputPath
    this.config = config || {}
    this.orm = this.config.framework?.backend?.orm || 'Mongoose'

    this.templates = {
      mongoose: this.loadTemplate('mongoose-model.js'),
      sequelize: this.loadTemplate('sequelize-model.js'),
      controller:
        this.orm === 'Sequelize'
          ? this.loadTemplate('sequelize-controller.js')
          : this.loadTemplate('controller.js'),
      routes: this.loadTemplate('routes.js'),
      validation: this.loadTemplate('validation.js'),
      db: this.loadTemplate('db.js'),
    }
  }

  loadTemplate(templateName) {
    const templatePath = path.join(__dirname, '../../templates/backend', templateName)
    if (fs.existsSync(templatePath)) {
      return fs.readFileSync(templatePath, 'utf8')
    }
    return ''
  }

  generateModel(schemaName, schema) {
    const modelName = this.toPascalCase(schemaName)
    const fileName = this.toKebabCase(schemaName)

    let modelContent = ''
    if (this.orm === 'Sequelize') {
      modelContent = this.templates.sequelize
        .replace(/{{MODEL_NAME}}/g, modelName)
        .replace(/{{TABLE_NAME}}/g, this.toSnakeCase(schemaName) + 's')
        .replace(
          /{{SCHEMA_PROPERTIES}}/g,
          this.generateSequelizeProperties(schema.properties, schema.required || []),
        )
        .replace(/{{SCHEMA_METHODS}}/g, '') // Sequelize 方法通常在 define 之外或通过 prototype
    } else {
      modelContent = this.templates.mongoose
        .replace(/{{MODEL_NAME}}/g, modelName)
        .replace(/{{SCHEMA_NAME}}/g, schemaName)
        .replace(/{{SCHEMA_PROPERTIES}}/g, this.generateSchemaProperties(schema.properties))
        .replace(/{{SCHEMA_METHODS}}/g, this.generateSchemaMethods(modelName, schema))
    }

    // 生成控制器
    const controllerContent = this.templates.controller
      .replace(/{{MODEL_NAME}}/g, modelName)
      .replace(/{{FILE_NAME}}/g, fileName)
      .replace(/{{SCHEMA_NAME}}/g, schemaName)
      .replace(/{{MODEL_LOWER}}/g, this.toCamelCase(schemaName))

    // 生成路由
    const rules = this.generateValidationRules(schema.properties, schema.required || [])
    const validationPlaceholder = rules ? rules + ',' : ''
    const routesContent = this.templates.routes
      .replace(/{{MODEL_NAME}}/g, modelName)
      .replace(/{{FILE_NAME}}/g, fileName)
      .replace(/{{SCHEMA_NAME}}/g, schemaName)
      .replace(/{{MODEL_LOWER}}/g, this.toCamelCase(schemaName))
      .replace(/{{SCHEMA_VALIDATION_PLACEHOLDER}}/g, validationPlaceholder)

    return {
      model: {
        fileName: `${fileName}.js`,
        content: modelContent,
        directory: path.join(this.outputPath, 'src', 'models'),
      },
      controller: {
        fileName: `${fileName}.js`,
        content: controllerContent,
        directory: path.join(this.outputPath, 'src', 'controllers'),
      },
      routes: {
        fileName: `${fileName}.js`,
        content: routesContent,
        directory: path.join(this.outputPath, 'src', 'routes'),
      },
    }
  }

  generateSequelizeProperties(properties, requiredFields = []) {
    let schemaCode = ''

    for (const [key, value] of Object.entries(properties)) {
      const fieldName = this.toCamelCase(key)
      const fieldType = this.getSequelizeType(value.type, value.format)

      schemaCode += `  ${fieldName}: {\n`
      schemaCode += `    type: ${fieldType},\n`
      if (requiredFields.includes(key)) schemaCode += `    allowNull: false,\n`
      if (value.default !== undefined) {
        const defaultValue =
          typeof value.default === 'string' ? `'${value.default}'` : value.default
        schemaCode += `    defaultValue: ${defaultValue},\n`
      }
      if (key === 'id' || value.format === 'objectId') {
        // 对于 MySQL，通常使用自增 ID 或 UUID，而不是 MongoDB 的 ObjectId
        // 这里简单处理为自增
        if (key === 'id') {
          schemaCode += `    primaryKey: true,\n`
          schemaCode += `    autoIncrement: true,\n`
        }
      }
      schemaCode += `    comment: '${value.description || ''}'\n`
      schemaCode += `  },\n`
    }

    return schemaCode
  }

  getSequelizeType(type, format) {
    const typeMap = {
      string: 'DataTypes.STRING',
      number: 'DataTypes.FLOAT',
      integer: 'DataTypes.INTEGER',
      boolean: 'DataTypes.BOOLEAN',
      array: 'DataTypes.JSON',
      object: 'DataTypes.JSON',
      date: 'DataTypes.DATE',
    }

    if (format === 'date-time' || format === 'date') {
      return 'DataTypes.DATE'
    }

    return typeMap[type] || 'DataTypes.STRING'
  }

  toSnakeCase(str) {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).replace(/^_/, '')
  }

  generateSchemaProperties(properties) {
    let schemaCode = ''

    for (const [key, value] of Object.entries(properties)) {
      const fieldName = this.toCamelCase(key)
      const fieldType = this.getMongooseType(value.type)
      const fieldOptions = this.generateFieldOptions(value)

      schemaCode += `  ${fieldName}: {\n`
      schemaCode += `    type: ${fieldType},\n`
      schemaCode += `${fieldOptions}`
      schemaCode += `  },\n`
    }

    return schemaCode
  }

  generateSchemaMethods(modelName, schema) {
    let methodsCode = ''

    // 添加静态方法
    methodsCode += `${modelName}Schema.statics.incrementUsage = async function(id) {\n`
    methodsCode += `  return this.findByIdAndUpdate(id, {\n`
    methodsCode += `    $inc: { 'usageStats.totalRequests': 1 },\n`
    methodsCode += `    $set: { 'usageStats.lastUsed': new Date() }\n`
    methodsCode += `  }, { new: true });\n`
    methodsCode += `};\n\n`

    // 添加中间件
    methodsCode += `${modelName}Schema.pre('save', function(next) {\n`
    methodsCode += `  this.updatedAt = Date.now();\n`
    methodsCode += `  next();\n`
    methodsCode += `});\n`

    return methodsCode
  }

  generateValidationRules(properties, requiredFields = []) {
    let rules = []

    for (const [key, value] of Object.entries(properties)) {
      const fieldName = this.toCamelCase(key)

      if (requiredFields.includes(key)) {
        rules.push(`    body('${fieldName}').notEmpty().trim()`)
      }

      if (value.type === 'string') {
        if (value.minLength !== undefined || value.maxLength !== undefined) {
          rules.push(
            `    body('${fieldName}').isLength({ min: ${value.minLength || 0}, max: ${value.maxLength || 255} })`,
          )
        }
      }

      if (value.type === 'number') {
        if (value.minimum !== undefined || value.maximum !== undefined) {
          rules.push(
            `    body('${fieldName}').isFloat({ min: ${value.minimum || 0}, max: ${value.maximum || Infinity} })`,
          )
        }
      }

      if (value.enum) {
        rules.push(`    body('${fieldName}').isIn([${value.enum.map((e) => `'${e}'`).join(', ')}])`)
      }
    }

    return rules.join(',\n')
  }

  getMongooseType(jsonType) {
    const typeMap = {
      string: 'String',
      number: 'Number',
      integer: 'Number',
      boolean: 'Boolean',
      date: 'Date',
      array: 'Array',
      object: 'Object',
    }

    return typeMap[jsonType] || 'Mixed'
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
      options += `    minlength: ${value.minLength},\n`
    }

    if (value.maxLength) {
      options += `    maxlength: ${value.maxLength},\n`
    }

    if (value.minimum) {
      options += `    min: ${value.minimum},\n`
    }

    if (value.maximum) {
      options += `    max: ${value.maximum},\n`
    }

    if (value.enum) {
      options += `    enum: [${value.enum.map((e) => `'${e}'`).join(', ')}],\n`
    }

    if (value.format === 'date-time') {
      options += `    get: function(v) { return v ? new Date(v) : v; },\n`
      options += `    set: function(v) { return v ? new Date(v) : v; },\n`
    }

    return options
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
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
  }

  writeFiles(files) {
    files.forEach((file) => {
      const fullPath = path.join(file.directory, file.fileName)

      // 确保目录存在
      if (!fs.existsSync(file.directory)) {
        fs.mkdirSync(file.directory, { recursive: true })
      }

      // 写入文件
      fs.writeFileSync(fullPath, file.content, 'utf8')
      console.log(`Generated: ${fullPath}`)
    })
  }
}

module.exports = ModelGenerator
