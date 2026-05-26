import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

// Webhook payment gateway gọi từ IP cố định và có thể retry nhiều lần khi
// gặp lỗi tạm. Nếu áp global rate-limit cho chúng, có thể chặn nhầm IPN
// hợp lệ → mất giao dịch. Chữ ký HMAC + IP whitelist riêng đã đủ bảo vệ.
const WEBHOOK_PATHS = [
  '/api/invoices/vnpay-ipn',
  '/api/invoices/payos-webhook',
];

function isWebhook(req: Request): boolean {
  return WEBHOOK_PATHS.includes(req.path);
}

// Global limit — chống flood toàn cục, áp cho mọi endpoint trừ webhook.
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300, // 5 req/giây/IP — đủ rộng cho UI bình thường, đủ chặt cho bot.
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: isWebhook,
});

// Login — chống brute-force. Hạn rất chặt vì auth là điểm yếu chính.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Quá nhiều lần đăng nhập sai, vui lòng thử lại sau 15 phút' },
});

// Forgot password — bảo vệ chi phí SMS + chống spam reset SĐT nạn nhân.
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Quá nhiều yêu cầu khôi phục mật khẩu, vui lòng thử lại sau 1 giờ' },
});
