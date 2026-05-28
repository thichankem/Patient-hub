import { FormEvent, useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../../lib/api';
import { formatDateTime } from '../../../lib/format';

interface TestOrderItem {
  id: string;
  test_order_id: string;
  test_type_id: string;
  test_type_name: string;
  lab_room_id: string | null;
  lab_room_name: string | null;
  status: 'not_started' | 'waiting' | 'processing' | 'completed' | 'unavailable' | 'cancelled';
  result_data: unknown;
  result_reviewed_by_doctor: boolean;
}

interface TestOrder {
  id: string;
  session_id: string;
  patient_id: string;
  patient_name?: string;
  note: string | null;
  created_at: string;
  items: TestOrderItem[];
}

interface TestType {
  id: string;
  name: string;
  estimated_minutes: number;
}

interface Session {
  id: string;
  patient_name?: string;
  appointment_date?: string;
  is_finalized: boolean;
}

const ITEM_STATUS: Record<string, { label: string; cls: string }> = {
  not_started: { label: 'Chưa bắt đầu', cls: 'bg-yellow-100 text-yellow-800' },
  waiting: { label: 'Chờ lấy mẫu', cls: 'bg-blue-100 text-blue-800' },
  processing: { label: 'Đang XN', cls: 'bg-violet-100 text-violet-800' },
  completed: { label: 'Có kết quả', cls: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Đã hủy', cls: 'bg-red-100 text-red-700' },
  unavailable: { label: 'Chưa có phòng', cls: 'bg-gray-100 text-gray-600' },
};

function orderStatusBadge(o: TestOrder) {
  const total = o.items.length;
  const done = o.items.filter((i) => i.status === 'completed').length;
  if (total > 0 && done === total) return { label: 'Hoàn thành', cls: 'bg-emerald-100 text-emerald-800' };
  if (done > 0) return { label: `Đang xử lý (${done}/${total})`, cls: 'bg-blue-100 text-blue-800' };
  return { label: 'Đang xử lý', cls: 'bg-yellow-100 text-yellow-800' };
}

export default function DoctorTestOrders() {
  const [items, setItems] = useState<TestOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail] = useState<TestOrder | null>(null);

  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [note, setNote] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await api.get<{ data: TestOrder[] }>('/test-orders/doctor/mine');
      setItems(res.data.data ?? []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function openCreate() {
    setShowCreate(true);
    try {
      const [tts, sess] = await Promise.all([
        api.get<{ data: TestType[] }>('/library/test-types'),
        api.get<{ data: Session[] }>('/examination-sessions/doctor/mine'),
      ]);
      setTestTypes(tts.data.data ?? []);
      setSessions(sess.data.data ?? []);
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const test_type_ids = selectedTypes.filter((id) => id);
    if (test_type_ids.length === 0) {
      alert('Cần chọn ít nhất 1 loại xét nghiệm');
      return;
    }
    setSaving(true);
    try {
      await api.post('/test-orders', {
        session_id: sessionId,
        note: note || null,
        test_type_ids,
      });
      setShowCreate(false);
      setSessionId('');
      setNote('');
      setSelectedTypes(['']);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function reviewItem(itemId: string, orderId: string) {
    try {
      await api.patch(`/test-orders/items/${itemId}/review`);
      const res = await api.get<{ data: TestOrder }>(`/test-orders/${orderId}`);
      setDetail(res.data.data);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Yêu cầu xét nghiệm</h1>
        <button onClick={openCreate} className="px-3 py-1.5 text-sm bg-brand-600 text-white rounded hover:bg-brand-700">
          + Tạo yêu cầu XN
        </button>
      </div>
      {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded mb-3">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Mã</th>
              <th className="px-4 py-3 text-left">Bệnh nhân</th>
              <th className="px-4 py-3 text-left">Số XN</th>
              <th className="px-4 py-3 text-left">Trạng thái</th>
              <th className="px-4 py-3 text-left">Ngày tạo</th>
              <th className="px-4 py-3 text-right">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Đang tải...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Chưa có yêu cầu XN.</td></tr>
            ) : items.map((o) => {
              const st = orderStatusBadge(o);
              return (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{o.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-gray-900">{o.patient_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{o.items.length}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(o.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setDetail(o)} className="text-brand-600 hover:underline text-xs">Xem</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Tạo yêu cầu xét nghiệm</h2>
            <form onSubmit={submit} className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Đợt khám</span>
                <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} required
                  className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm">
                  <option value="">— Chọn đợt khám —</option>
                  {sessions.filter((s) => !s.is_finalized).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.patient_name ?? s.id.slice(0, 8)} · {s.appointment_date ?? ''}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Loại xét nghiệm</div>
                {selectedTypes.map((id, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <select value={id} required
                      onChange={(e) => { const c = [...selectedTypes]; c[i] = e.target.value; setSelectedTypes(c); }}
                      className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm">
                      <option value="">— Chọn loại XN —</option>
                      {testTypes.map((tt) => (
                        <option key={tt.id} value={tt.id}>{tt.name} ({tt.estimated_minutes} phút)</option>
                      ))}
                    </select>
                    {selectedTypes.length > 1 && (
                      <button type="button" onClick={() => setSelectedTypes(selectedTypes.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700 text-sm px-2">X</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setSelectedTypes([...selectedTypes, ''])} className="text-sm text-brand-600 hover:underline">+ Thêm XN</button>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">Ghi chú</span>
                <textarea value={note} onChange={(e) => setNote(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm" rows={2} />
              </label>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Hủy</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50">
                  {saving ? 'Đang tạo...' : 'Tạo yêu cầu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Chi tiết yêu cầu XN</h2>
            <div className="text-xs text-gray-500 mb-3">Mã: {detail.id}</div>
            {detail.items.length > 0 ? (
              <div className="space-y-2">
                {detail.items.map((it) => {
                  const s = ITEM_STATUS[it.status] ?? { label: it.status, cls: 'bg-gray-100 text-gray-600' };
                  return (
                    <div key={it.id} className="border border-gray-200 rounded p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 text-sm">{it.test_type_name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.cls}`}>{s.label}</span>
                      </div>
                      {it.lab_room_name && (
                        <div className="text-xs text-gray-500 mt-0.5">Phòng: {it.lab_room_name}</div>
                      )}
                      {it.status === 'completed' && it.result_data != null && (
                        <pre className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded whitespace-pre-wrap">{JSON.stringify(it.result_data, null, 2)}</pre>
                      )}
                      {it.status === 'completed' && !it.result_reviewed_by_doctor && (
                        <button onClick={() => reviewItem(it.id, detail.id)} className="mt-1 text-xs text-brand-600 hover:underline">Xác nhận đã xem</button>
                      )}
                      {it.result_reviewed_by_doctor && (
                        <span className="mt-1 inline-block text-xs text-emerald-600">✓ Đã xem</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-sm text-gray-400">Không có chi tiết.</p>}
            {detail.note && <p className="text-sm text-gray-600 mt-3">Ghi chú: {detail.note}</p>}
            <div className="flex justify-end mt-4">
              <button onClick={() => setDetail(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
