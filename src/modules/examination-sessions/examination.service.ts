import { query, queryOne } from '../../db/query';
import type {
  ExaminationSessionRow,
  PrescriptionItemRow,
  TestOrderItemRow,
} from '../../types/db';
import { AppError } from '../../middleware/error';
import type { TokenPayload } from '../../utils/jwt';
import { notifyUser } from '../notifications/notification.helper';
import type { UpdateSessionInput } from './examination.schema';

async function patientIdOfUser(userId: string): Promise<string> {
  const row = await queryOne<{ id: string }>(
    'SELECT id FROM patients WHERE user_id = $1',
    [userId],
  );
  if (!row) throw new AppError(404, 'Không tìm thấy hồ sơ bệnh nhân');
  return row.id;
}

async function doctorIdOfUser(userId: string): Promise<string> {
  const row = await queryOne<{ id: string }>(
    'SELECT id FROM doctors WHERE user_id = $1',
    [userId],
  );
  if (!row) throw new AppError(404, 'Không tìm thấy hồ sơ bác sĩ');
  return row.id;
}

// Bác sĩ chỉ có quyền với đợt khám mình đang phụ trách; bệnh nhân chỉ xem của mình.
// Quản lý KHÔNG được truy cập hồ sơ bệnh án.
async function authorizeSession(
  session: ExaminationSessionRow,
  actor: TokenPayload,
): Promise<void> {
  if (actor.role === 'patient') {
    const pid = await patientIdOfUser(actor.sub);
    if (session.patient_id !== pid) throw new AppError(403, 'Không có quyền');
  } else if (actor.role === 'doctor') {
    const did = await doctorIdOfUser(actor.sub);
    if (session.doctor_id !== did) throw new AppError(403, 'Không có quyền');
  } else {
    throw new AppError(403, 'Không có quyền xem hồ sơ bệnh án');
  }
}

interface SessionDetail extends ExaminationSessionRow {
  test_orders: Array<{
    id: string;
    note: string | null;
    created_at: Date;
    items: Array<
      TestOrderItemRow & { test_type_name: string; lab_room_name: string | null }
    >;
  }>;
  prescription:
    | {
        id: string;
        general_note: string | null;
        created_at: Date;
        items: Array<
          PrescriptionItemRow & { medicine_name: string }
        >;
      }
    | null;
}

export async function getSessionDetail(
  id: string,
  actor: TokenPayload,
): Promise<SessionDetail> {
  const session = await queryOne<ExaminationSessionRow>(
    'SELECT * FROM examination_sessions WHERE id = $1',
    [id],
  );
  if (!session) throw new AppError(404, 'Đợt khám không tồn tại');
  await authorizeSession(session, actor);

  const orders = await query<{
    id: string;
    note: string | null;
    created_at: Date;
  }>(
    'SELECT id, note, created_at FROM test_orders WHERE session_id = $1 ORDER BY created_at ASC',
    [id],
  );

  const test_orders = [];
  for (const o of orders) {
    const items = await query<
      TestOrderItemRow & { test_type_name: string; lab_room_name: string | null }
    >(
      `SELECT toi.*, tt.name AS test_type_name, lr.name AS lab_room_name
         FROM test_order_items toi
         JOIN lib_test_types tt ON tt.id = toi.test_type_id
         LEFT JOIN lab_rooms lr ON lr.id = toi.lab_room_id
        WHERE toi.test_order_id = $1
        ORDER BY toi.schedule_order ASC NULLS LAST`,
      [o.id],
    );
    test_orders.push({ ...o, items });
  }

  const pres = await queryOne<{
    id: string;
    general_note: string | null;
    created_at: Date;
  }>('SELECT id, general_note, created_at FROM prescriptions WHERE session_id = $1', [
    id,
  ]);

  let prescription: SessionDetail['prescription'] = null;
  if (pres) {
    const pitems = await query<PrescriptionItemRow & { medicine_name: string }>(
      `SELECT pi.*, m.name AS medicine_name
         FROM prescription_items pi
         JOIN lib_medicines m ON m.id = pi.medicine_id
        WHERE pi.prescription_id = $1`,
      [pres.id],
    );
    prescription = { ...pres, items: pitems };
  }

  return { ...session, test_orders, prescription };
}

// Bệnh nhân: danh sách các đợt khám (hồ sơ bệnh án).
export async function listMySessions(
  actor: TokenPayload,
): Promise<Array<ExaminationSessionRow & { appointment_date: string }>> {
  const pid = await patientIdOfUser(actor.sub);
  return query(
    `SELECT es.*, a.appointment_date
       FROM examination_sessions es
       JOIN appointments a ON a.id = es.appointment_id
      WHERE es.patient_id = $1
      ORDER BY a.appointment_date DESC, es.created_at DESC`,
    [pid],
  );
}

// Bác sĩ: các đợt khám đang phụ trách (mặc định đang khám/chưa chốt).
export async function listDoctorSessions(
  actor: TokenPayload,
  opts: { includeFinalized?: boolean } = {},
): Promise<
  Array<ExaminationSessionRow & { appointment_date: string; patient_name: string }>
> {
  const did = await doctorIdOfUser(actor.sub);
  const where = ['es.doctor_id = $1'];
  if (!opts.includeFinalized) where.push('es.is_finalized = FALSE');
  return query(
    `SELECT es.*, a.appointment_date, p.full_name AS patient_name
       FROM examination_sessions es
       JOIN appointments a ON a.id = es.appointment_id
       JOIN patients p     ON p.id = es.patient_id
      WHERE ${where.join(' AND ')}
      ORDER BY es.created_at DESC`,
    [did],
  );
}

// Bác sĩ tra cứu hồ sơ bệnh nhân để khám.
export async function listSessionsByPatient(
  patientId: string,
  actor: TokenPayload,
): Promise<Array<ExaminationSessionRow & { appointment_date: string }>> {
  if (actor.role !== 'doctor')
    throw new AppError(403, 'Chỉ bác sĩ được tra cứu hồ sơ bệnh nhân');
  return query(
    `SELECT es.*, a.appointment_date
       FROM examination_sessions es
       JOIN appointments a ON a.id = es.appointment_id
      WHERE es.patient_id = $1
      ORDER BY a.appointment_date DESC, es.created_at DESC`,
    [patientId],
  );
}

export async function getMyMedicalHistory(
  actor: TokenPayload,
): Promise<Array<{ session_id: string; diagnosis: string; finalized_at: Date }>> {
  const pid = await patientIdOfUser(actor.sub);
  return getMedicalHistory(pid);
}

// Tiền sử bệnh = chẩn đoán cuối của các đợt khám đã chốt.
export async function getMedicalHistory(
  patientId: string,
): Promise<Array<{ session_id: string; diagnosis: string; finalized_at: Date }>> {
  return query(
    `SELECT id AS session_id, diagnosis, finalized_at
       FROM examination_sessions
      WHERE patient_id = $1 AND is_finalized = TRUE
        AND diagnosis IS NOT NULL AND diagnosis <> ''
      ORDER BY finalized_at DESC`,
    [patientId],
  );
}

export async function updateSession(
  id: string,
  actor: TokenPayload,
  input: UpdateSessionInput,
): Promise<ExaminationSessionRow> {
  if (actor.role !== 'doctor')
    throw new AppError(403, 'Chỉ bác sĩ được cập nhật đợt khám');

  const session = await queryOne<ExaminationSessionRow>(
    'SELECT * FROM examination_sessions WHERE id = $1',
    [id],
  );
  if (!session) throw new AppError(404, 'Đợt khám không tồn tại');

  const did = await doctorIdOfUser(actor.sub);
  if (session.doctor_id !== did)
    throw new AppError(403, 'Đây không phải đợt khám của bạn');
  if (session.is_finalized)
    throw new AppError(409, 'Đợt khám đã chốt, không thể chỉnh sửa');

  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (input.diagnosis !== undefined) {
    sets.push(`diagnosis = $${i++}`);
    params.push(input.diagnosis);
  }
  if (input.treatment_plan !== undefined) {
    sets.push(`treatment_plan = $${i++}`);
    params.push(input.treatment_plan);
  }
  if (sets.length === 0)
    throw new AppError(400, 'Không có thông tin cần cập nhật');

  params.push(id);
  const row = await queryOne<ExaminationSessionRow>(
    `UPDATE examination_sessions SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    params,
  );
  return row!;
}

// Bác sĩ xác nhận lưu đợt khám → 'đã khám'. Lịch hẹn chuyển done, báo bệnh nhân.
export async function finalizeSession(
  id: string,
  actor: TokenPayload,
): Promise<ExaminationSessionRow> {
  if (actor.role !== 'doctor')
    throw new AppError(403, 'Chỉ bác sĩ được chốt đợt khám');

  const session = await queryOne<ExaminationSessionRow>(
    'SELECT * FROM examination_sessions WHERE id = $1',
    [id],
  );
  if (!session) throw new AppError(404, 'Đợt khám không tồn tại');

  const did = await doctorIdOfUser(actor.sub);
  if (session.doctor_id !== did)
    throw new AppError(403, 'Đây không phải đợt khám của bạn');
  if (session.is_finalized)
    throw new AppError(409, 'Đợt khám đã được chốt trước đó');

  // Mọi xét nghiệm phải có kết quả trước khi chốt.
  const pending = await queryOne<{ cnt: string }>(
    `SELECT COUNT(*) AS cnt
       FROM test_order_items toi
       JOIN test_orders t ON t.id = toi.test_order_id
      WHERE t.session_id = $1
        AND toi.status IN ('not_started', 'waiting', 'processing')`,
    [id],
  );
  if (pending && Number(pending.cnt) > 0)
    throw new AppError(
      409,
      'Còn xét nghiệm chưa có kết quả — chưa thể chốt đợt khám',
    );

  const row = await queryOne<ExaminationSessionRow>(
    `UPDATE examination_sessions
        SET is_finalized = TRUE, finalized_at = NOW()
      WHERE id = $1 RETURNING *`,
    [id],
  );
  await query(
    `UPDATE appointments SET status = 'done' WHERE id = $1`,
    [session.appointment_id],
  );

  const u = await queryOne<{ user_id: string }>(
    'SELECT user_id FROM patients WHERE id = $1',
    [session.patient_id],
  );
  if (u)
    await notifyUser(
      u.user_id,
      'Hoàn tất khám',
      'Cảm ơn bạn đã sử dụng dịch vụ. Vui lòng thanh toán nếu chưa hoàn tất.',
    );
  return row!;
}
