# Patient Hub 2 — Backend

Hệ thống quản lý bệnh viện lấy bệnh nhân làm trung tâm.
Stack: **Express 5 + TypeScript + PostgreSQL (pg)**. Không dùng ORM — SQL thuần, tham số hóa.

## Yêu cầu

- Node.js >= 22
- PostgreSQL >= 14 (đang dùng 17), database `patient_hub_2` đã tạo từ `migrations/0001_init.sql`

## Cài đặt

```bash
npm install
cp .env.example .env   # rồi sửa lại giá trị cho đúng
```

`.env` quan trọng:

| Biến | Ý nghĩa |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:admin@localhost:5432/patient_hub_2` |
| `JWT_SECRET` | chuỗi ngẫu nhiên >= 16 ký tự |
| `AES_KEY` | 64 ký tự hex (32 bytes) — mã hóa phone/insurance. Sinh: `openssl rand -hex 32` |

## Lệnh

```bash
npm run dev             # chạy dev (tsx watch, hot reload)
npm run build           # biên dịch sang dist/
npm start               # chạy bản build
npm run typecheck       # tsc --noEmit
npm run migrate         # áp dụng migration chưa chạy
npm run migrate:status  # xem migration đã/chưa áp dụng
```

> DB đã được tạo tay từ `0001_init.sql` nên `npm run migrate` sẽ tự nhận diện
> baseline và chỉ đánh dấu `0001_init.sql` là applied (không chạy lại).
> Các thay đổi schema sau này: thêm file `migrations/0002_*.sql` rồi `npm run migrate`.

## Cấu trúc

```
migrations/          # SQL migrations (0001_init.sql = schema gốc)
src/
  config/env.ts      # validate biến môi trường (zod), fail fast
  db/
    pool.ts          # pg Pool; parser DATE->string (tránh lệch timezone)
    query.ts         # query / queryOne / withTransaction (luôn tham số hóa)
  middleware/
    auth.ts          # authenticate (JWT) + requireRole(...)
    error.ts         # AppError + errorHandler tập trung
    validate.ts      # validate({ body/query/params }) bằng zod
  utils/
    crypto.ts        # AES-256-GCM encrypt/decrypt
    password.ts      # bcrypt hash/verify
    jwt.ts           # sign/verify token
  types/db.ts        # interface khớp 1-1 với bảng DB (NUMERIC->string, DATE->string)
  modules/
    auth/            # mẫu vertical slice: schema | service | controller | routes
  routes.ts          # gom router các module
  app.ts             # khởi tạo express app
  server.ts          # entry point (check DB rồi mới listen)
```

## API hiện có

| Method | Path | Mô tả | Auth |
|---|---|---|---|
| GET  | `/api/health` | healthcheck | — |
| POST | `/api/auth/login` | đăng nhập → JWT | — |
| GET  | `/api/auth/me` | thông tin user hiện tại | Bearer |
| POST | `/api/auth/change-password` | đổi mật khẩu | Bearer |

## Thêm module mới (mẫu)

1. Tạo `src/modules/<ten>/` gồm 4 file: `*.schema.ts` (zod), `*.service.ts`
   (logic + SQL), `*.controller.ts` (req/res), `*.routes.ts` (router).
2. Mount trong `src/routes.ts`: `router.use('/<ten>', <ten>Routes)`.
3. Dùng `query`/`queryOne`/`withTransaction` từ `src/db/query.ts` — luôn truyền
   tham số `$1, $2` (chống SQL injection), không nối chuỗi.
4. Bảo vệ route bằng `authenticate` + `requireRole('doctor', ...)`.

## Quy ước tránh bug

- Tiền tệ (NUMERIC) trả về **string** — không ép sang number (mất precision).
- Ngày (DATE) trả về **string `YYYY-MM-DD`** — không lệch timezone.
- Mọi truy vấn đều tham số hóa; không bao giờ nội suy chuỗi vào SQL.
- Express 5 tự bắt lỗi async — controller chỉ cần `throw new AppError(...)`.
- Validate input ở biên bằng zod trước khi vào service.
