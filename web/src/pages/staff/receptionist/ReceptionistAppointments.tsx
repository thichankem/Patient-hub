import { FormEvent, useEffect, useState } from 'react';
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

export default function ReceptionistAppointments() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    patient_id: '', department_id: '', doctor_id: '',
    scheduled_date: '', scheduled_time: '', reason: '',
  });

  async function load() {
    try {
      const res = await api.get('/appointments');
      setItems(res.data.appointments ?? res.data.data ?? []);
    } catch (err) { setError(apiErrorMessage(err)); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/appointments', form);
      setSuccess('Đặt lịch hẹn thành công.');
      setShowCreate(false);
      setForm({ patient_id: '', department_id: '', doctor_id: '', scheduled_date: '', scheduled_time: '', reason: '' });
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Chờ', cls: 'bg-yellow-100 text-yellow-800' },
    confirmed: { label: 'Xác nhận', cls: 'bg-blue-100 text-blue-800' },
    booked: { label: 'Đã đặt', cls: 'bg-blue-100 text-blue-800' },
    in_progress: { label: 'Đang khám', cls: 'bg-emerald-100 text-emerald-800' },
    done: { label: 'Xong', cls: 'bg-gray-100 text-gray-600' },
    cancelled: { label: 'Hủy', cls: 'bg-red-100 text-red-700' },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Đặt lịch hẹn</h1>
        <button onClick={() => setShowCreate(true)} className="px-3 py-1.5 text-sm bg-brand-600 text-white rounded hover:bg-brand-700">+ Tạo lịch hẹn</button>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded mb-3">{error}</div>}
      {success && <div className="bg-emerald-50 text-emerald-700 text-sm px-3 py-2 rounded mb-3">{success}</div>}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Bệnh nhân</th>
              <th className="px-4 py-3 text-left">Bác sĩ</th>
              <th className="px-4 py-3 text-left">Khoa</th>
              <th className="px-4 py-3 text-left">Ngày</th>
              <th className="px-4 py-3 text-left">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Đang tải...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Không có lịch hẹn.</td></tr>
            ) : items.map((a) => {
              const st = STATUS_MAP[a.status] ?? { label: a.status, cls: 'bg-gray-100 text-gray-600' };
              return (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{a.patient_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{a.doctor_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{a.department_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(a.scheduled_date)}{a.scheduled_time ? ` · ${a.scheduled_time}` : ''}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${st.cls}`}>{st.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Tạo lịch hẹn mới</h2>
            <form onSubmit={submit} className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Mã bệnh nhân (patient_id)</span>
                <input value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} required
                  className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Mã khoa</span>
                  <input value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Mã bác sĩ</span>
                  <input value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Ngày khám</span>
                  <input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} required
                    className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Giờ khám</span>
                  <input type="time" value={form.scheduled_time} onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Lý do khám</span>
                <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm" rows={2} />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Hủy</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50">
                  {saving ? 'Đang tạo...' : 'Tạo lịch hẹn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
