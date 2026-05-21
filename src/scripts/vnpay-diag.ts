// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic VNPay — kiểm tra config, sinh URL mẫu, in ra để debug 404.
// Chạy: npm run vnpay:diag
// ─────────────────────────────────────────────────────────────────────────────

import { env } from '../config/env';
import {
  buildPaymentUrl,
  generateTxnRef,
  vnpayClient,
} from '../integrations/vnpay';

function row(label: string, value: string | undefined, note?: string): void {
  const v = value && value.length > 0 ? value : '(trống)';
  const padded = label.padEnd(20);
  console.log(`  ${padded}${v}${note ? '  ' + note : ''}`);
}

function header(t: string): void {
  console.log(`\n── ${t} ─────────────────────────────────────────`);
}

function pass(msg: string): void {
  console.log(`  ✅ ${msg}`);
}

function fail(msg: string): void {
  console.log(`  ❌ ${msg}`);
}

function warn(msg: string): void {
  console.log(`  ⚠️  ${msg}`);
}

async function main(): Promise<void> {
  console.log('🔍 VNPay diagnostic');

  header('1. Biến môi trường');
  row('NODE_ENV', env.NODE_ENV);
  row('VNP_HOST', env.VNP_HOST);
  row('VNP_TMN_CODE', env.VNP_TMN_CODE, env.VNP_TMN_CODE ? '' : '← BẮT BUỘC');
  row(
    'VNP_HASH_SECRET',
    env.VNP_HASH_SECRET ? `(${env.VNP_HASH_SECRET.length} ký tự)` : '',
    env.VNP_HASH_SECRET ? '' : '← BẮT BUỘC',
  );
  row('VNP_RETURN_URL', env.VNP_RETURN_URL);
  row('VNP_ALLOWED_IPS', env.VNP_ALLOWED_IPS, env.VNP_ALLOWED_IPS ? '' : '(whitelist tắt)');

  header('2. Kiểm tra điều kiện');

  let ok = true;
  if (!env.VNP_TMN_CODE) {
    fail('VNP_TMN_CODE trống — đăng ký terminal sandbox tại https://sandbox.vnpayment.vn');
    ok = false;
  } else if (env.VNP_TMN_CODE.length < 4 || env.VNP_TMN_CODE.length > 20) {
    warn(`VNP_TMN_CODE độ dài ${env.VNP_TMN_CODE.length} — VNPay thường cấp 8 ký tự`);
  } else {
    pass(`VNP_TMN_CODE hợp lệ (${env.VNP_TMN_CODE.length} ký tự)`);
  }

  if (!env.VNP_HASH_SECRET) {
    fail('VNP_HASH_SECRET trống — lấy từ portal cùng terminal');
    ok = false;
  } else if (env.VNP_HASH_SECRET.length < 16) {
    warn(`VNP_HASH_SECRET quá ngắn (${env.VNP_HASH_SECRET.length}) — VNPay sandbox thường 32 ký tự HMAC, production cấp 64`);
  } else {
    pass(`VNP_HASH_SECRET hợp lệ (${env.VNP_HASH_SECRET.length} ký tự)`);
  }

  if (!env.VNP_HOST.startsWith('https://')) {
    warn(`VNP_HOST không bắt đầu bằng https:// — kiểm tra lại`);
  } else if (
    env.VNP_HOST.includes('sandbox') &&
    env.NODE_ENV === 'production'
  ) {
    warn('Đang dùng sandbox host ở production — chuyển sang https://pay.vnpay.vn');
  } else if (
    !env.VNP_HOST.includes('sandbox') &&
    env.NODE_ENV !== 'production'
  ) {
    warn('Đang dùng production host ở dev/test — chuyển sang https://sandbox.vnpayment.vn');
  } else {
    pass(`VNP_HOST đúng môi trường`);
  }

  if (env.VNP_RETURN_URL.includes('localhost') && env.NODE_ENV === 'production') {
    fail('VNP_RETURN_URL còn là localhost ở production');
    ok = false;
  } else {
    pass(`VNP_RETURN_URL = ${env.VNP_RETURN_URL}`);
  }

  if (!ok) {
    console.log('\n⛔ Có lỗi cấu hình — sửa .env rồi chạy lại.');
    process.exit(1);
  }

  header('3. Default config từ SDK');
  try {
    const dc = vnpayClient().defaultConfig;
    row('vnp_Version', dc.vnp_Version);
    row('vnp_Command', dc.vnp_Command);
    row('vnp_CurrCode', dc.vnp_CurrCode);
    row('vnp_Locale', dc.vnp_Locale);
    row('vnp_OrderType', dc.vnp_OrderType);
    row('vnp_TmnCode', dc.vnp_TmnCode);
  } catch (e) {
    fail(`Không khởi tạo được VNPay client: ${(e as Error).message}`);
    process.exit(1);
  }

  header('4. URL thanh toán mẫu (50.000đ)');
  const txnRef = generateTxnRef();
  const url = buildPaymentUrl({
    amount: 50000,
    txnRef,
    orderInfo: `Thanh toan thu nghiem ${txnRef}`,
    ipAddr: '127.0.0.1',
  });
  console.log(`\n  txnRef = ${txnRef}`);
  console.log(`\n  ${url}\n`);

  header('5. Checklist khi 404 trên VNPay');
  console.log(`
  → Copy URL trên dán vào trình duyệt:

  • Nếu vẫn 404 với ảnh "Rất tiếc, trang bạn tìm kiếm không tồn tại":
    1. VNP_TMN_CODE chưa đúng / terminal chưa active trong portal sandbox.
       → Login https://sandbox.vnpayment.vn, kiểm tra terminal đang ở
         trạng thái "Hoạt động" và code khớp.
    2. Terminal chưa được duyệt phương thức thanh toán nào (Visa/QR/ATM).
       → Vào "Quản lý terminal" → "Phương thức TT" → tick các phương thức.
    3. VNP_HOST sai (ví dụ thiếu "https://" hoặc gõ nhầm "vnpay.vn" thay
       vì "vnpayment.vn").

  • Nếu vào được trang chọn ngân hàng nhưng báo "Sai chữ ký":
    → VNP_HASH_SECRET không khớp với terminal. Copy lại từ portal.

  • Nếu thanh toán xong nhưng BE không nhận IPN:
    → IPN URL trong portal phải public (ngrok / domain thật), không
      được trỏ localhost. VNPay không gọi được localhost.

  • Nếu IPN gọi tới nhưng phản hồi "97 - Invalid Checksum":
    → Đảm bảo VNPay portal khai đúng URL backend, KHÔNG có trailing slash.
`);
}

void main().then(() => process.exit(0));
