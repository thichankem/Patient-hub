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

function scopesForRole(role: UserRole): string[] {
  const scopes: string[] = ['single', 'all_system'];
  if (role === 'doctor') scopes.push('all_doctors');
  if (role === 'patient') scopes.push('all_patients');
  return scopes;
}

// Notification với cờ is_read tính theo user (broadcast lưu read trong
// bảng notification_reads; single dùng cột is_read sẵn có).
interface NotifWithRead extends NotificationRow {
  read_by_me: boolean;
}

export async function listMine(
  q: ListNotificationsQuery,
  actor: TokenPayload,
): Promise<NotifWithRead[]> {
  ensureCanReceive(actor.role);
  const scopes = scopesForRole(actor.role);

  const params: unknown[] = [actor.sub, scopes];
  let sql = `
    SELECT n.*,
           CASE
             WHEN n.recipient_user_id IS NOT NULL THEN n.is_read
             ELSE EXISTS (
               SELECT 1 FROM notification_reads nr
                WHERE nr.notification_id = n.id AND nr.user_id = $1
             )
           END AS read_by_me
      FROM notifications n
     WHERE (n.recipient_user_id = $1
        OR (n.recipient_user_id IS NULL AND n.target_scope = ANY($2)))
  `;
  if (q.is_read !== undefined) {
    params.push(q.is_read);
    sql += ` AND (
      CASE
        WHEN n.recipient_user_id IS NOT NULL THEN n.is_read
        ELSE EXISTS (
          SELECT 1 FROM notification_reads nr
           WHERE nr.notification_id = n.id AND nr.user_id = $1
        )
      END
    ) = $${params.length}`;
  }
  params.push(q.limit);
  sql += ` ORDER BY n.created_at DESC LIMIT $${params.length}`;
  return query<NotifWithRead>(sql, params);
}

export async function countUnread(actor: TokenPayload): Promise<number> {
  ensureCanReceive(actor.role);
  const scopes = scopesForRole(actor.role);

  const row = await queryOne<{ n: string }>(
    `SELECT COUNT(*) AS n FROM notifications n
      WHERE (
        (n.recipient_user_id = $1 AND n.is_read = FALSE)
        OR (n.recipient_user_id IS NULL AND n.target_scope = ANY($2)
            AND NOT EXISTS (
              SELECT 1 FROM notification_reads nr
               WHERE nr.notification_id = n.id AND nr.user_id = $1
            ))
      )`,
    [actor.sub, scopes],
  );
  return Number(row?.n ?? 0);
}

export async function markRead(
  id: string,
  actor: TokenPayload,
): Promise<{ id: string; read_by_me: boolean }> {
  ensureCanReceive(actor.role);

  const n = await queryOne<NotificationRow>(
    'SELECT * FROM notifications WHERE id = $1',
    [id],
  );
  if (!n) throw new AppError(404, 'Thông báo không tồn tại');

  if (n.recipient_user_id) {
    if (n.recipient_user_id !== actor.sub)
      throw new AppError(403, 'Không phải thông báo của bạn');
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1',
      [id],
    );
  } else {
    // Broadcast — kiểm tra user thuộc scope đó.
    if (!scopesForRole(actor.role).includes(n.target_scope)) {
      throw new AppError(403, 'Không thuộc phạm vi thông báo');
    }
    // Per-user read tracking; idempotent qua ON CONFLICT.
    await query(
      `INSERT INTO notification_reads (notification_id, user_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [id, actor.sub],
    );
  }
  return { id, read_by_me: true };
}

export async function markAllRead(actor: TokenPayload): Promise<number> {
  ensureCanReceive(actor.role);
  const scopes = scopesForRole(actor.role);

  let count = 0;
  await withTransaction(async (client) => {
    // 1) Mark đã đọc các single notification gửi riêng cho user.
    const singleRes = await client.query<{ id: string }>(
      `UPDATE notifications SET is_read = TRUE
        WHERE recipient_user_id = $1 AND is_read = FALSE
        RETURNING id`,
      [actor.sub],
    );
    count += singleRes.rowCount ?? 0;

    // 2) Insert read marker cho mọi broadcast user chưa đọc.
    const bcRes = await client.query<{ id: string }>(
      `INSERT INTO notification_reads (notification_id, user_id)
       SELECT n.id, $1
         FROM notifications n
        WHERE n.recipient_user_id IS NULL
          AND n.target_scope = ANY($2)
          AND NOT EXISTS (
            SELECT 1 FROM notification_reads nr
             WHERE nr.notification_id = n.id AND nr.user_id = $1
          )
       RETURNING notification_id AS id`,
      [actor.sub, scopes],
    );
    count += bcRes.rowCount ?? 0;
  });
  return count;
}

export async function broadcast(
  input: BroadcastInput,
  actor: TokenPayload,
): Promise<{ inserted: number }> {
  if (actor.role !== 'manager')
    throw new AppError(403, 'Chỉ quản lý gửi thông báo hàng loạt');

  if (input.target_scope === 'single') {
    const user = await queryOne<{ role: UserRole }>(
      'SELECT role FROM users WHERE id = $1',
      [input.recipient_user_id],
    );
    if (!user) throw new AppError(404, 'Người nhận không tồn tại');
    // Không gửi cho role không nhận được thông báo — tránh tạo notif "ma".
    if (user.role === 'cashier' || user.role === 'receptionist') {
      throw new AppError(400, 'Người nhận không có chức năng nhận thông báo');
    }
    await query(
      `INSERT INTO notifications (recipient_user_id, title, body, target_scope)
       VALUES ($1, $2, $3, 'single')`,
      [input.recipient_user_id, input.title, input.body],
    );
    return { inserted: 1 };
  }

  await query(
    `INSERT INTO notifications (recipient_user_id, title, body, target_scope)
     VALUES (NULL, $1, $2, $3)`,
    [input.title, input.body, input.target_scope],
  );
  return { inserted: 1 };
}
