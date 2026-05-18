import { createApp } from './app';
import { env } from './config/env';
import { pool, closePool } from './db/pool';

async function start(): Promise<void> {
  // Kiểm tra kết nối DB trước khi mở cổng — fail fast.
  await pool.query('SELECT 1');
  console.log('✓ Kết nối PostgreSQL OK');

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`✓ Server chạy tại http://localhost:${env.PORT}/api`);
  });

  const shutdown = (signal: string) => {
    console.log(`\n${signal} — đang tắt server...`);
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
