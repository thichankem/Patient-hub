import { createApp } from './app';
import { env } from './config/env';
import { pool, closePool } from './db/pool';
import { startSchedulers, stopSchedulers } from './scheduler';
import { logger } from './utils/logger';
import { aiHealth } from './modules/ai/ai.stub';

async function start(): Promise<void> {
  // Kiểm tra kết nối DB trước khi mở cổng — fail fast.
  await pool.query('SELECT 1');
  logger.info('PostgreSQL connected');

  const ai = aiHealth();
  logger.info({ ai }, 'AI components status');

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, `Server started: http://localhost:${env.PORT}/api`);
  });

  startSchedulers();
  logger.info('Cron expire-overdue-appointments enabled (every 1h)');

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'shutting down server');
    stopSchedulers();
    server.close(() => {
      void closePool().then(() => process.exit(0));
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  logger.fatal({ err }, 'không khởi động được server');
  process.exit(1);
});
