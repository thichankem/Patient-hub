type Tone = 'gray' | 'blue' | 'amber' | 'green' | 'red' | 'violet';

const styles: Record<Tone, string> = {
  gray: 'bg-slate-100 text-slate-700',
  blue: 'bg-blue-100 text-blue-700',
  amber: 'bg-amber-100 text-amber-800',
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700',
  violet: 'bg-violet-100 text-violet-700',
};

export function StatusBadge({
  tone = 'gray',
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  return <span className={`badge ${styles[tone]}`}>{children}</span>;
}

export const APPOINTMENT_STATUS: Record<
  string,
  { label: string; tone: Tone }
> = {
  pending: { label: 'Chờ xác nhận', tone: 'amber' },
  confirmed: { label: 'Đã đặt', tone: 'blue' },
  booked: { label: 'Đã đặt', tone: 'blue' },
  in_progress: { label: 'Đang khám', tone: 'violet' },
  examining: { label: 'Đang khám', tone: 'violet' },
  done: { label: 'Đã khám', tone: 'green' },
  expired: { label: 'Hết hạn', tone: 'gray' },
  cancelled: { label: 'Đã hủy', tone: 'red' },
};

export const TEST_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: 'Chưa thực hiện', tone: 'gray' },
  waiting: { label: 'Đang chờ khám', tone: 'amber' },
  processing: { label: 'Đang xử lý', tone: 'violet' },
  completed: { label: 'Đã có kết quả', tone: 'green' },
  cancelled: { label: 'Đã hủy', tone: 'red' },
  cannot_perform: { label: 'Không thể thực hiện', tone: 'red' },
};

export const INVOICE_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: 'Chưa thanh toán', tone: 'amber' },
  paid: { label: 'Đã thanh toán', tone: 'green' },
  cancelled: { label: 'Đã hủy', tone: 'red' },
  refunded: { label: 'Đã hoàn tiền', tone: 'blue' },
};
