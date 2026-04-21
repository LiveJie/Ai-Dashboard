const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const {{MODEL_NAME}}Controller = require('../controllers/{{FILE_NAME}}');
const validate = require('../middleware/validation');

/**
 * @swagger
 * /api/{{MODEL_LOWER}}s:
 *   get:
 *     summary: 获取{{MODEL_NAME}}列表
 *     tags: [{{MODEL_NAME}}s]
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
 *         description: {{MODEL_NAME}}列表
 */
router.get('/', 
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
  {{MODEL_NAME}}Controller.getAll
);

/**
 * @swagger
 * /api/{{MODEL_LOWER}}s/{id}:
 *   get:
 *     summary: 获取{{MODEL_NAME}}详情
 *     tags: [{{MODEL_NAME}}s]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: {{MODEL_NAME}}详情
 */
router.get('/:id',
  param('id').isMongoId(),
  validate,
  {{MODEL_NAME}}Controller.getById
);

/**
 * @swagger
 * /api/{{MODEL_LOWER}}s:
 *   post:
 *     summary: 创建{{MODEL_NAME}}
 *     tags: [{{MODEL_NAME}}s]
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
 *         description: {{MODEL_NAME}}创建成功
 */
router.post('/',
{{SCHEMA_VALIDATION_PLACEHOLDER}}
  validate,
  {{MODEL_NAME}}Controller.create
);

/**
 * @swagger
 * /api/{{MODEL_LOWER}}s/{id}:
 *   put:
 *     summary: 更新{{MODEL_NAME}}
 *     tags: [{{MODEL_NAME}}s]
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
 *         description: {{MODEL_NAME}}更新成功
 */
router.put('/:id',
  param('id').isMongoId(),
{{SCHEMA_VALIDATION_PLACEHOLDER}}
  validate,
  {{MODEL_NAME}}Controller.update
);

/**
 * @swagger
 * /api/{{MODEL_LOWER}}s/{id}:
 *   delete:
 *     summary: 删除{{MODEL_NAME}}
 *     tags: [{{MODEL_NAME}}s]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: {{MODEL_NAME}}删除成功
 */
router.delete('/:id',
  param('id').isMongoId(),
  validate,
  {{MODEL_NAME}}Controller.delete
);

/**
 * @swagger
 * /api/{{MODEL_LOWER}}s/{id}/usage:
 *   post:
 *     summary: 增加使用统计
 *     tags: [{{MODEL_NAME}}s]
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
  {{MODEL_NAME}}Controller.incrementUsage
);

module.exports = router;