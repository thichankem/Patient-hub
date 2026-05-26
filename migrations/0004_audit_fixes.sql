-- =============================================================
-- 0004 — Audit fixes (xem API_AUDIT_NOTES.md)
-- =============================================================
-- Cộng dồn các thay đổi schema để fix các vấn đề logic / kiểm soát:
--   - Hóa đơn: phí khám bác sĩ (consultation_fee) + số tiền nhận thật (received_amount)
--   - Notification: per-user read state cho broadcast
--   - Chat: read_at / delivered_at
--   - Failed login tracking (chống brute-force)
--   - Webhook failure audit
--   - Login attempt log (tùy chọn theo dõi)

-- 1. INVOICES: phí khám + số tiền thực thu (cashier không gian lận được)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS consultation_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS received_amount  NUMERIC(12, 2);

COMMENT ON COLUMN invoices.consultation_fee
  IS 'Phí khám bác sĩ snapshot tại thời điểm sinh hóa đơn';
COMMENT ON COLUMN invoices.received_amount
  IS 'Số tiền cashier nhận thực tế khi thu tiền mặt; phải >= final_amount';

-- 2. USERS: tracking failed login để lock account
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS failed_login_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until       TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_locked_until
  ON users(locked_until) WHERE locked_until IS NOT NULL;

-- 3. PASSWORD RESET TRACKING (rate limit forgot-password)
CREATE TABLE IF NOT EXISTS password_reset_log (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone      VARCHAR(20) NOT NULL,
  ip_addr    VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pwreset_phone_time
  ON password_reset_log(phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pwreset_ip_time
  ON password_reset_log(ip_addr, created_at DESC) WHERE ip_addr IS NOT NULL;

-- 4. CHAT: read tracking
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_chat_unread
  ON chat_messages(receiver_user_id) WHERE read_at IS NULL;

-- 5. NOTIFICATION: per-user read state cho broadcast
-- Hiện tại 1 row broadcast cho mọi user; cần bảng phụ để track ai đã đọc.
CREATE TABLE IF NOT EXISTS notification_reads (
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id)        ON DELETE CASCADE,
  read_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (notification_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_notif_reads_user
  ON notification_reads(user_id);

-- 6. WEBHOOK FAILURE AUDIT (cả VNPay + PayOS)
CREATE TABLE IF NOT EXISTS webhook_failures (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider   VARCHAR(20) NOT NULL,                -- 'vnpay' | 'payos'
  payload    JSONB,
  error_msg  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webhook_failures_provider_time
  ON webhook_failures(provider, created_at DESC);

-- 7. APPOINTMENT: thêm cột giới hạn lịch / ngày của bác sĩ
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS max_appointments_per_day INT NOT NULL DEFAULT 30;
COMMENT ON COLUMN doctors.max_appointments_per_day
  IS 'Số lịch tối đa bác sĩ chấp nhận trong 1 ngày; auto-assign sẽ tôn trọng';
