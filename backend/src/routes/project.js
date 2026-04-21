const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const ProjectController = require('../controllers/project');
const validate = require('../middleware/validation');

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: 获取Project列表
 *     tags: [Projects]
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
 *         description: Project列表
 */
router.get('/', 
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
  ProjectController.getAll
);

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: 获取Project详情
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Project详情
 */
router.get('/:id',
  param('id').isMongoId(),
  validate,
  ProjectController.getById
);

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: 创建Project
 *     tags: [Projects]
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
 *         description: Project创建成功
 */
router.post('/',
    body('name').notEmpty().trim(),
    body('status').isIn(['planning', 'development', 'testing', 'deployment', 'completed']),
    body('priority').isIn(['low', 'medium', 'high', 'critical']),
  validate,
  ProjectController.create
);

/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     summary: 更新Project
 *     tags: [Projects]
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
 *         description: Project更新成功
 */
router.put('/:id',
  param('id').isMongoId(),
    body('name').notEmpty().trim(),
    body('status').isIn(['planning', 'development', 'testing', 'deployment', 'completed']),
    body('priority').isIn(['low', 'medium', 'high', 'critical']),
  validate,
  ProjectController.update
);

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: 删除Project
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Project删除成功
 */
router.delete('/:id',
  param('id').isMongoId(),
  validate,
  ProjectController.delete
);

/**
 * @swagger
 * /api/projects/{id}/usage:
 *   post:
 *     summary: 增加使用统计
 *     tags: [Projects]
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
  ProjectController.incrementUsage
);

module.exports = router;