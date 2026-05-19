import type { PoolClient } from 'pg';
import { query } from '../../db/query';

// Helper nội bộ: ghi 1 thông báo in-app cho 1 user.
// Truyền client nếu cần nằm trong transaction; nếu không dùng pool mặc định.
// Module Notifications đầy đủ (đọc/đánh dấu đã đọc/broadcast) ở Ưu tiên 4.
export async function notifyUser(
  recipientUserId: string,
  title: string,
  body: string,
  client?: PoolClient,
): Promise<void> {
  const sql = `INSERT INTO notifications (recipient_user_id, title, body, target_scope)
               VALUES ($1, $2, $3, 'single')`;
  const params = [recipientUserId, title, body];
  if (client) {
    await client.query(sql, params);
  } else {
    await query(sql, params);
  }
}
