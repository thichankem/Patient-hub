import { queryOne, query, withTransaction } from '../../db/query';
import type { PatientRow, UserRow } from '../../types/db';
import { AppError } from '../../middleware/error';
import { generatePassword, hashPassword, verifyPassword } from '../../utils/password';
import { encrypt, decrypt } from '../../utils/crypto';
import { sendSms } from '../../utils/sms';
import { calcAge } from '../../utils/date';
import type { CreatePatientInput, UpdatePatientInput } from './patients.schema';

// DTO trả ra ngoài: giải mã phone/insurance, thêm tuổi, bỏ cột *_encrypted.
export interface PatientDTO {
  id: string;
  user_id: string;
  full_name: string;
  date_of_birth: string;
  age: number;
  gender: string;
  blood_type: string | null;
  address: string | null;
  phone: string;
  insurance_number: string | null;
  insurance_expiry: string | null;
  priority_type: PatientRow['priority_type'];
  created_at: Date;
  updated_at: Date;
}

function toDTO(row: PatientRow): PatientDTO {
  return {
    id: row.id,
    user_id: row.user_id,
    full_name: row.full_name,
    date_of_birth: row.date_of_birth,
    age: calcAge(row.date_of_birth),
    gender: row.gender,
    blood_type: row.blood_type,
    address: row.address,
    phone: decrypt(row.phone_encrypted),
    insurance_number: row.insurance_number_encrypted
      ? decrypt(row.insurance_number_encrypted)
      : null,
    insurance_expiry: row.insurance_expiry,
    priority_type: row.priority_type,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Tiếp tân tạo tài khoản — username = SĐT, mật khẩu sinh tự động gửi qua SMS.
export async function createPatient(
  input: CreatePatientInput,
): Promise<PatientDTO> {
  const dup = await queryOne('SELECT id FROM users WHERE username = $1', [
    input.phone,
  ]);
  if (dup)
    throw new AppError(409, 'Số điện thoại đã được dùng cho một tài khoản khác');

  const password = generatePassword();
  const hash = await hashPassword(password);

  const created = await withTransaction(async (client) => {
    const u = await client.query<UserRow>(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, 'patient') RETURNING *`,
      [input.phone, hash],
    );
    const user = u.rows[0]!;
    const p = await client.query<PatientRow>(
      `INSERT INTO patients
         (user_id, full_name, date_of_birth, gender, blood_type, address,
          phone_encrypted, insurance_number_encrypted, insurance_expiry, priority_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        user.id,
        input.full_name,
        input.date_of_birth,
        input.gender,
        input.blood_type ?? null,
        input.address ?? null,
        encrypt(input.phone),
        input.insurance_number ? encrypt(input.insurance_number) : null,
        input.insurance_expiry ?? null,
        input.priority_type ?? null,
      ],
    );
    return p.rows[0]!;
  });

  sendSms(
    input.phone,
    `Tài khoản bệnh viện đã được tạo. Tên đăng nhập: ${input.phone}. Mật khẩu: ${password}`,
  );

  return toDTO(created);
}

export async function listPatients(name?: string): Promise<PatientDTO[]> {
  const rows = name
    ? await query<PatientRow>(
        'SELECT * FROM patients WHERE full_name ILIKE $1 ORDER BY full_name ASC',
        [`%${name}%`],
      )
    : await query<PatientRow>('SELECT * FROM patients ORDER BY full_name ASC');
  return rows.map(toDTO);
}

export async function getPatientById(id: string): Promise<PatientDTO> {
  const row = await queryOne<PatientRow>(
    'SELECT * FROM patients WHERE id = $1',
    [id],
  );
  if (!row) throw new AppError(404, 'Bệnh nhân không tồn tại');
  return toDTO(row);
}

export async function getPatientByUserId(userId: string): Promise<PatientDTO> {
  const row = await queryOne<PatientRow>(
    'SELECT * FROM patients WHERE user_id = $1',
    [userId],
  );
  if (!row) throw new AppError(404, 'Không tìm thấy hồ sơ bệnh nhân');
  return toDTO(row);
}

// Tiếp tân sửa thông tin: cần mật khẩu hiện tại, sau khi sửa sinh mật khẩu mới
// và gửi về SĐT (đã cập nhật nếu có đổi).
export async function updatePatient(
  id: string,
  input: UpdatePatientInput,
): Promise<PatientDTO> {
  const patient = await queryOne<PatientRow>(
    'SELECT * FROM patients WHERE id = $1',
    [id],
  );
  if (!patient) throw new AppError(404, 'Bệnh nhân không tồn tại');

  const user = await queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [
    patient.user_id,
  ]);
  if (!user) throw new AppError(404, 'Tài khoản bệnh nhân không tồn tại');

  const ok = await verifyPassword(input.currentPassword, user.password_hash);
  if (!ok) throw new AppError(400, 'Mật khẩu hiện tại của bệnh nhân không đúng');

  if (input.phone !== undefined && input.phone !== user.username) {
    const dup = await queryOne(
      'SELECT id FROM users WHERE username = $1 AND id <> $2',
      [input.phone, user.id],
    );
    if (dup)
      throw new AppError(409, 'Số điện thoại đã được dùng cho một tài khoản khác');
  }

  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  const push = (col: string, val: unknown): void => {
    sets.push(`${col} = $${i++}`);
    params.push(val);
  };

  if (input.full_name !== undefined) push('full_name', input.full_name);
  if (input.date_of_birth !== undefined)
    push('date_of_birth', input.date_of_birth);
  if (input.gender !== undefined) push('gender', input.gender);
  if (input.blood_type !== undefined) push('blood_type', input.blood_type);
  if (input.address !== undefined) push('address', input.address);
  if (input.phone !== undefined) push('phone_encrypted', encrypt(input.phone));
  if (input.insurance_number !== undefined)
    push(
      'insurance_number_encrypted',
      input.insurance_number ? encrypt(input.insurance_number) : null,
    );
  if (input.insurance_expiry !== undefined)
    push('insurance_expiry', input.insurance_expiry);
  if (input.priority_type !== undefined)
    push('priority_type', input.priority_type);

  if (sets.length === 0) throw new AppError(400, 'Không có thông tin cần cập nhật');

  // CHỈ reset mật khẩu nếu SĐT (username) thay đổi — không spam SMS mỗi lần
  // sửa địa chỉ. Khi đổi SĐT thì bắt buộc reset vì username = SĐT cần khớp.
  const phoneChanged = input.phone !== undefined && input.phone !== user.username;
  const finalPhone = phoneChanged ? input.phone! : user.username;
  const newPassword = phoneChanged ? generatePassword() : null;
  const newHash = newPassword ? await hashPassword(newPassword) : null;

  const updated = await withTransaction(async (client) => {
    params.push(id);
    const r = await client.query<PatientRow>(
      `UPDATE patients SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      params,
    );
    if (phoneChanged) {
      await client.query(
        'UPDATE users SET username = $1, password_hash = $2 WHERE id = $3',
        [finalPhone, newHash, user.id],
      );
    }
    return r.rows[0]!;
  });

  if (phoneChanged && newPassword) {
    sendSms(
      finalPhone,
      `Số điện thoại tài khoản đã được cập nhật. Tên đăng nhập: ${finalPhone}. Mật khẩu mới: ${newPassword}`,
    );
  }

  return toDTO(updated);
}

// Quên mật khẩu — sinh mật khẩu mới gửi về SĐT bệnh nhân.
// Đồng thời clear lock counter (consistent với auth.forgotPassword).
export async function resetPassword(id: string): Promise<void> {
  const patient = await queryOne<PatientRow>(
    'SELECT * FROM patients WHERE id = $1',
    [id],
  );
  if (!patient) throw new AppError(404, 'Bệnh nhân không tồn tại');

  const newPassword = generatePassword();
  const newHash = await hashPassword(newPassword);
  await queryOne(
    `UPDATE users
        SET password_hash = $1,
            failed_login_count = 0,
            locked_until = NULL
      WHERE id = $2 RETURNING id`,
    [newHash, patient.user_id],
  );

  const phone = decrypt(patient.phone_encrypted);
  sendSms(phone, `Mật khẩu mới của bạn: ${newPassword}`);
}
