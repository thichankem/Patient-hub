import fs from 'node:fs';
import path from 'node:path';
import { pool, closePool } from '../db/pool';

// Migration runner thuần SQL.
//   npm run migrate          -> chạy các migration chưa áp dụng
//   npm run migrate:status   -> liệt kê đã áp dụng / đang chờ
//
// Baseline: DB patient_hub_2 đã được tạo tay từ 0001_init.sql.
// Nếu phát hiện bảng 'users' đã tồn tại mà 0001 chưa ghi nhận,
// runner sẽ ĐÁNH DẤU 0001 là applied mà KHÔNG chạy lại (tránh lỗi "already exists").

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function listMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

async function appliedSet(): Promise<Set<string>> {
  const res = await pool.query<{ name: string }>(
    'SELECT name FROM schema_migrations',
  );
  return new Set(res.rows.map((r) => r.name));
}

async function tableExists(name: string): Promise<boolean> {
  const res = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    [name],
  );
  return res.rows[0]?.exists ?? false;
}

async function runUp(): Promise<void> {
  await ensureMigrationsTable();
  const files = listMigrationFiles();
  const applied = await appliedSet();

  for (const file of files) {
    if (applied.has(file)) continue;

    // Baseline: 0001 đã nằm sẵn trong DB (tạo tay) -> chỉ ghi nhận.
    if (file === '0001_init.sql' && (await tableExists('users'))) {
      await pool.query(
        'INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING',
        [file],
      );
      console.log(`✓ baseline: ${file} (đã có sẵn, chỉ đánh dấu applied)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (name) VALUES ($1)',
        [file],
      );
      await client.query('COMMIT');
      console.log(`✓ applied: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`✗ FAILED: ${file}`);
      throw err;
    } finally {
      client.release();
    }
  }
  console.log('Hoàn tất migrations.');
}

async function showStatus(): Promise<void> {
  await ensureMigrationsTable();
  const files = listMigrationFiles();
  const applied = await appliedSet();
  for (const f of files) {
    console.log(`${applied.has(f) ? '[x]' : '[ ]'} ${f}`);
  }
}

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? 'up';
  try {
    if (cmd === 'status') await showStatus();
    else await runUp();
  } finally {
    await closePool();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
