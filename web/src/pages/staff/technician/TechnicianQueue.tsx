import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../../lib/api';
import { formatDateTime } from '../../../lib/format';

interface TestItem {
  id: string;
  test_type_name: string;
  patient_name?: string;
  order_id: string;
  status: string;
  result?: string;
  notes?: string;
  created_at: string;
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  waiting: 'bg-blue-100 text-blue-800',
  processing: 'bg-violet-100 text-violet-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ',
  waiting: 'Chờ lấy mẫu',
  processing: 'Đang XN',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

export default function TechnicianQueue() {
  const [items, setItems] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.get('/test-orders/technician/queue');
      setItems(res.data.items ?? res.data.data ?? []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, []);

  async function updateStatus(itemId: string, status: string, result?: string) {
    setUpdating(itemId);
    try {
      await api.patch(`/test-orders/items/${itemId}/status`, { status, result });
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setUpdating(null);
    }
  }

  async function handleComplete(itemId: string) {
    const result = prompt('Nhập kết quả xét nghiệm:');
    if (result === null) return;
    await updateStatus(itemId, 'completed', result);
  }

  async function handleCancel(itemId: string) {
    if (!confirm('Hủy xét nghiệm này?')) return;
    try {
      await api.post(`/test-orders/items/${itemId}/cancel`);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  const pending = items.filter((i) => i.status !== 'completed' && i.status !== 'cancelled');
  const done = items.filter((i) => i.status === 'completed' || i.status === 'cancelled');

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Hàng chờ xét nghiệm</h1>
      {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded mb-3">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700">Đang chờ xử lý ({pending.length})</span>
        </div>
        <table className="w-full text-sm">
          <thead className="text-gray-600 text-xs uppercase border-b">
            <tr>
              <th className="px-4 py-2 text-left">Xét nghiệm</th>
              <th className="px-4 py-2 text-left">Bệnh nhân</th>
              <th className="px-4 py-2 text-left">Trạng thái</th>
              <th className="px-4 py-2 text-left">Thời gian</th>
              <th className="px-4 py-2 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Đang tải...</td></tr>
            ) : pending.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Không có xét nghiệm chờ xử lý.</td></tr>
            ) : pending.map((it) => (
              <tr key={it.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{it.test_type_name}</td>
                <td className="px-4 py-3 text-gray-600">{it.patient_name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[it.status] ?? ''}`}>
                    {STATUS_LABEL[it.status] ?? it.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(it.created_at)}</td>
                <td className="px-4 py-3 text-right space-x-1">
                  {it.status === 'pending' && (
                    <button
                      onClick={() => updateStatus(it.id, 'waiting')}
                      disabled={updating === it.id}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >Nhận mẫu</button>
                  )}
                  {it.status === 'waiting' && (
                    <button
                      onClick={() => updateStatus(it.id, 'processing')}
                      disabled={updating === it.id}
                      className="px-2 py-1 text-xs bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50"
                    >Bắt đầu XN</button>
                  )}
                  {it.status === 'processing' && (
                    <button
                      onClick={() => handleComplete(it.id)}
                      disabled={updating === it.id}
                      className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                    >Nhập kết quả</button>
                  )}
                  <button
                    onClick={() => handleCancel(it.id)}
                    className="px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50"
                  >Hủy</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {done.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-700">Đã xử lý ({done.length})</span>
          </div>
          <table className="w-full text-sm">
            <thead className="text-gray-600 text-xs uppercase border-b">
              <tr>
                <th className="px-4 py-2 text-left">Xét nghiệm</th>
                <th className="px-4 py-2 text-left">Bệnh nhân</th>
                <th className="px-4 py-2 text-left">Kết quả</th>
                <th className="px-4 py-2 text-left">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {done.map((it) => (
                <tr key={it.id} className="text-gray-500">
                  <td className="px-4 py-2">{it.test_type_name}</td>
                  <td className="px-4 py-2">{it.patient_name ?? '—'}</td>
                  <td className="px-4 py-2">{it.result ?? '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[it.status] ?? ''}`}>
                      {STATUS_LABEL[it.status] ?? it.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
