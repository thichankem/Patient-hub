-- =============================================================
-- 0002 — Lưu vết giao dịch VNPay trên bảng invoices
-- =============================================================
-- vnp_txn_ref:        mã giao dịch merchant gửi VNPay (unique per attempt)
-- vnp_transaction_no: mã giao dịch do VNPay sinh
-- vnp_response_code:  mã kết quả (00 = success, xem RESPONSE_MAP)
-- vnp_bank_code:      mã ngân hàng người dùng dùng để thanh toán
-- vnp_pay_date:       chuỗi yyyyMMddHHmmss do VNPay trả về

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS vnp_txn_ref        VARCHAR(64),
  ADD COLUMN IF NOT EXISTS vnp_transaction_no VARCHAR(64),
  ADD COLUMN IF NOT EXISTS vnp_response_code  VARCHAR(8),
  ADD COLUMN IF NOT EXISTS vnp_bank_code      VARCHAR(32),
  ADD COLUMN IF NOT EXISTS vnp_pay_date       VARCHAR(20);

-- Index để IPN lookup nhanh theo vnp_TxnRef
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_vnp_txn_ref
  ON invoices(vnp_txn_ref)
  WHERE vnp_txn_ref IS NOT NULL;
