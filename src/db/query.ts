import type { PoolClient, QueryResultRow } from 'pg';
import { pool } from './pool';

// Luôn dùng tham số hóa ($1, $2...) — KHÔNG nội suy chuỗi vào SQL (chống SQL injection).

export async function query<T extends QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const res = await pool.query<T>(text, params as never[]);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

// Chạy nhiều câu lệnh trong 1 transaction. Tự rollback nếu callback throw.
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
