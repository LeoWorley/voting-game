const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { authMiddleware } = require('./middleware/auth');
const { logInfo } = require('./utils/logger');

const userRoutes = require('./routes/user.routes');
const votingRoutes = require('./routes/game.routes');
const voteRoutes = require('./routes/vote.routes');
const resultsRoutes = require('./routes/results.routes');
const sessionRoutes = require('./routes/session.routes');
const adminRoutes = require('./routes/admin.routes');

function buildAllowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function createApp() {
  const app = express();
  const allowedOrigins = buildAllowedOrigins();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );

  app.use((req, _res, next) => {
    logInfo('HTTP_REQUEST', {
      method: req.method,
      path: req.path,
    });
    next();
  });

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        if (buf?.length && req.originalUrl.startsWith('/api/users/sync')) {
          req.rawBody = Buffer.from(buf);
        }
      },
    })
  );

  app.use('/api/users', userRoutes);
  app.use('/api/voting', authMiddleware, votingRoutes);
  app.use('/api/votes', authMiddleware, voteRoutes);
  app.use('/api/results', resultsRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/admin', adminRoutes);

  app.get('/api/health', (_req, res) => {
    res.json({
      code: 'HEALTHY',
      message: 'Service is healthy',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/db-test', async (_req, res) => {
    try {
      const dbStatus = await mongoose.connection.db.admin().ping();
      res.json({
        code: 'DATABASE_OK',
        message: 'Database connection successful',
        status: dbStatus,
      });
    } catch (error) {
      res.status(500).json({
        code: 'DATABASE_ERROR',
        message: 'Database connection failed',
        error: error.message,
      });
    }
  });

  return app;
}

module.exports = { createApp };
