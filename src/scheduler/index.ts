import { expireOverdueAppointments } from '../modules/appointments/appointments.service';

const ONE_HOUR_MS = 60 * 60 * 1000;

let timer: NodeJS.Timeout | null = null;

async function runExpiryCheck(): Promise<void> {
  try {
    const n = await expireOverdueAppointments();
    if (n > 0) console.log(`⏰ Đã đánh dấu ${n} lịch hẹn quá hạn`);
  } catch (err) {
    console.error('❌ Lỗi cron kiểm tra lịch hẹn quá hạn:', err);
  }
}

// Spec: hệ thống kiểm tra lịch hẹn quá hạn liên tục mỗi 1h.
export function startSchedulers(): void {
  void runExpiryCheck();
  timer = setInterval(() => void runExpiryCheck(), ONE_HOUR_MS);
}

export function stopSchedulers(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
