#!/usr/bin/env node

const SpecCodeGenerator = require('./spec/generators/index')
const path = require('path')

// 解析命令行参数
const args = process.argv.slice(2)
const force = args.includes('--force') || args.includes('-f')
const targetArg = args.find((arg) => arg.startsWith('--target='))
const target = targetArg ? targetArg.split('=')[1] : null

console.log('🚀 开始生成 AI 原生开发仪表板系统...')
if (force) console.log('⚠️  已开启强制覆盖模式 (--force)')
if (target) console.log(`🎯 已指定生成目标: ${target}`)

const specPath = path.join(__dirname, 'spec')
const outputPath = path.join(__dirname)

// 传入参数以支持增量和安全模式
const generator = new SpecCodeGenerator(specPath, outputPath, { force, target })

generator
  .generate()
  .then((stats) => {
    console.log('✅ 代码生成完成！')
    if (stats) {
      console.log(
        `📊 统计: 新建 ${stats.created || 0} 个文件，覆盖 ${stats.overwritten || 0} 个文件，跳过 ${stats.skipped || 0} 个已有文件。`,
      )
    }
    console.log('📁 生成的文件位置:')

    console.log('   - 后端代码: backend/')
    console.log('   - 前端代码: frontend/')
    console.log('   - 规范定义: spec/')
    console.log('\n🛠️ 下一步:')
    console.log('   1. cd backend && npm install')
    console.log('   2. cd frontend && npm install')
    console.log('   3. npm run dev')
  })
  .catch((error) => {
    console.error('❌ 代码生成失败:', error)
    process.exit(1)
  })
