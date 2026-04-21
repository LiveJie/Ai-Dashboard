const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const UsageLog = sequelize.define('UsageLog', {
  projectId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '项目ID'
  },
  aiModelId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'AI模型ID'
  },
  requestType: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '请求类型'
  },
  inputTokens: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: ''
  },
  outputTokens: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: ''
  },
  responseTime: {
    type: DataTypes.FLOAT,
    allowNull: false,
    comment: ''
  },
  cost: {
    type: DataTypes.FLOAT,
    allowNull: false,
    comment: ''
  },
  success: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: ''
  },
  timestamp: {
    type: DataTypes.DATE,
    comment: ''
  },

}, {
  timestamps: true,
  underscored: true,
  tableName: 'usage-logs'
});



module.exports = UsageLog;
