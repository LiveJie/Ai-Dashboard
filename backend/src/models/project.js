const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Project = sequelize.define('Project', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '项目名称'
  },
  description: {
    type: DataTypes.STRING,
    comment: '项目描述'
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'planning',
    comment: ''
  },
  priority: {
    type: DataTypes.STRING,
    defaultValue: 'medium',
    comment: ''
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
  tableName: 'projects'
});



module.exports = Project;
