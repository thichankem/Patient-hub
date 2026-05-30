# PatientHub Web

Frontend cho hệ thống quản lý bệnh viện (React + Vite + TypeScript + Tailwind).

## Cài & chạy

```bash
cd web
npm install
npm run dev    # http://localhost:5173
```

Backend phải đang chạy ở `http://localhost:3000` (proxy /api được cấu hình trong [vite.config.ts](vite.config.ts)).

## Cấu trúc

- `src/pages/public/` — trang công khai: trang chủ, giới thiệu, dịch vụ, chuyên khoa, bác sĩ, tin tức, liên hệ.
- `src/pages/patient/` — khu vực bệnh nhân (yêu cầu đăng nhập): chatbot đặt lịch, lịch hẹn, lịch xét nghiệm, hồ sơ bệnh án, hóa đơn, thông báo, báo cáo.
- `src/components/PublicHeader.tsx` — header chung (topbar + main nav ngang). Chức năng cá nhân nằm trong dropdown của avatar, **không phải sidebar**.
- `src/auth/` — JWT auth context, route guard.
- `src/lib/api.ts` — axios client với token interceptor.

## Tasks còn lại

- Doctor area: lịch khám, đợt khám, đơn thuốc, yêu cầu XN, chat.
- Technician area: hàng chờ XN của phòng, nhập kết quả, chat.
- Manager / Receptionist / Cashier area.
