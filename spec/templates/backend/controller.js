const {{MODEL_NAME}} = require('../models/{{FILE_NAME}}');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validation');

/**
 * 获取{{MODEL_NAME}}列表
 */
exports.getAll = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  const filter = {};
  if (req.query.provider) filter.provider = req.query.provider;
  if (req.query.status) filter.status = req.query.status;
  
  const items = await {{MODEL_NAME}}.find(filter)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });
  
  const total = await {{MODEL_NAME}}.countDocuments(filter);
  
  res.json({
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * 获取{{MODEL_NAME}}详情
 */
exports.getById = asyncHandler(async (req, res) => {
  const item = await {{MODEL_NAME}}.findById(req.params.id);
  
  if (!item) {
    return res.status(404).json({ error: '{{MODEL_NAME}} not found' });
  }
  
  res.json(item);
});

/**
 * 创建{{MODEL_NAME}}
 */
exports.create = asyncHandler(async (req, res) => {
  const item = new {{MODEL_NAME}}(req.body);
  await item.save();
  
  res.status(201).json(item);
});

/**
 * 更新{{MODEL_NAME}}
 */
exports.update = asyncHandler(async (req, res) => {
  const item = await {{MODEL_NAME}}.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  
  if (!item) {
    return res.status(404).json({ error: '{{MODEL_NAME}} not found' });
  }
  
  res.json(item);
});

/**
 * 删除{{MODEL_NAME}}
 */
exports.delete = asyncHandler(async (req, res) => {
  const item = await {{MODEL_NAME}}.findByIdAndDelete(req.params.id);
  
  if (!item) {
    return res.status(404).json({ error: '{{MODEL_NAME}} not found' });
  }
  
  res.json({ message: '{{MODEL_NAME}} deleted successfully' });
});

/**
 * 增加使用统计
 */
exports.incrementUsage = asyncHandler(async (req, res) => {
  const item = await {{MODEL_NAME}}.findById(req.params.id);
  
  if (!item) {
    return res.status(404).json({ error: '{{MODEL_NAME}} not found' });
  }
  
  await item.incrementUsage();
  res.json(item);
});