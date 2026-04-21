const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const AiModelController = require('../controllers/ai-model');
const validate = require('../middleware/validation');

/**
 * @swagger
 * /api/aiModels:
 *   get:
 *     summary: 获取AiModel列表
 *     tags: [AiModels]
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
 *         description: AiModel列表
 */
router.get('/', 
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
  AiModelController.getAll
);

/**
 * @swagger
 * /api/aiModels/{id}:
 *   get:
 *     summary: 获取AiModel详情
 *     tags: [AiModels]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: AiModel详情
 */
router.get('/:id',
  param('id').isMongoId(),
  validate,
  AiModelController.getById
);

/**
 * @swagger
 * /api/aiModels:
 *   post:
 *     summary: 创建AiModel
 *     tags: [AiModels]
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
 *         description: AiModel创建成功
 */
router.post('/',
    body('name').notEmpty().trim(),
    body('modelId').notEmpty().trim(),
    body('provider').notEmpty().trim(),
    body('provider').isIn(['OpenAI', 'Anthropic', 'Google', 'Meta', 'Custom']),
    body('version').notEmpty().trim(),
    body('status').isIn(['active', 'deprecated', 'alpha', 'beta']),
  validate,
  AiModelController.create
);

/**
 * @swagger
 * /api/aiModels/{id}:
 *   put:
 *     summary: 更新AiModel
 *     tags: [AiModels]
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
 *         description: AiModel更新成功
 */
router.put('/:id',
  param('id').isMongoId(),
    body('name').notEmpty().trim(),
    body('modelId').notEmpty().trim(),
    body('provider').notEmpty().trim(),
    body('provider').isIn(['OpenAI', 'Anthropic', 'Google', 'Meta', 'Custom']),
    body('version').notEmpty().trim(),
    body('status').isIn(['active', 'deprecated', 'alpha', 'beta']),
  validate,
  AiModelController.update
);

/**
 * @swagger
 * /api/aiModels/{id}:
 *   delete:
 *     summary: 删除AiModel
 *     tags: [AiModels]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: AiModel删除成功
 */
router.delete('/:id',
  param('id').isMongoId(),
  validate,
  AiModelController.delete
);

/**
 * @swagger
 * /api/aiModels/{id}/usage:
 *   post:
 *     summary: 增加使用统计
 *     tags: [AiModels]
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
  AiModelController.incrementUsage
);

module.exports = router;