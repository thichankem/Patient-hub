import { isProd } from '../config/env';

// Stub SMS gateway. Production phải wire vào nhà cung cấp thật (Twilio/eSMS/...).
// CHẶN log mật khẩu ra console ở production để tránh leak qua log file.
export function sendSms(phone: string, message: string): void {
  if (isProd) {
    // Không có gateway thật → fail loud để không bao giờ leak mật khẩu xuống log
    // mà nghĩ là đã gửi.
    throw new Error(
      'SMS gateway chưa được cấu hình ở production — không thể gửi SMS. ' +
        'Wire src/utils/sms.ts vào nhà cung cấp SMS thật.',
    );
  }
  console.log(`📱 [SMS → ${phone}] ${message}`);
}
