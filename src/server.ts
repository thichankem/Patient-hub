import { createApp } from './app';
import { env } from './config/env';
import { pool, closePool } from './db/pool';
import { startSchedulers, stopSchedulers } from './scheduler';

async function start(): Promise<void> {
  // Kiểm tra kết nối DB trước khi mở cổng — fail fast.
  await pool.query('SELECT 1');
  console.log('✓ Kết nối PostgreSQL OK');

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`✓ Server chạy tại http://localhost:${env.PORT}/api`);
  });

  startSchedulers();
  console.log('✓ Đã bật cron kiểm tra lịch hẹn quá hạn (mỗi 1h)');

  const shutdown = (signal: string) => {
    console.log(`\n${signal} — đang tắt server...`);
    stopSchedulers();
    server.close(() => {
      void closePool().then(() => process.exit(0));
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('❌ Không khởi động được server:', err);
  process.exit(1);
});
