
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { connectDB, sequelize } = require('./config/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3010;

// 连接数据库
connectDB();

// 同步数据库模型 (开发环境下使用)
if (process.env.NODE_ENV !== 'production') {
  sequelize.sync({ alter: true }).then(async () => {
    console.log('Database synced');
    try {
      if (process.env.AUTO_SEED !== 'false') {
        const seed = require('./seed/seed');
        const result = await seed();
        if (result?.seeded) {
          console.log('Seed data inserted');
        }
      }
    } catch (e) {
      console.error('Seed error:', e);
    }
  });
}

// 中间件
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// 路由
const routes = require('./routes');
app.use('/api', routes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
