import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../../lib/api';
import { formatDate } from '../../../lib/format';

interface Appointment {
  id: string;
  patient_name?: string;
  doctor_name?: string;
  department_name?: string;
  scheduled_date: string;
  scheduled_time?: string;
  status: string;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Chờ', cls: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Xác nhận', cls: 'bg-blue-100 text-blue-800' },
  booked: { label: 'Đã đặt', cls: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'Đang khám', cls: 'bg-emerald-100 text-emerald-800' },
  done: { label: 'Xong', cls: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Hủy', cls: 'bg-red-100 text-red-700' },
};

export default function ManagerAppointments() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.get('/appointments');
      setItems(res.data.appointments ?? res.data.data ?? []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function reassign(id: string) {
    const doctorId = prompt('Nhập mã bác sĩ mới (doctor_id):');
    if (!doctorId) return;
    try {
      await api.patch(`/appointments/${id}/reassign`, { doctor_id: doctorId });
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  async function cancel(id: string) {
    if (!confirm('Hủy lịch hẹn này?')) return;
    try {
      await api.post(`/appointments/${id}/cancel`);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Quản lý lịch hẹn</h1>
      {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded mb-3">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Bệnh nhân</th>
              <th className="px-4 py-3 text-left">Bác sĩ</th>
              <th className="px-4 py-3 text-left">Khoa</th>
              <th className="px-4 py-3 text-left">Ngày</th>
              <th className="px-4 py-3 text-left">Trạng thái</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Đang tải...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Không có lịch hẹn.</td></tr>
            ) : items.map((a) => {
              const st = STATUS_MAP[a.status] ?? { label: a.status, cls: 'bg-gray-100 text-gray-600' };
              return (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{a.patient_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{a.doctor_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{a.department_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(a.scheduled_date)}{a.scheduled_time ? ` · ${a.scheduled_time}` : ''}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${st.cls}`}>{st.label}</span></td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {a.status !== 'done' && a.status !== 'cancelled' && (
                      <>
                        <button onClick={() => reassign(a.id)} className="text-xs text-brand-600 hover:underline">Đổi BS</button>
                        <button onClick={() => cancel(a.id)} className="text-xs text-red-600 hover:underline">Hủy</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
