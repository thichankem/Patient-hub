// ─────────────────────────────────────────────────────────────────────────────
// Tích hợp PayOS (VietQR, chuyển khoản ngân hàng, ví điện tử).
//
// Luồng:
//   1. BE gọi paymentRequests.create({ orderCode, amount, ... }) → trả
//      { checkoutUrl, qrCode, paymentLinkId, accountNumber, ... }.
//   2. FE redirect user sang checkoutUrl (hoặc hiển thị qrCode để quét VietQR).
//   3. User chuyển khoản → PayOS đối soát qua bank API → gửi webhook về BE.
//   4. BE gọi webhooks.verify(body) để xác minh chữ ký → mark invoice paid.
//
// Khác VNPay: PayOS dùng orderCode KIỂU SỐ (number, unique trong merchant).
// Description giới hạn 25 ký tự.
//
// Docs: https://payos.vn/docs/
// ─────────────────────────────────────────────────────────────────────────────

import { PayOS, type Webhook, type WebhookData } from '@payos/node';
import { env } from '../config/env';

function assertConfig(): {
  clientId: string;
  apiKey: string;
  checksumKey: string;
} {
  if (!env.PAYOS_CLIENT_ID || !env.PAYOS_API_KEY || !env.PAYOS_CHECKSUM_KEY) {
    throw new Error(
      'Thiếu cấu hình PayOS: cần PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY ' +
        'trong .env. Đăng ký kênh thanh toán tại https://my.payos.vn',
    );
  }
  return {
    clientId: env.PAYOS_CLIENT_ID,
    apiKey: env.PAYOS_API_KEY,
    checksumKey: env.PAYOS_CHECKSUM_KEY,
  };
}

let _client: PayOS | null = null;
export function payosClient(): PayOS {
  if (_client) return _client;
  const { clientId, apiKey, checksumKey } = assertConfig();
  _client = new PayOS({ clientId, apiKey, checksumKey });
  return _client;
}

// PayOS yêu cầu orderCode là number unique. Dùng millisecond timestamp +
// 3 chữ số ngẫu nhiên — đủ unique và nằm gọn trong JS safe integer
// (Number.MAX_SAFE_INTEGER = 9_007_199_254_740_991).
export function generateOrderCode(): number {
  const ts = Date.now(); // 13 digits
  const rand = Math.floor(Math.random() * 1000); // 0-999
  return ts * 1000 + rand;
}

interface CreateLinkInput {
  orderCode: number;
  amount: number; // VND nguyên
  description: string; // tối đa 25 ký tự
  buyerName?: string;
  buyerPhone?: string;
}

export interface PayosLinkResult {
  checkoutUrl: string;
  qrCode: string;
  paymentLinkId: string;
  orderCode: number;
  amount: number;
  accountNumber: string;
  accountName: string;
  bin: string;
  status: string;
}

export async function createPaymentLink(
  input: CreateLinkInput,
): Promise<PayosLinkResult> {
  const desc = input.description.slice(0, 25); // PayOS hard limit
  const res = await payosClient().paymentRequests.create({
    orderCode: input.orderCode,
    amount: input.amount,
    description: desc,
    cancelUrl: env.PAYOS_CANCEL_URL,
    returnUrl: env.PAYOS_RETURN_URL,
    ...(input.buyerName ? { buyerName: input.buyerName } : {}),
    ...(input.buyerPhone ? { buyerPhone: input.buyerPhone } : {}),
  });
  return {
    checkoutUrl: res.checkoutUrl,
    qrCode: res.qrCode,
    paymentLinkId: res.paymentLinkId,
    orderCode: res.orderCode,
    amount: res.amount,
    accountNumber: res.accountNumber,
    accountName: res.accountName,
    bin: res.bin,
    status: res.status,
  };
}

// Verify webhook — throw InvalidSignatureError nếu sai. Service phải bắt
// để trả response phù hợp (PayOS expect HTTP 200 với JSON ack đơn giản).
export async function verifyWebhook(body: Webhook): Promise<WebhookData> {
  return payosClient().webhooks.verify(body);
}

// Đăng ký webhook URL với PayOS (PayOS sẽ test bằng request thử).
// Dùng để chạy 1 lần sau khi deploy / khi đổi domain.
export async function confirmWebhook(url: string): Promise<{ webhookUrl: string }> {
  const res = await payosClient().webhooks.confirm(url);
  return { webhookUrl: res.webhookUrl };
}

// Truy vấn trạng thái link bằng orderCode.
export async function getPaymentInfo(orderCode: number) {
  return payosClient().paymentRequests.get(orderCode);
}

// Hủy link nếu user bỏ ngang (tránh để link mở vô thời hạn).
export async function cancelPaymentLink(
  orderCode: number,
  reason?: string,
): Promise<void> {
  await payosClient().paymentRequests.cancel(orderCode, reason);
}

export { type Webhook as PayosWebhook, type WebhookData as PayosWebhookData } from '@payos/node';
