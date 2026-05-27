import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../../lib/api';
import { formatDateTime } from '../../../lib/format';

interface Session {
  id: string;
  patient_id: string;
  patient_name?: string;
  appointment_id: string;
  diagnosis?: string;
  treatment_plan?: string;
  notes?: string;
  status: string;
  created_at: string;
}

export default function DoctorExaminations() {
  const [items, setItems] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Session | null>(null);
  const [form, setForm] = useState({ diagnosis: '', treatment_plan: '', notes: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await api.get('/examination-sessions', { params: { role: 'doctor' } });
      setItems(res.data.sessions ?? res.data.data ?? []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openEdit(s: Session) {
    setSelected(s);
    setForm({ diagnosis: s.diagnosis ?? '', treatment_plan: s.treatment_plan ?? '', notes: s.notes ?? '' });
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    try {
      await api.patch(`/examination-sessions/${selected.id}`, form);
      setSelected(null);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function finalize(id: string) {
    if (!confirm('Kết thúc đợt khám? Sau khi kết thúc sẽ không thể chỉnh sửa.')) return;
    try {
      await api.post(`/examination-sessions/${id}/finalize`);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  const STATUS_LABEL: Record<string, string> = {
    active: 'Đang khám',
    finalized: 'Đã kết thúc',
  };

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Đợt khám</h1>
      {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded mb-3">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Bệnh nhân</th>
              <th className="px-4 py-3 text-left">Chẩn đoán</th>
              <th className="px-4 py-3 text-left">Trạng thái</th>
              <th className="px-4 py-3 text-left">Ngày tạo</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Đang tải...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Chưa có đợt khám nào.</td></tr>
            ) : items.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{s.patient_name ?? s.patient_id}</td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{s.diagnosis || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    s.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(s.created_at)}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  {s.status === 'active' && (
                    <>
                      <button onClick={() => openEdit(s)} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Sửa</button>
                      <button onClick={() => finalize(s.id)} className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700">Kết thúc</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Cập nhật đợt khám</h2>
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Chẩn đoán</span>
                <textarea
                  value={form.diagnosis}
                  onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                  rows={3}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Phương pháp điều trị</span>
                <textarea
                  value={form.treatment_plan}
                  onChange={(e) => setForm({ ...form, treatment_plan: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                  rows={3}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Ghi chú</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                  rows={2}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Hủy</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50">
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
