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

## Thanh toán PayOS (VietQR — đơn giản hơn VNPay)

PayOS dùng VietQR + chuyển khoản ngân hàng. **Đơn giản và rẻ hơn VNPay**: phí
thấp, không hợp đồng phức tạp, tự đăng ký online là chạy được production.

```
[FE] POST /api/invoices/generate              → tạo hóa đơn (status=pending)
[FE] POST /api/invoices/:id/pay-payos         → BE trả { checkoutUrl, qrCode, accountNumber }
[FE] hiển thị QR / redirect checkoutUrl       → user chuyển khoản bằng app banking
[PayOS] POST /api/invoices/payos-webhook      → server-to-server, BE mark paid
```

### Bước 1 — Đăng ký kênh thanh toán

1. Vào <https://my.payos.vn> → đăng ký bằng số điện thoại (eKYC ~5 phút).
2. **Tạo kênh thanh toán** → liên kết với tài khoản ngân hàng của bệnh viện
   (PayOS hỗ trợ ~30 ngân hàng VN).
3. Vào kênh vừa tạo → tab **"Thông tin tích hợp"** → copy 3 key:
   - `Client ID`
   - `API Key`
   - `Checksum Key`

### Bước 2 — Cấu hình `.env`

```bash
PAYOS_CLIENT_ID="..."
PAYOS_API_KEY="..."
PAYOS_CHECKSUM_KEY="..."
PAYOS_RETURN_URL="https://app.benhvien.vn/payments/success"
PAYOS_CANCEL_URL="https://app.benhvien.vn/payments/cancel"
```

### Bước 3 — Verify + tạo link test

```bash
npm run payos:diag
```

Script in ra `checkoutUrl` mẫu (10.000đ). Mở URL đó → quét QR bằng app
banking → chuyển khoản → kiểm tra trong portal PayOS xem có ghi nhận.

### Bước 4 — Đăng ký webhook

Sau khi BE deploy public (hoặc dùng `ngrok http 3000` cho local test):

```bash
# Thay <domain> bằng domain thật hoặc URL ngrok
curl -X POST https://api-merchant.payos.vn/confirm-webhook \
  -H "x-client-id: $PAYOS_CLIENT_ID" \
  -H "x-api-key: $PAYOS_API_KEY" \
  -d '{"webhookUrl":"https://<domain>/api/invoices/payos-webhook"}'
```

PayOS sẽ gửi 1 request test (orderCode=123, amount=3000) — code đã handle.

### Lưu ý an toàn PayOS

- **Verify signature**: tất cả webhook đi qua `payos.webhooks.verify(body)` —
  sai chữ ký → reject ngay.
- **Idempotent**: nếu webhook gửi lại, BE chỉ update lần đầu.
- **Khớp amount**: so sánh `data.amount` với `invoices.final_amount` trước
  khi mark paid.
- **Hủy link cũ**: khi user bấm "Thanh toán PayOS" lần 2 trên cùng hóa đơn,
  link cũ tự hủy để tránh đối soát nhầm.
- **orderCode unique**: dùng `Date.now() * 1000 + random(0..999)` — collision
  probability gần 0 trong cùng millisecond.

---

## Thanh toán VNPay thật

Module Invoices đã tích hợp gói [`vnpay`](https://www.npmjs.com/package/vnpay)
để nhận tiền thật. Luồng theo chuẩn VNPay:

```
[FE] POST /api/invoices/generate              → tạo hóa đơn (status=pending)
[FE] POST /api/invoices/:id/pay-vnpay         → BE sinh vnp_TxnRef + trả vnp_url
[FE] window.location = vnp_url                → user thanh toán trên VNPay
[VNPay] GET  /api/invoices/vnpay-return       → user về lại app (UI hiển thị)
[VNPay] GET  /api/invoices/vnpay-ipn          → server-to-server, BE mark paid
```

### Bước 1 — Đăng ký terminal

- **Sandbox**: <https://sandbox.vnpayment.vn> → tạo merchant test → lấy
  `vnp_TmnCode` + `vnp_HashSecret`.
- **Production**: ký hợp đồng với VNPay → nhận credentials production.

### Bước 2 — Cấu hình `.env`

```bash
VNP_TMN_CODE="..."                                  # từ portal VNPay
VNP_HASH_SECRET="..."                               # từ portal VNPay
VNP_HOST="https://sandbox.vnpayment.vn"             # đổi sang https://pay.vnpay.vn khi production
VNP_RETURN_URL="https://app.benhvien.vn/payments/return"  # FE route hiển thị kết quả
VNP_ALLOWED_IPS="113.160.92.202,113.52.45.78"       # whitelist IP của VNPay (production)
```

### Bước 3 — Khai báo IPN trên portal

Trong portal VNPay → "Thông tin tích hợp" → **IPN URL** = `https://api.benhvien.vn/api/invoices/vnpay-ipn`.

> VNPay sẽ gọi URL này server-to-server mỗi khi giao dịch hoàn tất. Phải là URL
> public (không phải localhost). Khi dev có thể dùng `ngrok http 3000` để expose.

### Bước 4 — Test trên sandbox

Dùng [thẻ test VNPay](https://sandbox.vnpayment.vn/apis/vnpay-demo/) — ví dụ
NCB: thẻ `9704198526191432198`, tên `NGUYEN VAN A`, ngày `07/15`, OTP `123456`.

### Lưu ý an toàn

- **Không** tin `GET /vnpay-return` để mark paid — chỉ dùng IPN.
- **Idempotent**: nếu VNPay gửi IPN nhiều lần, BE chỉ update lần đầu, lần sau trả
  `IpnSuccess` ngay (đã có logic kiểm tra `payment_status === 'paid'`).
- **Khớp tiền**: IPN handler so sánh `vnp_Amount / 100` với `invoices.final_amount`
  trước khi mark paid, chống user sửa amount qua URL.
- **Whitelist IP**: bật `VNP_ALLOWED_IPS` ở production để chỉ chấp nhận IPN từ
  VNPay.
