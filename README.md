# Patient Hub 2

Hệ thống quản lý bệnh viện lấy bệnh nhân làm trung tâm.

## Yêu cầu

- Node.js >= 22
- PostgreSQL >= 14 (đang dùng 17), database `patient_hub_2` đã tạo từ `migrations/0001_init.sql`

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
