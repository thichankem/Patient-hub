-- =============================================================
-- 0003 — Tích hợp PayOS (QR VietQR + chuyển khoản ngân hàng)
-- =============================================================
-- PayOS dùng orderCode (số nguyên dương duy nhất) để định danh giao dịch,
-- và trả về paymentLinkId (UUID) khi tạo link. Webhook chứa cả 2 + reference
-- (mã giao dịch ngân hàng) để đối soát.

-- Thêm value 'payos' vào enum payment_method.
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'payos';

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payos_order_code        BIGINT,
  ADD COLUMN IF NOT EXISTS payos_payment_link_id   VARCHAR(64),
  ADD COLUMN IF NOT EXISTS payos_reference         VARCHAR(64),
  ADD COLUMN IF NOT EXISTS payos_transaction_time  VARCHAR(40),
  ADD COLUMN IF NOT EXISTS payos_account_number    VARCHAR(40),
  ADD COLUMN IF NOT EXISTS payos_qr_code           TEXT;

-- Webhook lookup theo orderCode → cần unique partial.
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_payos_order_code
  ON invoices(payos_order_code)
  WHERE payos_order_code IS NOT NULL;
