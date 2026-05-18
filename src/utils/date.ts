// Tính tuổi từ ngày sinh dạng 'YYYY-MM-DD' (DATE trả về string từ pg).
export function calcAge(dob: string): number {
  const b = new Date(`${dob}T00:00:00Z`);
  const now = new Date();
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) {
    age--;
  }
  return age;
}
