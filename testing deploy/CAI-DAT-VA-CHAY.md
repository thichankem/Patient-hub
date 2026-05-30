# PatientHub 2 — Cài đặt & Chạy

Hướng dẫn cài đặt từ đầu và chạy hệ thống. Có **2 cách**:

- **Cách A — Docker (khuyến nghị):** chạy cả 3 service (web + backend + postgres)
  bằng 1 lệnh. Phù hợp để demo / dùng thật trên 1 máy.
- **Cách B — Local dev:** chạy backend và frontend trực tiếp bằng Node để code,
  hot-reload nhanh. Cần tự cài PostgreSQL.

> Cấu trúc dự án: [CAU-TRUC-DU-AN.md](CAU-TRUC-DU-AN.md) · Vận hành production: [HUONG-DAN-CHAY.md](HUONG-DAN-CHAY.md)

---

## Yêu cầu

| Phần mềm | Phiên bản | Dùng cho |
|---|---|---|
| Docker Desktop | mới nhất | Cách A |
| Node.js | ≥ 22 | Cách B |
| PostgreSQL | ≥ 14 (đang dùng 16/17) | Cách B |

---

## Cách A — Chạy bằng Docker ✅ (khuyến nghị)

### A1. Tạo file `.env`

Copy mẫu rồi sửa giá trị:

```powershell
copy .env.docker.example .env
```

`.env` cần các giá trị (mẫu đã có sẵn, chỉ cần đổi secret cho production):

```ini
POSTGRES_DB=patient_hub_2
POSTGRES_USER=postgres
POSTGRES_PASSWORD=admin
POSTGRES_PORT=5432
BACKEND_PORT=3000
WEB_PORT=8080

# ⚠ QUAN TRỌNG cho việc "không kết nối được URL":
#   - Chạy local (vào http://localhost:8080): ĐỂ TRỐNG → FE gọi '/api' qua nginx proxy.
#   - Deploy domain thật tách subdomain API: đặt https://api.<domain>/api
VITE_API_BASE_URL=

JWT_SECRET=<chuỗi hex 64 ký tự>     # sinh: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
AES_KEY=<chuỗi hex 64 ký tự>        # sinh tương tự — ⚠ đổi sau sẽ không decrypt được data cũ
RUN_MIGRATIONS=true
```

> **DATABASE_URL không khai báo ở đây** — `docker-compose.yml` tự ráp từ
> `POSTGRES_*` và trỏ tới service `postgres` nội bộ.

### A2. Bật hệ thống

```powershell
docker compose up -d --build
docker compose ps          # chờ cả 3 container "healthy"
```

Mong đợi:
```
patienthub-postgres   Up (healthy)
patienthub-backend    Up (healthy)
patienthub-web        Up (healthy)
```

### A3. ⚠ Seed dữ liệu mẫu (BẮT BUỘC lần đầu)

Migration chạy tự động khi backend khởi động (tạo bảng), **nhưng dữ liệu mẫu và
tài khoản đăng nhập KHÔNG tự seed**. Nếu bỏ bước này, database rỗng → đăng nhập
sẽ báo *"Sai tài khoản hoặc mật khẩu"*.

```powershell
docker exec patienthub-backend node dist/scripts/seed.js
```

Lệnh in ra danh sách bảng đã seed và tài khoản mẫu. Xem [Testacount.md](Testacount.md).

### A4. Truy cập

| URL | Mô tả |
|---|---|
| http://localhost:8080 | **Giao diện web** — đăng nhập tại đây |
| http://localhost:3000/api/health | Healthcheck API trực tiếp |

Đăng nhập: `admin` / `admin` (vai trò quản lý).

---

## Cách B — Local dev (code & hot-reload)

### B1. Cài PostgreSQL & tạo database

```powershell
# Tạo database (đổi user/pass theo máy bạn)
psql -U postgres -c "CREATE DATABASE patient_hub_2;"
```

### B2. Backend

```powershell
npm install
copy .env.example .env       # mẫu này có DATABASE_URL — dùng cho local
```

Sửa `.env` (file backend local — KHÁC file Docker ở mục A1):

```ini
DATABASE_URL=postgresql://postgres:admin@localhost:5432/patient_hub_2
PORT=3000
NODE_ENV=development
JWT_SECRET=<>= 16 ký tự>
AES_KEY=<64 ký tự hex>
```

Chạy migration + seed + dev server:

```powershell
npm run migrate          # áp dụng toàn bộ migration (0001 → 0004)
npm run seed             # nạp dữ liệu mẫu + tài khoản
npm run dev              # tsx watch — hot reload, chạy ở http://localhost:3000
```

### B3. Frontend

```powershell
cd web
npm install
npm run dev              # Vite dev server ở http://localhost:5173
```

Vite tự proxy `/api` → `http://localhost:3000` (xem [web/vite.config.ts](web/vite.config.ts)),
nên **không cần** set `VITE_API_BASE_URL` khi dev. Truy cập http://localhost:5173.

### Các lệnh backend khác

```powershell
npm run build            # biên dịch sang dist/
npm start                # chạy bản build (dist/server.js)
npm run typecheck        # tsc --noEmit (kiểm tra type, không xuất file)
npm run migrate:status   # xem migration nào đã/chưa áp dụng
npm run payos:diag       # chẩn đoán cấu hình PayOS
npm run vnpay:diag       # chẩn đoán cấu hình VNPay
```

---

## Tài khoản mẫu (sau khi seed)

Mật khẩu **tất cả** = `admin`. Xem đầy đủ trong [Testacount.md](Testacount.md).

| Vai trò | Username |
|---|---|
| Quản lý (manager) | `admin` |
| Lễ tân (receptionist) | `letan1`, `letan2` |
| Thu ngân (cashier) | `thungan1`, `thungan2` |
| Bác sĩ (doctor) | `bs.nguyenvana`, `bs.tranthib`, … (×10) |
| Kỹ thuật viên (technician) | `ktv1` … `ktv8` |
| Bệnh nhân (patient) | `bn.phamthid`, `bn.nguyenvane`, … (×25) |

---

## Khắc phục sự cố thường gặp

### ❌ "Không kết nối được URL" / web tải được nhưng đăng nhập/không có dữ liệu

Hầu hết do **frontend build trỏ sai địa chỉ API**.

1. Mở DevTools trình duyệt (F12) → tab **Network** → thử đăng nhập. Nếu request
   `login` gọi tới một **domain production không truy cập được** (vd
   `https://api.dophuhung.fun/api`) và lỗi `ERR_NAME_NOT_RESOLVED` / timeout →
   FE đã build với `VITE_API_BASE_URL` trỏ domain đó.
2. Sửa trong `.env`: **để trống** `VITE_API_BASE_URL=` rồi build lại web:
   ```powershell
   docker compose up -d --build web
   ```
   FE sẽ gọi `/api` (đường tương đối) → nginx proxy nội bộ sang backend.
3. Kiểm tra backend còn sống: `curl http://localhost:3000/api/health` → `{"status":"ok"}`.

### ❌ Đăng nhập báo "Sai tài khoản hoặc mật khẩu" dù gõ đúng

Database **chưa được seed** (chỉ có bảng, không có user). Chạy:
```powershell
docker exec patienthub-backend node dist/scripts/seed.js
```
Kiểm tra số user: `docker exec patienthub-postgres psql -U postgres -d patient_hub_2 -c "SELECT count(*) FROM users;"`

### ❌ Đăng nhập báo "Quá nhiều lần đăng nhập sai…"

Đây là **rate limiter** hoạt động đúng (10 lần/15 phút mỗi IP). Chờ 15 phút hoặc
`docker compose restart backend`.

### ⚠ Lẫn lộn 2 PostgreSQL trên cùng port 5432

Nếu máy bạn **đã cài PostgreSQL local** (vd PG 17) đang chạy ở 5432, nó sẽ tranh
port với container `postgres`. Hậu quả: lệnh `psql -h localhost` từ host có thể
nối tới **PG local** (database cũ, khác), trong khi backend trong Docker nối tới
**postgres container** (database đúng). Hai database này **độc lập** → dễ tưởng
"đã seed rồi mà vẫn không đăng nhập được".

- Để chắc chắn thao tác đúng database mà backend dùng, luôn vào **trong container**:
  ```powershell
  docker exec patienthub-postgres psql -U postgres -d patient_hub_2 -c "SELECT count(*) FROM users;"
  ```
- Nếu muốn tránh hẳn xung đột: tắt service PostgreSQL local, hoặc đổi
  `POSTGRES_PORT` trong `.env` (vd `5433`) rồi `docker compose up -d`.

### ❌ `docker compose up` lỗi "port already in use"

Có app khác chiếm port 3000 / 8080 / 5432:
```powershell
netstat -ano | findstr ":3000"
taskkill /PID <PID> /F
```
Hoặc đổi `BACKEND_PORT` / `WEB_PORT` / `POSTGRES_PORT` trong `.env`.

### ❌ Backend lỗi `Biến môi trường không hợp lệ` khi chạy `npm run dev`

`.env` đang thiếu `DATABASE_URL` (hoặc đang dùng file `.env` kiểu Docker cho
local). Local dev cần `DATABASE_URL` đầy đủ — copy từ `.env.example` (mục B2).

---

## Tóm tắt lệnh nhanh (Docker)

```powershell
docker compose up -d --build                              # bật + build
docker exec patienthub-backend node dist/scripts/seed.js # seed (lần đầu)
docker compose ps                                         # trạng thái
docker compose logs -f backend                            # xem log
docker compose down                                       # tắt (giữ data)
docker compose up -d --build web                          # build lại FE sau khi đổi VITE_API_BASE_URL
```
