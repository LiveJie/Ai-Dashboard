const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const {{MODEL_NAME}} = sequelize.define('{{MODEL_NAME}}', {
{{SCHEMA_PROPERTIES}}
}, {
  timestamps: true,
  underscored: true,
  tableName: '{{TABLE_NAME}}'
});

{{SCHEMA_METHODS}}

module.exports = {{MODEL_NAME}};
