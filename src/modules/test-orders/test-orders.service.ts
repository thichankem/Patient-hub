import { query, queryOne, withTransaction } from '../../db/query';
import type {
  ExaminationSessionRow,
  TestItemStatus,
  TestOrderItemRow,
  TestOrderRow,
} from '../../types/db';
import { AppError } from '../../middleware/error';
import type { TokenPayload } from '../../utils/jwt';
import { notifyUser } from '../notifications/notification.helper';
import {
  scheduleTestRooms,
  type TestRoomScheduleInput,
} from '../ai/ai.stub';
import type {
  CreateTestOrderInput,
  UpdateItemStatusInput,
} from './test-orders.schema';

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

async function technicianRoomOfUser(userId: string): Promise<string> {
  const row = await queryOne<{ lab_room_id: string }>(
    'SELECT lab_room_id FROM technicians WHERE user_id = $1',
    [userId],
  );
  if (!row) throw new AppError(404, 'Không tìm thấy hồ sơ kỹ thuật viên');
  return row.lab_room_id;
}

async function patientUserId(patientId: string): Promise<string | null> {
  const row = await queryOne<{ user_id: string }>(
    'SELECT user_id FROM patients WHERE id = $1',
    [patientId],
  );
  return row?.user_id ?? null;
}

// Trả về list phòng phục vụ test_type kèm queueMinutes
// (= SUM estimated_minutes của các item chưa hoàn tất tại phòng đó).
// RL scheduler cần queue tính theo PHÚT để estimate wait time.
async function candidateRooms(
  testTypeId: string,
): Promise<Array<{ labRoomId: string; queueMinutes: number; currentQueue: number }>> {
  const rows = await query<{
    lab_room_id: string;
    queue_minutes: string;
    current_queue: string;
  }>(
    `SELECT lr.id AS lab_room_id,
            COALESCE((
              SELECT SUM(lt2.estimated_minutes)
                FROM test_order_items x
                JOIN lib_test_types lt2 ON lt2.id = x.test_type_id
               WHERE x.lab_room_id = lr.id
                 AND x.status IN ('not_started','waiting','processing')
            ), 0) AS queue_minutes,
            (SELECT COUNT(*) FROM test_order_items x
              WHERE x.lab_room_id = lr.id
                AND x.status IN ('not_started','waiting','processing')
            ) AS current_queue
       FROM lab_rooms lr
      WHERE lr.test_type_id = $1`,
    [testTypeId],
  );
  return rows.map((r) => ({
    labRoomId: r.lab_room_id,
    queueMinutes: Number(r.queue_minutes),
    currentQueue: Number(r.current_queue),
  }));
}

// Bác sĩ tạo yêu cầu xét nghiệm; hệ thống tự phân phòng (stub RL).
export async function createTestOrder(
  input: CreateTestOrderInput,
  actor: TokenPayload,
): Promise<{ order: TestOrderRow; items: TestOrderItemRow[] }> {
  if (actor.role !== 'doctor')
    throw new AppError(403, 'Chỉ bác sĩ được tạo yêu cầu xét nghiệm');

  const session = await queryOne<ExaminationSessionRow>(
    'SELECT * FROM examination_sessions WHERE id = $1',
    [input.session_id],
  );
  if (!session) throw new AppError(404, 'Đợt khám không tồn tại');

  const did = await doctorIdOfUser(actor.sub);
  if (session.doctor_id !== did)
    throw new AppError(403, 'Đây không phải đợt khám của bạn');
  if (session.is_finalized)
    throw new AppError(409, 'Đợt khám đã chốt, không thể thêm xét nghiệm');

  // Lấy estimated_minutes + phòng ứng viên cho TẤT CẢ loại xét nghiệm
  // trong 2 query gộp (tránh N+1).
  const ttRows = await query<{ id: string; estimated_minutes: number }>(
    'SELECT id, estimated_minutes FROM lib_test_types WHERE id = ANY($1::uuid[])',
    [input.test_type_ids],
  );
  const ttMap = new Map(ttRows.map((r) => [r.id, r.estimated_minutes]));
  for (const ttId of input.test_type_ids) {
    if (!ttMap.has(ttId))
      throw new AppError(404, `Loại xét nghiệm ${ttId} không tồn tại`);
  }

  const roomRows = await query<{
    test_type_id: string;
    lab_room_id: string;
    queue_minutes: string;
  }>(
    `SELECT lr.test_type_id, lr.id AS lab_room_id,
            COALESCE((
              SELECT SUM(lt2.estimated_minutes)
                FROM test_order_items x
                JOIN lib_test_types lt2 ON lt2.id = x.test_type_id
               WHERE x.lab_room_id = lr.id
                 AND x.status IN ('not_started','waiting','processing')
            ), 0) AS queue_minutes
       FROM lab_rooms lr
      WHERE lr.test_type_id = ANY($1::uuid[])`,
    [input.test_type_ids],
  );
  const roomsByType = new Map<string, Array<{ labRoomId: string; queueMinutes: number }>>();
  for (const r of roomRows) {
    const arr = roomsByType.get(r.test_type_id) ?? [];
    arr.push({ labRoomId: r.lab_room_id, queueMinutes: Number(r.queue_minutes) });
    roomsByType.set(r.test_type_id, arr);
  }

  const scheduleInput: TestRoomScheduleInput[] = input.test_type_ids.map((ttId) => ({
    itemId: ttId,
    testTypeId: ttId,
    estimatedMinutes: ttMap.get(ttId)!,
    candidateRooms: roomsByType.get(ttId) ?? [],
  }));

  const plan = scheduleTestRooms(scheduleInput);
  const planByType = new Map(plan.map((p) => [p.itemId, p]));

  const result = await withTransaction(async (client) => {
    const o = await client.query<TestOrderRow>(
      `INSERT INTO test_orders (session_id, patient_id, note)
       VALUES ($1, $2, $3) RETURNING *`,
      [input.session_id, session.patient_id, input.note ?? null],
    );
    const order = o.rows[0]!;

    const items: TestOrderItemRow[] = [];
    for (const ttId of input.test_type_ids) {
      const p = planByType.get(ttId)!;
      const status: TestItemStatus = p.labRoomId ? 'not_started' : 'unavailable';
      const it = await client.query<TestOrderItemRow>(
        `INSERT INTO test_order_items
           (test_order_id, test_type_id, lab_room_id, status, schedule_order)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          order.id,
          ttId,
          p.labRoomId,
          status,
          p.labRoomId ? p.scheduleOrder : null,
        ],
      );
      items.push(it.rows[0]!);
    }
    return { order, items };
  });

  const uid = await patientUserId(session.patient_id);
  if (uid) {
    const unavailable = result.items.filter(
      (it) => it.status === 'unavailable',
    ).length;
    await notifyUser(
      uid,
      'Có lịch xét nghiệm mới',
      unavailable > 0
        ? `Bạn có ${result.items.length} xét nghiệm, trong đó ${unavailable} hiện chưa có phòng thực hiện.`
        : `Bạn có ${result.items.length} xét nghiệm cần thực hiện. Vui lòng theo dõi lịch.`,
    );
  }
  return result;
}

interface ItemDetail extends TestOrderItemRow {
  test_type_name: string;
  lab_room_name: string | null;
}

export async function getTestOrderDetail(
  id: string,
  actor: TokenPayload,
): Promise<TestOrderRow & { items: ItemDetail[] }> {
  const order = await queryOne<TestOrderRow>(
    'SELECT * FROM test_orders WHERE id = $1',
    [id],
  );
  if (!order) throw new AppError(404, 'Yêu cầu xét nghiệm không tồn tại');

  if (actor.role === 'patient') {
    const pid = await patientIdOfUser(actor.sub);
    if (order.patient_id !== pid) throw new AppError(403, 'Không có quyền');
  } else if (actor.role === 'doctor') {
    const did = await doctorIdOfUser(actor.sub);
    const own = await queryOne(
      `SELECT 1 FROM examination_sessions
        WHERE id = $1 AND doctor_id = $2`,
      [order.session_id, did],
    );
    if (!own) throw new AppError(403, 'Không có quyền');
  } else {
    throw new AppError(403, 'Không có quyền');
  }

  const items = await query<ItemDetail>(
    `SELECT toi.*, tt.name AS test_type_name, lr.name AS lab_room_name
       FROM test_order_items toi
       JOIN lib_test_types tt ON tt.id = toi.test_type_id
       LEFT JOIN lab_rooms lr ON lr.id = toi.lab_room_id
      WHERE toi.test_order_id = $1
      ORDER BY toi.schedule_order ASC NULLS LAST`,
    [id],
  );
  return { ...order, items };
}

// Bác sĩ: tất cả test orders thuộc các đợt khám của mình.
export async function listMineForDoctor(
  actor: TokenPayload,
): Promise<
  Array<
    TestOrderRow & {
      patient_name: string;
      items: ItemDetail[];
    }
  >
> {
  if (actor.role !== 'doctor')
    throw new AppError(403, 'Chỉ bác sĩ được xem danh sách này');
  const did = await doctorIdOfUser(actor.sub);
  const orders = await query<TestOrderRow & { patient_name: string }>(
    `SELECT t.*, p.full_name AS patient_name
       FROM test_orders t
       JOIN examination_sessions es ON es.id = t.session_id
       JOIN patients p ON p.id = t.patient_id
      WHERE es.doctor_id = $1
      ORDER BY t.created_at DESC`,
    [did],
  );
  const out = [];
  for (const o of orders) {
    const items = await query<ItemDetail>(
      `SELECT toi.*, tt.name AS test_type_name, lr.name AS lab_room_name
         FROM test_order_items toi
         JOIN lib_test_types tt ON tt.id = toi.test_type_id
         LEFT JOIN lab_rooms lr ON lr.id = toi.lab_room_id
        WHERE toi.test_order_id = $1
        ORDER BY toi.schedule_order ASC NULLS LAST`,
      [o.id],
    );
    out.push({ ...o, items });
  }
  return out;
}

export async function listBySession(
  sessionId: string,
  actor: TokenPayload,
): Promise<Array<TestOrderRow & { items: ItemDetail[] }>> {
  if (actor.role !== 'doctor')
    throw new AppError(403, 'Chỉ bác sĩ được xem theo đợt khám');
  const did = await doctorIdOfUser(actor.sub);
  const own = await queryOne(
    'SELECT 1 FROM examination_sessions WHERE id = $1 AND doctor_id = $2',
    [sessionId, did],
  );
  if (!own) throw new AppError(403, 'Đây không phải đợt khám của bạn');

  const orders = await query<TestOrderRow>(
    'SELECT * FROM test_orders WHERE session_id = $1 ORDER BY created_at ASC',
    [sessionId],
  );
  const out = [];
  for (const o of orders) {
    const items = await query<ItemDetail>(
      `SELECT toi.*, tt.name AS test_type_name, lr.name AS lab_room_name
         FROM test_order_items toi
         JOIN lib_test_types tt ON tt.id = toi.test_type_id
         LEFT JOIN lab_rooms lr ON lr.id = toi.lab_room_id
        WHERE toi.test_order_id = $1
        ORDER BY toi.schedule_order ASC NULLS LAST`,
      [o.id],
    );
    out.push({ ...o, items });
  }
  return out;
}

// Bệnh nhân xem lịch xét nghiệm của mình (cập nhật thời gian thực).
export async function listMySchedule(
  actor: TokenPayload,
): Promise<ItemDetail[]> {
  const pid = await patientIdOfUser(actor.sub);
  return query<ItemDetail>(
    `SELECT toi.*, tt.name AS test_type_name, lr.name AS lab_room_name
       FROM test_order_items toi
       JOIN test_orders t ON t.id = toi.test_order_id
       JOIN lib_test_types tt ON tt.id = toi.test_type_id
       LEFT JOIN lab_rooms lr ON lr.id = toi.lab_room_id
      WHERE t.patient_id = $1
      ORDER BY toi.schedule_order ASC NULLS LAST, toi.updated_at DESC`,
    [pid],
  );
}

// KTV chỉ thấy xét nghiệm của phòng mình phụ trách, chưa hoàn tất.
// Sort theo created_at (FIFO toàn cục) — schedule_order chỉ unique trong 1
// bệnh nhân nên không dùng được làm thứ tự queue giữa nhiều bệnh nhân.
export async function technicianQueue(
  actor: TokenPayload,
): Promise<ItemDetail[]> {
  if (actor.role !== 'technician')
    throw new AppError(403, 'Chỉ kỹ thuật viên xem được hàng chờ');
  const roomId = await technicianRoomOfUser(actor.sub);
  return query<ItemDetail>(
    `SELECT toi.*, tt.name AS test_type_name, lr.name AS lab_room_name,
            t.created_at AS order_created_at
       FROM test_order_items toi
       JOIN test_orders t ON t.id = toi.test_order_id
       JOIN lib_test_types tt ON tt.id = toi.test_type_id
       LEFT JOIN lab_rooms lr ON lr.id = toi.lab_room_id
      WHERE toi.lab_room_id = $1
        AND toi.status IN ('not_started','waiting','processing')
      ORDER BY t.created_at ASC, toi.schedule_order ASC NULLS LAST`,
    [roomId],
  );
}

const NEXT: Record<string, TestItemStatus[]> = {
  not_started: ['waiting'],
  waiting: ['processing'],
  processing: ['completed'],
};

export async function updateItemStatus(
  itemId: string,
  input: UpdateItemStatusInput,
  actor: TokenPayload,
): Promise<TestOrderItemRow> {
  if (actor.role !== 'technician')
    throw new AppError(403, 'Chỉ kỹ thuật viên được nhập liệu');
  const roomId = await technicianRoomOfUser(actor.sub);

  const item = await queryOne<TestOrderItemRow>(
    'SELECT * FROM test_order_items WHERE id = $1',
    [itemId],
  );
  if (!item) throw new AppError(404, 'Mục xét nghiệm không tồn tại');
  if (item.lab_room_id !== roomId)
    throw new AppError(403, 'Mục này không thuộc phòng bạn phụ trách');
  if (item.status === 'completed')
    throw new AppError(409, 'Đã có kết quả, không thể chỉnh sửa');
  if (item.status === 'unavailable')
    throw new AppError(409, 'Mục này chưa được phân phòng');

  const allowed = NEXT[item.status] ?? [];
  if (!allowed.includes(input.status))
    throw new AppError(
      409,
      `Không thể chuyển từ ${item.status} sang ${input.status}`,
    );

  const row = await queryOne<TestOrderItemRow>(
    `UPDATE test_order_items
        SET status = $1,
            result_data = COALESCE($2::jsonb, result_data)
      WHERE id = $3 RETURNING *`,
    [
      input.status,
      input.result_data !== undefined
        ? JSON.stringify(input.result_data)
        : null,
      itemId,
    ],
  );

  if (input.status === 'completed') {
    const o = await queryOne<{ patient_id: string }>(
      'SELECT patient_id FROM test_orders WHERE id = $1',
      [item.test_order_id],
    );
    if (o) {
      const uid = await patientUserId(o.patient_id);
      if (uid)
        await notifyUser(
          uid,
          'Đã có kết quả xét nghiệm',
          'Một xét nghiệm của bạn đã có kết quả.',
        );
    }
  }
  return row!;
}

// KTV hủy → phân phòng khác cùng loại; không còn phòng → unavailable + báo bệnh nhân.
// Cũng reset schedule_order khi đổi phòng (queue mới khác → thứ tự cũ không còn nghĩa).
// Schedule_order mới = item lớn nhất hiện tại + 1 (đặt cuối lịch trình bệnh nhân).
export async function cancelItem(
  itemId: string,
  actor: TokenPayload,
): Promise<TestOrderItemRow> {
  if (actor.role !== 'technician')
    throw new AppError(403, 'Chỉ kỹ thuật viên được hủy');
  const roomId = await technicianRoomOfUser(actor.sub);

  const item = await queryOne<TestOrderItemRow>(
    'SELECT * FROM test_order_items WHERE id = $1',
    [itemId],
  );
  if (!item) throw new AppError(404, 'Mục xét nghiệm không tồn tại');
  if (item.lab_room_id !== roomId)
    throw new AppError(403, 'Mục này không thuộc phòng bạn phụ trách');
  if (item.status === 'completed')
    throw new AppError(409, 'Đã có kết quả, không thể hủy');

  const rooms = (await candidateRooms(item.test_type_id)).filter(
    (r) => r.labRoomId !== item.lab_room_id,
  );
  // Chọn phòng có queue (phút) ít nhất — fairer hơn dùng count vì 1 ca CT 30'
  // nặng hơn 3 ca lấy máu 5'.
  rooms.sort((a, b) => a.queueMinutes - b.queueMinutes);
  const next = rooms[0];

  let row: TestOrderItemRow | null;
  if (next) {
    // Đặt cuối lịch của bệnh nhân (cùng test_order): max(schedule_order) + 1.
    const maxRow = await queryOne<{ m: number | null }>(
      `SELECT COALESCE(MAX(schedule_order), 0) AS m
         FROM test_order_items WHERE test_order_id = $1`,
      [item.test_order_id],
    );
    const newOrder = (Number(maxRow?.m ?? 0)) + 1;
    row = await queryOne<TestOrderItemRow>(
      `UPDATE test_order_items
          SET lab_room_id = $1, status = 'not_started', schedule_order = $3
        WHERE id = $2 RETURNING *`,
      [next.labRoomId, itemId, newOrder],
    );
  } else {
    row = await queryOne<TestOrderItemRow>(
      `UPDATE test_order_items
          SET lab_room_id = NULL, status = 'unavailable', schedule_order = NULL
        WHERE id = $1 RETURNING *`,
      [itemId],
    );
  }

  if (!next) {
    const o = await queryOne<{ patient_id: string }>(
      'SELECT patient_id FROM test_orders WHERE id = $1',
      [item.test_order_id],
    );
    if (o) {
      const uid = await patientUserId(o.patient_id);
      if (uid)
        await notifyUser(
          uid,
          'Xét nghiệm chưa thể thực hiện',
          'Một xét nghiệm của bạn hiện không còn phòng thực hiện. Hệ thống sẽ cập nhật khi có phòng.',
        );
    }
  }
  return row!;
}

// Bác sĩ xác nhận đã xem kết quả từng mục (điều kiện để cấp đơn thuốc).
export async function reviewItem(
  itemId: string,
  actor: TokenPayload,
): Promise<TestOrderItemRow> {
  if (actor.role !== 'doctor')
    throw new AppError(403, 'Chỉ bác sĩ được xác nhận đã xem kết quả');
  const did = await doctorIdOfUser(actor.sub);

  const item = await queryOne<
    TestOrderItemRow & { session_doctor: string; session_finalized: boolean }
  >(
    `SELECT toi.*, es.doctor_id AS session_doctor, es.is_finalized AS session_finalized
       FROM test_order_items toi
       JOIN test_orders t ON t.id = toi.test_order_id
       JOIN examination_sessions es ON es.id = t.session_id
      WHERE toi.id = $1`,
    [itemId],
  );
  if (!item) throw new AppError(404, 'Mục xét nghiệm không tồn tại');
  if (item.session_doctor !== did)
    throw new AppError(403, 'Đây không phải đợt khám của bạn');
  if (item.session_finalized)
    throw new AppError(409, 'Đợt khám đã chốt, không thể review thêm');
  if (item.status !== 'completed')
    throw new AppError(409, 'Chỉ xác nhận khi mục đã có kết quả');

  const row = await queryOne<TestOrderItemRow>(
    `UPDATE test_order_items
        SET result_reviewed_by_doctor = TRUE
      WHERE id = $1 RETURNING *`,
    [itemId],
  );
  return row!;
}
