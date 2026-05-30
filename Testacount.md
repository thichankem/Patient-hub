# Tài khoản đăng nhập mẫu

> Tạo bởi `npm run seed` (hoặc `docker exec patienthub-backend node dist/scripts/seed.js`).
> **Mật khẩu của TẤT CẢ tài khoản = `admin`**

| Vai trò | Username |
|---|---|
| Quản lý (manager) | `admin` |
| Lễ tân (receptionist) | `letan1`, `letan2` |
| Thu ngân (cashier) | `thungan1`, `thungan2` |
| Bác sĩ (doctor) | `bs.nguyenvana`, `bs.tranthib`, `bs.lequangc`, `bs.phamhuyd`, `bs.hoangthie`, `bs.vuminhf`, `bs.dothig`, `bs.buihungh`, `bs.dangthii`, `bs.ngohuyk` |
| Kỹ thuật viên (technician) | `ktv1` … `ktv8` |
| Bệnh nhân (patient) | `bn.phamthid`, `bn.nguyenvane`, `bn.tranthif`, `bn.leduyg`, … (25 tài khoản, tiền tố `bn.`) |

## Đăng nhập nhanh để test

| Mục đích | Username | Mật khẩu |
|---|---|---|
| Quản lý / dashboard / danh mục | `admin` | `admin` |
| Lễ tân / tạo bệnh nhân, đặt lịch | `letan1` | `admin` |
| Bác sĩ / khám, kê đơn, chỉ định XN | `bs.nguyenvana` | `admin` |
| Kỹ thuật viên / thực hiện XN | `ktv1` | `admin` |
| Thu ngân / thu tiền hóa đơn | `thungan1` | `admin` |
| Bệnh nhân / tra cứu, chat | `bn.phamthid` | `admin` |
