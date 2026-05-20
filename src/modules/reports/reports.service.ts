import { query, queryOne } from '../../db/query';
import { AppError } from '../../middleware/error';
import type { TokenPayload } from '../../utils/jwt';
import type { ReportRow, UserRole } from '../../types/db';
import { notifyUser } from '../notifications/notification.helper';
import type {
  CreateReportInput,
  ListReportsQuery,
} from './reports.schema';

// Theo spec: tiếp tân và thu ngân không có chức năng báo cáo / thông báo.
function ensureCanReport(role: UserRole): void {
  if (role === 'receptionist' || role === 'cashier')
    throw new AppError(403, 'Role này không được gửi báo cáo');
}

export async function createReport(
  input: CreateReportInput,
  actor: TokenPayload,
): Promise<ReportRow> {
  ensureCanReport(actor.role);
  const row = await queryOne<ReportRow>(
    `INSERT INTO reports (reporter_user_id, content)
     VALUES ($1, $2) RETURNING *`,
    [actor.sub, input.content],
  );
  return row!;
}

export async function listReports(
  q: ListReportsQuery,
  actor: TokenPayload,
): Promise<ReportRow[]> {
  const params: unknown[] = [];
  const where: string[] = [];

  if (actor.role === 'manager') {
    // Manager xem tất cả.
  } else {
    ensureCanReport(actor.role);
    params.push(actor.sub);
    where.push(`reporter_user_id = $${params.length}`);
  }

  if (q.status) {
    params.push(q.status);
    where.push(`status = $${params.length}`);
  }
  params.push(q.limit);
  const sql = `SELECT * FROM reports
               ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY created_at DESC LIMIT $${params.length}`;
  return query<ReportRow>(sql, params);
}

export async function getReport(
  id: string,
  actor: TokenPayload,
): Promise<ReportRow> {
  const r = await queryOne<ReportRow>(
    'SELECT * FROM reports WHERE id = $1',
    [id],
  );
  if (!r) throw new AppError(404, 'Báo cáo không tồn tại');
  if (actor.role !== 'manager' && r.reporter_user_id !== actor.sub)
    throw new AppError(403, 'Không có quyền');
  return r;
}

export async function resolveReport(
  id: string,
  actor: TokenPayload,
): Promise<ReportRow> {
  if (actor.role !== 'manager')
    throw new AppError(403, 'Chỉ quản lý giải quyết báo cáo');

  const existing = await queryOne<ReportRow>(
    'SELECT * FROM reports WHERE id = $1',
    [id],
  );
  if (!existing) throw new AppError(404, 'Báo cáo không tồn tại');
  if (existing.status === 'resolved')
    throw new AppError(409, 'Báo cáo đã được giải quyết');

  const updated = await queryOne<ReportRow>(
    `UPDATE reports SET status = 'resolved', resolved_at = NOW()
      WHERE id = $1 RETURNING *`,
    [id],
  );
  // Thông báo cho người gửi báo cáo.
  await notifyUser(
    existing.reporter_user_id,
    'Báo cáo đã được xử lý',
    'Quản lý đã giải quyết báo cáo của bạn.',
  );
  return updated!;
}
