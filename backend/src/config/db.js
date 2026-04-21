const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'ai_dashboard',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('MySQL Connected (Sequelize)...');
    
    // 同步模型
    // await sequelize.sync({ alter: true });
  } catch (error) {
    console.error('MySQL Connection Error:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
