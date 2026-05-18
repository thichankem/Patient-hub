import { query, queryOne } from '../../db/query';
import type { LabRoomRow } from '../../types/db';
import { AppError } from '../../middleware/error';
import type { CreateLabRoomInput, UpdateLabRoomInput } from './lab-rooms.schema';

export async function listLabRooms(name?: string): Promise<LabRoomRow[]> {
  if (name) {
    return query<LabRoomRow>(
      'SELECT * FROM lab_rooms WHERE name ILIKE $1 ORDER BY name ASC',
      [`%${name}%`],
    );
  }
  return query<LabRoomRow>('SELECT * FROM lab_rooms ORDER BY name ASC');
}

export async function getLabRoom(id: string): Promise<LabRoomRow> {
  const row = await queryOne<LabRoomRow>(
    'SELECT * FROM lab_rooms WHERE id = $1',
    [id],
  );
  if (!row) throw new AppError(404, 'Phòng xét nghiệm không tồn tại');
  return row;
}

export async function createLabRoom(
  input: CreateLabRoomInput,
): Promise<LabRoomRow> {
  const testTypeExists = await queryOne(
    'SELECT id FROM lib_test_types WHERE id = $1',
    [input.test_type_id],
  );
  if (!testTypeExists)
    throw new AppError(404, 'Loại xét nghiệm không tồn tại');

  const row = await queryOne<LabRoomRow>(
    'INSERT INTO lab_rooms (name, test_type_id) VALUES ($1, $2) RETURNING *',
    [input.name, input.test_type_id],
  );
  return row!;
}

export async function updateLabRoom(
  id: string,
  input: UpdateLabRoomInput,
): Promise<LabRoomRow> {
  await getLabRoom(id);

  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (input.name !== undefined) {
    sets.push(`name = $${i++}`);
    params.push(input.name);
  }
  if (input.test_type_id !== undefined) {
    const testTypeExists = await queryOne(
      'SELECT id FROM lib_test_types WHERE id = $1',
      [input.test_type_id],
    );
    if (!testTypeExists)
      throw new AppError(404, 'Loại xét nghiệm không tồn tại');
    sets.push(`test_type_id = $${i++}`);
    params.push(input.test_type_id);
  }

  if (sets.length === 0) throw new AppError(400, 'Không có thông tin cần cập nhật');

  params.push(id);
  const row = await queryOne<LabRoomRow>(
    `UPDATE lab_rooms SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    params,
  );
  return row!;
}

export async function deleteLabRoom(id: string): Promise<void> {
  await getLabRoom(id);

  // technicians.lab_room_id is ON DELETE RESTRICT — kiểm tra trước
  const hasTechnician = await queryOne(
    'SELECT id FROM technicians WHERE lab_room_id = $1 LIMIT 1',
    [id],
  );
  if (hasTechnician)
    throw new AppError(409, 'Không thể xóa phòng đang có kỹ thuật viên phụ trách');

  await queryOne('DELETE FROM lab_rooms WHERE id = $1 RETURNING id', [id]);
}
