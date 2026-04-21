const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const AimodelController = require('../controllers/aimodel');
const validate = require('../middleware/validation');

/**
 * @swagger
 * /api/aimodels:
 *   get:
 *     summary: 获取Aimodel列表
 *     tags: [Aimodels]
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
 *         description: Aimodel列表
 */
router.get('/', 
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
  AimodelController.getAll
);

/**
 * @swagger
 * /api/aimodels/{id}:
 *   get:
 *     summary: 获取Aimodel详情
 *     tags: [Aimodels]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Aimodel详情
 */
router.get('/:id',
  param('id').isMongoId(),
  validate,
  AimodelController.getById
);

/**
 * @swagger
 * /api/aimodels:
 *   post:
 *     summary: 创建Aimodel
 *     tags: [Aimodels]
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
 *         description: Aimodel创建成功
 */
router.post('/',
    body('provider').isIn(['OpenAI', 'Anthropic', 'Google', 'Meta', 'Custom']),
    body('status').isIn(['active', 'deprecated', 'alpha', 'beta']),
  validate,
  AimodelController.create
);

/**
 * @swagger
 * /api/aimodels/{id}:
 *   put:
 *     summary: 更新Aimodel
 *     tags: [Aimodels]
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
 *         description: Aimodel更新成功
 */
router.put('/:id',
  param('id').isMongoId(),
    body('provider').isIn(['OpenAI', 'Anthropic', 'Google', 'Meta', 'Custom']),
    body('status').isIn(['active', 'deprecated', 'alpha', 'beta']),
  validate,
  AimodelController.update
);

/**
 * @swagger
 * /api/aimodels/{id}:
 *   delete:
 *     summary: 删除Aimodel
 *     tags: [Aimodels]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Aimodel删除成功
 */
router.delete('/:id',
  param('id').isMongoId(),
  validate,
  AimodelController.delete
);

/**
 * @swagger
 * /api/aimodels/{id}/usage:
 *   post:
 *     summary: 增加使用统计
 *     tags: [Aimodels]
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
  AimodelController.incrementUsage
);

module.exports = router;