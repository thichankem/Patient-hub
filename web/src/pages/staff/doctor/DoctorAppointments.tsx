import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../../lib/api';
import { formatDate } from '../../../lib/format';

interface Appointment {
  id: string;
  patient_id: string;
  patient_name?: string;
  doctor_id: string;
  doctor_name?: string;
  appointment_date: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'done' | 'cancelled' | 'expired';
  created_by_role: 'patient' | 'receptionist' | 'manager';
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Chờ xác nhận', cls: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Đã xác nhận', cls: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'Đang khám', cls: 'bg-emerald-100 text-emerald-800' },
  done: { label: 'Hoàn thành', cls: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Đã hủy', cls: 'bg-red-100 text-red-700' },
  expired: { label: 'Quá hẹn', cls: 'bg-gray-100 text-gray-500' },
};

export default function DoctorAppointments() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.get<{ data: Appointment[] }>('/appointments');
      setItems(res.data.data ?? []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function startExam(id: string) {
    setStarting(id);
    try {
      await api.post(`/appointments/${id}/start`);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setStarting(null);
    }
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Lịch khám hôm nay</h1>
      {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded mb-3">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Bệnh nhân</th>
              <th className="px-4 py-3 text-left">Ngày khám</th>
              <th className="px-4 py-3 text-left">Nguồn đặt</th>
              <th className="px-4 py-3 text-left">Trạng thái</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Đang tải...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Không có lịch khám.</td></tr>
            ) : items.map((a) => {
              const st = STATUS_MAP[a.status] ?? { label: a.status, cls: 'bg-gray-100 text-gray-600' };
              return (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{a.patient_name ?? a.patient_id}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(a.appointment_date)}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{a.created_by_role}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(a.status === 'confirmed' || a.status === 'pending') && (
                      <button
                        onClick={() => startExam(a.id)}
                        disabled={starting === a.id}
                        className="px-3 py-1 text-xs font-medium bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50"
                      >
                        {starting === a.id ? 'Đang xử lý...' : 'Bắt đầu khám'}
                      </button>
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
