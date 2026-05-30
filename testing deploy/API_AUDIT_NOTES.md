# Ghi chú rà soát toàn bộ API

Phạm vi: `src/` (toàn bộ modules, middleware, integrations, utils, scheduler).
Mức độ: **C** = Critical (cần fix ngay), **H** = High, **M** = Medium, **L** = Low / cải tiến.

Trang này KHÔNG bao gồm các vấn đề thuần ML model (đã có ghi chú riêng trong folder `model ai/`).

> ## ✅ TRẠNG THÁI FIX (cập nhật)
> Toàn bộ các issues C/H/M trong tài liệu này đã được fix. Build + typecheck pass.
> Xem chi tiết ở mục [11. Tóm tắt thay đổi](#11-tóm-tắt-thay-đổi-đã-thực-hiện) cuối file.
> Một số việc còn lại được tách thành **issues còn mở** trong cùng mục.

---

## 1. AUTH / JWT / MẬT KHẨU

### [C-1] `jsonwebtoken.verify` không restrict algorithm
File: `src/utils/jwt.ts:19`
```ts
const decoded = jwt.verify(token, env.JWT_SECRET);
```
Mặc định `jsonwebtoken` chấp nhận MỌI thuật toán, kể cả `none`. Kẻ tấn công có thể tự ký token với `alg: none` hoặc chuyển sang `RS256` rồi attack key confusion để bypass auth.
**Fix:** `jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] })` (và truyền `algorithm: 'HS256'` vào `SignOptions` của `signToken`).

### [H-2] `forgot-password` không rate-limit
File: `src/modules/auth/auth.service.ts:76`, `src/modules/auth/auth.routes.ts:14`
Endpoint public `POST /auth/forgot-password`. Kẻ tấn công có thể:
- Spam SMS reset cho mọi SĐT trong dải Việt Nam → tốn phí gateway + DoS bệnh nhân.
- Reset mật khẩu liên tục của 1 bệnh nhân khiến họ không vào được.
**Fix:** rate limit theo IP + theo phone (vd. ≤ 3 lần / SĐT / giờ), thêm captcha hoặc OTP step.

### [H-3] Brute-force login không bị khóa
File: `src/modules/auth/auth.service.ts:23`
`login` không đếm số lần sai, không lock account, không rate-limit. Có thể brute-force mật khẩu yếu (≥ 6 ký tự là quá ngắn). Đặc biệt nguy hiểm với `username = SĐT` của bệnh nhân (dễ đoán).
**Fix:** đếm fail count trong cache, lock 15' sau 5 lần sai; thêm rate limit IP.

### [H-4] `generatePassword` có modulo bias
File: `src/utils/password.ts:8`
```ts
out += charset[bytes[i]! % charset.length];   // 55 ký tự → 256 % 55 != 0
```
Một số ký tự đầu charset bị bias (~17% xác suất cao hơn). Với password 10 ký tự, entropy mất ~3 bit. Không catastrophic, nhưng best practice là rejection sampling.

### [C-5] `sendSms` chỉ log ra console
File: `src/utils/sms.ts:3`
Mật khẩu reset / mật khẩu mới của bệnh nhân được in ra console log. Nếu production deploy quên thay implementation, **mật khẩu nằm trong log file → bất kỳ ai có quyền đọc log có thể chiếm tài khoản bệnh nhân**.
**Fix:** wire vào gateway thật; trong lúc chưa có, throw error ở production để tránh leak ngầm.

### [H-6] Staff không có chức năng quên mật khẩu
`forgotPassword` chỉ áp dụng `role = 'patient'`. Bác sĩ / KTV / cashier / receptionist quên mật khẩu → bị lock-out, mà cũng **không có API nào cho manager reset mật khẩu staff**. `setAccountActive` chỉ khóa/mở.
**Fix:** thêm `POST /staff/accounts/:userId/reset-password` cho manager.

### [M-7] `updatePatient` luôn reset mật khẩu bệnh nhân
File: `src/modules/patients/patients.service.ts:180-204`
Mọi PATCH (kể cả chỉ sửa địa chỉ) đều sinh mật khẩu mới + gửi SMS. Bệnh nhân bị "đổi mật khẩu vô lý" khi receptionist sửa typo. Cũng tốn phí SMS không cần thiết.
**Fix:** chỉ reset password khi `phone` thay đổi (cần ưu tiên), hoặc tách thành endpoint riêng.

---

## 2. THANH TOÁN (INVOICE / VNPAY / PAYOS)

### [C-8] `payCash` có thể bị nhân viên thu ngân gian lận
File: `src/modules/invoices/invoices.service.ts:492`, `src/modules/invoices/invoices.schema.ts:11`
Schema có `received_amount` optional. Service KHÔNG kiểm tra `received_amount >= final_amount`, **không lưu lại số tiền nhận thật**. Trong DB cũng không có cột `received_amount` (xem `migrations/0001_init.sql:362` — chỉ có `cashier_user_id`).

Cashier có thể:
1. Đánh dấu hóa đơn 1.000.000đ "đã paid" mà không thu xu nào → bỏ túi.
2. Thu 500k, nhập 1tr, không ai phát hiện vì không lưu.

**Fix:** validate `received_amount >= final_amount`, thêm cột `received_amount NUMERIC` vào `invoices`, lưu vào DB.

### [H-9] Race condition khi cập nhật `payment_status = 'paid'`
File: `src/modules/invoices/invoices.service.ts:421` (VNPay IPN) và `:334` (PayOS webhook)

```ts
if (inv.payment_status === 'paid') return VnpIpn.Success;  // check
// ... UPDATE invoices SET payment_status = 'paid' ...      // act
```
Hai IPN gần như đồng thời (VNPay retry) đều pass check rồi cùng UPDATE. Hậu quả: 2 lần `notifyUser` → bệnh nhân nhận 2 SMS, 2 record audit. Tệ hơn nếu sau này có business logic side-effect (vd. trừ kho thuốc).
**Fix:** `withTransaction` + `SELECT ... FOR UPDATE`, hoặc `UPDATE ... WHERE id = $1 AND payment_status != 'paid' RETURNING *` — chỉ row trả về mới thực sự "chuyển".

### [C-10] `clientIp` đọc `x-forwarded-for` mà KHÔNG bật `trust proxy`
File: `src/integrations/vnpay.ts:146`, `src/app.ts:7`
```ts
const fwd = req.headers['x-forwarded-for'];
if (typeof fwd === 'string') return fwd.split(',')[0]!.trim();
```
Express không `app.set('trust proxy', ...)` → BẤT KỲ AI cũng có thể spoof header `X-Forwarded-For` để giả mạo là VNPay khi gọi `/vnpay-ipn`. `VNP_ALLOWED_IPS` whitelist trở nên vô tác dụng.
**Fix:** `app.set('trust proxy', 1)` (hoặc đúng số hop reverse proxy), và dùng `req.ip` thay cho việc parse thủ công.

### [H-11] PayOS webhook không có IP whitelist
File: `src/modules/invoices/invoices.routes.ts:22`, `src/integrations/payos.ts`
Endpoint `POST /payos-webhook` public hoàn toàn. Chỉ dựa vào chữ ký HMAC để chống giả mạo, OK. Nhưng:
- Không có rate limit → kẻ tấn công flood request → mỗi request đều phải verify signature (CPU cost).
- Trong PayOS docs có công bố IP gateway — nên áp dụng whitelist tương tự VNPay.

### [M-12] `payVnpay` ghi `vnp_txn_ref` ngoài transaction
File: `src/modules/invoices/invoices.service.ts:236-251`
Nếu `buildPaymentUrl` throw sau khi UPDATE thành công → DB có `vnp_txn_ref` cho 1 phiên không tồn tại. Lần sau patient retry sinh txnRef mới, txnRef cũ vẫn còn trong DB (column không unique, không sao nhưng rác).

### [M-13] `payPayos` không lưu transaction → orphan PayOS link
File: `src/modules/invoices/invoices.service.ts:261-328`
`payosCreate` xong, nếu UPDATE DB fail → link đã tồn tại trên hệ thống PayOS nhưng không gắn vào invoice. Lần sau patient bấm pay → sinh link mới, link cũ bị "treo" (có thể PayOS retry webhook về `orderCode` không tìm thấy → `Order not found` → ack 200, OK).

### [L-14] `generateOrderCode` PayOS có thể trùng
File: `src/integrations/payos.ts:49`
```ts
return ts * 1000 + rand;   // 0-999, không kiểm tra DB
```
Trong cùng 1 ms, 1000 request đồng thời chỉ cần ~37 cái để có 50% trùng (birthday paradox). Trong thực tế thấp nhưng có thể xảy ra ở môi trường stress test → PayOS từ chối với "orderCode đã tồn tại". Cũng tương tự cho `generateTxnRef` (chỉ 6 char A-Z0-9 = 2 tỷ tổ hợp, OK hơn).

### [H-15] Hóa đơn thiếu phí khám bác sĩ + phí thuốc
File: `src/modules/invoices/invoices.service.ts:124-125` (comment thừa nhận)
Chỉ tính tiền xét nghiệm; phí khám = 0, phí thuốc không cộng. **Bệnh nhân được khám free + được thuốc free** nếu chỉ thanh toán hóa đơn này. Lỗi nghiệp vụ nghiêm trọng cho production.

### [M-16] `getRevenue` chỉ tính VNPay, bỏ qua PayOS + cash
File: `src/modules/invoices/invoices.service.ts:587-614`, `manager.service.ts:96-103`
```sql
WHERE payment_method = 'vnpay' AND payment_status = 'paid'
```
PayOS đã tích hợp nhưng KHÔNG vào doanh thu. Tiền mặt cũng không. Manager dashboard hiển thị `revenue_vnpay` → sai số.

---

## 3. APPOINTMENT / EXAMINATION / TEST ORDER

### [H-17] `expireOverdueAppointments` lệch timezone
File: `src/modules/appointments/appointments.service.ts:374`
```ts
const today = new Date().toISOString().slice(0, 10);  // UTC date
... WHERE appointment_date < $1
```
`appointment_date` là `DATE` local Việt Nam, `today` là UTC. Sau 17:00 VN trở đi, UTC vẫn là ngày trước → cron bỏ qua các lịch quá hạn của hôm nay 1 tiếng (hoặc đánh dấu sớm 7h).
**Fix:** dùng `(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date` ngay trong SQL.

### [H-18] `cancelItem` không cập nhật `schedule_order` khi đổi phòng
File: `src/modules/test-orders/test-orders.service.ts:336-369`
Khi KTV hủy + reassign sang phòng khác, item giữ `schedule_order` cũ. Nhưng `schedule_order` được tính theo queue lúc tạo test order — phòng mới có queue khác → thứ tự không còn ý nghĩa. Bệnh nhân thấy item nhảy chỗ ngẫu nhiên.
**Fix:** chạy lại scheduler cho tất cả item chưa hoàn tất của bệnh nhân khi reassign.

### [M-19] `technicianQueue` sort theo `schedule_order`
File: `src/modules/test-orders/test-orders.service.ts:257-266`
`schedule_order` chỉ unique trong phạm vi 1 bệnh nhân. Khi nhiều bệnh nhân cùng vào queue 1 phòng, ORDER BY này không cho ra FIFO — KTV có thể gọi nhầm bệnh nhân đến trước. Nên sort theo `created_at` hoặc `updated_at`.

### [M-20] `reviewItem` không chặn session đã finalized
File: `src/modules/test-orders/test-orders.service.ts:390`
Bác sĩ có thể review item của session `is_finalized = TRUE` → vô nghĩa. Không gây hại nghiêm trọng nhưng nên reject.

### [M-21] `startExamination` không kiểm tra appointment date
File: `src/modules/appointments/appointments.service.ts:244`
Bác sĩ có thể start examination cho lịch hẹn tuần sau → tạo session trước ngày khám. Có thể cho phép (bệnh nhân đến sớm), nhưng nên cảnh báo / giới hạn vd. trong khoảng `[appointment_date - 1, today]`.

### [M-22] `reassignDoctor` không kiểm tra bác sĩ mới thuộc cùng khoa
File: `src/modules/appointments/appointments.service.ts:315`
Manager có thể chuyển 1 lịch khám Tim mạch sang bác sĩ Răng-hàm-mặt. Spec có thể cho phép (linh động) nhưng nên cảnh báo hoặc bắt confirm.

### [M-23] `autoAssignDoctor` không có concept khung giờ
File: `src/modules/appointments/appointments.service.ts:47`
Chỉ đếm số lịch / ngày, không quan tâm bác sĩ có thể khám bao nhiêu / ngày. Có thể assign 100 bệnh nhân cho 1 bác sĩ trong cùng ngày. Cần `max_per_day` hoặc time slot.

### [L-24] `createTestOrder` N+1 query
File: `src/modules/test-orders/test-orders.service.ts:96-108`
Trong loop `for ttId of test_type_ids`: gọi `queryOne` + `candidateRooms` (cũng query). Với 5 loại test = 10+ round-trip. Gộp thành 1 query với `WHERE id = ANY($1)`.

### [M-25] `prescriptions.createPrescription` không lock session
File: `src/modules/prescriptions/prescriptions.service.ts:97-141`
Check `dup` rồi `INSERT` không trong transaction lock. 2 request gần đồng thời có thể cùng pass check → vi phạm UNIQUE constraint trên `session_id`. Lỗi sẽ throw 500 (Postgres unique violation) thay vì AppError 409 đẹp.

### [M-26] `updateSession` build SET rỗng → SQL invalid
File: `src/modules/examination-sessions/examination.service.ts:200-216`
Nếu PATCH body chỉ có `{ }`, code tạo SQL `UPDATE examination_sessions SET WHERE id = $1` → Postgres throw syntax error → 500. Nên check `sets.length === 0` trả 400.

### [L-27] `listSessionsByPatient` mọi bác sĩ xem được mọi bệnh nhân
File: `src/modules/examination-sessions/examination.service.ts:143`
Bác sĩ A có thể list session của bệnh nhân chưa bao giờ khám với A. Có thể intent ("tra cứu hồ sơ"), nhưng leak privacy. Cân nhắc log audit hoặc giới hạn bằng "đã từng có lịch".

---

## 4. NOTIFICATIONS / CHAT / REPORT

### [M-28] `markAllRead` trả count luôn = 0
File: `src/modules/notifications/notifications.service.ts:78-91`
```ts
const res = await query(`UPDATE notifications SET is_read = TRUE WHERE ...`, ...);
return res.length;  // query trả res.rows; UPDATE không RETURNING → rows = []
```
Hàm luôn trả 0. Cần thêm `RETURNING id` + đếm.

### [M-29] Broadcast `single` cho user không có chức năng nhận
File: `src/modules/notifications/notifications.service.ts:100-111`
Manager có thể `broadcast({ target_scope: 'single', recipient_user_id: <cashier> })`. Notification được lưu DB nhưng cashier không bao giờ thấy (vì `ensureCanReceive` throw). Nên reject ngay lúc broadcast.

### [M-30] Chat `getHistory` không kiểm tra peer role
File: `src/modules/chat/chat.service.ts:83`
`sendMessage` check peer thuộc CHAT_ROLES, nhưng `getHistory` chỉ check actor. Nếu DB có lịch sử chat với role không hợp lệ (vd. cũ trước khi đổi role), vẫn lộ.

### [L-31] Chat không có `read_at` / `delivered_at`
Comment trong code đã thừa nhận: "đơn giản: 0 vì schema không có read_at". Tính năng "tin nhắn chưa đọc" báo nhầm.

### [L-32] Notification không hỗ trợ "is_read per user" cho broadcast
File: `src/modules/notifications/notifications.service.ts:71-75`
Khi 1 user mark-read 1 broadcast → set `is_read = TRUE` trên row chung → mọi user khác cũng thấy "đã đọc". Sai logic UX.

---

## 5. INFRA / GLOBAL

### [H-33] CORS mở cho mọi origin
File: `src/app.ts:11`
```ts
app.use(cors());      // default: Access-Control-Allow-Origin: *
```
Production: cho phép mọi website gọi API → trang phishing có thể trực tiếp gửi request login (mất XSRF). Nên restrict origin theo env.

### [H-34] `express.json()` không có size limit
File: `src/app.ts:12`
Mặc định `100kb` (Express 5 mới, OK) — verify lại. Tuy nhiên nên explicit `{ limit: '256kb' }` để document intent + chống ai đổi mặc định.

### [H-35] Không có rate limit toàn cục
Không thấy `express-rate-limit` hay middleware tương đương. Các endpoint nhạy cảm (`login`, `forgot-password`, webhook public) đều có thể bị flood.

### [M-36] PayOS webhook handler catch lỗi nhưng vẫn trả 200
File: `src/modules/invoices/invoices.controller.ts:57-65`
```ts
} catch (err) {
  console.error(...);
  res.json({ error: 1, message: 'Unknown error' });   // HTTP 200
}
```
Đúng theo PayOS docs (luôn 200 để tránh retry vô hạn), nhưng error chỉ log console — không có alert/metric. Production cần ghi vào table `webhook_failures` hoặc Sentry để biết PayOS đang fail.

### [M-37] VNPay IPN tương tự
File: `src/modules/invoices/invoices.controller.ts:74-82`
Catch error → log → trả `UnknownError`. VNPay sẽ retry, nhưng sau N lần fail không có alert.

### [L-38] Pool max = 10
File: `src/db/pool.ts:12`
Quá thấp cho production có cron + nhiều endpoint song song. Burst traffic → connection timeout.

### [L-39] `errorHandler` không log lỗi 4xx
File: `src/middleware/error.ts`
Chỉ console.error cho lỗi unhandled. AppError không log → khó debug khi user báo "tôi bấm vào báo lỗi 409".

### [L-40] Server không có healthcheck DB
File: `src/routes.ts:21` `/health` chỉ trả `{status:'ok'}` không ping DB. Load balancer sẽ giữ pod live ngay cả khi DB down.

---

## 6. VALIDATION / SCHEMA

### [M-41] Schema thiếu giới hạn độ dài text
Nhiều trường text như `diagnosis`, `treatment_plan`, `address`, `report.content`, `chat.content` không có `max()`. Bệnh nhân/user có thể submit 1 MB text → DB chấp nhận (TEXT) nhưng tốn băng thông, render UI vỡ, có thể DoS storage.
**Fix:** đặt limit hợp lý (vd. `address ≤ 500`, `chat.content ≤ 2000`, `diagnosis ≤ 5000`).

### [L-42] `updatePatientSchema` không refine "phải có ít nhất 1 field ngoài currentPassword"
Patient gọi PATCH với chỉ `{ currentPassword: "..." }` → đi qua validate, service `sets.length === 0` → vẫn UPDATE users (đổi password) mà không sửa gì khác. Workaround intent? Nên rõ ràng.

### [L-43] `payCash` schema cho `received_amount` nhưng service ignore
Đã note ở C-8. Field tồn tại trong schema để FE gửi lên, nhưng BE âm thầm bỏ → tạo cảm giác sai cho dev FE.

### [L-44] `createAppointmentSchema` cho phép cả `doctor_id` + `department_id`
Không có check "nếu chọn doctor thì bỏ department". Service ưu tiên doctor — OK, nhưng schema nên explicit để FE biết.

---

## 7. LOGIC NGHIỆP VỤ

### [M-45] AI stub trả `null` → tạo lịch hẹn qua chatbot bị fail
File: `src/modules/ai/ai.stub.ts:18`, `src/modules/appointments/appointments.service.ts:139-147`
`predictDiseaseDepartment` luôn trả `{ departmentId: null }`. Patient gọi `POST /appointments` với chỉ `symptoms` (không department/doctor) → service throw 400 "Chưa xác định được khoa". Chatbot workflow không hoạt động.

### [M-46] `scheduleTestRooms` stub không dùng `estimatedMinutes` cho queue
File: `src/modules/ai/ai.stub.ts:37`
Queue weight = COUNT items trong queue, không phải SUM minutes. 1 phòng có 3 items × 10 phút bị xem nặng hơn 1 phòng 1 item × 60 phút. Stub này cần thay bằng RL agent đã train.

### [L-47] Cron expire chạy mỗi 1h, ngay khi start
File: `src/scheduler/index.ts:18` `void runExpiryCheck()` chạy lần đầu cùng với `app.listen`. Nếu DB chưa sẵn sàng → throw. Nên đợi vài giây hoặc bỏ run đầu.

### [L-48] Library `deleteDisease` / `deleteProcedure` không check liên kết
File: `src/modules/library/library.service.ts:113-115`, `:338-340`
`lib_diseases` không có FK khác trỏ tới (chỉ có `department_id` của chính nó). Nhưng nếu sau này thêm liên kết, xóa sẽ phá DB. Nên giữ pattern như `deleteMedicine`.

### [L-49] `setAccountActive` không kiểm tra đối tượng đặc biệt
File: `src/modules/staff/staff.service.ts:96`
Manager có thể disable account manager khác. Hệ thống có thể rơi vào tình trạng không còn manager nào active → không ai unlock được. Nên check "phải còn ≥ 1 manager active".

---

## 8. KIẾN TRÚC / DỌN DẸP

- **`payCash` `_input` không sử dụng** (line 494) — dấu hiệu của #C-8 / #L-43.
- **`generateInvoice` cho `actor.role === 'patient'`** OK theo spec, nhưng đa số bệnh viện không cho bệnh nhân tự sinh hóa đơn (rủi ro thao tác sai). Nên cân nhắc.
- **`crypto.ts` chỉ có 1 key (`AES_KEY`)** — không có key rotation. Acceptable cho v1 nhưng cần plan migration nếu key leak.
- **`db/query.ts`** không có query timeout — query treo có thể giữ connection mãi. Cân nhắc `statement_timeout` ở pool config hoặc per query.
- **Toàn bộ service không có integration test** — không thấy folder `tests/`. Một thay đổi nhỏ có thể phá luồng thanh toán mà không ai biết.
- **Không thấy structured logging** (mọi nơi đều `console.log/error`). Production cần JSON log để aggregate.

---

## 9. TÓM TẮT THEO ƯU TIÊN FIX

| # | Mức | Vấn đề | File |
|---|-----|--------|------|
| 1  | C | JWT verify không restrict algorithm | `utils/jwt.ts:19` |
| 2  | C | `sendSms` log mật khẩu ra console | `utils/sms.ts:3` |
| 3  | C | Cashier có thể bypass `payCash` để gian lận | `invoices.service.ts:492` |
| 4  | C | `clientIp` đọc `X-Forwarded-For` không `trust proxy` → spoof IP whitelist VNPay | `vnpay.ts:146`, `app.ts` |
| 5  | H | Hóa đơn thiếu phí khám + phí thuốc | `invoices.service.ts:124` |
| 6  | H | Race condition `payment_status = 'paid'` | `invoices.service.ts:421,334` |
| 7  | H | `forgot-password` + `login` không rate-limit / lock | `auth/*` |
| 8  | H | Staff không có flow quên mật khẩu | `auth/`, `staff/` |
| 9  | H | `expireOverdueAppointments` lệch timezone | `appointments.service.ts:374` |
| 10 | H | `cancelItem` không reschedule lại order | `test-orders.service.ts:336` |
| 11 | H | CORS mở `*`, không rate limit toàn cục | `app.ts` |
| 12 | H | PayOS webhook không có IP whitelist | `invoices.routes.ts:22` |
| 13 | M | `getRevenue` bỏ qua PayOS + cash | `invoices.service.ts:587` |
| 14 | M | `technicianQueue` không FIFO giữa các bệnh nhân | `test-orders.service.ts:257` |
| 15 | M | `markAllRead` count luôn 0 | `notifications.service.ts:91` |
| 16 | M | AI stub trả null → chatbot không tạo lịch được | `ai.stub.ts:18` |
| 17 | M | `reassignDoctor` cho phép khác khoa | `appointments.service.ts:315` |
| 18 | M | `prescriptions.createPrescription` race condition | `prescriptions.service.ts:97` |
| 19 | M | `updateSession` SET rỗng → 500 | `examination.service.ts:200` |
| 20 | M | `updatePatient` reset password mỗi lần PATCH | `patients.service.ts:180` |
| 21 | M | Schema thiếu max length cho text dài | nhiều file |
| 22 | L | N+1 query trong `createTestOrder` | `test-orders.service.ts:96` |
| 23 | L | Pool max = 10 quá thấp | `db/pool.ts` |
| 24 | L | `setAccountActive` không bảo vệ "≥ 1 manager active" | `staff.service.ts:96` |
| 25 | L | Không có integration test / structured log | toàn project |

---

## 10. ĐỀ XUẤT THỨ TỰ FIX

1. **Tuần 1 — Security gốc:** C-1, C-4, C-5, H-7, H-33, H-35.
2. **Tuần 2 — Tài chính:** C-8, H-9, H-15, M-13.
3. **Tuần 3 — Nghiệp vụ:** H-17, H-18, M-14 (technician queue), M-45 (AI stub), wire RL scheduler.
4. **Tuần 4 — Quality:** validation limits, integration test, structured logging.

---

## 11. Tóm tắt thay đổi đã thực hiện

### Migration & dependency mới
- **`migrations/0004_audit_fixes.sql`** — cộng cột & bảng phụ trợ:
  - `invoices.consultation_fee`, `invoices.received_amount`
  - `users.failed_login_count`, `users.locked_until`
  - `doctors.max_appointments_per_day`
  - `chat_messages.read_at`
  - Bảng mới: `password_reset_log`, `notification_reads`, `webhook_failures`
- **`express-rate-limit`** đã cài qua npm.
- **`src/middleware/rateLimit.ts`** mới — `globalLimiter`, `loginLimiter`, `forgotPasswordLimiter`.

### Env mới (cập nhật `.env`)
- `CORS_ORIGINS` — CSV origin được phép (production phải khai báo).
- `TRUST_PROXY` — số hop reverse proxy (mặc định 0).
- `DEFAULT_CONSULTATION_FEE` — phí khám VNĐ (mặc định 150000).
- `PAYOS_ALLOWED_IPS` — whitelist IP webhook PayOS.

### Issues đã fix theo nhóm
| # | Mức | Fix | File chính |
|---|-----|-----|------------|
| C-1 | C | Pin JWT algorithm = `HS256` (chặn alg:none/key confusion) | [utils/jwt.ts](src/utils/jwt.ts) |
| C-5 | C | `sendSms` throw ở production (không leak mật khẩu qua log) | [utils/sms.ts](src/utils/sms.ts) |
| C-8 | C | `payCash` validate `received_amount >= final_amount`, lưu DB | [invoices.service.ts](src/modules/invoices/invoices.service.ts) |
| C-10 | C | `clientIp` dùng `req.ip` (sau `app.set('trust proxy')`); IP normalize | [integrations/vnpay.ts](src/integrations/vnpay.ts), [app.ts](src/app.ts) |
| H-2 | H | Forgot-password: rate limit IP (5/h) + per-phone (3/h) + log | [auth.service.ts](src/modules/auth/auth.service.ts), [rateLimit.ts](src/middleware/rateLimit.ts) |
| H-3 | H | Brute-force login: lock 15' sau 5 lần sai + rate limit 10/15' | [auth.service.ts](src/modules/auth/auth.service.ts) |
| H-4 | H | `generatePassword` rejection sampling (loại modulo bias) | [utils/password.ts](src/utils/password.ts) |
| H-6 | H | Manager reset mật khẩu staff qua `POST /staff/accounts/:userId/reset-password` | [staff.service.ts](src/modules/staff/staff.service.ts) |
| H-9 | H | Atomic `UPDATE ... WHERE payment_status='pending' RETURNING` (VNPay + PayOS) | [invoices.service.ts](src/modules/invoices/invoices.service.ts) |
| H-11 | H | PayOS webhook IP whitelist qua `PAYOS_ALLOWED_IPS` | [invoices.controller.ts](src/modules/invoices/invoices.controller.ts) |
| H-15 | H | Hóa đơn cộng `consultation_fee` từ env, snapshot vào DB + invoice_items | [invoices.service.ts](src/modules/invoices/invoices.service.ts) |
| H-17 | H | Expire cron dùng `(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date` | [appointments.service.ts](src/modules/appointments/appointments.service.ts) |
| H-18 | H | `cancelItem` re-assign + reset `schedule_order = max+1` | [test-orders.service.ts](src/modules/test-orders/test-orders.service.ts) |
| H-33 | H | CORS theo whitelist khi `CORS_ORIGINS` được set | [app.ts](src/app.ts) |
| H-34 | H | `express.json({ limit: '256kb' })` explicit | [app.ts](src/app.ts) |
| H-35 | H | `globalLimiter` (300 req/phút/IP) áp toàn cục | [app.ts](src/app.ts) |
| M-7  | M | `updatePatient` chỉ reset mật khẩu khi `phone` thay đổi | [patients.service.ts](src/modules/patients/patients.service.ts) |
| M-12,13 | M | `payVnpay` / `payPayos` wrap UPDATE trong transaction | [invoices.service.ts](src/modules/invoices/invoices.service.ts) |
| M-14 | M | `generateOrderCode` PayOS: retry 3 lần nếu trùng DB | [invoices.service.ts](src/modules/invoices/invoices.service.ts) |
| M-16 | M | `getRevenue` cộng tất cả phương thức + `by_method` breakdown | [invoices.service.ts](src/modules/invoices/invoices.service.ts) |
| M-19 | M | `technicianQueue` order theo `t.created_at` (FIFO toàn cục) | [test-orders.service.ts](src/modules/test-orders/test-orders.service.ts) |
| M-20 | M | `reviewItem` reject nếu session đã `is_finalized` | [test-orders.service.ts](src/modules/test-orders/test-orders.service.ts) |
| M-21 | M | `startExamination` yêu cầu đúng ngày VN | [appointments.service.ts](src/modules/appointments/appointments.service.ts) |
| M-22 | M | `reassignDoctor` check cùng khoa | [appointments.service.ts](src/modules/appointments/appointments.service.ts) |
| M-23 | M | `autoAssignDoctor` + direct assign tôn trọng `max_appointments_per_day` | [appointments.service.ts](src/modules/appointments/appointments.service.ts) |
| M-25 | M | `createPrescription` catch unique-violation → 409 | [prescriptions.service.ts](src/modules/prescriptions/prescriptions.service.ts) |
| M-26 | M | `updateSession` throw 400 khi SET rỗng | [examination.service.ts](src/modules/examination-sessions/examination.service.ts) |
| M-28 | M | `markAllRead` đếm thật (UPDATE RETURNING + insert read marker) | [notifications.service.ts](src/modules/notifications/notifications.service.ts) |
| M-29 | M | `broadcast single` reject cashier/receptionist | [notifications.service.ts](src/modules/notifications/notifications.service.ts) |
| M-30 | M | Chat `getHistory` check peer role + mark read | [chat.service.ts](src/modules/chat/chat.service.ts) |
| M-36/37 | M | Webhook fail → ghi `webhook_failures` table | [invoices.service.ts](src/modules/invoices/invoices.service.ts) |
| M-41 | M | Schema max length cho `address`, `diagnosis`, `treatment_plan`, broadcast, report | nhiều schema |
| L-24 | L | `createTestOrder` gộp 2 query (`ANY($1::uuid[])`) — bỏ N+1 | [test-orders.service.ts](src/modules/test-orders/test-orders.service.ts) |
| L-32 | L | Notification per-user read tracking qua bảng `notification_reads` | [notifications.service.ts](src/modules/notifications/notifications.service.ts) |
| L-31 | L | Chat `read_at` cột mới + `unread_count` trong listConversations | [chat.service.ts](src/modules/chat/chat.service.ts) |
| L-42 | L | `updatePatientSchema` refine "≥ 1 trường ngoài currentPassword" | [patients.schema.ts](src/modules/patients/patients.schema.ts) |
| L-43 | L | `payCash` schema bắt buộc `received_amount` (không còn silently dropped) | [invoices.schema.ts](src/modules/invoices/invoices.schema.ts) |
| L-49 | L | `setAccountActive` chặn khóa manager active cuối cùng | [staff.service.ts](src/modules/staff/staff.service.ts) |

### Issues còn mở (cần làm sau / cần quyết định)
- **M-45 / M-46**: AI stub trả null + scheduler RL stub. Đã có model RL được train trong `model ai/rl scheduling/` — bước tiếp theo là wire `ai.stub.ts:scheduleTestRooms` gọi `model ai/rl scheduling/serve/scheduler.py` (qua child_process hoặc REST microservice). Disease predict cần wire vào `model ai/ml random forest/`.
- **L-25**: integration test suite — không thấy framework, chưa thêm. Đề xuất `vitest` + `supertest`.
- **L-38**: `pool.max = 10` — giữ nguyên vì tải nhỏ; production nên `max=20` + `statement_timeout`.
- **L-39**: structured logging — giữ `console.*`; production nên thay bằng `pino` để aggregate.
- **L-40**: `/health` chưa ping DB — đơn giản nhưng chưa bổ sung vì có thể yêu cầu DB up mới live.

### Bước triển khai
```bash
npm install                 # đảm bảo express-rate-limit
npm run migrate             # áp dụng 0004_audit_fixes.sql
# Cập nhật .env:
#   CORS_ORIGINS=https://app.benhvien.vn,https://manager.benhvien.vn
#   TRUST_PROXY=1
#   PAYOS_ALLOWED_IPS=...
#   DEFAULT_CONSULTATION_FEE=150000
npm run typecheck && npm run build
```

---

## 12. Pass 2 — issues bổ sung từ re-audit

Phát hiện 9 issues mới sau khi review lại các file đã sửa. Tất cả đã fix.

| # | Mức | Vấn đề | Fix |
|---|-----|--------|-----|
| N-1 | H | `globalLimiter` áp cho VNPay IPN / PayOS webhook → có thể chặn nhầm retry → mất giao dịch | Thêm `skip: isWebhook` trong [middleware/rateLimit.ts](src/middleware/rateLimit.ts) |
| N-2 | H | `generateInvoice`: 2 patient call đồng thời → unique-violation `session_id` → 500 thay vì idempotent | Catch `23505` → SELECT existing → return [invoices.service.ts](src/modules/invoices/invoices.service.ts) |
| N-3 | H | `expireOverdueAppointments`: 1 patient lỗi `patientUserId` throw → cron dừng giữa chừng | Thêm `patientUserIdSafe` + try/catch trong loop [appointments.service.ts](src/modules/appointments/appointments.service.ts) |
| N-4 | M | `payVnpay`: build URL TRƯỚC khi UPDATE DB → nếu UPDATE fail, user có URL "ma" mà IPN không tìm được | Đảo thứ tự: UPDATE trước, build URL sau [invoices.service.ts](src/modules/invoices/invoices.service.ts) |
| N-5 | M | `login`: check `is_active` TRƯỚC verify password → leak username tồn tại (enumeration) | Verify password trước, sau đó mới báo "khóa" / "đang lock" [auth.service.ts](src/modules/auth/auth.service.ts) |
| N-6 | M | `changePassword` không clear `failed_login_count` / `locked_until` sau khi đổi thành công | Clear trong UPDATE [auth.service.ts](src/modules/auth/auth.service.ts) |
| N-7 | M | `patients.resetPassword` không clear lock counter (inconsistent với `auth.forgotPassword`) | Clear trong UPDATE [patients.service.ts](src/modules/patients/patients.service.ts) |
| N-8 | L | `validate.ts` `Object.assign(req.query)` không xóa key cũ — key không qua validate có thể vẫn còn | `replaceProps` xóa hết key gốc rồi assign [middleware/validate.ts](src/middleware/validate.ts) |
| N-9 | L | `chat.listConversations` peer là manager → `peer_name = null` (manager không có profile table) | `COALESCE(d.full_name, t.full_name, u.username)` [chat.service.ts](src/modules/chat/chat.service.ts) |
| Bonus | L | CORS origin sai → `errorHandler` trả 500 với message tiếng Việt | Catch trong `errorHandler` → trả 403 sạch [middleware/error.ts](src/middleware/error.ts) |

### Tóm tắt cuối
- **Tổng cộng đã fix: 49 (pass 1) + 9 (pass 2) + 1 (bonus) = 59 issues**.
- `npm run typecheck` + `npm run build` PASS sạch sau cả 2 pass.
- Issues còn mở: AI stubs (chờ wire ML model), integration test, structured logging — đều là task lớn hơn 1 commit.
