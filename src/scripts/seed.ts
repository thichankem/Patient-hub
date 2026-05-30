import type { PoolClient } from 'pg';
import { pool, closePool } from '../db/pool';
import { hashPassword } from '../utils/password';
import { encrypt } from '../utils/crypto';

// =============================================================
// SEED DỮ LIỆU MẪU LỚN — TEST TOÀN HỆ THỐNG
// =============================================================
// Idempotent: TRUNCATE rồi tạo lại toàn bộ.
// Tất cả tài khoản dùng chung mật khẩu: admin
// Tài khoản quản lý cao nhất: admin / admin
// =============================================================

async function insertOne<T extends Record<string, unknown>>(
  c: PoolClient,
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  const r = await c.query<T>(sql, params);
  return r.rows[0] as T;
}

async function main(): Promise<void> {
  const pw = await hashPassword('admin');
  const c = await pool.connect();

  try {
    await c.query('BEGIN');

    // ---------------------------------------------------------
    // 0. RESET — xóa toàn bộ theo thứ tự FK
    // ---------------------------------------------------------
    await c.query(`
      TRUNCATE
        invoice_items, invoices,
        prescription_items, prescriptions,
        test_order_items, test_orders,
        examination_sessions, appointments,
        notification_reads, notifications,
        chat_messages, reports,
        password_reset_log, webhook_failures,
        patients, doctors, technicians,
        lab_rooms, lib_test_types, lib_medicines,
        lib_diseases, lib_procedures,
        departments, users
      RESTART IDENTITY CASCADE;
    `);

    // ---------------------------------------------------------
    // 1. USERS — staff
    // ---------------------------------------------------------
    const manager = await insertOne<{ id: string }>(
      c,
      `INSERT INTO users (username, password_hash, role)
       VALUES ('admin', $1, 'manager') RETURNING id`,
      [pw],
    );

    const reception = await c.query<{ id: string; username: string }>(
      `INSERT INTO users (username, password_hash, role) VALUES
         ('letan1', $1, 'receptionist'),
         ('letan2', $1, 'receptionist')
       RETURNING id, username`,
      [pw],
    );

    const cashiers = await c.query<{ id: string; username: string }>(
      `INSERT INTO users (username, password_hash, role) VALUES
         ('thungan1', $1, 'cashier'),
         ('thungan2', $1, 'cashier')
       RETURNING id, username`,
      [pw],
    );

    // ---------------------------------------------------------
    // 2. DEPARTMENTS
    // ---------------------------------------------------------
    const depts = await c.query<{ id: string; name: string }>(
      `INSERT INTO departments (name, description) VALUES
         ('Khoa Nội tổng quát',  'Khám và điều trị bệnh nội khoa tổng quát'),
         ('Khoa Ngoại',          'Phẫu thuật và điều trị ngoại khoa'),
         ('Khoa Nhi',            'Khám chữa bệnh cho trẻ em dưới 16 tuổi'),
         ('Khoa Sản phụ',        'Sản phụ khoa và chăm sóc thai sản'),
         ('Khoa Tai Mũi Họng',   'Khám và điều trị các bệnh về TMH'),
         ('Khoa Da liễu',        'Khám và điều trị các bệnh về da'),
         ('Khoa Tim mạch',       'Khám và điều trị tim mạch')
       RETURNING id, name`,
    );
    const deptMap = new Map(depts.rows.map((r) => [r.name, r.id]));
    const dNoi = deptMap.get('Khoa Nội tổng quát')!;
    const dNgoai = deptMap.get('Khoa Ngoại')!;
    const dNhi = deptMap.get('Khoa Nhi')!;
    const dSan = deptMap.get('Khoa Sản phụ')!;
    const dTmh = deptMap.get('Khoa Tai Mũi Họng')!;
    const dDa = deptMap.get('Khoa Da liễu')!;
    const dTim = deptMap.get('Khoa Tim mạch')!;

    // ---------------------------------------------------------
    // 3. DOCTORS (10 bác sĩ, rải đều các khoa)
    // ---------------------------------------------------------
    const doctorSpec = [
      { u: 'bs.nguyenvana',  name: 'BS. Nguyễn Văn An',     dept: dNoi },
      { u: 'bs.tranthib',    name: 'BS. Trần Thị Bích',     dept: dNoi },
      { u: 'bs.lequangc',    name: 'BS. Lê Quang Cường',    dept: dNgoai },
      { u: 'bs.phamhuyd',    name: 'BS. Phạm Huy Dũng',     dept: dNgoai },
      { u: 'bs.hoangthie',   name: 'BS. Hoàng Thị Em',      dept: dNhi },
      { u: 'bs.vuminhf',     name: 'BS. Vũ Minh Phúc',      dept: dNhi },
      { u: 'bs.dothig',      name: 'BS. Đỗ Thị Giang',      dept: dSan },
      { u: 'bs.buihungh',    name: 'BS. Bùi Hùng Hải',      dept: dTmh },
      { u: 'bs.dangthii',    name: 'BS. Đặng Thị Linh',     dept: dDa },
      { u: 'bs.ngohuyk',     name: 'BS. Ngô Huy Khang',     dept: dTim },
    ];

    const doctorUserRows = await c.query<{ id: string; username: string }>(
      `INSERT INTO users (username, password_hash, role)
       SELECT u, $1, 'doctor' FROM unnest($2::text[]) AS u
       RETURNING id, username`,
      [pw, doctorSpec.map((d) => d.u)],
    );
    const userByUsername = new Map(
      doctorUserRows.rows.map((r) => [r.username, r.id]),
    );

    const doctors: { id: string; userId: string; name: string; dept: string }[] = [];
    for (const d of doctorSpec) {
      const userId = userByUsername.get(d.u)!;
      const r = await insertOne<{ id: string }>(
        c,
        `INSERT INTO doctors (user_id, full_name, department_id, max_appointments_per_day)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [userId, d.name, d.dept, 25],
      );
      doctors.push({ id: r.id, userId, name: d.name, dept: d.dept });
    }

    // ---------------------------------------------------------
    // 4. LIB_TEST_TYPES & LAB_ROOMS & TECHNICIANS
    // ---------------------------------------------------------
    const testTypeSpec = [
      { name: 'Xét nghiệm máu tổng quát', desc: 'Công thức máu CBC',          mins: 20, price: 150000, ins: 50000 },
      { name: 'Xét nghiệm nước tiểu',     desc: 'Tổng phân tích nước tiểu',   mins: 15, price: 80000,  ins: 30000 },
      { name: 'Siêu âm bụng',             desc: 'Siêu âm ổ bụng tổng quát',   mins: 25, price: 250000, ins: 100000 },
      { name: 'Chụp X-quang ngực',        desc: 'X-quang phổi thẳng',         mins: 15, price: 200000, ins: 80000 },
      { name: 'Điện tim ECG',             desc: 'Điện tâm đồ 12 chuyển đạo',  mins: 10, price: 120000, ins: 40000 },
      { name: 'Sinh hóa máu',             desc: 'Đường, gan, thận, mỡ',       mins: 30, price: 300000, ins: 120000 },
      { name: 'Nội soi tai mũi họng',     desc: 'Soi mũi xoang',              mins: 20, price: 350000, ins: 150000 },
      { name: 'Siêu âm tim',              desc: 'Đánh giá chức năng tim',     mins: 30, price: 400000, ins: 180000 },
    ];

    const testTypes: { id: string; name: string; price: number }[] = [];
    for (const t of testTypeSpec) {
      const r = await insertOne<{ id: string }>(
        c,
        `INSERT INTO lib_test_types (name, description, estimated_minutes, price, insurance_price)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [t.name, t.desc, t.mins, t.price, t.ins],
      );
      testTypes.push({ id: r.id, name: t.name, price: t.price });
    }

    // 1 lab_room cho mỗi test type (tech 1-1 với lab_room)
    const labRoomSpec = [
      { name: 'Phòng XN máu 01',        ttIdx: 0 },
      { name: 'Phòng XN nước tiểu',     ttIdx: 1 },
      { name: 'Phòng siêu âm bụng',     ttIdx: 2 },
      { name: 'Phòng X-quang',          ttIdx: 3 },
      { name: 'Phòng điện tim',         ttIdx: 4 },
      { name: 'Phòng sinh hóa',         ttIdx: 5 },
      { name: 'Phòng nội soi TMH',      ttIdx: 6 },
      { name: 'Phòng siêu âm tim',      ttIdx: 7 },
    ];

    const labRooms: { id: string; name: string; testTypeId: string }[] = [];
    for (const lr of labRoomSpec) {
      const tt = testTypes[lr.ttIdx]!;
      const r = await insertOne<{ id: string }>(
        c,
        `INSERT INTO lab_rooms (name, test_type_id) VALUES ($1, $2) RETURNING id`,
        [lr.name, tt.id],
      );
      labRooms.push({ id: r.id, name: lr.name, testTypeId: tt.id });
    }

    // Technicians (1 cho mỗi lab_room)
    const techSpec = [
      'KTV. Lê Văn Cảnh',
      'KTV. Trần Thị Diệu',
      'KTV. Nguyễn Văn Hùng',
      'KTV. Phạm Thị Hoa',
      'KTV. Vũ Đức Anh',
      'KTV. Lý Thị Mai',
      'KTV. Hoàng Văn Phúc',
      'KTV. Đặng Thị Quỳnh',
    ];

    for (let i = 0; i < techSpec.length; i++) {
      const lab = labRooms[i]!;
      const u = await insertOne<{ id: string }>(
        c,
        `INSERT INTO users (username, password_hash, role)
         VALUES ($1, $2, 'technician') RETURNING id`,
        [`ktv${i + 1}`, pw],
      );
      await c.query(
        `INSERT INTO technicians (user_id, full_name, lab_room_id)
         VALUES ($1, $2, $3)`,
        [u.id, techSpec[i], lab.id],
      );
    }

    // ---------------------------------------------------------
    // 5. LIB_MEDICINES
    // ---------------------------------------------------------
    const medicineSpec = [
      { name: 'Paracetamol 500mg',  desc: 'Hạ sốt, giảm đau',          usage: 'Uống sau ăn, 1 viên/lần, tối đa 4 lần/ngày', side: 'Có thể gây buồn nôn', price: 2000, ins: 1000 },
      { name: 'Amoxicillin 500mg',  desc: 'Kháng sinh nhóm Beta-lactam', usage: '1 viên × 3 lần/ngày sau ăn',              side: 'Dị ứng penicillin', price: 5000, ins: 2500 },
      { name: 'Ibuprofen 400mg',    desc: 'Chống viêm, giảm đau',      usage: '1 viên × 2-3 lần/ngày sau ăn',              side: 'Đau dạ dày', price: 3000, ins: 1500 },
      { name: 'Cetirizine 10mg',    desc: 'Kháng histamin trị dị ứng', usage: '1 viên/ngày trước khi đi ngủ',              side: 'Buồn ngủ', price: 2500, ins: 1200 },
      { name: 'Omeprazole 20mg',    desc: 'Trị viêm loét dạ dày',      usage: '1 viên/ngày trước ăn sáng',                 side: 'Đau đầu, tiêu chảy', price: 4000, ins: 2000 },
      { name: 'Metformin 500mg',    desc: 'Trị đái tháo đường type 2', usage: '1 viên × 2 lần/ngày trong bữa ăn',          side: 'Khó tiêu', price: 3500, ins: 1500 },
      { name: 'Amlodipine 5mg',     desc: 'Hạ huyết áp',               usage: '1 viên/ngày vào buổi sáng',                 side: 'Phù chân', price: 4500, ins: 2000 },
      { name: 'Atorvastatin 20mg',  desc: 'Hạ mỡ máu',                 usage: '1 viên/ngày vào buổi tối',                  side: 'Đau cơ', price: 6000, ins: 3000 },
      { name: 'Salbutamol xịt',     desc: 'Giãn phế quản, cắt cơn hen', usage: '2 nhát xịt khi khó thở',                   side: 'Run tay, hồi hộp', price: 80000, ins: 40000 },
      { name: 'Loratadine 10mg',    desc: 'Kháng histamin không buồn ngủ', usage: '1 viên/ngày',                            side: 'Hiếm gặp', price: 2800, ins: 1400 },
      { name: 'Vitamin C 500mg',    desc: 'Bổ sung vitamin C',         usage: '1 viên/ngày sau ăn',                        side: 'An toàn', price: 1500, ins: 800 },
      { name: 'Vitamin D3 1000IU',  desc: 'Bổ sung vitamin D',         usage: '1 viên/ngày sau ăn sáng',                   side: 'An toàn', price: 2000, ins: 1000 },
      { name: 'Augmentin 625mg',    desc: 'Kháng sinh phối hợp',       usage: '1 viên × 2 lần/ngày sau ăn',                side: 'Tiêu chảy', price: 12000, ins: 6000 },
      { name: 'Smecta gói',         desc: 'Trị tiêu chảy',             usage: '1 gói × 3 lần/ngày pha với nước',           side: 'Táo bón', price: 4500, ins: 2200 },
      { name: 'Oresol gói',         desc: 'Bù nước điện giải',         usage: 'Pha 1 gói với 200ml nước',                  side: 'An toàn', price: 3000, ins: 1500 },
    ];

    const medicines: { id: string; name: string; price: number }[] = [];
    for (const m of medicineSpec) {
      const r = await insertOne<{ id: string }>(
        c,
        `INSERT INTO lib_medicines (name, description, usage, side_effects, price, insurance_price)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [m.name, m.desc, m.usage, m.side, m.price, m.ins],
      );
      medicines.push({ id: r.id, name: m.name, price: m.price });
    }

    // ---------------------------------------------------------
    // 6. LIB_DISEASES (phục vụ chatbot phân khoa)
    // ---------------------------------------------------------
    const diseaseSpec = [
      { name: 'Cảm cúm',                symp: 'Sốt, ho, đau họng, mệt mỏi',            desc: 'Nhiễm virus đường hô hấp',           treat: 'Nghỉ ngơi, uống nhiều nước, hạ sốt',   dept: dNoi },
      { name: 'Viêm dạ dày',            symp: 'Đau bụng vùng thượng vị, buồn nôn',     desc: 'Viêm niêm mạc dạ dày',               treat: 'Thuốc ức chế tiết acid, kiêng cay nóng', dept: dNoi },
      { name: 'Tăng huyết áp',          symp: 'Đau đầu, chóng mặt, mệt mỏi',           desc: 'HA tâm thu ≥140/90',                  treat: 'Thuốc hạ HA, chế độ ăn nhạt',          dept: dTim },
      { name: 'Đái tháo đường type 2',  symp: 'Khát nhiều, tiểu nhiều, sụt cân',       desc: 'Rối loạn chuyển hóa đường',           treat: 'Metformin, chế độ ăn kiêng',           dept: dNoi },
      { name: 'Viêm họng cấp',          symp: 'Đau họng, sốt nhẹ, ho khan',             desc: 'Viêm cấp tính họng',                  treat: 'Kháng sinh nếu vi khuẩn, súc miệng',    dept: dTmh },
      { name: 'Viêm mũi dị ứng',        symp: 'Hắt hơi, ngứa mũi, chảy mũi',           desc: 'Phản ứng dị ứng đường hô hấp trên',   treat: 'Kháng histamin, tránh dị nguyên',       dept: dTmh },
      { name: 'Viêm da cơ địa',         symp: 'Ngứa, mẩn đỏ, khô da',                  desc: 'Bệnh da mạn tính có yếu tố cơ địa',  treat: 'Bôi corticoid, dưỡng ẩm',               dept: dDa },
      { name: 'Sốt xuất huyết',         symp: 'Sốt cao, đau cơ, xuất huyết da',         desc: 'Do virus Dengue qua muỗi',            treat: 'Hạ sốt, bù dịch, theo dõi tiểu cầu',    dept: dNoi },
      { name: 'Viêm phế quản',          symp: 'Ho có đờm, khó thở, đau ngực',           desc: 'Viêm đường dẫn khí',                  treat: 'Kháng sinh, giãn phế quản',             dept: dNoi },
      { name: 'Tay chân miệng',         symp: 'Sốt, nổi mụn nước miệng và tay chân',    desc: 'Bệnh do enterovirus, trẻ em hay gặp', treat: 'Hạ sốt, chăm sóc miệng, cách ly',       dept: dNhi },
    ];

    for (const dz of diseaseSpec) {
      await c.query(
        `INSERT INTO lib_diseases (name, symptoms, description, treatment, department_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [dz.name, dz.symp, dz.desc, dz.treat, dz.dept],
      );
    }

    // ---------------------------------------------------------
    // 7. LIB_PROCEDURES (chatbot)
    // ---------------------------------------------------------
    const procSpec = [
      { name: 'Đăng ký khám',     desc: 'Đến quầy tiếp tân hoặc đặt qua chatbot, mang CCCD và BHYT (nếu có)' },
      { name: 'Khám sức khỏe',    desc: 'Lấy số thứ tự, chờ gọi tên, vào phòng khám theo chỉ định bác sĩ' },
      { name: 'Làm xét nghiệm',   desc: 'Mang phiếu xét nghiệm đến phòng tương ứng, lấy mẫu, chờ kết quả' },
      { name: 'Nhận kết quả',     desc: 'Quay lại phòng khám sau khi có kết quả xét nghiệm để bác sĩ kê đơn' },
      { name: 'Thanh toán',       desc: 'Đến quầy thu ngân hoặc thanh toán online qua VNPay/PayOS' },
    ];
    for (const p of procSpec) {
      await c.query(
        `INSERT INTO lib_procedures (name, description) VALUES ($1, $2)`,
        [p.name, p.desc],
      );
    }

    // ---------------------------------------------------------
    // 8. PATIENTS (25 bệnh nhân, có ưu tiên đa dạng)
    // ---------------------------------------------------------
    const patientSpec = [
      { u: 'bn.phamthid',     name: 'Phạm Thị Dung',        dob: '1990-05-10', gender: 'female', blood: 'O',  addr: 'Hà Nội',     phone: '0901234567', ins: 'HS40123456789', insExp: '2030-01-01', prio: null },
      { u: 'bn.nguyenvane',   name: 'Nguyễn Văn Em',        dob: '1985-08-22', gender: 'male',   blood: 'A',  addr: 'Hà Nội',     phone: '0902345678', ins: 'HS40234567890', insExp: '2029-12-31', prio: null },
      { u: 'bn.tranthif',     name: 'Trần Thị Phương',      dob: '2022-03-15', gender: 'female', blood: 'B',  addr: 'Hà Nội',     phone: '0903456789', ins: 'HS40345678901', insExp: '2030-06-30', prio: '1' },
      { u: 'bn.leduyg',       name: 'Lê Duy Giang',         dob: '1942-11-30', gender: 'male',   blood: 'AB', addr: 'Hải Phòng',  phone: '0904567890', ins: 'HS40456789012', insExp: '2028-12-31', prio: '3' },
      { u: 'bn.phamhongh',    name: 'Phạm Hồng Hạnh',       dob: '1995-07-04', gender: 'female', blood: 'O',  addr: 'Đà Nẵng',    phone: '0905678901', ins: null,            insExp: null,         prio: '5' },
      { u: 'bn.dothanhi',     name: 'Đỗ Thanh Ích',         dob: '1978-02-14', gender: 'male',   blood: 'A',  addr: 'Hà Nội',     phone: '0906789012', ins: 'HS40567890123', insExp: '2030-12-31', prio: '4' },
      { u: 'bn.vuthik',       name: 'Vũ Thị Kim',           dob: '1965-09-09', gender: 'female', blood: 'B',  addr: 'Hà Nam',     phone: '0907890123', ins: 'HS40678901234', insExp: '2030-03-15', prio: '2' },
      { u: 'bn.hoangminhl',   name: 'Hoàng Minh Long',      dob: '2020-12-01', gender: 'male',   blood: 'O',  addr: 'Hà Nội',     phone: '0908901234', ins: 'HS40789012345', insExp: '2030-12-31', prio: '1' },
      { u: 'bn.buithim',      name: 'Bùi Thị Mai',          dob: '1998-04-25', gender: 'female', blood: 'A',  addr: 'Bắc Ninh',   phone: '0909012345', ins: 'HS40890123456', insExp: '2030-07-01', prio: null },
      { u: 'bn.dangvann',     name: 'Đặng Văn Nam',         dob: '1980-06-18', gender: 'male',   blood: 'B',  addr: 'Hà Nội',     phone: '0910123456', ins: 'HS40901234567', insExp: '2029-09-30', prio: null },
      { u: 'bn.nguyenthio',   name: 'Nguyễn Thị Oanh',      dob: '1992-10-12', gender: 'female', blood: 'O',  addr: 'Hà Nội',     phone: '0911234567', ins: null,            insExp: null,         prio: null },
      { u: 'bn.tranvanp',     name: 'Trần Văn Phong',       dob: '1972-01-20', gender: 'male',   blood: 'AB', addr: 'Vĩnh Phúc',  phone: '0912345678', ins: 'HS41012345678', insExp: '2030-12-31', prio: null },
      { u: 'bn.lethiq',       name: 'Lê Thị Quỳnh',         dob: '2024-08-10', gender: 'female', blood: 'A',  addr: 'Hà Nội',     phone: '0913456789', ins: 'HS41123456789', insExp: '2030-12-31', prio: '1' },
      { u: 'bn.phamducr',     name: 'Phạm Đức Rồng',        dob: '1955-03-22', gender: 'male',   blood: 'B',  addr: 'Nam Định',   phone: '0914567890', ins: 'HS41234567890', insExp: '2030-12-31', prio: '4' },
      { u: 'bn.hoangthis',    name: 'Hoàng Thị Sương',      dob: '1996-11-05', gender: 'female', blood: 'O',  addr: 'Hà Nội',     phone: '0915678901', ins: 'HS41345678901', insExp: '2030-12-31', prio: '5' },
      { u: 'bn.vuvant',       name: 'Vũ Văn Tài',           dob: '1988-07-14', gender: 'male',   blood: 'A',  addr: 'Quảng Ninh', phone: '0916789012', ins: 'HS41456789012', insExp: '2030-12-31', prio: null },
      { u: 'bn.dothiu',       name: 'Đỗ Thị Uyên',          dob: '2001-02-28', gender: 'female', blood: 'B',  addr: 'Hà Nội',     phone: '0917890123', ins: null,            insExp: null,         prio: null },
      { u: 'bn.nguyenvanv',   name: 'Nguyễn Văn Vương',     dob: '1938-05-08', gender: 'male',   blood: 'O',  addr: 'Hà Nội',     phone: '0918901234', ins: 'HS41567890123', insExp: '2030-12-31', prio: '3' },
      { u: 'bn.tranthix',     name: 'Trần Thị Xuân',        dob: '1970-09-15', gender: 'female', blood: 'AB', addr: 'Thái Bình',  phone: '0919012345', ins: 'HS41678901234', insExp: '2030-12-31', prio: null },
      { u: 'bn.lethiy',       name: 'Lê Thị Yến',           dob: '1993-12-20', gender: 'female', blood: 'A',  addr: 'Hà Nội',     phone: '0920123456', ins: 'HS41789012345', insExp: '2030-12-31', prio: null },
      { u: 'bn.phamvanz',     name: 'Phạm Văn Zũng',        dob: '2021-06-30', gender: 'male',   blood: 'O',  addr: 'Hà Nội',     phone: '0921234567', ins: 'HS41890123456', insExp: '2030-12-31', prio: '1' },
      { u: 'bn.hoangthiba',   name: 'Hoàng Thị Ba',         dob: '1945-04-04', gender: 'female', blood: 'B',  addr: 'Hà Nội',     phone: '0922345678', ins: 'HS41901234567', insExp: '2030-12-31', prio: '2' },
      { u: 'bn.buivanca',     name: 'Bùi Văn Cảnh',         dob: '1982-08-08', gender: 'male',   blood: 'A',  addr: 'Hà Nội',     phone: '0923456789', ins: 'HS42012345678', insExp: '2030-12-31', prio: null },
      { u: 'bn.dovanda',      name: 'Đỗ Văn Đại',           dob: '1976-10-25', gender: 'male',   blood: 'AB', addr: 'Hưng Yên',   phone: '0924567890', ins: null,            insExp: null,         prio: null },
      { u: 'bn.tranthie',     name: 'Trần Thị Hạnh',        dob: '1991-01-11', gender: 'female', blood: 'O',  addr: 'Hà Nội',     phone: '0925678901', ins: 'HS42123456789', insExp: '2030-12-31', prio: null },
    ];

    const patients: {
      id: string;
      userId: string;
      name: string;
      hasInsurance: boolean;
    }[] = [];

    for (const p of patientSpec) {
      const u = await insertOne<{ id: string }>(
        c,
        `INSERT INTO users (username, password_hash, role)
         VALUES ($1, $2, 'patient') RETURNING id`,
        [p.u, pw],
      );
      const r = await insertOne<{ id: string }>(
        c,
        `INSERT INTO patients
           (user_id, full_name, date_of_birth, gender, blood_type, address,
            phone_encrypted, insurance_number_encrypted, insurance_expiry, priority_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [
          u.id,
          p.name,
          p.dob,
          p.gender,
          p.blood,
          p.addr,
          encrypt(p.phone),
          p.ins ? encrypt(p.ins) : null,
          p.insExp,
          p.prio,
        ],
      );
      patients.push({
        id: r.id,
        userId: u.id,
        name: p.name,
        hasInsurance: p.ins !== null,
      });
    }

    // ---------------------------------------------------------
    // 9. APPOINTMENTS — đa dạng status
    // ---------------------------------------------------------
    // Date helpers (today = 2026-05-28 theo context)
    const today = new Date();
    const fmt = (d: Date): string => d.toISOString().slice(0, 10);
    const daysAgo = (n: number): string => {
      const d = new Date(today);
      d.setDate(d.getDate() - n);
      return fmt(d);
    };
    const daysAhead = (n: number): string => daysAgo(-n);

    // mỗi phần tử: [patientIdx, doctorIdx, dateOffset(+/- ngày), status, createdBy]
    type ApptSpec = [number, number, number, string, string];
    const apptSpec: ApptSpec[] = [
      // PENDING — trong tương lai
      [0, 0, 1, 'pending', 'patient'],
      [1, 1, 2, 'pending', 'patient'],
      [8, 4, 1, 'pending', 'receptionist'],
      [10, 2, 3, 'pending', 'patient'],
      [16, 7, 2, 'pending', 'receptionist'],

      // CONFIRMED — sắp tới
      [2, 4, 1, 'confirmed', 'receptionist'],
      [3, 9, 2, 'confirmed', 'manager'],
      [4, 6, 3, 'confirmed', 'receptionist'],
      [11, 0, 1, 'confirmed', 'patient'],
      [19, 8, 2, 'confirmed', 'receptionist'],

      // IN_PROGRESS — hôm nay
      [5, 0, 0, 'in_progress', 'receptionist'],
      [9, 1, 0, 'in_progress', 'patient'],
      [14, 6, 0, 'in_progress', 'receptionist'],

      // DONE — quá khứ (có session finalized)
      [0, 0, -3, 'done', 'patient'],
      [1, 1, -5, 'done', 'patient'],
      [6, 9, -10, 'done', 'receptionist'],
      [7, 4, -7, 'done', 'patient'],
      [12, 5, -14, 'done', 'patient'],
      [13, 9, -2, 'done', 'receptionist'],
      [17, 9, -1, 'done', 'patient'],
      [22, 2, -20, 'done', 'patient'],
      [24, 0, -4, 'done', 'patient'],

      // CANCELLED
      [18, 7, 5, 'cancelled', 'patient'],
      [20, 4, -1, 'cancelled', 'receptionist'],

      // EXPIRED — quá hạn không tới khám
      [21, 8, -3, 'expired', 'patient'],
      [23, 2, -6, 'expired', 'patient'],
    ];

    type Appt = {
      id: string;
      patientId: string;
      doctorId: string;
      status: string;
      date: string;
    };
    const appts: Appt[] = [];

    for (const [pIdx, dIdx, offset, status, createdBy] of apptSpec) {
      const p = patients[pIdx]!;
      const d = doctors[dIdx]!;
      const date = offset >= 0 ? daysAhead(offset) : daysAgo(-offset);
      const r = await insertOne<{ id: string }>(
        c,
        `INSERT INTO appointments
           (patient_id, doctor_id, appointment_date, status, created_by_role)
         VALUES ($1, $2, $3, $4::appointment_status, $5::created_by_role)
         RETURNING id`,
        [p.id, d.id, date, status, createdBy],
      );
      appts.push({
        id: r.id,
        patientId: p.id,
        doctorId: d.id,
        status,
        date,
      });
    }

    // ---------------------------------------------------------
    // 10. EXAMINATION SESSIONS
    //  - Mọi appointment in_progress → session (chưa finalized)
    //  - Mọi appointment done → session finalized
    // ---------------------------------------------------------
    type SessionRow = {
      id: string;
      appointmentId: string;
      patientId: string;
      doctorId: string;
      finalized: boolean;
      date: string;
    };
    const sessions: SessionRow[] = [];

    const sessionsToCreate = appts.filter(
      (a) => a.status === 'in_progress' || a.status === 'done',
    );

    const diagSamples = [
      { dx: 'Cảm cúm thông thường',         plan: 'Nghỉ ngơi, uống nhiều nước, dùng thuốc hạ sốt khi cần' },
      { dx: 'Viêm họng cấp do virus',       plan: 'Súc miệng nước muối, giảm đau, theo dõi sốt' },
      { dx: 'Tăng huyết áp giai đoạn 1',    plan: 'Thay đổi lối sống, ăn nhạt, dùng thuốc hạ áp Amlodipine' },
      { dx: 'Viêm dạ dày cấp',              plan: 'Ức chế tiết acid, kiêng cay nóng và rượu bia' },
      { dx: 'Viêm phế quản cấp',            plan: 'Kháng sinh Augmentin, giãn phế quản nếu khó thở' },
      { dx: 'Đái tháo đường type 2 ổn',     plan: 'Tiếp tục Metformin, tái khám sau 1 tháng' },
      { dx: 'Viêm mũi dị ứng',              plan: 'Kháng histamin, tránh dị nguyên' },
      { dx: 'Tay chân miệng độ I',          plan: 'Cách ly tại nhà, hạ sốt, theo dõi sát' },
      { dx: 'Khám sức khỏe định kỳ',        plan: 'Kết quả bình thường, tiếp tục theo dõi' },
    ];

    for (let i = 0; i < sessionsToCreate.length; i++) {
      const a = sessionsToCreate[i]!;
      const finalized = a.status === 'done';
      const diag = diagSamples[i % diagSamples.length]!;
      const r = await insertOne<{ id: string }>(
        c,
        `INSERT INTO examination_sessions
           (appointment_id, patient_id, doctor_id, diagnosis, treatment_plan, is_finalized, finalized_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          a.id,
          a.patientId,
          a.doctorId,
          finalized ? diag.dx : null,
          finalized ? diag.plan : null,
          finalized,
          finalized ? a.date + 'T10:30:00Z' : null,
        ],
      );
      sessions.push({
        id: r.id,
        appointmentId: a.id,
        patientId: a.patientId,
        doctorId: a.doctorId,
        finalized,
        date: a.date,
      });
    }

    // ---------------------------------------------------------
    // 11. TEST_ORDERS & ITEMS
    //   - Sessions finalized: 60% có test_order, mỗi order 1-3 items completed
    //   - Sessions in_progress: 50% có order với mix not_started/processing
    // ---------------------------------------------------------
    type TestItem = {
      id: string;
      sessionId: string;
      patientId: string;
      testTypeId: string;
      labRoomId: string;
      status: string;
      price: number;
      typeName: string;
    };
    const testItems: TestItem[] = [];

    const sampleResults: Record<string, unknown> = {
      'Xét nghiệm máu tổng quát': { WBC: 7.2, RBC: 4.5, HGB: 14.2, PLT: 250, note: 'Trong giới hạn bình thường' },
      'Xét nghiệm nước tiểu':     { color: 'Vàng nhạt', protein: 'Âm tính', glucose: 'Âm tính', pH: 6.0 },
      'Siêu âm bụng':             { liver: 'Bình thường', kidney: 'Bình thường', conclusion: 'Không phát hiện bất thường' },
      'Chụp X-quang ngực':        { lung: 'Trong sáng', heart: 'Kích thước bình thường', conclusion: 'Phim sạch' },
      'Điện tim ECG':             { rhythm: 'Xoang đều', rate: 78, conclusion: 'Bình thường' },
      'Sinh hóa máu':             { glucose: 5.4, ALT: 25, AST: 22, creatinine: 70, cholesterol: 4.8 },
      'Nội soi tai mũi họng':     { nose: 'Niêm mạc hồng', throat: 'Sung huyết nhẹ', conclusion: 'Viêm họng nhẹ' },
      'Siêu âm tim':              { ef: '62%', valves: 'Bình thường', conclusion: 'Chức năng tim trong giới hạn' },
    };

    let testOrderCount = 0;

    for (const s of sessions) {
      // Bốc test_type ngẫu nhiên dựa trên index session
      const sIdx = sessions.indexOf(s);

      // Quyết định session này có test_order không
      const hasOrder = s.finalized ? sIdx % 5 !== 4 : sIdx % 2 === 0;
      if (!hasOrder) continue;

      const order = await insertOne<{ id: string }>(
        c,
        `INSERT INTO test_orders (session_id, patient_id, note)
         VALUES ($1, $2, $3) RETURNING id`,
        [s.id, s.patientId, sIdx % 2 === 0 ? 'Cần kết quả gấp' : null],
      );
      testOrderCount++;

      // 1-3 items
      const nItems = (sIdx % 3) + 1;
      for (let j = 0; j < nItems; j++) {
        const tt = testTypes[(sIdx + j) % testTypes.length]!;
        const lab = labRooms.find((l) => l.testTypeId === tt.id)!;
        // status
        let status: string;
        let resultJson: unknown = null;
        if (s.finalized) {
          status = 'completed';
          resultJson = sampleResults[tt.name] ?? { note: 'OK' };
        } else {
          const cyc = (sIdx + j) % 4;
          status = cyc === 0 ? 'not_started' : cyc === 1 ? 'waiting' : cyc === 2 ? 'processing' : 'waiting';
        }
        const reviewed = s.finalized; // bác sĩ đã xem khi finalize
        const r = await insertOne<{ id: string }>(
          c,
          `INSERT INTO test_order_items
             (test_order_id, test_type_id, lab_room_id, status, result_data,
              result_reviewed_by_doctor, schedule_order)
           VALUES ($1, $2, $3, $4::test_item_status, $5::jsonb, $6, $7) RETURNING id`,
          [
            order.id,
            tt.id,
            lab.id,
            status,
            resultJson ? JSON.stringify(resultJson) : null,
            reviewed,
            j + 1,
          ],
        );
        testItems.push({
          id: r.id,
          sessionId: s.id,
          patientId: s.patientId,
          testTypeId: tt.id,
          labRoomId: lab.id,
          status,
          price: testTypes.find((t) => t.id === tt.id)!.price,
          typeName: tt.name,
        });
      }
    }

    // ---------------------------------------------------------
    // 12. PRESCRIPTIONS — chỉ cho session finalized
    // ---------------------------------------------------------
    const prescriptionTemplates: number[][] = [
      [0, 3],            // Paracetamol + Cetirizine
      [1, 0],            // Amox + Paracetamol
      [6, 7],            // Amlodipine + Atorvastatin (tim mạch)
      [4, 0],            // Omeprazole + Paracetamol (dạ dày)
      [12, 2],           // Augmentin + Ibuprofen (viêm)
      [5, 10, 11],       // Metformin + vitamin (đái đường)
      [9, 3],            // Loratadine + Cetirizine (dị ứng)
      [0, 13, 14],       // Paracetamol + Smecta + Oresol (TCM trẻ em)
      [10, 11],          // Vitamin (khám định kỳ)
    ];

    let prescriptionCount = 0;
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i]!;
      if (!s.finalized) continue;
      const tpl = prescriptionTemplates[i % prescriptionTemplates.length]!;

      const pres = await insertOne<{ id: string }>(
        c,
        `INSERT INTO prescriptions (session_id, general_note)
         VALUES ($1, $2) RETURNING id`,
        [s.id, 'Uống đủ liều, tái khám sau 7 ngày nếu không đỡ'],
      );
      prescriptionCount++;

      for (const medIdx of tpl) {
        const m = medicines[medIdx]!;
        await c.query(
          `INSERT INTO prescription_items
             (prescription_id, medicine_id, quantity, usage_instruction)
           VALUES ($1, $2, $3, $4)`,
          [
            pres.id,
            m.id,
            10 + (medIdx % 5) * 5,
            'Theo hướng dẫn bác sĩ, uống sau ăn',
          ],
        );
      }
    }

    // ---------------------------------------------------------
    // 13. INVOICES — chỉ cho session finalized
    // Mix payment_method/status:
    //   - một số đã 'paid' (cash/vnpay/payos)
    //   - một số còn 'pending'
    // ---------------------------------------------------------
    let invoiceCount = 0;
    const consultationFee = 100000;

    const finalizedSessions = sessions.filter((s) => s.finalized);

    for (let i = 0; i < finalizedSessions.length; i++) {
      const s = finalizedSessions[i]!;
      const patient = patients.find((p) => p.id === s.patientId)!;
      const sessionTestItems = testItems.filter((t) => t.sessionId === s.id);

      // Tính tổng
      const testTotal = sessionTestItems.reduce((sum, t) => sum + t.price, 0);
      const totalAmount = consultationFee + testTotal;

      // Bảo hiểm 50% nếu có
      const insuranceDiscount = patient.hasInsurance
        ? Math.round(totalAmount * 0.5)
        : 0;
      const finalAmount = totalAmount - insuranceDiscount;

      // Quyết định trạng thái & method
      const cyc = i % 5;
      let paymentMethod: string | null = null;
      let paymentStatus = 'pending';
      let paidAt: string | null = null;
      let receivedAmount: number | null = null;
      let cashierUserId: string | null = null;
      let vnpRef: string | null = null;
      let vnpTransNo: string | null = null;
      let vnpRespCode: string | null = null;
      let vnpBankCode: string | null = null;
      let vnpPayDate: string | null = null;
      let payosOrderCode: number | null = null;
      let payosLinkId: string | null = null;
      let payosRef: string | null = null;

      if (cyc === 0) {
        // Cash paid
        paymentMethod = 'cash';
        paymentStatus = 'paid';
        paidAt = s.date + 'T11:00:00Z';
        receivedAmount = finalAmount;
        cashierUserId = cashiers.rows[i % 2]!.id;
      } else if (cyc === 1) {
        // VNPay paid
        paymentMethod = 'vnpay';
        paymentStatus = 'paid';
        paidAt = s.date + 'T11:15:00Z';
        vnpRef = `INV${Date.now()}${i}`;
        vnpTransNo = `VNP${10000000 + i}`;
        vnpRespCode = '00';
        vnpBankCode = 'NCB';
        vnpPayDate = '20260528111500';
      } else if (cyc === 2) {
        // PayOS paid
        paymentMethod = 'payos';
        paymentStatus = 'paid';
        paidAt = s.date + 'T11:30:00Z';
        payosOrderCode = 100000 + i;
        payosLinkId = `LINK-${1000 + i}`;
        payosRef = `REF${10000 + i}`;
      }
      // cyc 3, 4: pending

      await c.query(
        `INSERT INTO invoices
           (patient_id, session_id, cashier_user_id, total_amount, insurance_discount,
            final_amount, consultation_fee, received_amount,
            payment_method, payment_status, paid_at,
            vnp_txn_ref, vnp_transaction_no, vnp_response_code, vnp_bank_code, vnp_pay_date,
            payos_order_code, payos_payment_link_id, payos_reference)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
                 $9::payment_method, $10::payment_status, $11,
                 $12, $13, $14, $15, $16,
                 $17, $18, $19)
         RETURNING id`,
        [
          patient.id, s.id, cashierUserId,
          totalAmount, insuranceDiscount, finalAmount,
          consultationFee, receivedAmount,
          paymentMethod, paymentStatus, paidAt,
          vnpRef, vnpTransNo, vnpRespCode, vnpBankCode, vnpPayDate,
          payosOrderCode, payosLinkId, payosRef,
        ],
      );
      invoiceCount++;

      // Lưu invoice_items snapshot
      // Snapshot phí khám
      await c.query(
        `INSERT INTO invoice_items
           (invoice_id, service_type, service_label, unit_price, discounted_price, quantity, subtotal)
         SELECT i.id, 'consultation', $1, $2, $3, 1, $3
         FROM invoices i WHERE i.session_id = $4`,
        [
          'Phí khám bác sĩ',
          consultationFee,
          patient.hasInsurance ? Math.round(consultationFee * 0.5) : consultationFee,
          s.id,
        ],
      );
      // Snapshot từng test
      for (const t of sessionTestItems) {
        await c.query(
          `INSERT INTO invoice_items
             (invoice_id, service_type, test_order_item_id, service_label,
              unit_price, discounted_price, quantity, subtotal)
           SELECT i.id, 'test', $1, $2, $3, $4, 1, $4
           FROM invoices i WHERE i.session_id = $5`,
          [
            t.id,
            t.typeName,
            t.price,
            patient.hasInsurance ? Math.round(t.price * 0.5) : t.price,
            s.id,
          ],
        );
      }
    }

    // ---------------------------------------------------------
    // 14. NOTIFICATIONS
    // ---------------------------------------------------------
    // Broadcast
    await c.query(
      `INSERT INTO notifications (title, body, target_scope) VALUES
         ('Bảo trì hệ thống',     'Hệ thống sẽ bảo trì lúc 23:00 ngày 30/05/2026.', 'all_system'),
         ('Lịch họp khoa',        'Họp giao ban toàn bệnh viện 7h30 sáng thứ 2.',   'all_doctors'),
         ('Khuyến cáo sức khỏe',  'Tiêm vaccine cúm mùa miễn phí từ 01/06/2026.',    'all_patients')`,
    );

    // Single notifications: gửi cho từng bệnh nhân có appointment pending/confirmed
    for (const a of appts) {
      if (a.status !== 'pending' && a.status !== 'confirmed') continue;
      const p = patients.find((x) => x.id === a.patientId)!;
      await c.query(
        `INSERT INTO notifications (recipient_user_id, title, body, target_scope)
         VALUES ($1, $2, $3, 'single')`,
        [
          p.userId,
          'Lịch hẹn khám',
          `Bạn có lịch hẹn ngày ${a.date}. Vui lòng đến đúng giờ.`,
        ],
      );
    }

    // ---------------------------------------------------------
    // 15. CHAT MESSAGES — doctor ↔ technician, doctor ↔ manager
    // ---------------------------------------------------------
    const tech1User = await c.query<{ user_id: string }>(
      `SELECT user_id FROM technicians ORDER BY full_name LIMIT 1`,
    );
    const techUserId = tech1User.rows[0]!.user_id;

    await c.query(
      `INSERT INTO chat_messages (sender_user_id, receiver_user_id, content) VALUES
         ($1, $2, 'Anh ơi, kết quả XN máu của BN Phạm Thị Dung đã có chưa ạ?'),
         ($2, $1, 'Đã có rồi bác sĩ, em vừa cập nhật trên hệ thống.'),
         ($1, $2, 'Cảm ơn em.'),
         ($1, $3, 'Sếp ơi, tuần này em xin nghỉ thứ 6 đi học chuyên đề.'),
         ($3, $1, 'OK, em ghi vào lịch và bàn giao lịch khám cho BS Trần Thị Bích nhé.')`,
      [doctors[0]!.userId, techUserId, manager.id],
    );

    // ---------------------------------------------------------
    // 16. REPORTS — doctor / technician gửi
    // ---------------------------------------------------------
    await c.query(
      `INSERT INTO reports (reporter_user_id, content, status) VALUES
         ($1, 'Máy in tại phòng khám số 3 bị kẹt giấy, không in được phiếu.', 'pending'),
         ($2, 'Máy ly tâm phòng XN máu phát ra tiếng kêu lạ, cần kiểm tra.',   'pending'),
         ($1, 'Hệ thống xếp lịch tự động đôi khi trùng giờ, đã chụp ảnh kèm.', 'resolved')`,
      [doctors[0]!.userId, techUserId],
    );

    await c.query('COMMIT');

    // ---------------------------------------------------------
    // SUMMARY
    // ---------------------------------------------------------
    const counts = await pool.query<{ tbl: string; n: string }>(
      `SELECT 'users'        AS tbl, COUNT(*)::text AS n FROM users
       UNION ALL SELECT 'patients',          COUNT(*)::text FROM patients
       UNION ALL SELECT 'doctors',           COUNT(*)::text FROM doctors
       UNION ALL SELECT 'technicians',       COUNT(*)::text FROM technicians
       UNION ALL SELECT 'departments',       COUNT(*)::text FROM departments
       UNION ALL SELECT 'lib_diseases',      COUNT(*)::text FROM lib_diseases
       UNION ALL SELECT 'lib_medicines',     COUNT(*)::text FROM lib_medicines
       UNION ALL SELECT 'lib_test_types',    COUNT(*)::text FROM lib_test_types
       UNION ALL SELECT 'lib_procedures',    COUNT(*)::text FROM lib_procedures
       UNION ALL SELECT 'lab_rooms',         COUNT(*)::text FROM lab_rooms
       UNION ALL SELECT 'appointments',      COUNT(*)::text FROM appointments
       UNION ALL SELECT 'examination_sess.', COUNT(*)::text FROM examination_sessions
       UNION ALL SELECT 'test_orders',       COUNT(*)::text FROM test_orders
       UNION ALL SELECT 'test_order_items',  COUNT(*)::text FROM test_order_items
       UNION ALL SELECT 'prescriptions',     COUNT(*)::text FROM prescriptions
       UNION ALL SELECT 'prescription_items',COUNT(*)::text FROM prescription_items
       UNION ALL SELECT 'invoices',          COUNT(*)::text FROM invoices
       UNION ALL SELECT 'invoice_items',     COUNT(*)::text FROM invoice_items
       UNION ALL SELECT 'notifications',     COUNT(*)::text FROM notifications
       UNION ALL SELECT 'chat_messages',     COUNT(*)::text FROM chat_messages
       UNION ALL SELECT 'reports',           COUNT(*)::text FROM reports`,
    );

    console.log('\n✓ Seed hoàn tất. Bảng đã nạp:');
    for (const r of counts.rows) {
      console.log(`  ${r.tbl.padEnd(22)} ${r.n.padStart(4)} dòng`);
    }
    console.log(`\n  (test_orders sinh ra: ${testOrderCount},`
      + ` prescriptions: ${prescriptionCount}, invoices: ${invoiceCount})`);

    console.log('\n──── TÀI KHOẢN MẪU (password = "admin") ────');
    console.log('  manager       : admin');
    console.log('  receptionist  : letan1 / letan2');
    console.log('  cashier       : thungan1 / thungan2');
    console.log('  doctor (×10)  : bs.nguyenvana, bs.tranthib, bs.lequangc, ...');
    console.log('  technician(×8): ktv1 .. ktv8');
    console.log('  patient (×25) : bn.phamthid, bn.nguyenvane, ...');
  } catch (err) {
    await c.query('ROLLBACK');
    throw err;
  } finally {
    c.release();
  }
}

main()
  .then(() => closePool())
  .catch(async (err) => {
    console.error('❌ Seed lỗi:', err);
    await closePool();
    process.exit(1);
  });
