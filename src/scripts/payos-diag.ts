// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic PayOS — kiểm tra config, tạo payment link mẫu, in checkoutUrl
// + qrCode để bạn quét test ngay. Chạy: npm run payos:diag
// ─────────────────────────────────────────────────────────────────────────────

import { env } from '../config/env';
import {
  createPaymentLink,
  generateOrderCode,
  payosClient,
} from '../integrations/payos';

function row(label: string, value: string | undefined, note?: string): void {
  const v = value && value.length > 0 ? value : '(trống)';
  const padded = label.padEnd(22);
  console.log(`  ${padded}${v}${note ? '  ' + note : ''}`);
}

function header(t: string): void {
  console.log(`\n── ${t} ─────────────────────────────────────────`);
}

const tickFail = (m: string) => console.log(`  ❌ ${m}`);
const tickPass = (m: string) => console.log(`  ✅ ${m}`);
const tickWarn = (m: string) => console.log(`  ⚠️  ${m}`);

async function main(): Promise<void> {
  console.log('🔍 PayOS diagnostic');

  header('1. Biến môi trường');
  row('NODE_ENV', env.NODE_ENV);
  row('PAYOS_CLIENT_ID', env.PAYOS_CLIENT_ID, env.PAYOS_CLIENT_ID ? '' : '← BẮT BUỘC');
  row(
    'PAYOS_API_KEY',
    env.PAYOS_API_KEY ? `(${env.PAYOS_API_KEY.length} ký tự)` : '',
    env.PAYOS_API_KEY ? '' : '← BẮT BUỘC',
  );
  row(
    'PAYOS_CHECKSUM_KEY',
    env.PAYOS_CHECKSUM_KEY ? `(${env.PAYOS_CHECKSUM_KEY.length} ký tự)` : '',
    env.PAYOS_CHECKSUM_KEY ? '' : '← BẮT BUỘC',
  );
  row('PAYOS_RETURN_URL', env.PAYOS_RETURN_URL);
  row('PAYOS_CANCEL_URL', env.PAYOS_CANCEL_URL);

  header('2. Kiểm tra điều kiện');
  let ok = true;
  if (!env.PAYOS_CLIENT_ID) {
    tickFail('PAYOS_CLIENT_ID trống — lấy ở https://my.payos.vn → Kênh thanh toán → Thông tin tích hợp');
    ok = false;
  } else {
    tickPass('PAYOS_CLIENT_ID đã set');
  }
  if (!env.PAYOS_API_KEY) {
    tickFail('PAYOS_API_KEY trống');
    ok = false;
  } else {
    tickPass('PAYOS_API_KEY đã set');
  }
  if (!env.PAYOS_CHECKSUM_KEY) {
    tickFail('PAYOS_CHECKSUM_KEY trống');
    ok = false;
  } else {
    tickPass('PAYOS_CHECKSUM_KEY đã set');
  }
  if (env.PAYOS_RETURN_URL.includes('localhost') && env.NODE_ENV === 'production') {
    tickWarn('PAYOS_RETURN_URL còn localhost ở production');
  }

  if (!ok) {
    console.log('\n⛔ Có lỗi cấu hình — sửa .env rồi chạy lại.');
    process.exit(1);
  }

  header('3. Khởi tạo client');
  try {
    const c = payosClient();
    row('baseURL', c.baseURL);
    row('clientId', c.clientId);
    tickPass('Client init OK');
  } catch (e) {
    tickFail(`Init lỗi: ${(e as Error).message}`);
    process.exit(1);
  }

  header('4. Tạo payment link mẫu (10.000đ)');
  try {
    const orderCode = generateOrderCode();
    const result = await createPaymentLink({
      orderCode,
      amount: 10000,
      description: `TEST ${orderCode.toString().slice(-6)}`,
    });
    row('orderCode', String(orderCode));
    row('paymentLinkId', result.paymentLinkId);
    row('accountNumber', result.accountNumber);
    row('accountName', result.accountName);
    row('bin', result.bin);
    row('status', result.status);
    console.log('\n  checkoutUrl:');
    console.log(`    ${result.checkoutUrl}`);
    console.log('\n  qrCode (VietQR string — paste vào app banking để test):');
    console.log(`    ${result.qrCode}`);
    tickPass('Tạo link thành công — mở checkoutUrl trong browser để thử thanh toán');
  } catch (e) {
    tickFail(`Tạo link lỗi: ${(e as Error).message}`);
    console.log(
      '\n  Nguyên nhân thường gặp:\n' +
        '  • 401: PAYOS_API_KEY sai hoặc kênh thanh toán chưa active\n' +
        '  • 403: clientId/apiKey không khớp với kênh đang dùng\n' +
        '  • 422: amount < 2000đ hoặc description > 25 ký tự\n',
    );
    process.exit(1);
  }

  header('5. Sau khi test thành công');
  console.log(`
  → Quét QR / mở checkoutUrl bằng app ngân hàng (Vietcombank, MB, TPBank...)
    và chuyển 10.000đ. PayOS sẽ đối soát realtime.

  → Đăng ký webhook URL với PayOS (1 lần, sau khi deploy):
      curl -X POST https://api-merchant.payos.vn/confirm-webhook \\
        -H "x-client-id: ${env.PAYOS_CLIENT_ID}" \\
        -H "x-api-key: ${env.PAYOS_API_KEY}" \\
        -d '{"webhookUrl":"https://<domain-public>/api/invoices/payos-webhook"}'

    Hoặc dùng SDK: \`await payosClient().webhooks.confirm(url)\`

  → Local test: \`ngrok http 3000\` rồi đăng ký URL ngrok làm webhookUrl.
    PayOS không gọi được localhost.
`);
}

void main().then(() => process.exit(0));
