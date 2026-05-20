import { query, queryOne } from '../../db/query';
import { AppError } from '../../middleware/error';
import type { TokenPayload } from '../../utils/jwt';
import type {
  DepartmentRow,
  DoctorRow,
  LibDiseaseRow,
  LibMedicineRow,
  LibProcedureRow,
  LibTestTypeRow,
} from '../../types/db';
import { predictDiseaseDepartment } from './ai.stub';
import type {
  AskLibraryQuery,
  SuggestDoctorQuery,
  SymptomQuery,
} from './chatbot.schema';

// Bước 1: bệnh nhân nhập triệu chứng. Hệ thống dùng AI predict.
// Output gợi ý khoa / lời khuyên / cần đi viện hay không.
export async function analyzeSymptoms(
  q: SymptomQuery,
  actor: TokenPayload,
): Promise<{
  needs_hospital: boolean;
  suggested_department: DepartmentRow | null;
  disease_name: string | null;
  advice: string | null;
}> {
  if (actor.role !== 'patient')
    throw new AppError(403, 'Chỉ bệnh nhân dùng chatbot');

  const pred = await predictDiseaseDepartment(q.symptoms);

  let dept: DepartmentRow | null = null;
  if (pred.departmentId) {
    dept = await queryOne<DepartmentRow>(
      'SELECT * FROM departments WHERE id = $1',
      [pred.departmentId],
    );
  }

  return {
    needs_hospital: dept !== null,
    suggested_department: dept,
    disease_name: pred.diseaseName,
    advice: pred.advice,
  };
}

// Bước 2: bệnh nhân tra cứu thư viện qua chatbot.
export async function askLibrary(
  q: AskLibraryQuery,
): Promise<
  Array<
    | LibDiseaseRow
    | LibMedicineRow
    | LibProcedureRow
    | LibTestTypeRow
  >
> {
  const like = `%${q.q.toLowerCase()}%`;
  switch (q.topic) {
    case 'disease':
      return query<LibDiseaseRow>(
        `SELECT * FROM lib_diseases
          WHERE LOWER(name) LIKE $1 OR LOWER(symptoms) LIKE $1
          ORDER BY name LIMIT 20`,
        [like],
      );
    case 'medicine':
      return query<LibMedicineRow>(
        `SELECT * FROM lib_medicines
          WHERE LOWER(name) LIKE $1 OR LOWER(description) LIKE $1
          ORDER BY name LIMIT 20`,
        [like],
      );
    case 'procedure':
      return query<LibProcedureRow>(
        `SELECT * FROM lib_procedures
          WHERE LOWER(name) LIKE $1 OR LOWER(description) LIKE $1
          ORDER BY name LIMIT 20`,
        [like],
      );
    case 'test_type':
      return query<LibTestTypeRow>(
        `SELECT * FROM lib_test_types
          WHERE LOWER(name) LIKE $1 OR LOWER(description) LIKE $1
          ORDER BY name LIMIT 20`,
        [like],
      );
  }
}

// Bước 3: load-balancing — gợi ý bác sĩ ít lịch nhất trong khoa cho ngày đã chọn,
// loại bỏ bác sĩ auto_schedule_paused.
export async function suggestDoctor(
  q: SuggestDoctorQuery,
  actor: TokenPayload,
): Promise<DoctorRow | null> {
  if (actor.role !== 'patient')
    throw new AppError(403, 'Chỉ bệnh nhân dùng chatbot');

  const dept = await queryOne(
    'SELECT id FROM departments WHERE id = $1',
    [q.department_id],
  );
  if (!dept) throw new AppError(404, 'Khoa không tồn tại');

  // Đếm lịch chưa đóng của từng bác sĩ trong khoa cho ngày đó.
  return queryOne<DoctorRow>(
    `SELECT d.*
       FROM doctors d
       JOIN users u ON u.id = d.user_id
       LEFT JOIN appointments a
              ON a.doctor_id = d.id
             AND a.appointment_date = $2
             AND a.status IN ('pending','confirmed','in_progress')
      WHERE d.department_id = $1
        AND u.is_active = TRUE
        AND u.auto_schedule_paused = FALSE
      GROUP BY d.id
      ORDER BY COUNT(a.id) ASC, d.full_name ASC
      LIMIT 1`,
    [q.department_id, q.appointment_date],
  );
}
