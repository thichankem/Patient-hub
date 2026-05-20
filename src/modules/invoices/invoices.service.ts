import { query, queryOne, withTransaction } from '../../db/query';
import { AppError } from '../../middleware/error';
import type { TokenPayload } from '../../utils/jwt';
import type {
  ExaminationSessionRow,
  InvoiceItemRow,
  InvoiceRow,
  PatientRow,
} from '../../types/db';
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

// Bệnh nhân thanh toán online qua VNPay (stub).
export async function payVnpay(
  id: string,
  actor: TokenPayload,
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

  // TODO: thay bằng SDK/REST VNPay thật. Hiện stub: đánh dấu paid ngay.
  await query(
    `UPDATE invoices
        SET payment_method = 'vnpay',
            payment_status = 'paid',
            paid_at = NOW()
      WHERE id = $1`,
    [id],
  );

  const patient = await queryOne<{ user_id: string }>(
    'SELECT user_id FROM patients WHERE id = $1',
    [inv.patient_id],
  );
  if (patient)
    await notifyUser(
      patient.user_id,
      'Thanh toán thành công',
      `Hóa đơn ${id} đã được thanh toán qua VNPay.`,
    );

  return {
    invoice: await loadDetail(id),
    vnp_url: `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?stub=true&invoice=${id}`,
  };
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
