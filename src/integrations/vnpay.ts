// ─────────────────────────────────────────────────────────────────────────────
// Tích hợp VNPay thật (Payment Gateway).
//
// Luồng:
//   1. Bệnh nhân bấm "Thanh toán VNPay" → backend tạo vnp_TxnRef, dựng URL,
//      lưu vnp_txn_ref vào DB rồi trả URL về cho client redirect.
//   2. Sau khi thanh toán xong, VNPay redirect bệnh nhân về vnp_ReturnUrl
//      (trình duyệt) → chỉ để hiển thị kết quả cho UI, KHÔNG được coi là
//      bằng chứng đã trả tiền.
//   3. VNPay đồng thời gọi IPN URL (server-to-server) → đây mới là chỗ
//      đáng tin cậy để cập nhật trạng thái paid.
//
// Docs: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
// ─────────────────────────────────────────────────────────────────────────────

import {
  HashAlgorithm,
  IpnFailChecksum,
  IpnInvalidAmount,
  IpnOrderNotFound,
  IpnSuccess,
  IpnUnknownError,
  ProductCode,
  VnpLocale,
  VNPay,
  type ReturnQueryFromVNPay,
} from 'vnpay';
import { env } from '../config/env';

function assertConfig(): { tmn: string; secret: string } {
  if (!env.VNP_TMN_CODE || !env.VNP_HASH_SECRET) {
    throw new Error(
      'Thiếu cấu hình VNPay: cần VNP_TMN_CODE và VNP_HASH_SECRET trong .env. ' +
        'Đăng ký terminal sandbox tại https://sandbox.vnpayment.vn',
    );
  }
  return { tmn: env.VNP_TMN_CODE, secret: env.VNP_HASH_SECRET };
}

// Singleton — VNPay client stateless, build 1 lần.
let _client: VNPay | null = null;
export function vnpayClient(): VNPay {
  if (_client) return _client;
  const { tmn, secret } = assertConfig();
  _client = new VNPay({
    vnpayHost: env.VNP_HOST,
    tmnCode: tmn,
    secureSecret: secret,
    hashAlgorithm: HashAlgorithm.SHA512,
    // testMode=true sẽ ép host về sandbox bất kể vnpayHost; bật ở dev cho an toàn.
    testMode: env.NODE_ENV !== 'production',
  });
  return _client;
}

// Sinh mã giao dịch merchant — VNPay yêu cầu unique, không quá 100 ký tự.
// Dùng timestamp + random 6 ký tự để tránh va chạm khi user bấm lại.
export function generateTxnRef(): string {
  const ts = new Date()
    .toISOString()
    .replace(/[^0-9]/g, '')
    .slice(0, 14); // yyyyMMddHHmmss
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${ts}${rand}`;
}

interface BuildUrlInput {
  amount: number; // VND, đã làm tròn về số nguyên
  txnRef: string;
  orderInfo: string; // không dấu Tiếng Việt
  ipAddr: string;
  bankCode?: string;
}

export function buildPaymentUrl(input: BuildUrlInput): string {
  return vnpayClient().buildPaymentUrl({
    vnp_Amount: input.amount, // SDK tự nhân 100
    vnp_TxnRef: input.txnRef,
    vnp_OrderInfo: input.orderInfo,
    vnp_IpAddr: input.ipAddr,
    vnp_ReturnUrl: env.VNP_RETURN_URL,
    vnp_Locale: VnpLocale.VN,
    vnp_OrderType: ProductCode.Other,
    ...(input.bankCode ? { vnp_BankCode: input.bankCode } : {}),
  });
}

export interface VnpVerified {
  isVerified: boolean;
  isSuccess: boolean;
  message: string;
  txnRef?: string;
  amountVnd?: number;
  transactionNo?: string;
  responseCode?: string;
  bankCode?: string;
  payDate?: string;
}

function normalize(
  result: { isVerified: boolean; isSuccess: boolean; message: string },
  query: ReturnQueryFromVNPay,
): VnpVerified {
  return {
    isVerified: result.isVerified,
    isSuccess: result.isSuccess,
    message: result.message,
    txnRef: query.vnp_TxnRef ? String(query.vnp_TxnRef) : undefined,
    amountVnd: query.vnp_Amount
      ? Math.round(Number(query.vnp_Amount) / 100)
      : undefined,
    transactionNo: query.vnp_TransactionNo
      ? String(query.vnp_TransactionNo)
      : undefined,
    responseCode: query.vnp_ResponseCode
      ? String(query.vnp_ResponseCode)
      : undefined,
    bankCode: query.vnp_BankCode ? String(query.vnp_BankCode) : undefined,
    payDate: query.vnp_PayDate ? String(query.vnp_PayDate) : undefined,
  };
}

// Browser return — chỉ verify chữ ký, KHÔNG được dùng để mark paid.
export function verifyReturnUrl(query: ReturnQueryFromVNPay): VnpVerified {
  const r = vnpayClient().verifyReturnUrl(query);
  return normalize(r, query);
}

// IPN — server-to-server, đây mới là nguồn sự thật.
export function verifyIpnCall(query: ReturnQueryFromVNPay): VnpVerified {
  const r = vnpayClient().verifyIpnCall(query);
  return normalize(r, query);
}

// Re-export các IpnResponse chuẩn để controller phản hồi đúng format VNPay yêu cầu.
export const VnpIpn = {
  Success: IpnSuccess,
  OrderNotFound: IpnOrderNotFound,
  InvalidAmount: IpnInvalidAmount,
  FailChecksum: IpnFailChecksum,
  UnknownError: IpnUnknownError,
};

// Helper: trích IP của caller.
// QUAN TRỌNG: dùng req.ip (Express tự xử lý theo trust proxy setting).
// Trước đây đọc trực tiếp X-Forwarded-For khi không bật trust proxy → bị spoof
// → whitelist IP vô tác dụng. Xem env.TRUST_PROXY.
export function clientIp(req: { ip?: string; socket: { remoteAddress?: string | null } }): string {
  return req.ip ?? req.socket.remoteAddress ?? '127.0.0.1';
}

// Chuẩn hóa IPv4-mapped IPv6 (vd ::ffff:1.2.3.4 → 1.2.3.4) để so sánh whitelist.
function normalizeIp(ip: string): string {
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

function ipInList(ip: string, csv: string | undefined): boolean {
  if (!csv) return true; // bỏ trống = tắt
  const list = csv.split(',').map((s) => s.trim()).filter(Boolean);
  const norm = normalizeIp(ip);
  return list.includes(norm) || list.includes(ip);
}

export function isIpAllowed(ip: string): boolean {
  return ipInList(ip, env.VNP_ALLOWED_IPS);
}

export function isPayosIpAllowed(ip: string): boolean {
  return ipInList(ip, env.PAYOS_ALLOWED_IPS);
}
