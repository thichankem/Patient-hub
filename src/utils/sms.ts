// Stub SMS gateway — hệ thống thật sẽ cắm nhà cung cấp SMS tại đây.
// Hiện log ra console để phục vụ dev/test (mật khẩu "gửi về SĐT bệnh nhân").
export function sendSms(phone: string, message: string): void {
  console.log(`📱 [SMS → ${phone}] ${message}`);
}
