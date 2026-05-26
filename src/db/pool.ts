import { Pool, types } from 'pg';
import { env } from '../config/env';

// DATE (oid 1082): trả về chuỗi 'YYYY-MM-DD' thay vì Date —
// tránh lệch ngày do timezone (bug kinh điển của node-postgres).
types.setTypeParser(1082, (val) => val);

// NUMERIC (oid 1700) giữ mặc định = string để không mất precision tiền tệ.

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  // statement_timeout: chặn query treo (vd. transaction quên commit, slow query)
  // giữ connection mãi. 30s đủ cho 99% query OLTP; query nặng nên tách job riêng.
  statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
});

import { logger } from '../utils/logger';
pool.on('error', (err) => {
  logger.error({ err }, 'pg pool error (idle client)');
});

export async function closePool(): Promise<void> {
  await pool.end();
}

// Healthcheck ping DB — dùng cho /health endpoint của load balancer.
export async function pingDb(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await pool.query('SELECT 1');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
