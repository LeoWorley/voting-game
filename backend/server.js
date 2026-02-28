const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const { initializeDatabase, closeDatabase } = require('./config/init-db');
const { logInfo } = require('./utils/logger');
const { createApp } = require('./app');
const { startSessionScheduler } = require('./jobs/sessionScheduler');

const app = createApp();
let stopScheduler = () => {};

const port = process.env.PORT || 3001;
initializeDatabase()
  .then(() => {
    stopScheduler = startSessionScheduler();
    app.listen(port, () => {
      logInfo('SERVER_STARTED', { port });
    });
  })
  .catch((error) => {
    console.error('Error initializing database:', error);
    process.exit(1);
  });

process.on('SIGTERM', async () => {
  stopScheduler();
  await closeDatabase();
});
process.on('SIGINT', async () => {
  stopScheduler();
  await closeDatabase();
});
process.on('uncaughtException', async () => {
  stopScheduler();
  await closeDatabase();
});
