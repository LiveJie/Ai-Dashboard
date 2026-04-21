const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Aimodel = sequelize.define('Aimodel', {
  name: {
    type: DataTypes.STRING,
    comment: '模型名称'
  },
  modelId: {
    type: DataTypes.STRING,
    comment: '模型唯一标识符'
  },
  provider: {
    type: DataTypes.STRING,
    comment: '模型提供商'
  },
  version: {
    type: DataTypes.STRING,
    comment: '模型版本号'
  },
  description: {
    type: DataTypes.STRING,
    comment: '模型描述'
  },
  capabilities: {
    type: DataTypes.JSON,
    comment: ''
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active',
    comment: ''
  },
  testSyncField: {
    type: DataTypes.STRING,
    comment: '用于测试自动同步的字段'
  },
  createdAt: {
    type: DataTypes.DATE,
    comment: ''
  },
  updatedAt: {
    type: DataTypes.DATE,
    comment: ''
  },

}, {
  timestamps: true,
  underscored: true,
  tableName: 'aimodels'
});



module.exports = Aimodel;
