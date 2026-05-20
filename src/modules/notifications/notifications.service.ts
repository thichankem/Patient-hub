import { query, queryOne, withTransaction } from '../../db/query';
import { AppError } from '../../middleware/error';
import type { TokenPayload } from '../../utils/jwt';
import type { NotificationRow, UserRole } from '../../types/db';
import type {
  BroadcastInput,
  ListNotificationsQuery,
} from './notifications.schema';

// Role không có phần thông báo (theo spec): receptionist, cashier.
function ensureCanReceive(role: UserRole): void {
  if (role === 'receptionist' || role === 'cashier')
    throw new AppError(403, 'Role này không có chức năng thông báo');
}

export async function listMine(
  q: ListNotificationsQuery,
  actor: TokenPayload,
): Promise<NotificationRow[]> {
  ensureCanReceive(actor.role);

  // Mỗi user thấy: (a) thông báo gửi riêng cho mình, (b) broadcast theo role.
  const scopes: string[] = ['single'];
  if (actor.role === 'doctor') scopes.push('all_doctors');
  if (actor.role === 'patient') scopes.push('all_patients');
  scopes.push('all_system');

  const params: unknown[] = [actor.sub, scopes];
  let sql = `SELECT * FROM notifications
              WHERE (recipient_user_id = $1 OR (recipient_user_id IS NULL AND target_scope = ANY($2)))`;
  if (q.is_read !== undefined) {
    params.push(q.is_read);
    sql += ` AND is_read = $${params.length}`;
  }
  params.push(q.limit);
  sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;
  return query<NotificationRow>(sql, params);
}

export async function countUnread(actor: TokenPayload): Promise<number> {
  ensureCanReceive(actor.role);
  const scopes: string[] = ['single', 'all_system'];
  if (actor.role === 'doctor') scopes.push('all_doctors');
  if (actor.role === 'patient') scopes.push('all_patients');

  const row = await queryOne<{ n: string }>(
    `SELECT COUNT(*) AS n FROM notifications
      WHERE is_read = FALSE
        AND (recipient_user_id = $1 OR (recipient_user_id IS NULL AND target_scope = ANY($2)))`,
    [actor.sub, scopes],
  );
  return Number(row?.n ?? 0);
}

export async function markRead(
  id: string,
  actor: TokenPayload,
): Promise<NotificationRow> {
  ensureCanReceive(actor.role);

  const n = await queryOne<NotificationRow>(
    'SELECT * FROM notifications WHERE id = $1',
    [id],
  );
  if (!n) throw new AppError(404, 'Thông báo không tồn tại');

  // Broadcast (recipient_user_id NULL) cũng cho phép mark read — đánh dấu chung.
  if (n.recipient_user_id && n.recipient_user_id !== actor.sub)
    throw new AppError(403, 'Không phải thông báo của bạn');

  const updated = await queryOne<NotificationRow>(
    'UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *',
    [id],
  );
  return updated!;
}

export async function markAllRead(actor: TokenPayload): Promise<number> {
  ensureCanReceive(actor.role);
  const scopes: string[] = ['single', 'all_system'];
  if (actor.role === 'doctor') scopes.push('all_doctors');
  if (actor.role === 'patient') scopes.push('all_patients');

  const res = await query(
    `UPDATE notifications SET is_read = TRUE
      WHERE is_read = FALSE
        AND (recipient_user_id = $1 OR (recipient_user_id IS NULL AND target_scope = ANY($2)))`,
    [actor.sub, scopes],
  );
  return res.length;
}

export async function broadcast(
  input: BroadcastInput,
  actor: TokenPayload,
): Promise<{ inserted: number }> {
  if (actor.role !== 'manager')
    throw new AppError(403, 'Chỉ quản lý gửi thông báo hàng loạt');

  if (input.target_scope === 'single') {
    const user = await queryOne(
      'SELECT id FROM users WHERE id = $1',
      [input.recipient_user_id],
    );
    if (!user) throw new AppError(404, 'Người nhận không tồn tại');
    await query(
      `INSERT INTO notifications (recipient_user_id, title, body, target_scope)
       VALUES ($1, $2, $3, 'single')`,
      [input.recipient_user_id, input.title, input.body],
    );
    return { inserted: 1 };
  }

  // Broadcast: lưu 1 record, recipient NULL. Client filter theo scope khi list.
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO notifications (recipient_user_id, title, body, target_scope)
       VALUES (NULL, $1, $2, $3)`,
      [input.title, input.body, input.target_scope],
    );
  });
  return { inserted: 1 };
}
