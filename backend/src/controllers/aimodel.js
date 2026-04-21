const Aimodel = require('../models/aimodel');
const asyncHandler = require('../utils/asyncHandler');
const { Op } = require('sequelize');

/**
 * 获取Aimodel列表
 */
exports.getAll = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  
  const where = {};
  if (req.query.provider) where.provider = req.query.provider;
  if (req.query.status) where.status = req.query.status;
  
  const { count, rows } = await Aimodel.findAndCountAll({
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
 * 获取Aimodel详情
 */
exports.getById = asyncHandler(async (req, res) => {
  const item = await Aimodel.findByPk(req.params.id);
  
  if (!item) {
    return res.status(404).json({ error: 'Aimodel not found' });
  }
  
  res.json(item);
});

/**
 * 创建Aimodel
 */
exports.create = asyncHandler(async (req, res) => {
  const item = await Aimodel.create(req.body);
  res.status(201).json(item);
});

/**
 * 更新Aimodel
 */
exports.update = asyncHandler(async (req, res) => {
  const [updated] = await Aimodel.update(req.body, {
    where: { id: req.params.id }
  });
  
  if (!updated) {
    return res.status(404).json({ error: 'Aimodel not found' });
  }
  
  const updatedItem = await Aimodel.findByPk(req.params.id);
  res.json(updatedItem);
});

/**
 * 删除Aimodel
 */
exports.delete = asyncHandler(async (req, res) => {
  const deleted = await Aimodel.destroy({
    where: { id: req.params.id }
  });
  
  if (!deleted) {
    return res.status(404).json({ error: 'Aimodel not found' });
  }
  
  res.json({ message: 'Aimodel deleted successfully' });
});

/**
 * 增加使用统计
 */
exports.incrementUsage = asyncHandler(async (req, res) => {
  const item = await Aimodel.findByPk(req.params.id);
  
  if (!item) {
    return res.status(404).json({ error: 'Aimodel not found' });
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
