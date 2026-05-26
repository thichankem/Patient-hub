// Kiểu dữ liệu khớp 1-1 với schema PostgreSQL (migrations/0001_init.sql).
// Quy ước map kiểu (tránh bug phổ biến của node-postgres):
//   UUID/TEXT/VARCHAR -> string
//   TIMESTAMPTZ        -> Date
//   DATE               -> string 'YYYY-MM-DD'  (pool cấu hình trả string, tránh lệch timezone)
//   NUMERIC            -> string               (giữ nguyên precision, KHÔNG dùng number)
//   BOOLEAN            -> boolean
//   INT                -> number
//   JSONB              -> unknown

// ---------- ENUMS ----------
export type UserRole =
  | 'patient'
  | 'doctor'
  | 'technician'
  | 'manager'
  | 'cashier'
  | 'receptionist';

export type PriorityType = '1' | '2' | '3' | '4' | '5';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'done'
  | 'cancelled'
  | 'expired';

export type CreatedByRole = 'patient' | 'receptionist' | 'manager';

export type TestItemStatus =
  | 'not_started'
  | 'waiting'
  | 'processing'
  | 'completed'
  | 'unavailable';

export type PaymentMethod = 'vnpay' | 'cash' | 'payos';
export type PaymentStatus = 'pending' | 'paid';
export type ServiceType = 'consultation' | 'test';
export type ReportStatus = 'pending' | 'resolved';
export type NotificationScope =
  | 'single'
  | 'all_doctors'
  | 'all_patients'
  | 'all_system';

// ---------- TABLES ----------
export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  role: UserRole;
  is_active: boolean;
  auto_schedule_paused: boolean;
  failed_login_count: number;
  locked_until: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface PatientRow {
  id: string;
  user_id: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  blood_type: string | null;
  address: string | null;
  phone_encrypted: string;
  insurance_number_encrypted: string | null;
  insurance_expiry: string | null;
  priority_type: PriorityType | null;
  created_at: Date;
  updated_at: Date;
}

export interface DoctorRow {
  id: string;
  user_id: string;
  full_name: string;
  department_id: string;
  max_appointments_per_day: number;
  created_at: Date;
  updated_at: Date;
}

export interface TechnicianRow {
  id: string;
  user_id: string;
  full_name: string;
  lab_room_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface DepartmentRow {
  id: string;
  name: string;
  description: string | null;
  created_at: Date;
}

export interface LabRoomRow {
  id: string;
  name: string;
  test_type_id: string;
  created_at: Date;
}

export interface LibDiseaseRow {
  id: string;
  name: string;
  symptoms: string | null;
  description: string | null;
  treatment: string | null;
  department_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface LibMedicineRow {
  id: string;
  name: string;
  description: string | null;
  usage: string | null;
  side_effects: string | null;
  price: string;
  insurance_price: string;
  created_at: Date;
  updated_at: Date;
}

export interface LibTestTypeRow {
  id: string;
  name: string;
  description: string | null;
  estimated_minutes: number;
  price: string;
  insurance_price: string;
  created_at: Date;
  updated_at: Date;
}

export interface LibProcedureRow {
  id: string;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AppointmentRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  status: AppointmentStatus;
  created_by_role: CreatedByRole;
  created_at: Date;
  updated_at: Date;
}

export interface ExaminationSessionRow {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  diagnosis: string | null;
  treatment_plan: string | null;
  is_finalized: boolean;
  created_at: Date;
  finalized_at: Date | null;
}

export interface TestOrderRow {
  id: string;
  session_id: string;
  patient_id: string;
  note: string | null;
  created_at: Date;
}

export interface TestOrderItemRow {
  id: string;
  test_order_id: string;
  test_type_id: string;
  lab_room_id: string | null;
  status: TestItemStatus;
  result_data: unknown;
  result_reviewed_by_doctor: boolean;
  schedule_order: number | null;
  updated_at: Date;
}

export interface PrescriptionRow {
  id: string;
  session_id: string;
  general_note: string | null;
  created_at: Date;
}

export interface PrescriptionItemRow {
  id: string;
  prescription_id: string;
  medicine_id: string;
  quantity: number;
  usage_instruction: string | null;
}

export interface InvoiceRow {
  id: string;
  patient_id: string;
  session_id: string;
  cashier_user_id: string | null;
  total_amount: string;
  insurance_discount: string;
  final_amount: string;
  consultation_fee: string;
  received_amount: string | null;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  created_at: Date;
  paid_at: Date | null;
  vnp_txn_ref: string | null;
  vnp_transaction_no: string | null;
  vnp_response_code: string | null;
  vnp_bank_code: string | null;
  vnp_pay_date: string | null;
  payos_order_code: string | null; // BIGINT → string (giữ precision)
  payos_payment_link_id: string | null;
  payos_reference: string | null;
  payos_transaction_time: string | null;
  payos_account_number: string | null;
  payos_qr_code: string | null;
}

export interface InvoiceItemRow {
  id: string;
  invoice_id: string;
  service_type: ServiceType;
  test_order_item_id: string | null;
  service_label: string;
  unit_price: string;
  discounted_price: string;
  quantity: number;
  subtotal: string;
}

export interface NotificationRow {
  id: string;
  recipient_user_id: string | null;
  title: string;
  body: string;
  target_scope: NotificationScope;
  is_read: boolean;
  created_at: Date;
}

export interface ChatMessageRow {
  id: string;
  sender_user_id: string;
  receiver_user_id: string;
  content: string;
  sent_at: Date;
  read_at: Date | null;
}

export interface ReportRow {
  id: string;
  reporter_user_id: string;
  content: string;
  status: ReportStatus;
  created_at: Date;
  resolved_at: Date | null;
}
