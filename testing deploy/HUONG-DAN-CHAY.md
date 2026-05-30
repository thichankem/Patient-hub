# PatientHub — Hướng dẫn chạy

File này dành cho thao tác hằng ngày: bật/tắt hệ thống, xem log, fix sự cố thường gặp.

**Lần đầu setup từ A-Z**: xem [caddy/DEPLOY-IPV6.md](caddy/DEPLOY-IPV6.md).

---

## ⚡ Khởi động hệ thống (sau khi máy vừa reboot)

Mở **PowerShell** hoặc **CMD**, chạy 3 bước theo thứ tự:

### 1. Bật Docker Desktop
- Start Menu → tìm "Docker Desktop" → bấm mở
- Chờ icon cá voi dưới taskbar đứng yên (~30s – 2 phút)
- Verify:
```cmd
docker info
```
Thấy `Server Version: ...` là OK.

### 2. Bật containers
```cmd
cd "C:\Users\ADMIN\OneDrive\Máy tính\Patienthub2"
docker compose up -d
```

Verify cả 3 container `healthy`:
```cmd
docker compose ps
```

Expected:
```
NAME                  STATUS
patienthub-backend    Up (healthy)
patienthub-postgres   Up (healthy)
patienthub-web        Up (healthy)
```

### 3. Bật Caddy (reverse proxy + HTTPS)
```cmd
cd C:\Users\ADMIN
caddy.exe start --config "C:\Users\ADMIN\OneDrive\Máy tính\Patienthub2\caddy\Caddyfile"
```

Verify ports đã bind:
```cmd
netstat -ano | findstr ":80 :443"
```
Thấy `LISTENING` cho cả `:80` và `:443` là OK.

### 4. Truy cập

| URL | Mô tả |
|---|---|
| https://dophuhung.fun | FE — bệnh nhân và staff đăng nhập tại đây |
| https://api.dophuhung.fun/api/health | API health check |

---

## 🛑 Tắt hệ thống

### Tắt Caddy
```cmd
cd C:\Users\ADMIN
caddy.exe stop
```

### Tắt containers (giữ data)
```cmd
cd "C:\Users\ADMIN\OneDrive\Máy tính\Patienthub2"
docker compose stop
```

### Tắt hoàn toàn (giữ data trong volume)
```cmd
docker compose down
```

> Data Postgres lưu trong volume `patienthub2_postgres-data` → vẫn còn sau khi `down`.

---

## 🔄 Restart 1 service

```cmd
# Backend (sau khi sửa code BE)
docker compose restart backend

# Web (sau khi sửa code FE - phải rebuild)
docker compose up -d --build web

# Reload Caddy (sau khi sửa Caddyfile)
cd C:\Users\ADMIN
caddy.exe reload --config "C:\Users\ADMIN\OneDrive\Máy tính\Patienthub2\caddy\Caddyfile"
```

---

## 📋 Xem log

```cmd
# Tất cả container, live
docker compose logs -f

# Chỉ backend
docker compose logs -f backend

# 100 dòng cuối, không follow
docker compose logs --tail 100

# Caddy log (HTTPS, ACME, errors)
type C:\Caddy\caddy.log

# Caddy log live
Get-Content C:\Caddy\caddy.log -Wait      # PowerShell
```

---

## 💾 Backup database

```cmd
# Backup ra file SQL
docker exec patienthub-postgres pg_dump -U postgres patient_hub_2 > backup-%date:~10,4%%date:~4,2%%date:~7,2%.sql

# Restore (xóa data cũ trước!)
docker exec -i patienthub-postgres psql -U postgres patient_hub_2 < backup-20260528.sql
```

**Backup định kỳ hằng ngày 2 giờ sáng** — tạo Task Scheduler:
```powershell
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument '/c docker exec patienthub-postgres pg_dump -U postgres patient_hub_2 > C:\backups\ph_%date:~10,4%%date:~4,2%%date:~7,2%.sql'
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -TaskName "PatientHub Backup" -Action $action -Trigger $trigger
```

---

## 🚨 Sự cố thường gặp

### "Cannot connect to Docker daemon"
→ Docker Desktop chưa chạy. Mở từ Start Menu, chờ icon ổn định.

### `docker compose up` lỗi "port already in use"
→ Project cũ hoặc app khác chiếm port. Tìm thủ phạm:
```cmd
netstat -ano | findstr ":3000"
netstat -ano | findstr ":8080"
netstat -ano | findstr ":5432"
```
Lấy PID, kill: `taskkill /PID <PID> /F`

Nếu là project Docker cũ:
```cmd
cd <folder project cũ>
docker compose down
```

### Domain không vào được — `ERR_CONNECTION_REFUSED` / `timeout`
1. Kiểm tra Caddy chạy chưa:
```cmd
tasklist | findstr Caddy
```
   Nếu không có → start lại theo bước 3 ở trên.

2. Kiểm tra IPv6 hiện tại của máy:
```cmd
powershell -Command "(Invoke-RestMethod https://api6.ipify.org).Trim()"
```
   So với AAAA record ở zonedns. Nếu KHÁC → **FPT đã đổi prefix**, phải vào panel zonedns sửa 3 record AAAA (`@`, `api`, `www`) về IPv6 mới.

3. Test reach IPv6 từ ngoài:
```cmd
powershell -Command "curl.exe -6 -v -m 10 https://dophuhung.fun/"
```

### HTTPS báo "certificate expired" hoặc "not secure"
→ Cert hết hạn. Caddy tự renew, nhưng nếu Caddy bị tắt > 60 ngày sẽ hết.
Fix: chạy `caddy reload --config <path>` để Caddy tự xin cert mới.

### Backend lỗi 500 — không kết nối được Postgres
```cmd
docker compose logs backend --tail 30
```
Nếu thấy `ECONNREFUSED postgres:5432`:
```cmd
docker compose restart postgres
sleep 10
docker compose restart backend
```

### Toàn bộ máy chậm, lag
→ Docker Desktop ăn nhiều RAM (mặc định 7GB). Giảm:
- Docker Desktop → Settings → Resources → Memory → giảm xuống 4GB
- Apply & Restart

### "IPv6 đã đổi" — thấy thông báo toast Windows
→ Đây là `monitor-ipv6.ps1` báo. Làm theo:
1. Mở panel zonedns
2. Sửa 3 record AAAA về IPv6 mới (xem trong thông báo)
3. Lưu — đợi 5 phút TTL hết → site hoạt động lại

---

## 🧰 Lệnh chẩn đoán nhanh

```cmd
# Tổng quan trạng thái
docker compose ps
tasklist | findstr Caddy
netstat -ano | findstr ":80 :443"

# Test endpoints
curl http://localhost:3000/api/health
curl http://localhost:8080/

# Test qua HTTPS public
curl https://api.dophuhung.fun/api/health

# DNS check
nslookup -type=AAAA dophuhung.fun 8.8.8.8

# IPv6 hiện tại của máy
powershell -Command "(Invoke-RestMethod https://api6.ipify.org).Trim()"
```

---

## 📁 Cấu trúc thư mục quan trọng

```
Patienthub2/
├── .env                            ← SECRETS, KHÔNG commit git
├── docker-compose.yml              cấu hình Docker
├── HUONG-DAN-CHAY.md               file này
├── caddy/
│   ├── Caddyfile                   config reverse proxy + HTTPS
│   ├── monitor-ipv6.ps1            cảnh báo IPv6 đổi
│   └── DEPLOY-IPV6.md              hướng dẫn setup lần đầu
└── src/                            backend Node.js + Express
└── web/                            frontend React + Vite
└── migrations/                     SQL migrations
```

| File quan trọng | Đường dẫn ngoài project |
|---|---|
| Caddy.exe | `C:\Users\ADMIN\caddy.exe` |
| Caddy log | `C:\Caddy\caddy.log` |
| Caddy cert storage | `C:\Users\ADMIN\AppData\Roaming\Caddy\certificates\` |
| Docker volume Postgres | (managed by Docker, dùng `docker volume ls`) |

---

## 🔑 Secrets (đừng quên!)

`.env` chứa các secret sau, **không bao giờ commit lên git**:
- `JWT_SECRET` — ký JWT token
- `AES_KEY` — mã hóa dữ liệu nhạy cảm
- `POSTGRES_PASSWORD` — mật khẩu DB

Sinh lại nếu cần:
```cmd
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

⚠ Nếu đổi `JWT_SECRET` → **tất cả user phải đăng nhập lại**.
⚠ Nếu đổi `AES_KEY` → **dữ liệu mã hóa cũ không decrypt được** (nguy hiểm).

---

## ☎️ Khi cần thêm sự trợ giúp

Paste ra cho assistant các thông tin sau:
```cmd
docker compose ps
docker compose logs --tail 50 backend
tasklist | findstr Caddy
type C:\Caddy\caddy.log | findstr -i "error fail"
```
