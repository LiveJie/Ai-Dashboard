const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const UsageLogController = require('../controllers/usage-log');
const validate = require('../middleware/validation');

/**
 * @swagger
 * /api/usageLogs:
 *   get:
 *     summary: 获取UsageLog列表
 *     tags: [UsageLogs]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: provider
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: UsageLog列表
 */
router.get('/', 
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
  UsageLogController.getAll
);

/**
 * @swagger
 * /api/usageLogs/{id}:
 *   get:
 *     summary: 获取UsageLog详情
 *     tags: [UsageLogs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: UsageLog详情
 */
router.get('/:id',
  param('id').isMongoId(),
  validate,
  UsageLogController.getById
);

/**
 * @swagger
 * /api/usageLogs:
 *   post:
 *     summary: 创建UsageLog
 *     tags: [UsageLogs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               modelId:
 *                 type: string
 *               provider:
 *                 type: string
 *               version:
 *                 type: string
 *     responses:
 *       201:
 *         description: UsageLog创建成功
 */
router.post('/',
    body('projectId').notEmpty().trim(),
    body('aiModelId').notEmpty().trim(),
    body('requestType').notEmpty().trim(),
    body('inputTokens').notEmpty().trim(),
    body('outputTokens').notEmpty().trim(),
    body('responseTime').notEmpty().trim(),
    body('cost').notEmpty().trim(),
  validate,
  UsageLogController.create
);

/**
 * @swagger
 * /api/usageLogs/{id}:
 *   put:
 *     summary: 更新UsageLog
 *     tags: [UsageLogs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               version:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: UsageLog更新成功
 */
router.put('/:id',
  param('id').isMongoId(),
    body('projectId').notEmpty().trim(),
    body('aiModelId').notEmpty().trim(),
    body('requestType').notEmpty().trim(),
    body('inputTokens').notEmpty().trim(),
    body('outputTokens').notEmpty().trim(),
    body('responseTime').notEmpty().trim(),
    body('cost').notEmpty().trim(),
  validate,
  UsageLogController.update
);

/**
 * @swagger
 * /api/usageLogs/{id}:
 *   delete:
 *     summary: 删除UsageLog
 *     tags: [UsageLogs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: UsageLog删除成功
 */
router.delete('/:id',
  param('id').isMongoId(),
  validate,
  UsageLogController.delete
);

/**
 * @swagger
 * /api/usageLogs/{id}/usage:
 *   post:
 *     summary: 增加使用统计
 *     tags: [UsageLogs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 使用统计更新成功
 */
router.post('/:id/usage',
  param('id').isMongoId(),
  validate,
  UsageLogController.incrementUsage
);

module.exports = router;