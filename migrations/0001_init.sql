-- =============================================================
-- HOSPITAL MANAGEMENT SYSTEM — PostgreSQL Schema
-- =============================================================
-- Thứ tự tạo bảng theo dependency (không có circular FK)
-- 1. Enums
-- 2. Auth & Users
-- 3. Thư viện (Library)
-- 4. Departments & Lab Rooms
-- 5. Staff profiles
-- 6. Patient profile
-- 7. Appointments & Examination
-- 8. Xét nghiệm
-- 9. Đơn thuốc
-- 10. Thanh toán
-- 11. Hệ thống (Notification, Chat, Report)
-- =============================================================

-- -------------------------------------------------------------
-- EXTENSIONS
-- -------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================
-- 1. ENUMS
-- =============================================================

CREATE TYPE user_role AS ENUM (
  'patient',
  'doctor',
  'technician',
  'manager',
  'cashier',
  'receptionist'
);

CREATE TYPE priority_type AS ENUM (
  '1', -- trẻ em dưới 6 tuổi
  '2', -- người khuyết tật
  '3', -- người trên 80 tuổi
  '4', -- người có công với cách mạng
  '5'  -- phụ nữ có thai
);

CREATE TYPE appointment_status AS ENUM (
  'pending',      -- đã đặt, chờ xác nhận
  'confirmed',    -- đã xác nhận
  'in_progress',  -- đang khám
  'done',         -- đã khám xong (session finalized)
  'cancelled',    -- bị hủy
  'expired'       -- quá hẹn
);

CREATE TYPE created_by_role AS ENUM (
  'patient',       -- bệnh nhân tự đặt qua chatbot
  'receptionist',  -- tiếp tân tạo
  'manager'        -- quản lý tạo/đổi
);

CREATE TYPE test_item_status AS ENUM (
  'not_started',  -- chưa thực hiện
  'waiting',      -- đang chờ khám
  'processing',   -- đang xử lý
  'completed',    -- đã có kết quả
  'unavailable'   -- không thể thực hiện (không có phòng)
);

CREATE TYPE payment_method AS ENUM (
  'vnpay',  -- online VNPay
  'cash'    -- tiền mặt tại quầy thu ngân
);

CREATE TYPE payment_status AS ENUM (
  'pending',   -- chờ thanh toán
  'paid'       -- đã thanh toán
);

CREATE TYPE service_type AS ENUM (
  'consultation', -- phí khám
  'test'          -- xét nghiệm
);

CREATE TYPE report_status AS ENUM (
  'pending',   -- chưa giải quyết
  'resolved'   -- đã giải quyết
);

CREATE TYPE notification_scope AS ENUM (
  'single',       -- 1 user cụ thể
  'all_doctors',
  'all_patients',
  'all_system'
);


-- =============================================================
-- 2. AUTH & USERS
-- =============================================================

CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username              VARCHAR(100) NOT NULL UNIQUE,
  password_hash         TEXT NOT NULL,                    -- bcrypt
  role                  user_role NOT NULL,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  auto_schedule_paused  BOOLEAN NOT NULL DEFAULT FALSE,   -- chỉ dùng cho doctor
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);


-- =============================================================
-- 3. THƯ VIỆN (LIBRARY) — quản lý CRUD
-- =============================================================

CREATE TABLE lib_diseases (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  symptoms      TEXT,
  description   TEXT,
  treatment     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lib_medicines (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             VARCHAR(255) NOT NULL,
  description      TEXT,
  usage            TEXT,
  side_effects     TEXT,
  price            NUMERIC(12, 2) NOT NULL DEFAULT 0,
  insurance_price  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lib_test_types (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                VARCHAR(255) NOT NULL,
  description         TEXT,
  estimated_minutes   INT NOT NULL DEFAULT 30,  -- dùng cho RL scheduling
  price               NUMERIC(12, 2) NOT NULL DEFAULT 0,
  insurance_price     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chỉ phục vụ chatbot tra cứu, không quan hệ nghiệp vụ
CREATE TABLE lib_procedures (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================
-- 4. DEPARTMENTS & LAB ROOMS
-- =============================================================

CREATE TABLE departments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(255) NOT NULL UNIQUE,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mỗi lib_disease thuộc 1 department (chatbot dùng để phân khoa)
ALTER TABLE lib_diseases
  ADD COLUMN department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

CREATE INDEX idx_lib_diseases_department ON lib_diseases(department_id);

-- 1 phòng xét nghiệm chỉ xử lý 1 loại test_type
CREATE TABLE lab_rooms (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) NOT NULL,
  test_type_id  UUID NOT NULL REFERENCES lib_test_types(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lab_rooms_test_type ON lab_rooms(test_type_id);


-- =============================================================
-- 5. STAFF PROFILES
-- =============================================================

CREATE TABLE doctors (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name      VARCHAR(255) NOT NULL,
  department_id  UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doctors_department ON doctors(department_id);

-- 1 phòng xét nghiệm chỉ có 1 kỹ thuật viên chính
CREATE TABLE technicians (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name    VARCHAR(255) NOT NULL,
  lab_room_id  UUID NOT NULL UNIQUE REFERENCES lab_rooms(id) ON DELETE RESTRICT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cashier & Receptionist không có bảng profile riêng,
-- thông tin đủ trong bảng users, quản lý tạo trực tiếp.


-- =============================================================
-- 6. PATIENT PROFILE
-- =============================================================
-- Tiếp tân tạo tài khoản, bệnh nhân không tự đăng ký
-- Phone và insurance number mã hóa AES-256 ở application layer
-- trước khi lưu vào DB

CREATE TABLE patients (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name                   VARCHAR(255) NOT NULL,
  date_of_birth               DATE NOT NULL,
  gender                      VARCHAR(10) NOT NULL,
  blood_type                  VARCHAR(5),
  address                     TEXT,
  phone_encrypted             TEXT NOT NULL,           -- AES-256
  insurance_number_encrypted  TEXT,                    -- AES-256, nullable nếu không có BHYT
  insurance_expiry            DATE,
  priority_type               priority_type,           -- NULL nếu không thuộc nhóm ưu tiên
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patients_user_id ON patients(user_id);


-- =============================================================
-- 7. APPOINTMENTS & EXAMINATION SESSIONS
-- =============================================================

CREATE TABLE appointments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id       UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_id        UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  appointment_date DATE NOT NULL,
  status           appointment_status NOT NULL DEFAULT 'pending',
  created_by_role  created_by_role NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_patient    ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor     ON appointments(doctor_id);
CREATE INDEX idx_appointments_date       ON appointments(appointment_date);
CREATE INDEX idx_appointments_status     ON appointments(status);

-- Đợt khám được tạo tự động khi bác sĩ chuyển trạng thái → in_progress
-- Toàn bộ nội dung là nháp (is_finalized = false) cho đến khi bác sĩ xác nhận lưu
-- Sau khi finalized = true thì không thể sửa bất kỳ thông tin nào
CREATE TABLE examination_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id  UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE RESTRICT,
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_id       UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  diagnosis       TEXT,          -- chẩn đoán cuối (cũng là tiền sử bệnh khi finalized)
  treatment_plan  TEXT,          -- kế hoạch điều trị
  is_finalized    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalized_at    TIMESTAMPTZ                          -- thời điểm bác sĩ xác nhận lưu
);

CREATE INDEX idx_sessions_patient    ON examination_sessions(patient_id);
CREATE INDEX idx_sessions_doctor     ON examination_sessions(doctor_id);
CREATE INDEX idx_sessions_finalized  ON examination_sessions(is_finalized);


-- =============================================================
-- 8. XÉT NGHIỆM
-- =============================================================

-- Bác sĩ tạo 1 yêu cầu xét nghiệm (test_order) cho 1 đợt khám,
-- bên trong có nhiều test_order_items (từng loại xét nghiệm cụ thể)
CREATE TABLE test_orders (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID NOT NULL REFERENCES examination_sessions(id) ON DELETE RESTRICT,
  patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_test_orders_session ON test_orders(session_id);
CREATE INDEX idx_test_orders_patient ON test_orders(patient_id);

-- Mỗi item là 1 loại xét nghiệm, hệ thống tự phân phòng (lab_room)
-- dựa trên RL scheduling
-- result_data: JSON string chứa kết quả nhập từ kỹ thuật viên
-- result_reviewed_by_doctor: bác sĩ phải xác nhận đã xem từng item
-- trước khi được phép cấp đơn thuốc
CREATE TABLE test_order_items (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_order_id               UUID NOT NULL REFERENCES test_orders(id) ON DELETE RESTRICT,
  test_type_id                UUID NOT NULL REFERENCES lib_test_types(id) ON DELETE RESTRICT,
  lab_room_id                 UUID REFERENCES lab_rooms(id) ON DELETE SET NULL, -- nullable khi unavailable
  status                      test_item_status NOT NULL DEFAULT 'not_started',
  result_data                 JSONB,                 -- nhập bởi kỹ thuật viên, không thể sửa sau completed
  result_reviewed_by_doctor   BOOLEAN NOT NULL DEFAULT FALSE,
  schedule_order              INT,                   -- thứ tự phòng do RL tính (1, 2, 3...)
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_test_items_order    ON test_order_items(test_order_id);
CREATE INDEX idx_test_items_lab      ON test_order_items(lab_room_id);
CREATE INDEX idx_test_items_status   ON test_order_items(status);


-- =============================================================
-- 9. ĐƠN THUỐC
-- =============================================================

-- 1 đợt khám có tối đa 1 đơn thuốc
-- Chỉ tạo được khi tất cả test_order_items đã reviewed
CREATE TABLE prescriptions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    UUID NOT NULL UNIQUE REFERENCES examination_sessions(id) ON DELETE RESTRICT,
  general_note  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE prescription_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_id     UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine_id         UUID NOT NULL REFERENCES lib_medicines(id) ON DELETE RESTRICT,
  quantity            INT NOT NULL CHECK (quantity > 0),
  usage_instruction   TEXT
);

CREATE INDEX idx_prescription_items_prescription ON prescription_items(prescription_id);


-- =============================================================
-- 10. THANH TOÁN
-- =============================================================

-- Invoice chỉ được tạo khi:
--   1. Tất cả test_order_items status = 'completed'
--   2. examination_session is_finalized = true
-- Bảo hiểm tự động áp dụng nếu insurance_expiry còn hạn tại thời điểm khám

CREATE TABLE invoices (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  session_id          UUID NOT NULL UNIQUE REFERENCES examination_sessions(id) ON DELETE RESTRICT,
  cashier_user_id     UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL nếu bệnh nhân tự thanh toán online
  total_amount        NUMERIC(12, 2) NOT NULL,       -- tổng trước bảo hiểm
  insurance_discount  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  final_amount        NUMERIC(12, 2) NOT NULL,       -- tổng sau bảo hiểm
  payment_method      payment_method,                -- NULL khi chưa thanh toán
  payment_status      payment_status NOT NULL DEFAULT 'pending',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at             TIMESTAMPTZ
);

CREATE INDEX idx_invoices_patient        ON invoices(patient_id);
CREATE INDEX idx_invoices_payment_status ON invoices(payment_status);

-- Snapshot giá tại thời điểm thanh toán — không bị ảnh hưởng
-- khi quản lý cập nhật bảng giá sau này
CREATE TABLE invoice_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id        UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  service_type      service_type NOT NULL,
  test_order_item_id UUID REFERENCES test_order_items(id) ON DELETE SET NULL, -- nullable nếu consultation
  service_label     VARCHAR(255) NOT NULL,       -- tên dịch vụ snapshot
  unit_price        NUMERIC(12, 2) NOT NULL,     -- giá gốc snapshot
  discounted_price  NUMERIC(12, 2) NOT NULL,     -- giá sau bảo hiểm snapshot
  quantity          INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  subtotal          NUMERIC(12, 2) NOT NULL      -- discounted_price * quantity
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);


-- =============================================================
-- 11. HỆ THỐNG
-- =============================================================

-- Tất cả thông báo đều là in-app
-- target_scope dùng cho quản lý gửi hàng loạt
-- Nếu scope = 'single' thì recipient_user_id bắt buộc có giá trị
CREATE TABLE notifications (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_user_id   UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL nếu broadcast
  title               VARCHAR(255) NOT NULL,
  body                TEXT NOT NULL,
  target_scope        notification_scope NOT NULL DEFAULT 'single',
  is_read             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_user_id);
CREATE INDEX idx_notifications_is_read   ON notifications(is_read);

-- Chat nội bộ 1-1 giữa doctor / technician / manager
-- Không mã hóa theo yêu cầu đặc tả
CREATE TABLE chat_messages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content           TEXT NOT NULL,
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_chat_not_self CHECK (sender_user_id <> receiver_user_id)
);

CREATE INDEX idx_chat_sender   ON chat_messages(sender_user_id);
CREATE INDEX idx_chat_receiver ON chat_messages(receiver_user_id);
CREATE INDEX idx_chat_sent_at  ON chat_messages(sent_at);

-- Báo cáo lỗi hệ thống — tiếp tân và thu ngân không có quyền gửi
-- Constraint đặt ở application layer vì cần check role của user
CREATE TABLE reports (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content           TEXT NOT NULL,
  status            report_status NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ
);

CREATE INDEX idx_reports_status   ON reports(status);
CREATE INDEX idx_reports_reporter ON reports(reporter_user_id);


-- =============================================================
-- TRIGGERS — auto update updated_at
-- =============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON technicians
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON lib_diseases
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON lib_medicines
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON lib_test_types
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON lib_procedures
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON test_order_items
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- =============================================================
-- COMMENTS — ghi chú nghiệp vụ quan trọng
-- =============================================================

COMMENT ON COLUMN users.auto_schedule_paused
  IS 'Chỉ áp dụng cho role doctor. Khi TRUE, chatbot bỏ qua bác sĩ này khi xếp lịch tự động.';

COMMENT ON COLUMN patients.phone_encrypted
  IS 'Mã hóa AES-256 tại application layer trước khi lưu.';

COMMENT ON COLUMN patients.insurance_number_encrypted
  IS 'Mã hóa AES-256 tại application layer trước khi lưu.';

COMMENT ON COLUMN patients.priority_type
  IS '1=trẻ em <6t, 2=khuyết tật, 3=người >80t, 4=người có công CM, 5=phụ nữ có thai. NULL nếu không thuộc nhóm ưu tiên.';

COMMENT ON COLUMN examination_sessions.diagnosis
  IS 'Sau khi is_finalized=true, giá trị này trở thành tiền sử bệnh của bệnh nhân.';

COMMENT ON COLUMN examination_sessions.is_finalized
  IS 'Khi TRUE, toàn bộ session (diagnosis, treatment_plan, prescription) không thể chỉnh sửa.';

COMMENT ON COLUMN test_order_items.result_data
  IS 'JSON kết quả xét nghiệm do kỹ thuật viên nhập. Không thể sửa khi status=completed.';

COMMENT ON COLUMN test_order_items.result_reviewed_by_doctor
  IS 'Bác sĩ phải xác nhận đã xem từng item trước khi cấp đơn thuốc.';

COMMENT ON COLUMN invoice_items.service_label
  IS 'Snapshot tên dịch vụ tại thời điểm thanh toán, không bị ảnh hưởng khi quản lý cập nhật bảng giá.';

COMMENT ON COLUMN invoice_items.unit_price
  IS 'Snapshot giá gốc tại thời điểm thanh toán.';

COMMENT ON COLUMN invoice_items.discounted_price
  IS 'Snapshot giá sau bảo hiểm tại thời điểm thanh toán.';

COMMENT ON TABLE lib_procedures
  IS 'Chỉ phục vụ chatbot tra cứu thông tin. Không có quan hệ với bảng nghiệp vụ.';
