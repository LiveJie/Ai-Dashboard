
const express = require('express');
const router = express.Router();

// 导入所有路由（排除健康检查）
const aiModelRoutes = require('./ai-model');
const projectRoutes = require('./project');
const usageLogRoutes = require('./usage-log');

// 注册路由（排除健康检查）
router.use('/ai-models', aiModelRoutes);
router.use('/ai-models/:id', aiModelRoutes);
router.use('/projects', projectRoutes);
router.use('/projects/:id', projectRoutes);
router.use('/usage', usageLogRoutes);
router.use('/usage/stats', usageLogRoutes);
router.use('/analytics/overview', usageLogRoutes);
router.use('/settings', aiModelRoutes);

module.exports = router;
