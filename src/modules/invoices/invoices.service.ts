import type { ReturnQueryFromVNPay } from 'vnpay';
import { query, queryOne, withTransaction } from '../../db/query';
import { AppError } from '../../middleware/error';
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

// Sinh hóa đơn nháp (pending). Điều kiện: session finalized + tất cả XN completed.
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

  // Lấy danh sách dịch vụ: 1 phí khám + n xét nghiệm.
  // Phí khám: lib_procedures không có giá → bỏ qua, dùng giá khám cố định mặc định 0
  //   (spec không bắt buộc; có thể bổ sung sau). Hiện tại không tính consultation.
  // Xét nghiệm: lấy từ test_order_items + lib_test_types.
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

  let total = 0;
  let discount = 0;
  const rowsToInsert = testRows.map((r) => {
    const { discounted } = applyInsurance(r.price, r.insurance_price, hasInsurance);
    const unit = Number(r.price);
    const disc = Number(discounted);
    total += unit;
    discount += unit - disc;
    return {
      service_label: r.test_name,
      service_type: 'test' as const,
      test_order_item_id: r.item_id,
      unit_price: r.price,
      discounted_price: discounted,
      quantity: 1,
      subtotal: discounted,
    };
  });

  const final = total - discount;

  const created = await withTransaction(async (client) => {
    const inv = await client.query<InvoiceRow>(
      `INSERT INTO invoices
         (patient_id, session_id, total_amount, insurance_discount, final_amount, payment_status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
      [
        session.patient_id,
        input.session_id,
        total.toFixed(2),
        discount.toFixed(2),
        final.toFixed(2),
      ],
    );
    const invoiceId = inv.rows[0]!.id;
    for (const it of rowsToInsert) {
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
  // VNPay không cho dùng lại TxnRef đã thành công.
  const txnRef = generateTxnRef();

  // Số tiền phải là VND nguyên (không thập phân). Theo nghiệp vụ final_amount đã
  // được tính sẵn lúc generate; cần làm tròn đề phòng numeric có ".00".
  const amount = Math.round(Number(inv.final_amount));
  if (!Number.isFinite(amount) || amount < 1)
    throw new AppError(400, 'Số tiền hóa đơn không hợp lệ');

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
    // Mô tả không dấu theo yêu cầu VNPay.
    orderInfo: `Thanh toan hoa don ${id}`,
    ipAddr,
    ...(bankCode ? { bankCode } : {}),
  });

  return { invoice: await loadDetail(id), vnp_url };
}

// ─── PayOS ────────────────────────────────────────────────────────────────

// Bệnh nhân khởi tạo thanh toán PayOS. Trả checkoutUrl + qrCode để FE hiển thị.
// Invoice KHÔNG được mark paid ở đây — chỉ ghi orderCode + paymentLinkId.
// Trạng thái 'paid' chỉ chuyển trong handlePayosWebhook().
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

  // Nếu trước đó đã sinh orderCode (user mở rồi bỏ) — hủy link cũ trước khi sinh mới.
  if (inv.payos_order_code) {
    try {
      await payosCancel(Number(inv.payos_order_code), 'Người dùng tạo link mới');
    } catch {
      // Bỏ qua: link cũ có thể đã hết hạn hoặc đã hủy.
    }
  }

  const orderCode = payosGenerateOrderCode();
  // Description ≤ 25 ký tự; dùng prefix HD + 6 ký tự cuối của invoice id để
  // người chuyển khoản nhận diện được.
  const description = `HD ${id.slice(-6).toUpperCase()}`;

  // Lấy tên người mua từ patient để hiển thị trên hóa đơn PayOS.
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

  await query(
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

  return { invoice: await loadDetail(id), payos: result };
}

// Webhook từ PayOS — gọi POST tới URL công khai. Body chứa { code, desc,
// success, data, signature }. Phải verify chữ ký trước khi tin tưởng.
//
// Trả về { error: 0|1, message } theo convention PayOS expect HTTP 200.
export async function handlePayosWebhook(
  body: PayosWebhook,
): Promise<{ error: number; message: string }> {
  // PayOS gửi 1 request "ping" khi confirm webhook lần đầu với orderCode=123
  // amount=3000 description="VQRIO123" để test endpoint hoạt động. Ta luôn
  // ack 200 cho ping — verify sẽ vẫn pass vì signature đúng.
  let data;
  try {
    data = await payosVerifyWebhook(body);
  } catch (err) {
    console.error('❌ PayOS webhook signature invalid:', err);
    return { error: 1, message: 'Invalid signature' };
  }

  // Bỏ qua webhook test của PayOS (orderCode 123, không phải đơn thật).
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

  // Idempotent — đã paid rồi thì không update lần nữa.
  if (inv.payment_status === 'paid') {
    return { error: 0, message: 'Already paid' };
  }

  // Kiểm tra số tiền — phải khớp final_amount.
  const expected = Math.round(Number(inv.final_amount));
  if (data.amount !== expected) {
    console.error(
      `❌ PayOS webhook amount mismatch: got ${data.amount}, expected ${expected}`,
    );
    return { error: 1, message: 'Amount mismatch' };
  }

  // code '00' = thành công (chuẩn PayOS, tương tự VNPay).
  if (body.code === '00' && body.success === true) {
    await query(
      `UPDATE invoices
          SET payment_status = 'paid',
              paid_at = NOW(),
              payos_reference = $2,
              payos_transaction_time = $3
        WHERE id = $1`,
      [inv.id, data.reference, data.transactionDateTime],
    );

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

  return { error: 0, message: 'OK' };
}

// Browser redirect về sau khi user thanh toán xong — chỉ verify chữ ký
// và trả thông tin cho FE hiển thị, KHÔNG mark paid (không tin client).
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

// IPN — server-to-server từ VNPay. Đây là nguồn sự thật để chuyển paid.
// PHẢI trả về đúng format { RspCode, Message } theo VNPay docs.
export async function handleVnpayIpn(
  vnpQuery: ReturnQueryFromVNPay,
): Promise<{ RspCode: string; Message: string }> {
  const verified = verifyIpnCall(vnpQuery);

  if (!verified.isVerified) return VnpIpn.FailChecksum;
  if (!verified.txnRef) return VnpIpn.OrderNotFound;

  const inv = await queryOne<InvoiceRow>(
    'SELECT * FROM invoices WHERE vnp_txn_ref = $1',
    [verified.txnRef],
  );
  if (!inv) return VnpIpn.OrderNotFound;

  // Kiểm tra số tiền khớp với hóa đơn (đề phòng tampering).
  const expected = Math.round(Number(inv.final_amount));
  if (verified.amountVnd !== expected) return VnpIpn.InvalidAmount;

  // Idempotent — nếu đã paid rồi và VNPay gửi lại IPN, trả về thành công
  // nhưng không update lần nữa.
  if (inv.payment_status === 'paid') {
    return VnpIpn.Success;
  }

  try {
    if (verified.isSuccess && verified.responseCode === '00') {
      await query(
        `UPDATE invoices
            SET payment_status = 'paid',
                paid_at = NOW(),
                vnp_transaction_no = $2,
                vnp_response_code = $3,
                vnp_bank_code = $4,
                vnp_pay_date = $5
          WHERE id = $1`,
        [
          inv.id,
          verified.transactionNo ?? null,
          verified.responseCode ?? null,
          verified.bankCode ?? null,
          verified.payDate ?? null,
        ],
      );

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
    } else {
      // Thanh toán fail/cancel — chỉ ghi response code, vẫn để pending để user retry.
      await query(
        `UPDATE invoices
            SET vnp_response_code = $2
          WHERE id = $1`,
        [inv.id, verified.responseCode ?? null],
      );
    }
    return VnpIpn.Success;
  } catch (err) {
    console.error('❌ Lỗi xử lý VNPay IPN:', err);
    return VnpIpn.UnknownError;
  }
}

// Thu ngân xác nhận đã thu tiền mặt.
export async function payCash(
  id: string,
  _input: PayCashInput,
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

  await query(
    `UPDATE invoices
        SET payment_method = 'cash',
            payment_status = 'paid',
            cashier_user_id = $2,
            paid_at = NOW()
      WHERE id = $1`,
    [id, actor.sub],
  );

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
    // Mặc định thu ngân chỉ thấy các hóa đơn cần xử lý.
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

// Doanh thu cho Manager — chỉ tính VNPay (theo spec).
export async function getRevenue(
  q: RevenueQuery,
  actor: TokenPayload,
): Promise<{ year: number; month?: number; total: string; count: number }> {
  if (actor.role !== 'manager')
    throw new AppError(403, 'Chỉ quản lý xem doanh thu');

  const params: unknown[] = [q.year];
  let dateFilter = `EXTRACT(YEAR FROM paid_at) = $1`;
  if (q.month) {
    params.push(q.month);
    dateFilter += ` AND EXTRACT(MONTH FROM paid_at) = $2`;
  }
  const row = await queryOne<{ total: string | null; count: string }>(
    `SELECT COALESCE(SUM(final_amount), 0)::text AS total, COUNT(*) AS count
       FROM invoices
      WHERE payment_method = 'vnpay'
        AND payment_status = 'paid'
        AND ${dateFilter}`,
    params,
  );
  return {
    year: q.year,
    ...(q.month ? { month: q.month } : {}),
    total: row?.total ?? '0',
    count: Number(row?.count ?? 0),
  };
}
