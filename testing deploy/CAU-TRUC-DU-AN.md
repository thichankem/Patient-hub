# PatientHub 2 — Cấu trúc dự án

Hệ thống quản lý bệnh viện lấy bệnh nhân làm trung tâm. Tài liệu này mô tả
**kiến trúc tổng thể, cây thư mục và bản đồ API** để người mới đọc hiểu nhanh.

> Cách cài đặt & chạy: xem [CAI-DAT-VA-CHAY.md](CAI-DAT-VA-CHAY.md)
> Vận hành hằng ngày (bật/tắt, log, sự cố): xem [HUONG-DAN-CHAY.md](HUONG-DAN-CHAY.md)

---

## 1. Tổng quan kiến trúc

```
                         Internet
                            │
                   ┌────────▼────────┐
                   │  Caddy (HTTPS)  │   reverse proxy + TLS tự động
                   │   :80 / :443    │   (chỉ dùng khi deploy domain thật)
                   └────────┬────────┘
                            │
          ┌─────────────────┴──────────────────┐
          │                                     │
   ┌──────▼───────┐                     ┌───────▼────────┐
   │  web (nginx) │  /api  proxy ─────► │  backend (API) │
   │   React SPA  │                     │ Express + TS   │
   │    :8080     │                     │     :3000      │
   └──────────────┘                     └───────┬────────┘
                                                 │
                                         ┌───────▼────────┐
                                         │  PostgreSQL 16  │
                                         │     :5432       │
                                         └────────────────┘
```

- **3 container Docker**: `web` (nginx phục vụ React build), `backend` (API
  Express), `postgres` (database). Định nghĩa trong [docker-compose.yml](docker-compose.yml).
- **Caddy** chạy trực tiếp trên host (không trong Docker) — chỉ cần khi expose
  domain `dophuhung.fun` ra Internet qua IPv6.
- Frontend gọi API theo đường tương đối `/api` → nginx trong container `web`
  proxy nội bộ sang `backend:3000`. Nhờ vậy không cần CORS khi chạy cùng origin.

### Stack công nghệ

| Tầng | Công nghệ |
|---|---|
| Backend | Node.js ≥ 22, Express 5, TypeScript 5.9, `pg` (SQL thuần, **không ORM**) |
| Auth | JWT (`jsonwebtoken`) + bcrypt (`bcryptjs`) |
| Validate | `zod` ở biên mọi request |
| Bảo mật | `helmet`, `express-rate-limit`, AES-256-GCM mã hóa phone/insurance |
| Thanh toán | VNPay (`vnpay`) + PayOS (`@payos/node`) |
| Log | `pino` + `pino-http` |
| Frontend | React + Vite + TypeScript + TailwindCSS + axios |
| Hạ tầng | Docker Compose, nginx, Caddy (TLS) |

---

## 2. Cây thư mục gốc

```
Patienthub2/
├── src/                      # Backend (Express + TypeScript)
├── web/                      # Frontend (React + Vite)
├── migrations/               # SQL migrations (schema database)
├── caddy/                    # Caddyfile + script giám sát IPv6 + hướng dẫn deploy
├── docker/                   # backend-entrypoint.sh (chờ DB + chạy migrate)
├── postman/                  # Collection test API (nếu có)
├── dist/                     # Backend build output (sinh ra bởi `npm run build`)
├── Dockerfile                # Build image backend (multi-stage)
├── docker-compose.yml        # Orchestrate 3 service
├── .env                      # ⚠ SECRETS — không commit git
├── .env.example              # Mẫu biến môi trường cho LOCAL dev (có DATABASE_URL)
├── .env.docker.example       # Mẫu biến môi trường cho DOCKER compose
├── README.md                 # Tài liệu backend + tích hợp thanh toán
├── CAU-TRUC-DU-AN.md         # ← file này
├── CAI-DAT-VA-CHAY.md        # Hướng dẫn cài đặt & chạy
├── HUONG-DAN-CHAY.md         # Vận hành hằng ngày (production)
├── API_AUDIT_NOTES.md        # Ghi chú rà soát bảo mật API
└── Testacount.md             # Tài khoản đăng nhập mẫu
```

---

## 3. Backend — `src/`

Kiến trúc **vertical slice**: mỗi nghiệp vụ là 1 thư mục trong `modules/`, gồm 4
file `schema | service | controller | routes`.

```
src/
├── server.ts                 # Entry point: check DB → listen → start scheduler
├── app.ts                    # Khởi tạo Express (helmet, cors, rate-limit, mount /api)
├── routes.ts                 # Gom router tất cả module + /health, /ready
├── config/
│   └── env.ts                # Validate biến môi trường bằng zod (fail-fast)
├── db/
│   ├── pool.ts               # pg Pool; ép DATE→string tránh lệch timezone
│   └── query.ts              # query / queryOne / withTransaction (luôn tham số hóa)
├── middleware/
│   ├── auth.ts               # authenticate (JWT) + requireRole(...)
│   ├── error.ts              # AppError + errorHandler tập trung + notFound
│   ├── validate.ts           # validate({ body, query, params }) bằng zod
│   └── rateLimit.ts          # globalLimiter, loginLimiter, forgotPasswordLimiter
├── utils/
│   ├── crypto.ts             # AES-256-GCM encrypt/decrypt
│   ├── password.ts           # bcrypt hash/verify + sinh mật khẩu ngẫu nhiên
│   ├── jwt.ts                # sign/verify token
│   ├── date.ts               # tiện ích ngày tháng
│   ├── logger.ts             # pino logger + httpLogger
│   └── sms.ts                # gửi SMS (mật khẩu reset cho bệnh nhân)
├── integrations/             # tích hợp ngoài (VNPay, PayOS)
├── scheduler/                # cron job (vd: expire-overdue-appointments mỗi 1h)
├── scripts/
│   ├── migrate.ts            # chạy migration (npm run migrate)
│   ├── seed.ts               # seed dữ liệu mẫu (npm run seed)
│   ├── vnpay-diag.ts         # chẩn đoán cấu hình VNPay
│   └── payos-diag.ts         # chẩn đoán cấu hình PayOS
├── types/
│   └── db.ts                 # interface khớp 1-1 với bảng DB
└── modules/                  # 16 module nghiệp vụ (xem mục 5)
    ├── auth/         departments/   library/      lab-rooms/
    ├── staff/        patients/      appointments/ examination-sessions/
    ├── test-orders/  prescriptions/ invoices/     notifications/
    └── reports/      chat/          ai/           manager/
```

### Quy ước quan trọng (tránh bug)
- Tiền tệ (NUMERIC) trả về **string** — không ép number (mất precision).
- Ngày (DATE) trả về **string `YYYY-MM-DD`** — không lệch timezone.
- Mọi query **tham số hóa** `$1, $2` — không nối chuỗi (chống SQL injection).
- Express 5 tự bắt lỗi async — controller chỉ cần `throw new AppError(...)`.
- Validate input bằng zod **trước** khi vào service.

---

## 4. Frontend — `web/`

```
web/
├── index.html                # HTML gốc của SPA
├── vite.config.ts            # cấu hình Vite; proxy /api → localhost:3000 (dev)
├── tailwind.config.js        # cấu hình Tailwind
├── nginx.conf                # cấu hình nginx khi chạy trong container (SPA + proxy /api)
├── Dockerfile                # build React → phục vụ tĩnh bằng nginx
└── src/
    ├── main.tsx              # mount React
    ├── App.tsx               # router gốc
    ├── auth/                 # context + guard đăng nhập
    ├── layouts/              # khung trang (staff / patient)
    ├── components/           # component dùng chung
    ├── lib/
    │   └── api.ts            # axios instance; baseURL = VITE_API_BASE_URL ?? '/api'
    └── pages/
        ├── LoginPage.tsx
        ├── ForgotPasswordPage.tsx
        ├── public/           # trang công khai
        ├── patient/          # giao diện bệnh nhân
        └── staff/            # giao diện nhân viên (bác sĩ, KTV, lễ tân, thu ngân, quản lý)
```

> **`web/src/lib/api.ts`**: `baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api'`.
> Khi chạy local để trống `VITE_API_BASE_URL` → FE gọi `/api` (nginx proxy).
> Khi deploy tách subdomain mới set `https://api.<domain>/api`.

---

## 5. Bản đồ module & API

Tất cả endpoint có tiền tố `/api`. Hầu hết yêu cầu header `Authorization: Bearer <token>`.
Phân quyền theo vai trò: `manager`, `doctor`, `technician`, `receptionist`, `cashier`, `patient`.

| Module | Tiền tố | Endpoint tiêu biểu | Vai trò chính |
|---|---|---|---|
| **auth** | `/auth` | `POST /login`, `POST /forgot-password`, `GET /me`, `POST /change-password` | tất cả |
| **departments** | `/departments` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id` | manager |
| **library** | `/library` | `…/diseases`, `…/medicines`, `…/test-types`, `…/procedures` (CRUD) | manager |
| **lab-rooms** | `/lab-rooms` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id` | manager |
| **staff** | `/staff` | `…/accounts`, `…/doctors`, `…/technicians`, `…/cashiers`, `…/receptionists` | manager |
| **patients** | `/patients` | `GET /me`, `GET /`, `POST /`, `GET/PATCH /:id`, `POST /:id/reset-password` | receptionist, patient |
| **appointments** | `/appointments` | `POST /`, `GET /`, `GET /:id`, `POST /:id/start`, `/:id/cancel`, `PATCH /:id/reassign` | receptionist, doctor |
| **examination-sessions** | `/examination-sessions` | `GET /me`, `/me/medical-history`, `/doctor/mine`, `/patient/:id`, `GET/PATCH /:id`, `POST /:id/finalize` | doctor, patient |
| **test-orders** | `/test-orders` | `POST /`, `/doctor/mine`, `/me`, `/technician/queue`, `PATCH /items/:itemId/status` … | doctor, technician |
| **prescriptions** | `/prescriptions` | `POST /`, `/doctor/mine`, `GET /`, `GET/PATCH /:id` | doctor |
| **invoices** | `/invoices` | `POST /generate`, `/:id/pay-vnpay`, `/:id/pay-payos`, `/:id/pay-cash`, `GET /revenue`, webhook VNPay/PayOS | cashier |
| **notifications** | `/notifications` | `GET /`, `/unread-count`, `PATCH /mark-all-read`, `/:id/read`, `POST /broadcast` | tất cả |
| **reports** | `/reports` | `POST /`, `GET /`, `GET /:id`, `PATCH /:id/resolve` | manager |
| **chat** | `/chat` | `GET /conversations`, `/with/:peerId`, `POST /messages` | tất cả |
| **ai (chatbot)** | `/chatbot` | `GET /symptoms`, `/library`, `/suggest-doctor` | patient |
| **manager** | `/manager` | `GET /dashboard` | manager |

### Endpoint hệ thống (không cần auth)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/health` | Liveness — server còn sống (không gọi DB) |
| GET | `/api/ready` | Readiness — DB + AI component sẵn sàng (dùng cho LB) |

---

## 6. Database — `migrations/`

PostgreSQL, 22 bảng. Áp dụng theo thứ tự file:

| File | Nội dung |
|---|---|
| `0001_init.sql` | Schema gốc: toàn bộ bảng, enum `user_role`, trigger `updated_at` |
| `0002_vnpay_columns.sql` | Cột phục vụ thanh toán VNPay |
| `0003_payos_columns.sql` | Cột phục vụ thanh toán PayOS |
| `0004_audit_fixes.sql` | `failed_login_count`, `locked_until`, bảng `password_reset_log` |

**Các bảng chính**: `users`, `doctors`, `technicians`, `patients`, `departments`,
`lab_rooms`, `appointments`, `examination_sessions`, `test_orders` /
`test_order_items`, `prescriptions` / `prescription_items`, `invoices` /
`invoice_items`, `notifications`, `chat_messages`, `reports`, `lib_diseases`,
`lib_medicines`, `lib_test_types`, `lib_procedures`, `schema_migrations`.

> ⚠ Migration được áp dụng **tự động** khi container backend khởi động
> (`RUN_MIGRATIONS=true` trong [docker/backend-entrypoint.sh](docker/backend-entrypoint.sh)).
> Nhưng **seed dữ liệu mẫu KHÔNG tự chạy** — phải chạy tay 1 lần
> (xem [CAI-DAT-VA-CHAY.md](CAI-DAT-VA-CHAY.md)).

---

## 7. Luồng nghiệp vụ chính

```
Lễ tân tạo bệnh nhân + đặt lịch hẹn (appointment)
        │
Bác sĩ bắt đầu khám (examination-session)
        │
        ├─► Chỉ định xét nghiệm (test-order) ──► KTV thực hiện ──► trả kết quả
        │
        └─► Kê đơn thuốc (prescription)
        │
Bác sĩ chốt phiên khám (finalize)
        │
Hệ thống sinh hóa đơn (invoice) ──► Thu ngân thu tiền (cash / VNPay / PayOS)
```

Quản lý xem dashboard, báo cáo doanh thu, quản lý nhân sự & danh mục (library).
Bệnh nhân tra cứu lịch sử khám, đơn thuốc, kết quả XN; chat với staff; chatbot gợi ý.
