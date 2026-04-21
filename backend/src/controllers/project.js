const Project = require('../models/project');
const asyncHandler = require('../utils/asyncHandler');
const { Op } = require('sequelize');

/**
 * 获取Project列表
 */
exports.getAll = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  
  const where = {};
  // 通用过滤：除 page/limit/startDate/endDate 外，其它 query 均按等值过滤
  const { page: _p, limit: _l, startDate, endDate, ...rest } = req.query;
  Object.keys(rest).forEach((k) => {
    if (rest[k] !== undefined && rest[k] !== '') {
      where[k] = rest[k];
    }
  });

  // 时间范围过滤（针对 timestamp 字段）
  if (startDate || endDate) {
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();
    where.timestamp = { [Op.between]: [start, end] };
  }
  
  const { count, rows } = await Project.findAndCountAll({
    where,
    limit,
    offset,
    order: [['createdAt', 'DESC']]
  });
  
  res.json({
    items: rows,
    pagination: {
      page,
      limit,
      total: count,
      pages: Math.ceil(count / limit)
    }
  });
});

/**
 * 获取Project详情
 */
exports.getById = asyncHandler(async (req, res) => {
  const item = await Project.findByPk(req.params.id);
  
  if (!item) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  res.json(item);
});

/**
 * 创建Project
 */
exports.create = asyncHandler(async (req, res) => {
  const item = await Project.create(req.body);
  res.status(201).json(item);
});

/**
 * 更新Project
 */
exports.update = asyncHandler(async (req, res) => {
  const [updated] = await Project.update(req.body, {
    where: { id: req.params.id }
  });
  
  if (!updated) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const updatedItem = await Project.findByPk(req.params.id);
  res.json(updatedItem);
});

/**
 * 删除Project
 */
exports.delete = asyncHandler(async (req, res) => {
  const deleted = await Project.destroy({
    where: { id: req.params.id }
  });
  
  if (!deleted) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  res.json({ message: 'Project deleted successfully' });
});

/**
 * 增加使用统计
 */
exports.incrementUsage = asyncHandler(async (req, res) => {
  const item = await Project.findByPk(req.params.id);
  
  if (!item) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  // Sequelize 增加统计的逻辑
  if (item.usage_stats) {
    const stats = typeof item.usage_stats === 'string' ? JSON.parse(item.usage_stats) : item.usage_stats;
    stats.totalRequests = (stats.totalRequests || 0) + 1;
    stats.lastUsed = new Date();
    await item.update({ usage_stats: stats });
  }
  
  res.json(item);
});
