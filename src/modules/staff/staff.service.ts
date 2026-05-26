import { query, queryOne, withTransaction } from '../../db/query';
import type {
  DoctorRow,
  TechnicianRow,
  UserRole,
  UserRow,
} from '../../types/db';
import { AppError } from '../../middleware/error';
import { generatePassword, hashPassword } from '../../utils/password';
import { calcAge } from '../../utils/date';
import type {
  CreateBasicStaffInput,
  CreateDoctorInput,
  CreateTechnicianInput,
  ListAccountsQuery,
  UpdateDoctorInput,
  UpdateTechnicianInput,
} from './staff.schema';

interface PublicUser {
  id: string;
  username: string;
  role: UserRole;
  is_active: boolean;
}

function toPublicUser(u: UserRow): PublicUser {
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    is_active: u.is_active,
  };
}

async function ensureUsernameFree(username: string): Promise<void> {
  const dup = await queryOne('SELECT id FROM users WHERE username = $1', [
    username,
  ]);
  if (dup) throw new AppError(409, 'Username đã tồn tại');
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCOUNT MANAGEMENT (mọi role) — quản lý chỉ xem tên, tuổi; KHÔNG xem hồ sơ bệnh án
// ═══════════════════════════════════════════════════════════════════════════

interface AccountListRow {
  id: string;
  username: string;
  role: UserRole;
  is_active: boolean;
  auto_schedule_paused: boolean;
  full_name: string | null;
  date_of_birth: string | null;
}

export async function listAccounts(q: ListAccountsQuery): Promise<
  Array<{
    id: string;
    username: string;
    role: UserRole;
    is_active: boolean;
    auto_schedule_paused: boolean;
    full_name: string | null;
    age: number | null;
  }>
> {
  const rows = await query<AccountListRow>(
    `SELECT u.id, u.username, u.role, u.is_active, u.auto_schedule_paused,
            COALESCE(d.full_name, t.full_name, p.full_name) AS full_name,
            p.date_of_birth
       FROM users u
       LEFT JOIN doctors d     ON d.user_id = u.id
       LEFT JOIN technicians t ON t.user_id = u.id
       LEFT JOIN patients p    ON p.user_id = u.id
      WHERE ($1::user_role IS NULL OR u.role = $1::user_role)
        AND ($2::boolean   IS NULL OR u.is_active = $2::boolean)
      ORDER BY u.role, u.username`,
    [
      q.role ?? null,
      q.is_active === undefined ? null : q.is_active === 'true',
    ],
  );

  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    role: r.role,
    is_active: r.is_active,
    auto_schedule_paused: r.auto_schedule_paused,
    full_name: r.full_name,
    age: r.date_of_birth ? calcAge(r.date_of_birth) : null,
  }));
}

export async function setAccountActive(
  targetUserId: string,
  requesterUserId: string,
  isActive: boolean,
): Promise<PublicUser> {
  if (targetUserId === requesterUserId) {
    throw new AppError(400, 'Không thể tự khóa/mở khóa tài khoản của chính mình');
  }
  const user = await queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [
    targetUserId,
  ]);
  if (!user) throw new AppError(404, 'Tài khoản không tồn tại');

  // Bảo vệ: không cho phép khóa manager cuối cùng đang active — sẽ không còn ai
  // có quyền mở khóa lại, hệ thống lock chính nó.
  if (!isActive && user.role === 'manager' && user.is_active) {
    const others = await queryOne<{ n: string }>(
      `SELECT COUNT(*) AS n FROM users
        WHERE role = 'manager' AND is_active = TRUE AND id <> $1`,
      [targetUserId],
    );
    if (others && Number(others.n) === 0) {
      throw new AppError(
        409,
        'Không thể khóa manager cuối cùng — hệ thống cần ít nhất 1 manager active',
      );
    }
  }

  const updated = await queryOne<UserRow>(
    'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING *',
    [isActive, targetUserId],
  );
  return toPublicUser(updated!);
}

// Manager reset mật khẩu cho staff (doctor/technician/cashier/receptionist).
// Sinh mật khẩu mới, trả về cho manager đọc và đưa tận tay staff
// (không gửi SMS vì staff không lưu SĐT trong bảng users).
export async function resetStaffPassword(
  targetUserId: string,
  requesterUserId: string,
): Promise<{ username: string; new_password: string }> {
  if (targetUserId === requesterUserId)
    throw new AppError(400, 'Không thể reset mật khẩu của chính mình — dùng change-password');

  const user = await queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [
    targetUserId,
  ]);
  if (!user) throw new AppError(404, 'Tài khoản không tồn tại');
  if (user.role === 'patient')
    throw new AppError(400, 'Reset mật khẩu bệnh nhân qua /patients/:id/reset-password');

  const newPassword = generatePassword();
  const newHash = await hashPassword(newPassword);
  await queryOne(
    `UPDATE users
        SET password_hash = $1,
            failed_login_count = 0,
            locked_until = NULL
      WHERE id = $2 RETURNING id`,
    [newHash, targetUserId],
  );
  return { username: user.username, new_password: newPassword };
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCTOR
// ═══════════════════════════════════════════════════════════════════════════

export async function createDoctor(
  input: CreateDoctorInput,
): Promise<{ user: PublicUser; doctor: DoctorRow }> {
  await ensureUsernameFree(input.username);

  const dept = await queryOne('SELECT id FROM departments WHERE id = $1', [
    input.department_id,
  ]);
  if (!dept) throw new AppError(404, 'Khoa không tồn tại');

  const hash = await hashPassword(input.password);

  return withTransaction(async (client) => {
    const u = await client.query<UserRow>(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, 'doctor') RETURNING *`,
      [input.username, hash],
    );
    const user = u.rows[0]!;
    const d = await client.query<DoctorRow>(
      `INSERT INTO doctors (user_id, full_name, department_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [user.id, input.full_name, input.department_id],
    );
    return { user: toPublicUser(user), doctor: d.rows[0]! };
  });
}

export async function listDoctors(): Promise<
  Array<DoctorRow & { username: string; is_active: boolean; department_name: string }>
> {
  return query(
    `SELECT dr.*, u.username, u.is_active, dep.name AS department_name
       FROM doctors dr
       JOIN users u        ON u.id = dr.user_id
       JOIN departments dep ON dep.id = dr.department_id
      ORDER BY dr.full_name ASC`,
  );
}

export async function getDoctor(id: string): Promise<DoctorRow> {
  const row = await queryOne<DoctorRow>(
    'SELECT * FROM doctors WHERE id = $1',
    [id],
  );
  if (!row) throw new AppError(404, 'Bác sĩ không tồn tại');
  return row;
}

export async function updateDoctor(
  id: string,
  input: UpdateDoctorInput,
): Promise<DoctorRow & { auto_schedule_paused: boolean }> {
  const doctor = await getDoctor(id);

  if (input.department_id !== undefined) {
    const dept = await queryOne('SELECT id FROM departments WHERE id = $1', [
      input.department_id,
    ]);
    if (!dept) throw new AppError(404, 'Khoa không tồn tại');
  }

  return withTransaction(async (client) => {
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (input.full_name !== undefined) {
      sets.push(`full_name = $${i++}`);
      params.push(input.full_name);
    }
    if (input.department_id !== undefined) {
      sets.push(`department_id = $${i++}`);
      params.push(input.department_id);
    }

    let updatedDoctor = doctor;
    if (sets.length > 0) {
      params.push(id);
      const r = await client.query<DoctorRow>(
        `UPDATE doctors SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
        params,
      );
      updatedDoctor = r.rows[0]!;
    }

    let autoPaused: boolean;
    if (input.auto_schedule_paused !== undefined) {
      const u = await client.query<UserRow>(
        'UPDATE users SET auto_schedule_paused = $1 WHERE id = $2 RETURNING *',
        [input.auto_schedule_paused, doctor.user_id],
      );
      autoPaused = u.rows[0]!.auto_schedule_paused;
    } else {
      const u = await client.query<UserRow>(
        'SELECT auto_schedule_paused FROM users WHERE id = $1',
        [doctor.user_id],
      );
      autoPaused = u.rows[0]!.auto_schedule_paused;
    }

    return { ...updatedDoctor, auto_schedule_paused: autoPaused };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TECHNICIAN
// ═══════════════════════════════════════════════════════════════════════════

export async function createTechnician(
  input: CreateTechnicianInput,
): Promise<{ user: PublicUser; technician: TechnicianRow }> {
  await ensureUsernameFree(input.username);

  const room = await queryOne(
    'SELECT id FROM lab_rooms WHERE id = $1',
    [input.lab_room_id],
  );
  if (!room) throw new AppError(404, 'Phòng xét nghiệm không tồn tại');

  const taken = await queryOne(
    'SELECT id FROM technicians WHERE lab_room_id = $1',
    [input.lab_room_id],
  );
  if (taken)
    throw new AppError(409, 'Phòng xét nghiệm đã có kỹ thuật viên phụ trách');

  const hash = await hashPassword(input.password);

  return withTransaction(async (client) => {
    const u = await client.query<UserRow>(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, 'technician') RETURNING *`,
      [input.username, hash],
    );
    const user = u.rows[0]!;
    const t = await client.query<TechnicianRow>(
      `INSERT INTO technicians (user_id, full_name, lab_room_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [user.id, input.full_name, input.lab_room_id],
    );
    return { user: toPublicUser(user), technician: t.rows[0]! };
  });
}

export async function listTechnicians(): Promise<
  Array<TechnicianRow & { username: string; is_active: boolean; lab_room_name: string }>
> {
  return query(
    `SELECT te.*, u.username, u.is_active, lr.name AS lab_room_name
       FROM technicians te
       JOIN users u     ON u.id = te.user_id
       JOIN lab_rooms lr ON lr.id = te.lab_room_id
      ORDER BY te.full_name ASC`,
  );
}

export async function getTechnician(id: string): Promise<TechnicianRow> {
  const row = await queryOne<TechnicianRow>(
    'SELECT * FROM technicians WHERE id = $1',
    [id],
  );
  if (!row) throw new AppError(404, 'Kỹ thuật viên không tồn tại');
  return row;
}

export async function updateTechnician(
  id: string,
  input: UpdateTechnicianInput,
): Promise<TechnicianRow> {
  await getTechnician(id);

  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (input.full_name !== undefined) {
    sets.push(`full_name = $${i++}`);
    params.push(input.full_name);
  }
  if (input.lab_room_id !== undefined) {
    const room = await queryOne('SELECT id FROM lab_rooms WHERE id = $1', [
      input.lab_room_id,
    ]);
    if (!room) throw new AppError(404, 'Phòng xét nghiệm không tồn tại');
    const taken = await queryOne(
      'SELECT id FROM technicians WHERE lab_room_id = $1 AND id <> $2',
      [input.lab_room_id, id],
    );
    if (taken)
      throw new AppError(409, 'Phòng xét nghiệm đã có kỹ thuật viên phụ trách');
    sets.push(`lab_room_id = $${i++}`);
    params.push(input.lab_room_id);
  }

  if (sets.length === 0) throw new AppError(400, 'Không có thông tin cần cập nhật');

  params.push(id);
  const row = await queryOne<TechnicianRow>(
    `UPDATE technicians SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    params,
  );
  return row!;
}

// ═══════════════════════════════════════════════════════════════════════════
// CASHIER / RECEPTIONIST — không có bảng profile, thông tin đủ trong users
// ═══════════════════════════════════════════════════════════════════════════

async function createBasicStaff(
  input: CreateBasicStaffInput,
  role: 'cashier' | 'receptionist',
): Promise<PublicUser> {
  await ensureUsernameFree(input.username);
  const hash = await hashPassword(input.password);
  const user = await queryOne<UserRow>(
    `INSERT INTO users (username, password_hash, role)
     VALUES ($1, $2, $3) RETURNING *`,
    [input.username, hash, role],
  );
  return toPublicUser(user!);
}

export function createCashier(input: CreateBasicStaffInput): Promise<PublicUser> {
  return createBasicStaff(input, 'cashier');
}

export function createReceptionist(
  input: CreateBasicStaffInput,
): Promise<PublicUser> {
  return createBasicStaff(input, 'receptionist');
}
