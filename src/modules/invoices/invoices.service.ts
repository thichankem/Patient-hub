import type { ReturnQueryFromVNPay } from 'vnpay';
import { query, queryOne, withTransaction } from '../../db/query';
import { AppError } from '../../middleware/error';
import { env } from '../../config/env';
import type { TokenPayload } from '../../utils/jwt';
import type {
  ExaminationSessionRow,
  InvoiceItemRow,
  InvoiceRow,
  PatientRow,
} from '../../types/db';
import {
  buildPaymentUrl,
  generateTxnRef,
  VnpIpn,
  verifyIpnCall,
  verifyReturnUrl,
  type VnpVerified,
} from '../../integrations/vnpay';
import {
  cancelPaymentLink as payosCancel,
  createPaymentLink as payosCreate,
  generateOrderCode as payosGenerateOrderCode,
  verifyWebhook as payosVerifyWebhook,
  type PayosLinkResult,
  type PayosWebhook,
} from '../../integrations/payos';
import { notifyUser } from '../notifications/notification.helper';
import { logger } from '../../utils/logger';
import type {
  GenerateInvoiceInput,
  ListInvoiceQuery,
  PayCashInput,
  RevenueQuery,
} from './invoices.schema';

interface InvoiceDetail extends InvoiceRow {
  items: InvoiceItemRow[];
}

async function patientIdOfUser(userId: string): Promise<string> {
  const row = await queryOne<{ id: string }>(
    'SELECT id FROM patients WHERE user_id = $1',
    [userId],
  );
  if (!row) throw new AppError(404, 'Không tìm thấy hồ sơ bệnh nhân');
  return row.id;
}

async function loadDetail(id: string): Promise<InvoiceDetail> {
  const inv = await queryOne<InvoiceRow>(
    'SELECT * FROM invoices WHERE id = $1',
    [id],
  );
  if (!inv) throw new AppError(404, 'Hóa đơn không tồn tại');
  const items = await query<InvoiceItemRow>(
    'SELECT * FROM invoice_items WHERE invoice_id = $1',
    [id],
  );
  return { ...inv, items };
}

// Quy đổi tiền theo BHYT: nếu insurance_expiry còn hạn → dùng insurance_price.
function applyInsurance(
  unit: string,
  insurance: string,
  hasValidInsurance: boolean,
): { discounted: string } {
  return { discounted: hasValidInsurance ? insurance : unit };
}

async function logWebhookFailure(
  provider: 'vnpay' | 'payos',
  payload: unknown,
  errorMsg: string,
): Promise<void> {
  try {
    await query(
      `INSERT INTO webhook_failures (provider, payload, error_msg)
       VALUES ($1, $2::jsonb, $3)`,
      [provider, JSON.stringify(payload ?? null), errorMsg],
    );
    logger.warn({ provider, errorMsg }, 'webhook failure logged');
  } catch (err) {
    logger.error({ err, provider }, 'không ghi được webhook_failures');
  }
}

// Sinh hóa đơn nháp (pending). Điều kiện: session finalized + tất cả XN completed.
// Hóa đơn = phí khám (snapshot) + tổng các xét nghiệm đã hoàn tất.
// (Thuốc theo prescription_items hiện chưa có giá riêng — dùng lib_medicines.price,
//  nhưng schema invoice_items chưa có service_type='medicine'. Để giảm rủi ro
//  thay đổi nghiệp vụ, hiện chỉ thêm consultation_fee. Thuốc bổ sung ở bước sau
//  khi schema mở rộng.)
export async function generateInvoice(
  input: GenerateInvoiceInput,
  actor: TokenPayload,
): Promise<InvoiceDetail> {
  if (!['cashier', 'patient'].includes(actor.role))
    throw new AppError(403, 'Chỉ thu ngân hoặc bệnh nhân được sinh hóa đơn');

  const session = await queryOne<ExaminationSessionRow>(
    'SELECT * FROM examination_sessions WHERE id = $1',
    [input.session_id],
  );
  if (!session) throw new AppError(404, 'Đợt khám không tồn tại');
  if (!session.is_finalized)
    throw new AppError(409, 'Đợt khám chưa được bác sĩ chốt');

  // Patient chỉ được sinh hóa đơn của chính mình.
  if (actor.role === 'patient') {
    const pid = await patientIdOfUser(actor.sub);
    if (session.patient_id !== pid)
      throw new AppError(403, 'Không phải đợt khám của bạn');
  }

  // Không cho tạo trùng — đã có invoice cho session này.
  const exist = await queryOne<InvoiceRow>(
    'SELECT * FROM invoices WHERE session_id = $1',
    [input.session_id],
  );
  if (exist) return loadDetail(exist.id);

  // Tất cả XN phải completed.
  const pending = await queryOne<{ n: string }>(
    `SELECT COUNT(*) AS n
       FROM test_order_items toi
       JOIN test_orders t ON t.id = toi.test_order_id
      WHERE t.session_id = $1 AND toi.status <> 'completed'`,
    [input.session_id],
  );
  if (pending && Number(pending.n) > 0)
    throw new AppError(409, 'Còn xét nghiệm chưa hoàn tất — chưa thể thanh toán');

  const patient = await queryOne<PatientRow>(
    'SELECT * FROM patients WHERE id = $1',
    [session.patient_id],
  );
  if (!patient) throw new AppError(404, 'Bệnh nhân không tồn tại');

  const today = new Date().toISOString().slice(0, 10);
  const hasInsurance =
    !!patient.insurance_number_encrypted &&
    !!patient.insurance_expiry &&
    patient.insurance_expiry >= today;

  // Lấy danh sách dịch vụ: phí khám + n xét nghiệm.
  const consultationFee = env.DEFAULT_CONSULTATION_FEE;

  const testRows = await query<{
    item_id: string;
    test_type_id: string;
    test_name: string;
    price: string;
    insurance_price: string;
  }>(
    `SELECT toi.id AS item_id, lt.id AS test_type_id, lt.name AS test_name,
            lt.price, lt.insurance_price
       FROM test_order_items toi
       JOIN test_orders t ON t.id = toi.test_order_id
       JOIN lib_test_types lt ON lt.id = toi.test_type_id
      WHERE t.session_id = $1 AND toi.status = 'completed'`,
    [input.session_id],
  );

  // Phí khám luôn tính. BHYT không áp dụng cho phí khám trong v1.
  let total = consultationFee;
  let discount = 0;
  const itemsToInsert: Array<{
    service_type: 'consultation' | 'test';
    test_order_item_id: string | null;
    service_label: string;
    unit_price: string;
    discounted_price: string;
    quantity: number;
    subtotal: string;
  }> = [
    {
      service_type: 'consultation',
      test_order_item_id: null,
      service_label: 'Phí khám bệnh',
      unit_price: consultationFee.toFixed(2),
      discounted_price: consultationFee.toFixed(2),
      quantity: 1,
      subtotal: consultationFee.toFixed(2),
    },
  ];

  for (const r of testRows) {
    const { discounted } = applyInsurance(r.price, r.insurance_price, hasInsurance);
    const unit = Number(r.price);
    const disc = Number(discounted);
    total += unit;
    discount += unit - disc;
    itemsToInsert.push({
      service_type: 'test',
      test_order_item_id: r.item_id,
      service_label: r.test_name,
      unit_price: r.price,
      discounted_price: discounted,
      quantity: 1,
      subtotal: discounted,
    });
  }

  const final = total - discount;

  let created: InvoiceRow;
  try {
    created = await withTransaction(async (client) => {
      const inv = await client.query<InvoiceRow>(
        `INSERT INTO invoices
           (patient_id, session_id, total_amount, insurance_discount, final_amount,
            consultation_fee, payment_status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
        [
          session.patient_id,
          input.session_id,
          total.toFixed(2),
          discount.toFixed(2),
          final.toFixed(2),
          consultationFee.toFixed(2),
        ],
      );
      const invoiceId = inv.rows[0]!.id;
      for (const it of itemsToInsert) {
        await client.query(
          `INSERT INTO invoice_items
             (invoice_id, service_type, test_order_item_id, service_label,
              unit_price, discounted_price, quantity, subtotal)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            invoiceId,
            it.service_type,
            it.test_order_item_id,
            it.service_label,
            it.unit_price,
            it.discounted_price,
            it.quantity,
            it.subtotal,
          ],
        );
      }
      return inv.rows[0]!;
    });
  } catch (err: unknown) {
    // Race condition: 2 request đồng thời cùng pass check `exist` → cùng INSERT.
    // invoices.session_id là UNIQUE → 1 ăn, 1 throw 23505. Convert sang trả về
    // invoice đã tạo (idempotent giống nhánh `if (exist)` ở trên).
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      const existing = await queryOne<InvoiceRow>(
        'SELECT * FROM invoices WHERE session_id = $1',
        [input.session_id],
      );
      if (existing) return loadDetail(existing.id);
    }
    throw err;
  }

  return loadDetail(created.id);
}

// Bệnh nhân khởi tạo phiên thanh toán VNPay. Trả URL cho client redirect.
// LƯU Ý: hóa đơn KHÔNG được đánh dấu paid ở đây — chỉ ghi vnp_txn_ref + đặt
// payment_method='vnpay'. Trạng thái 'paid' chỉ được set ở handleVnpayIpn().
export async function payVnpay(
  id: string,
  actor: TokenPayload,
  ipAddr: string,
  bankCode?: string,
): Promise<{ invoice: InvoiceDetail; vnp_url: string }> {
  if (actor.role !== 'patient')
    throw new AppError(403, 'Chỉ bệnh nhân thanh toán online');

  const inv = await queryOne<InvoiceRow>(
    'SELECT * FROM invoices WHERE id = $1',
    [id],
  );
  if (!inv) throw new AppError(404, 'Hóa đơn không tồn tại');

  const pid = await patientIdOfUser(actor.sub);
  if (inv.patient_id !== pid) throw new AppError(403, 'Không phải hóa đơn của bạn');

  if (inv.payment_status === 'paid')
    throw new AppError(409, 'Hóa đơn đã thanh toán');

  // Sinh TxnRef mới mỗi lần bệnh nhân bấm thanh toán (cho phép retry).
  const txnRef = generateTxnRef();

  const amount = Math.round(Number(inv.final_amount));
  if (!Number.isFinite(amount) || amount < 1)
    throw new AppError(400, 'Số tiền hóa đơn không hợp lệ');

  // UPDATE DB TRƯỚC build URL — nếu DB fail, không trả URL cho user.
  // Ngược lại sẽ có URL hợp lệ trên client mà IPN không tìm thấy txnRef trong DB
  // → user thanh toán xong nhưng hệ thống không cập nhật được.
  await query(
    `UPDATE invoices
        SET payment_method = 'vnpay',
            vnp_txn_ref = $2
      WHERE id = $1`,
    [id, txnRef],
  );

  const vnp_url = buildPaymentUrl({
    amount,
    txnRef,
    orderInfo: `Thanh toan hoa don ${id}`,
    ipAddr,
    ...(bankCode ? { bankCode } : {}),
  });

  return { invoice: await loadDetail(id), vnp_url };
}

// ─── PayOS ────────────────────────────────────────────────────────────────

export async function payPayos(
  id: string,
  actor: TokenPayload,
): Promise<{ invoice: InvoiceDetail; payos: PayosLinkResult }> {
  if (actor.role !== 'patient')
    throw new AppError(403, 'Chỉ bệnh nhân thanh toán online');

  const inv = await queryOne<InvoiceRow>(
    'SELECT * FROM invoices WHERE id = $1',
    [id],
  );
  if (!inv) throw new AppError(404, 'Hóa đơn không tồn tại');

  const pid = await patientIdOfUser(actor.sub);
  if (inv.patient_id !== pid) throw new AppError(403, 'Không phải hóa đơn của bạn');
  if (inv.payment_status === 'paid')
    throw new AppError(409, 'Hóa đơn đã thanh toán');

  const amount = Math.round(Number(inv.final_amount));
  if (!Number.isFinite(amount) || amount < 1)
    throw new AppError(400, 'Số tiền hóa đơn không hợp lệ');

  if (inv.payos_order_code) {
    try {
      await payosCancel(Number(inv.payos_order_code), 'Người dùng tạo link mới');
    } catch {
      // Bỏ qua: link cũ có thể đã hết hạn hoặc đã hủy.
    }
  }

  // Sinh orderCode + retry nếu rủi ro trùng (rất hiếm nhưng có thể).
  let orderCode = payosGenerateOrderCode();
  for (let i = 0; i < 3; i++) {
    const dup = await queryOne(
      'SELECT id FROM invoices WHERE payos_order_code = $1',
      [orderCode],
    );
    if (!dup) break;
    orderCode = payosGenerateOrderCode();
  }

  const description = `HD ${id.slice(-6).toUpperCase()}`;

  const patient = await queryOne<{ full_name: string; phone_encrypted: string }>(
    'SELECT full_name, phone_encrypted FROM patients WHERE id = $1',
    [inv.patient_id],
  );

  const result = await payosCreate({
    orderCode,
    amount,
    description,
    ...(patient?.full_name ? { buyerName: patient.full_name } : {}),
  });

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE invoices
          SET payment_method = 'payos',
              payos_order_code = $2,
              payos_payment_link_id = $3,
              payos_account_number = $4,
              payos_qr_code = $5
        WHERE id = $1`,
      [
        id,
        orderCode,
        result.paymentLinkId,
        result.accountNumber,
        result.qrCode,
      ],
    );
  });

  return { invoice: await loadDetail(id), payos: result };
}

export async function handlePayosWebhook(
  body: PayosWebhook,
): Promise<{ error: number; message: string }> {
  let data;
  try {
    data = await payosVerifyWebhook(body);
  } catch (err) {
    await logWebhookFailure('payos', body, `signature invalid: ${String(err)}`);
    return { error: 1, message: 'Invalid signature' };
  }

  if (data.orderCode === 123) {
    return { error: 0, message: 'Webhook test acknowledged' };
  }

  const inv = await queryOne<InvoiceRow>(
    'SELECT * FROM invoices WHERE payos_order_code = $1',
    [data.orderCode],
  );
  if (!inv) {
    return { error: 0, message: 'Order not found (already cleaned up)' };
  }

  if (inv.payment_status === 'paid') {
    return { error: 0, message: 'Already paid' };
  }

  const expected = Math.round(Number(inv.final_amount));
  if (data.amount !== expected) {
    await logWebhookFailure(
      'payos',
      body,
      `amount mismatch: got ${data.amount}, expected ${expected}`,
    );
    return { error: 1, message: 'Amount mismatch' };
  }

  if (body.code === '00' && body.success === true) {
    // Atomic update: chỉ chuyển sang 'paid' nếu hiện đang 'pending'.
    // Nếu webhook trùng đến đồng thời, chỉ có 1 row được update → 1 notification.
    const updated = await queryOne<InvoiceRow>(
      `UPDATE invoices
          SET payment_status = 'paid',
              paid_at = NOW(),
              payos_reference = $2,
              payos_transaction_time = $3
        WHERE id = $1 AND payment_status = 'pending' RETURNING *`,
      [inv.id, data.reference, data.transactionDateTime],
    );

    if (updated) {
      const p = await queryOne<{ user_id: string }>(
        'SELECT user_id FROM patients WHERE id = $1',
        [inv.patient_id],
      );
      if (p)
        await notifyUser(
          p.user_id,
          'Thanh toán PayOS thành công',
          `Hóa đơn ${inv.id} đã được thanh toán ${expected.toLocaleString('vi-VN')}đ qua PayOS (REF: ${data.reference}).`,
        );
    }
  }

  return { error: 0, message: 'OK' };
}

export async function handleVnpayReturn(
  query: ReturnQueryFromVNPay,
): Promise<{ verified: VnpVerified; invoice: InvoiceDetail | null }> {
  const verified = verifyReturnUrl(query);
  let invoice: InvoiceDetail | null = null;
  if (verified.txnRef) {
    const row = await queryOne<InvoiceRow>(
      'SELECT * FROM invoices WHERE vnp_txn_ref = $1',
      [verified.txnRef],
    );
    if (row) invoice = await loadDetail(row.id);
  }
  return { verified, invoice };
}

export async function handleVnpayIpn(
  vnpQuery: ReturnQueryFromVNPay,
): Promise<{ RspCode: string; Message: string }> {
  const verified = verifyIpnCall(vnpQuery);

  if (!verified.isVerified) {
    await logWebhookFailure('vnpay', vnpQuery, 'signature invalid');
    return VnpIpn.FailChecksum;
  }
  if (!verified.txnRef) return VnpIpn.OrderNotFound;

  const inv = await queryOne<InvoiceRow>(
    'SELECT * FROM invoices WHERE vnp_txn_ref = $1',
    [verified.txnRef],
  );
  if (!inv) return VnpIpn.OrderNotFound;

  const expected = Math.round(Number(inv.final_amount));
  if (verified.amountVnd !== expected) {
    await logWebhookFailure(
      'vnpay',
      vnpQuery,
      `amount mismatch: got ${verified.amountVnd}, expected ${expected}`,
    );
    return VnpIpn.InvalidAmount;
  }

  if (inv.payment_status === 'paid') {
    return VnpIpn.Success;
  }

  try {
    if (verified.isSuccess && verified.responseCode === '00') {
      // Atomic: chỉ row đang 'pending' mới được chuyển sang 'paid' — chống
      // race condition khi VNPay retry IPN.
      const updated = await queryOne<InvoiceRow>(
        `UPDATE invoices
            SET payment_status = 'paid',
                paid_at = NOW(),
                vnp_transaction_no = $2,
                vnp_response_code = $3,
                vnp_bank_code = $4,
                vnp_pay_date = $5
          WHERE id = $1 AND payment_status = 'pending' RETURNING *`,
        [
          inv.id,
          verified.transactionNo ?? null,
          verified.responseCode ?? null,
          verified.bankCode ?? null,
          verified.payDate ?? null,
        ],
      );

      if (updated) {
        const patient = await queryOne<{ user_id: string }>(
          'SELECT user_id FROM patients WHERE id = $1',
          [inv.patient_id],
        );
        if (patient)
          await notifyUser(
            patient.user_id,
            'Thanh toán VNPay thành công',
            `Hóa đơn ${inv.id} đã được thanh toán ${expected.toLocaleString('vi-VN')}đ qua VNPay.`,
          );
      }
    } else {
      await query(
        `UPDATE invoices
            SET vnp_response_code = $2
          WHERE id = $1`,
        [inv.id, verified.responseCode ?? null],
      );
    }
    return VnpIpn.Success;
  } catch (err) {
    await logWebhookFailure('vnpay', vnpQuery, String(err));
    return VnpIpn.UnknownError;
  }
}

// Thu ngân xác nhận đã thu tiền mặt — phải nhập received_amount và lưu lại
// để chống gian lận (không lưu được = không kiểm tra được).
export async function payCash(
  id: string,
  input: PayCashInput,
  actor: TokenPayload,
): Promise<InvoiceDetail> {
  if (actor.role !== 'cashier')
    throw new AppError(403, 'Chỉ thu ngân được xác nhận tiền mặt');

  const inv = await queryOne<InvoiceRow>(
    'SELECT * FROM invoices WHERE id = $1',
    [id],
  );
  if (!inv) throw new AppError(404, 'Hóa đơn không tồn tại');
  if (inv.payment_status === 'paid')
    throw new AppError(409, 'Hóa đơn đã thanh toán');

  // Số tiền nhận phải đủ — không cho phép cashier "xác nhận" mà không thu đủ.
  const finalAmount = Number(inv.final_amount);
  if (input.received_amount < finalAmount) {
    throw new AppError(
      400,
      `Số tiền nhận (${input.received_amount.toLocaleString('vi-VN')}đ) ` +
        `không đủ để thanh toán hóa đơn (${finalAmount.toLocaleString('vi-VN')}đ)`,
    );
  }

  const updated = await queryOne<InvoiceRow>(
    `UPDATE invoices
        SET payment_method = 'cash',
            payment_status = 'paid',
            cashier_user_id = $2,
            received_amount = $3,
            paid_at = NOW()
      WHERE id = $1 AND payment_status = 'pending' RETURNING *`,
    [id, actor.sub, input.received_amount.toFixed(2)],
  );
  if (!updated)
    throw new AppError(409, 'Hóa đơn đã được thanh toán bởi 1 phiên khác');

  const patient = await queryOne<{ user_id: string }>(
    'SELECT user_id FROM patients WHERE id = $1',
    [inv.patient_id],
  );
  if (patient)
    await notifyUser(
      patient.user_id,
      'Đã thanh toán tại quầy',
      `Hóa đơn ${id} đã được thu ngân xác nhận thanh toán.`,
    );

  return loadDetail(id);
}

export async function getInvoice(
  id: string,
  actor: TokenPayload,
): Promise<InvoiceDetail> {
  const detail = await loadDetail(id);
  if (actor.role === 'patient') {
    const pid = await patientIdOfUser(actor.sub);
    if (detail.patient_id !== pid) throw new AppError(403, 'Không có quyền');
  } else if (!['cashier', 'manager'].includes(actor.role)) {
    throw new AppError(403, 'Không có quyền');
  }
  return detail;
}

export async function listInvoices(
  q: ListInvoiceQuery,
  actor: TokenPayload,
): Promise<InvoiceRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (actor.role === 'patient') {
    const pid = await patientIdOfUser(actor.sub);
    params.push(pid);
    where.push(`patient_id = $${params.length}`);
  } else if (actor.role === 'cashier') {
    if (!q.payment_status) {
      where.push(`payment_status = 'pending'`);
    }
  } else if (actor.role !== 'manager') {
    throw new AppError(403, 'Không có quyền');
  }
  if (q.patient_id && actor.role !== 'patient') {
    params.push(q.patient_id);
    where.push(`patient_id = $${params.length}`);
  }
  if (q.payment_status) {
    params.push(q.payment_status);
    where.push(`payment_status = $${params.length}`);
  }
  if (q.from) {
    params.push(q.from);
    where.push(`created_at >= $${params.length}`);
  }
  if (q.to) {
    params.push(q.to);
    where.push(`created_at <= $${params.length}`);
  }
  const sql = `SELECT * FROM invoices
               ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY created_at DESC LIMIT 200`;
  return query<InvoiceRow>(sql, params);
}

// Doanh thu cho Manager — tính TỔNG mọi phương thức (vnpay + payos + cash).
// Trả thêm breakdown để FE hiển thị tách theo phương thức.
export async function getRevenue(
  q: RevenueQuery,
  actor: TokenPayload,
): Promise<{
  year: number;
  month?: number;
  total: string;
  count: number;
  by_method: { vnpay: string; payos: string; cash: string };
}> {
  if (actor.role !== 'manager')
    throw new AppError(403, 'Chỉ quản lý xem doanh thu');

  const params: unknown[] = [q.year];
  let dateFilter = `EXTRACT(YEAR FROM paid_at) = $1`;
  if (q.month) {
    params.push(q.month);
    dateFilter += ` AND EXTRACT(MONTH FROM paid_at) = $2`;
  }
  const row = await queryOne<{
    total: string | null;
    count: string;
    vnpay: string | null;
    payos: string | null;
    cash: string | null;
  }>(
    `SELECT COALESCE(SUM(final_amount), 0)::text AS total,
            COUNT(*) AS count,
            COALESCE(SUM(final_amount) FILTER (WHERE payment_method='vnpay'), 0)::text AS vnpay,
            COALESCE(SUM(final_amount) FILTER (WHERE payment_method='payos'), 0)::text AS payos,
            COALESCE(SUM(final_amount) FILTER (WHERE payment_method='cash'),  0)::text AS cash
       FROM invoices
      WHERE payment_status = 'paid'
        AND ${dateFilter}`,
    params,
  );
  return {
    year: q.year,
    ...(q.month ? { month: q.month } : {}),
    total: row?.total ?? '0',
    count: Number(row?.count ?? 0),
    by_method: {
      vnpay: row?.vnpay ?? '0',
      payos: row?.payos ?? '0',
      cash:  row?.cash  ?? '0',
    },
  };
}
