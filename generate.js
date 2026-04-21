#!/usr/bin/env node

const SpecCodeGenerator = require('./spec/generators/index');
const path = require('path');

console.log('🚀 开始生成 AI 原生开发仪表板系统...');

const specPath = path.join(__dirname, 'spec');
const outputPath = path.join(__dirname);

const generator = new SpecCodeGenerator(specPath, outputPath);

generator.generate()
  .then(() => {
    console.log('✅ 代码生成完成！');
    console.log('📁 生成的文件位置:');
    console.log('   - 后端代码: backend/');
    console.log('   - 前端代码: frontend/');
    console.log('   - 规范定义: spec/');
    console.log('\n🛠️ 下一步:');
    console.log('   1. cd backend && npm install');
    console.log('   2. cd frontend && npm install');
    console.log('   3. npm run dev');
  })
  .catch(error => {
    console.error('❌ 代码生成失败:', error);
    process.exit(1);
  });