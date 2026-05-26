import { expireOverdueAppointments } from '../modules/appointments/appointments.service';
import { logger } from '../utils/logger';

const ONE_HOUR_MS = 60 * 60 * 1000;

let timer: NodeJS.Timeout | null = null;

async function runExpiryCheck(): Promise<void> {
  try {
    const n = await expireOverdueAppointments();
    if (n > 0) logger.info({ expired: n }, 'cron: đánh dấu lịch hẹn quá hạn');
  } catch (err) {
    logger.error({ err }, 'cron: lỗi kiểm tra lịch hẹn quá hạn');
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
