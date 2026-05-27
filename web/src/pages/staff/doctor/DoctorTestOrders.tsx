import { FormEvent, useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../../lib/api';
import { formatDateTime } from '../../../lib/format';

interface TestOrder {
  id: string;
  session_id: string;
  patient_name?: string;
  status: string;
  items?: { id: string; test_type_name: string; status: string; result?: string }[];
  created_at: string;
}

const ITEM_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Chờ', cls: 'bg-yellow-100 text-yellow-800' },
  waiting: { label: 'Chờ lấy mẫu', cls: 'bg-blue-100 text-blue-800' },
  processing: { label: 'Đang XN', cls: 'bg-violet-100 text-violet-800' },
  completed: { label: 'Có kết quả', cls: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Đã hủy', cls: 'bg-red-100 text-red-700' },
};

export default function DoctorTestOrders() {
  const [items, setItems] = useState<TestOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail] = useState<TestOrder | null>(null);

  // Create form
  const [sessionId, setSessionId] = useState('');
  const [testItems, setTestItems] = useState([{ test_type_id: '', notes: '' }]);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await api.get('/test-orders');
      setItems(res.data.orders ?? res.data.data ?? []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/test-orders', { session_id: sessionId, items: testItems });
      setShowCreate(false);
      setSessionId('');
      setTestItems([{ test_type_id: '', notes: '' }]);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function reviewItem(itemId: string) {
    const comment = prompt('Nhận xét kết quả XN:');
    if (comment === null) return;
    try {
      await api.patch(`/test-orders/items/${itemId}/review`, { review_comment: comment });
      if (detail) {
        const res = await api.get(`/test-orders/${detail.id}`);
        setDetail(res.data.order ?? res.data);
      }
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Yêu cầu xét nghiệm</h1>
        <button onClick={() => setShowCreate(true)} className="px-3 py-1.5 text-sm bg-brand-600 text-white rounded hover:bg-brand-700">
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
            ) : items.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{o.id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-gray-900">{o.patient_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{o.items?.length ?? 0}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    o.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>{o.status === 'completed' ? 'Hoàn thành' : 'Đang xử lý'}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(o.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setDetail(o)} className="text-brand-600 hover:underline text-xs">Xem</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Tạo yêu cầu xét nghiệm</h2>
            <form onSubmit={submit} className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Mã đợt khám (session_id)</span>
                <input value={sessionId} onChange={(e) => setSessionId(e.target.value)} required
                  className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </label>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Danh sách xét nghiệm</div>
                {testItems.map((t, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-6">
                      <input placeholder="Mã loại XN (test_type_id)" value={t.test_type_id}
                        onChange={(e) => { const c = [...testItems]; c[i] = { ...c[i], test_type_id: e.target.value }; setTestItems(c); }}
                        className="block w-full border border-gray-300 rounded px-2 py-1.5 text-sm" required />
                    </div>
                    <div className="col-span-5">
                      <input placeholder="Ghi chú" value={t.notes}
                        onChange={(e) => { const c = [...testItems]; c[i] = { ...c[i], notes: e.target.value }; setTestItems(c); }}
                        className="block w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div className="col-span-1">
                      {testItems.length > 1 && (
                        <button type="button" onClick={() => setTestItems(testItems.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700 text-sm">X</button>
                      )}
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setTestItems([...testItems, { test_type_id: '', notes: '' }])} className="text-sm text-brand-600 hover:underline">+ Thêm XN</button>
              </div>
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

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Chi tiết yêu cầu XN</h2>
            {detail.items && detail.items.length > 0 ? (
              <div className="space-y-2">
                {detail.items.map((it) => {
                  const s = ITEM_STATUS[it.status] ?? { label: it.status, cls: 'bg-gray-100 text-gray-600' };
                  return (
                    <div key={it.id} className="border border-gray-200 rounded p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 text-sm">{it.test_type_name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.cls}`}>{s.label}</span>
                      </div>
                      {it.result && <div className="mt-1 text-sm text-gray-600">Kết quả: {it.result}</div>}
                      {it.status === 'completed' && (
                        <button onClick={() => reviewItem(it.id)} className="mt-1 text-xs text-brand-600 hover:underline">Nhận xét kết quả</button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-sm text-gray-400">Không có chi tiết.</p>}
            <div className="flex justify-end mt-4">
              <button onClick={() => setDetail(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
