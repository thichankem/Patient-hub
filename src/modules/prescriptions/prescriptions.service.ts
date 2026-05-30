import { query, queryOne, withTransaction } from '../../db/query';
import type {
  ExaminationSessionRow,
  PrescriptionItemRow,
  PrescriptionRow,
} from '../../types/db';
import { AppError } from '../../middleware/error';
import type { TokenPayload } from '../../utils/jwt';
import type {
  CreatePrescriptionInput,
  UpdatePrescriptionInput,
} from './prescriptions.schema';

async function doctorIdOfUser(userId: string): Promise<string> {
  const row = await queryOne<{ id: string }>(
    'SELECT id FROM doctors WHERE user_id = $1',
    [userId],
  );
  if (!row) throw new AppError(404, 'Không tìm thấy hồ sơ bác sĩ');
  return row.id;
}

async function patientIdOfUser(userId: string): Promise<string> {
  const row = await queryOne<{ id: string }>(
    'SELECT id FROM patients WHERE user_id = $1',
    [userId],
  );
  if (!row) throw new AppError(404, 'Không tìm thấy hồ sơ bệnh nhân');
  return row.id;
}

async function loadOwnedSession(
  sessionId: string,
  actor: TokenPayload,
): Promise<ExaminationSessionRow> {
  const session = await queryOne<ExaminationSessionRow>(
    'SELECT * FROM examination_sessions WHERE id = $1',
    [sessionId],
  );
  if (!session) throw new AppError(404, 'Đợt khám không tồn tại');
  const did = await doctorIdOfUser(actor.sub);
  if (session.doctor_id !== did)
    throw new AppError(403, 'Đây không phải đợt khám của bạn');
  if (session.is_finalized)
    throw new AppError(409, 'Đợt khám đã chốt, không thể thay đổi đơn thuốc');
  return session;
}

// Điều kiện cấp đơn: không còn xét nghiệm dở dang và mọi kết quả đã được bác sĩ xem.
async function assertTestsReviewed(sessionId: string): Promise<void> {
  const row = await queryOne<{ pending: string; unreviewed: string }>(
    `SELECT
        COUNT(*) FILTER (
          WHERE toi.status IN ('not_started','waiting','processing')
        ) AS pending,
        COUNT(*) FILTER (
          WHERE toi.status = 'completed'
            AND toi.result_reviewed_by_doctor = FALSE
        ) AS unreviewed
       FROM test_order_items toi
       JOIN test_orders t ON t.id = toi.test_order_id
      WHERE t.session_id = $1`,
    [sessionId],
  );
  if (row && Number(row.pending) > 0)
    throw new AppError(
      409,
      'Còn xét nghiệm chưa có kết quả — chưa thể cấp đơn thuốc',
    );
  if (row && Number(row.unreviewed) > 0)
    throw new AppError(
      409,
      'Còn kết quả xét nghiệm bác sĩ chưa xác nhận đã xem',
    );
}

interface PrescriptionDetail extends PrescriptionRow {
  items: Array<PrescriptionItemRow & { medicine_name: string }>;
}

async function loadDetail(id: string): Promise<PrescriptionDetail> {
  const p = await queryOne<PrescriptionRow>(
    'SELECT * FROM prescriptions WHERE id = $1',
    [id],
  );
  if (!p) throw new AppError(404, 'Đơn thuốc không tồn tại');
  const items = await query<PrescriptionItemRow & { medicine_name: string }>(
    `SELECT pi.*, m.name AS medicine_name
       FROM prescription_items pi
       JOIN lib_medicines m ON m.id = pi.medicine_id
      WHERE pi.prescription_id = $1`,
    [id],
  );
  return { ...p, items };
}

export async function createPrescription(
  input: CreatePrescriptionInput,
  actor: TokenPayload,
): Promise<PrescriptionDetail> {
  if (actor.role !== 'doctor')
    throw new AppError(403, 'Chỉ bác sĩ được cấp đơn thuốc');

  await loadOwnedSession(input.session_id, actor);
  await assertTestsReviewed(input.session_id);

  // Validate thuốc tồn tại trước transaction để fail nhanh không cần lock.
  for (const it of input.items) {
    const m = await queryOne('SELECT id FROM lib_medicines WHERE id = $1', [
      it.medicine_id,
    ]);
    if (!m)
      throw new AppError(404, `Thuốc ${it.medicine_id} không tồn tại`);
  }

  // Wrap INSERT trong transaction + dựa vào UNIQUE constraint của session_id
  // để chống race condition (2 request gần đồng thời cùng pass check rồi cùng
  // INSERT). Bắt unique-violation → throw 409 thay vì 500.
  let created: PrescriptionRow;
  try {
    created = await withTransaction(async (client) => {
      const p = await client.query<PrescriptionRow>(
        `INSERT INTO prescriptions (session_id, general_note)
         VALUES ($1, $2) RETURNING *`,
        [input.session_id, input.general_note ?? null],
      );
      const presc = p.rows[0]!;
      for (const it of input.items) {
        await client.query(
          `INSERT INTO prescription_items
             (prescription_id, medicine_id, quantity, usage_instruction)
           VALUES ($1, $2, $3, $4)`,
          [presc.id, it.medicine_id, it.quantity, it.usage_instruction ?? null],
        );
      }
      return presc;
    });
  } catch (err: unknown) {
    // PostgreSQL unique_violation = '23505'.
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      throw new AppError(409, 'Đợt khám đã có đơn thuốc');
    }
    throw err;
  }

  return loadDetail(created.id);
}

export async function getPrescription(
  id: string,
  actor: TokenPayload,
): Promise<PrescriptionDetail> {
  const detail = await loadDetail(id);
  const session = await queryOne<ExaminationSessionRow>(
    'SELECT * FROM examination_sessions WHERE id = $1',
    [detail.session_id],
  );
  if (!session) throw new AppError(404, 'Đợt khám không tồn tại');

  if (actor.role === 'patient') {
    const pid = await patientIdOfUser(actor.sub);
    if (session.patient_id !== pid) throw new AppError(403, 'Không có quyền');
  } else if (actor.role === 'doctor') {
    const did = await doctorIdOfUser(actor.sub);
    if (session.doctor_id !== did) throw new AppError(403, 'Không có quyền');
  } else {
    throw new AppError(403, 'Không có quyền');
  }
  return detail;
}

export async function listBySession(
  sessionId: string,
  actor: TokenPayload,
): Promise<PrescriptionDetail | null> {
  const p = await queryOne<PrescriptionRow>(
    'SELECT * FROM prescriptions WHERE session_id = $1',
    [sessionId],
  );
  if (!p) return null;
  return getPrescription(p.id, actor);
}

// Bác sĩ: tất cả đơn thuốc thuộc các đợt khám của mình.
export async function listMineForDoctor(
  actor: TokenPayload,
): Promise<
  Array<
    PrescriptionRow & {
      patient_id: string;
      patient_name: string;
      item_count: number;
    }
  >
> {
  if (actor.role !== 'doctor')
    throw new AppError(403, 'Chỉ bác sĩ được xem danh sách này');
  const did = await doctorIdOfUser(actor.sub);
  return query(
    `SELECT pr.*, es.patient_id, p.full_name AS patient_name,
            (SELECT COUNT(*) FROM prescription_items pi WHERE pi.prescription_id = pr.id)::int AS item_count
       FROM prescriptions pr
       JOIN examination_sessions es ON es.id = pr.session_id
       JOIN patients p ON p.id = es.patient_id
      WHERE es.doctor_id = $1
      ORDER BY pr.created_at DESC`,
    [did],
  );
}

export async function updatePrescription(
  id: string,
  input: UpdatePrescriptionInput,
  actor: TokenPayload,
): Promise<PrescriptionDetail> {
  if (actor.role !== 'doctor')
    throw new AppError(403, 'Chỉ bác sĩ được sửa đơn thuốc');

  const presc = await queryOne<PrescriptionRow>(
    'SELECT * FROM prescriptions WHERE id = $1',
    [id],
  );
  if (!presc) throw new AppError(404, 'Đơn thuốc không tồn tại');
  await loadOwnedSession(presc.session_id, actor);

  if (input.items) {
    for (const it of input.items) {
      const m = await queryOne('SELECT id FROM lib_medicines WHERE id = $1', [
        it.medicine_id,
      ]);
      if (!m)
        throw new AppError(404, `Thuốc ${it.medicine_id} không tồn tại`);
    }
  }

  await withTransaction(async (client) => {
    if (input.general_note !== undefined) {
      await client.query(
        'UPDATE prescriptions SET general_note = $1 WHERE id = $2',
        [input.general_note, id],
      );
    }
    if (input.items) {
      await client.query(
        'DELETE FROM prescription_items WHERE prescription_id = $1',
        [id],
      );
      for (const it of input.items) {
        await client.query(
          `INSERT INTO prescription_items
             (prescription_id, medicine_id, quantity, usage_instruction)
           VALUES ($1, $2, $3, $4)`,
          [id, it.medicine_id, it.quantity, it.usage_instruction ?? null],
        );
      }
    }
  });

  return loadDetail(id);
}
