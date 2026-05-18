import { query, queryOne } from '../../db/query';
import type { DepartmentRow } from '../../types/db';
import { AppError } from '../../middleware/error';
import type { CreateDepartmentInput, UpdateDepartmentInput } from './departments.schema';

export async function listDepartments(name?: string): Promise<DepartmentRow[]> {
  if (name) {
    return query<DepartmentRow>(
      'SELECT * FROM departments WHERE name ILIKE $1 ORDER BY name ASC',
      [`%${name}%`],
    );
  }
  return query<DepartmentRow>('SELECT * FROM departments ORDER BY name ASC');
}

export async function getDepartment(id: string): Promise<DepartmentRow> {
  const row = await queryOne<DepartmentRow>(
    'SELECT * FROM departments WHERE id = $1',
    [id],
  );
  if (!row) throw new AppError(404, 'Khoa không tồn tại');
  return row;
}

export async function createDepartment(
  input: CreateDepartmentInput,
): Promise<DepartmentRow> {
  const dup = await queryOne('SELECT id FROM departments WHERE name = $1', [
    input.name,
  ]);
  if (dup) throw new AppError(409, 'Tên khoa đã tồn tại');

  const row = await queryOne<DepartmentRow>(
    'INSERT INTO departments (name, description) VALUES ($1, $2) RETURNING *',
    [input.name, input.description ?? null],
  );
  return row!;
}

export async function updateDepartment(
  id: string,
  input: UpdateDepartmentInput,
): Promise<DepartmentRow> {
  await getDepartment(id);

  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (input.name !== undefined) {
    const dup = await queryOne(
      'SELECT id FROM departments WHERE name = $1 AND id <> $2',
      [input.name, id],
    );
    if (dup) throw new AppError(409, 'Tên khoa đã tồn tại');
    sets.push(`name = $${i++}`);
    params.push(input.name);
  }
  if (input.description !== undefined) {
    sets.push(`description = $${i++}`);
    params.push(input.description);
  }

  if (sets.length === 0) throw new AppError(400, 'Không có thông tin cần cập nhật');

  params.push(id);
  const row = await queryOne<DepartmentRow>(
    `UPDATE departments SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    params,
  );
  return row!;
}

export async function deleteDepartment(id: string): Promise<void> {
  await getDepartment(id);

  const hasDoctors = await queryOne(
    'SELECT id FROM doctors WHERE department_id = $1 LIMIT 1',
    [id],
  );
  if (hasDoctors) throw new AppError(409, 'Không thể xóa khoa đang có bác sĩ');

  const hasDiseases = await queryOne(
    'SELECT id FROM lib_diseases WHERE department_id = $1 LIMIT 1',
    [id],
  );
  if (hasDiseases)
    throw new AppError(409, 'Không thể xóa khoa đang có bệnh liên kết');

  await queryOne('DELETE FROM departments WHERE id = $1 RETURNING id', [id]);
}
