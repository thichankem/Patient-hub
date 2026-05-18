import { query, queryOne } from '../../db/query';
import type {
  LibDiseaseRow,
  LibMedicineRow,
  LibTestTypeRow,
  LibProcedureRow,
} from '../../types/db';
import { AppError } from '../../middleware/error';
import type {
  CreateDiseaseInput,
  UpdateDiseaseInput,
  ListDiseaseQuery,
  CreateMedicineInput,
  UpdateMedicineInput,
  CreateTestTypeInput,
  UpdateTestTypeInput,
  CreateProcedureInput,
  UpdateProcedureInput,
  ListNameQuery,
} from './library.schema';

// Helper: build a dynamic SET clause for partial updates.
// Returns { sets, params } where params does NOT include the WHERE id param.
function buildSets(
  fields: Record<string, unknown>,
): { sets: string[]; params: unknown[]; nextIdx: number } {
  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  for (const [col, val] of Object.entries(fields)) {
    if (val !== undefined) {
      sets.push(`${col} = $${i++}`);
      params.push(val === null ? null : val);
    }
  }
  return { sets, params, nextIdx: i };
}

// ═══════════════════════════════════════════════════════════════════════════
// DISEASES
// ═══════════════════════════════════════════════════════════════════════════

export async function listDiseases(q: ListDiseaseQuery): Promise<LibDiseaseRow[]> {
  const conditions: string[] = ['1=1'];
  const params: unknown[] = [];
  let i = 1;

  if (q.name) {
    conditions.push(`name ILIKE $${i++}`);
    params.push(`%${q.name}%`);
  }
  if (q.department_id) {
    conditions.push(`department_id = $${i++}`);
    params.push(q.department_id);
  }

  return query<LibDiseaseRow>(
    `SELECT * FROM lib_diseases WHERE ${conditions.join(' AND ')} ORDER BY name ASC`,
    params,
  );
}

export async function getDisease(id: string): Promise<LibDiseaseRow> {
  const row = await queryOne<LibDiseaseRow>(
    'SELECT * FROM lib_diseases WHERE id = $1',
    [id],
  );
  if (!row) throw new AppError(404, 'Bệnh không tồn tại');
  return row;
}

export async function createDisease(
  input: CreateDiseaseInput,
): Promise<LibDiseaseRow> {
  const row = await queryOne<LibDiseaseRow>(
    `INSERT INTO lib_diseases (name, symptoms, description, treatment, department_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      input.name,
      input.symptoms ?? null,
      input.description ?? null,
      input.treatment ?? null,
      input.department_id ?? null,
    ],
  );
  return row!;
}

export async function updateDisease(
  id: string,
  input: UpdateDiseaseInput,
): Promise<LibDiseaseRow> {
  await getDisease(id);

  const { sets, params, nextIdx } = buildSets({
    name: input.name,
    symptoms: input.symptoms,
    description: input.description,
    treatment: input.treatment,
    department_id: input.department_id,
  });

  if (sets.length === 0) throw new AppError(400, 'Không có thông tin cần cập nhật');

  params.push(id);
  const row = await queryOne<LibDiseaseRow>(
    `UPDATE lib_diseases SET ${sets.join(', ')} WHERE id = $${nextIdx} RETURNING *`,
    params,
  );
  return row!;
}

export async function deleteDisease(id: string): Promise<void> {
  await getDisease(id);
  await queryOne('DELETE FROM lib_diseases WHERE id = $1 RETURNING id', [id]);
}

// ═══════════════════════════════════════════════════════════════════════════
// MEDICINES
// ═══════════════════════════════════════════════════════════════════════════

export async function listMedicines(q: ListNameQuery): Promise<LibMedicineRow[]> {
  if (q.name) {
    return query<LibMedicineRow>(
      'SELECT * FROM lib_medicines WHERE name ILIKE $1 ORDER BY name ASC',
      [`%${q.name}%`],
    );
  }
  return query<LibMedicineRow>('SELECT * FROM lib_medicines ORDER BY name ASC');
}

export async function getMedicine(id: string): Promise<LibMedicineRow> {
  const row = await queryOne<LibMedicineRow>(
    'SELECT * FROM lib_medicines WHERE id = $1',
    [id],
  );
  if (!row) throw new AppError(404, 'Thuốc không tồn tại');
  return row;
}

export async function createMedicine(
  input: CreateMedicineInput,
): Promise<LibMedicineRow> {
  const row = await queryOne<LibMedicineRow>(
    `INSERT INTO lib_medicines (name, description, usage, side_effects, price, insurance_price)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      input.name,
      input.description ?? null,
      input.usage ?? null,
      input.side_effects ?? null,
      input.price,
      input.insurance_price,
    ],
  );
  return row!;
}

export async function updateMedicine(
  id: string,
  input: UpdateMedicineInput,
): Promise<LibMedicineRow> {
  await getMedicine(id);

  const { sets, params, nextIdx } = buildSets({
    name: input.name,
    description: input.description,
    usage: input.usage,
    side_effects: input.side_effects,
    price: input.price,
    insurance_price: input.insurance_price,
  });

  if (sets.length === 0) throw new AppError(400, 'Không có thông tin cần cập nhật');

  params.push(id);
  const row = await queryOne<LibMedicineRow>(
    `UPDATE lib_medicines SET ${sets.join(', ')} WHERE id = $${nextIdx} RETURNING *`,
    params,
  );
  return row!;
}

export async function deleteMedicine(id: string): Promise<void> {
  await getMedicine(id);

  const inUse = await queryOne(
    'SELECT id FROM prescription_items WHERE medicine_id = $1 LIMIT 1',
    [id],
  );
  if (inUse)
    throw new AppError(409, 'Không thể xóa thuốc đang được dùng trong đơn thuốc');

  await queryOne('DELETE FROM lib_medicines WHERE id = $1 RETURNING id', [id]);
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST TYPES
// ═══════════════════════════════════════════════════════════════════════════

export async function listTestTypes(q: ListNameQuery): Promise<LibTestTypeRow[]> {
  if (q.name) {
    return query<LibTestTypeRow>(
      'SELECT * FROM lib_test_types WHERE name ILIKE $1 ORDER BY name ASC',
      [`%${q.name}%`],
    );
  }
  return query<LibTestTypeRow>('SELECT * FROM lib_test_types ORDER BY name ASC');
}

export async function getTestType(id: string): Promise<LibTestTypeRow> {
  const row = await queryOne<LibTestTypeRow>(
    'SELECT * FROM lib_test_types WHERE id = $1',
    [id],
  );
  if (!row) throw new AppError(404, 'Loại xét nghiệm không tồn tại');
  return row;
}

export async function createTestType(
  input: CreateTestTypeInput,
): Promise<LibTestTypeRow> {
  const row = await queryOne<LibTestTypeRow>(
    `INSERT INTO lib_test_types (name, description, estimated_minutes, price, insurance_price)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      input.name,
      input.description ?? null,
      input.estimated_minutes,
      input.price,
      input.insurance_price,
    ],
  );
  return row!;
}

export async function updateTestType(
  id: string,
  input: UpdateTestTypeInput,
): Promise<LibTestTypeRow> {
  await getTestType(id);

  const { sets, params, nextIdx } = buildSets({
    name: input.name,
    description: input.description,
    estimated_minutes: input.estimated_minutes,
    price: input.price,
    insurance_price: input.insurance_price,
  });

  if (sets.length === 0) throw new AppError(400, 'Không có thông tin cần cập nhật');

  params.push(id);
  const row = await queryOne<LibTestTypeRow>(
    `UPDATE lib_test_types SET ${sets.join(', ')} WHERE id = $${nextIdx} RETURNING *`,
    params,
  );
  return row!;
}

export async function deleteTestType(id: string): Promise<void> {
  await getTestType(id);

  const hasLabRoom = await queryOne(
    'SELECT id FROM lab_rooms WHERE test_type_id = $1 LIMIT 1',
    [id],
  );
  if (hasLabRoom)
    throw new AppError(409, 'Không thể xóa loại xét nghiệm đang được gán cho phòng');

  const inUse = await queryOne(
    'SELECT id FROM test_order_items WHERE test_type_id = $1 LIMIT 1',
    [id],
  );
  if (inUse)
    throw new AppError(
      409,
      'Không thể xóa loại xét nghiệm đang được dùng trong yêu cầu xét nghiệm',
    );

  await queryOne('DELETE FROM lib_test_types WHERE id = $1 RETURNING id', [id]);
}

// ═══════════════════════════════════════════════════════════════════════════
// PROCEDURES
// ═══════════════════════════════════════════════════════════════════════════

export async function listProcedures(q: ListNameQuery): Promise<LibProcedureRow[]> {
  if (q.name) {
    return query<LibProcedureRow>(
      'SELECT * FROM lib_procedures WHERE name ILIKE $1 ORDER BY name ASC',
      [`%${q.name}%`],
    );
  }
  return query<LibProcedureRow>('SELECT * FROM lib_procedures ORDER BY name ASC');
}

export async function getProcedure(id: string): Promise<LibProcedureRow> {
  const row = await queryOne<LibProcedureRow>(
    'SELECT * FROM lib_procedures WHERE id = $1',
    [id],
  );
  if (!row) throw new AppError(404, 'Quy trình khám không tồn tại');
  return row;
}

export async function createProcedure(
  input: CreateProcedureInput,
): Promise<LibProcedureRow> {
  const row = await queryOne<LibProcedureRow>(
    'INSERT INTO lib_procedures (name, description) VALUES ($1, $2) RETURNING *',
    [input.name, input.description ?? null],
  );
  return row!;
}

export async function updateProcedure(
  id: string,
  input: UpdateProcedureInput,
): Promise<LibProcedureRow> {
  await getProcedure(id);

  const { sets, params, nextIdx } = buildSets({
    name: input.name,
    description: input.description,
  });

  if (sets.length === 0) throw new AppError(400, 'Không có thông tin cần cập nhật');

  params.push(id);
  const row = await queryOne<LibProcedureRow>(
    `UPDATE lib_procedures SET ${sets.join(', ')} WHERE id = $${nextIdx} RETURNING *`,
    params,
  );
  return row!;
}

export async function deleteProcedure(id: string): Promise<void> {
  await getProcedure(id);
  await queryOne('DELETE FROM lib_procedures WHERE id = $1 RETURNING id', [id]);
}
