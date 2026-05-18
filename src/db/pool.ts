import { Pool, types } from 'pg';
import { env } from '../config/env';

// DATE (oid 1082): trả về chuỗi 'YYYY-MM-DD' thay vì Date —
// tránh lệch ngày do timezone (bug kinh điển của node-postgres).
types.setTypeParser(1082, (val) => val);

// NUMERIC (oid 1700) giữ mặc định = string để không mất precision tiền tệ.

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('❌ Lỗi pg pool (idle client):', err);
});

export async function closePool(): Promise<void> {
  await pool.end();
}
