# Patient Hub 2 — Hệ thống Quản lý Bệnh viện lấy Bệnh nhân làm Trung tâm

Patient Hub 2 là hệ thống quản lý bệnh viện toàn diện bao gồm Backend API (Express 5 + TypeScript + PostgreSQL), Frontend Client (React + Vite + Tailwind CSS), các mô hình Trí tuệ Nhân tạo (Machine Learning/Reinforcement Learning) cho chẩn đoán bệnh và tối ưu hóa lịch trình khám chữa bệnh, cùng với hạ tầng triển khai qua Docker/Docker Compose.

---

## 🛠️ Các công nghệ được sử dụng

Hệ thống được thiết kế và triển khai với các công nghệ hiện đại, đảm bảo hiệu năng cao và khả năng mở rộng:

### 1. Backend (API Server)
- **Runtime**: Node.js (>= 22)
- **Framework**: Express.js 5
- **Ngôn ngữ**: TypeScript
- **Database**: PostgreSQL (>= 14, khuyên dùng 17)
- **Database Driver**: `pg`
- **Security**: JWT (JSON Web Token), bcryptjs (băm mật khẩu), Express Rate Limit (giới hạn tần suất gọi API)
- **Thanh toán**: Tích hợp thanh toán thật qua cổng **PayOS
### 2. Frontend (Web Portal)
- **Framework/Bundler**: React 18 & Vite
- **Ngôn ngữ**: TypeScript
- **Styling**: Tailwind CSS
- **Navigation**: React Router DOM (v6)

### 3. AI / Machine Learning (Mô hình Trí tuệ Nhân tạo)
- **Ngôn ngữ**: Python
- **Mô hình Random Forest (Chẩn đoán bệnh)**: `scikit-learn`, `pandas`, `numpy`, `joblib` để phân tích triệu chứng và chẩn đoán bệnh. Triển khai API phục vụ qua `FastAPI` & `Uvicorn`.
- **Mô hình Reinforcement Learning (Tối ưu hóa lịch trình)**: Sử dụng Q-Learning (Gym-style environment) để tối ưu thứ tự và phòng khám thực hiện các chỉ định cận lâm sàng (xét nghiệm, siêu âm, chụp X-quang) cho bệnh nhân.

### 4. DevOps & Deployment
- **Containerization**: Docker & Docker Compose

## 🚀 Cách chạy dự án

Bạn có thể chạy dự án thông qua Docker Compose (đầy đủ dịch vụ) hoặc chạy thủ công từng phần để phát triển (Local Development).

### 1. Chuẩn bị biến môi trường
Sao chép tệp cấu hình mẫu và điền các thông tin cần thiết:
```bash
# Tại thư mục gốc của dự án
cp .env.example .env
```

Các biến cấu hình quan trọng trong `.env`:
| Biến | Ý nghĩa | Ví dụ / Ghi chú |
|---|---|---|
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL | `postgresql://postgres:admin@localhost:5432/patient_hub_2` |
| `JWT_SECRET` | Khóa bí mật dùng ký JWT | Chuỗi ngẫu nhiên từ 16 ký tự trở lên |
| `AES_KEY` | Khóa mã hóa hex 64 ký tự | Mã hóa phone/insurance. Sinh nhanh: `openssl rand -hex 32` |
| `PAYOS_CLIENT_ID` | Client ID của PayOS | Lấy từ tab "Thông tin tích hợp" trên portal PayOS |
| `PAYOS_API_KEY` | API Key của PayOS | Lấy từ tab "Thông tin tích hợp" trên portal PayOS |
| `PAYOS_CHECKSUM_KEY` | Checksum Key của PayOS | Lấy từ tab "Thông tin tích hợp" trên portal PayOS |

---

### 2. Chạy bằng Docker Compose (Cách nhanh nhất)
Chỉ cần một câu lệnh duy nhất để khởi động toàn bộ dịch vụ (PostgreSQL, Backend API, Frontend Web):

```bash
docker compose up -d --build
```

**Cách kiểm tra và quản lý:**
* Xem trạng thái các container: `docker compose ps`
* Xem logs của Backend: `docker compose logs -f backend`
* Truy cập Web UI: [http://localhost:8080](http://localhost:8080) (Nginx sẽ tự động proxy các request `/api/*` sang backend).
* Truy cập trực tiếp Backend API: [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

### 3. Chạy thủ công từng phần (Local Development)

#### Bước A: Chạy Cơ sở dữ liệu (PostgreSQL)
1. Đảm bảo máy tính đã cài đặt PostgreSQL >= 14 (đang dùng 17) và dịch vụ đang chạy.
2. Tạo cơ sở dữ liệu có tên là `patient_hub_2`.
3. Khởi tạo cấu trúc bảng bằng cách import file migrations/0001_init.sql vào cơ sở dữ liệu `patient_hub_2`.

#### Bước B: Khởi động Backend
1. Tại thư mục gốc của dự án, cài đặt thư viện:
   ```bash
   npm install
   ```
2. Thực hiện chạy database migration và seed dữ liệu ban đầu:
   ```bash
   npm run migrate         # Áp dụng migration chưa chạy (sử dụng baseline cho 0001_init.sql)
   npm run migrate:status  # Kiểm tra trạng thái migrations
   npm run seed            # Seed dữ liệu mẫu (tài khoản, phòng khám, v.v.)
   ```
3. Chạy server ở chế độ phát triển (hot reload):
   ```bash
   npm run dev
   ```
   * Server sẽ chạy tại: [http://localhost:3000](http://localhost:3000)

**Các lệnh hỗ trợ phát triển Backend:**
```bash
npm run build           # Biên dịch dự án sang JavaScript tại thư mục dist/
npm start               # Khởi chạy bản build production từ dist/
npm run typecheck       # Kiểm tra kiểu TypeScript mà không build (tsc --noEmit)
```

#### Bước C: Khởi động Frontend
1. Di chuyển vào thư mục `web` và cài đặt thư viện:
   ```bash
   cd web
   npm install
   ```
2. Khởi chạy ở chế độ phát triển (Vite Dev Server):
   ```bash
   npm run dev
   ```
   * Giao diện Web sẽ chạy tại: [http://localhost:5173](http://localhost:5173)
   * Vite đã cấu hình proxy ngầm chuyển tiếp các request `/api` sang backend ở `http://localhost:3000`.

---
