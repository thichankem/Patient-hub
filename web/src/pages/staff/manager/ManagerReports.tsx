import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../../lib/api';
import { formatDateTime } from '../../../lib/format';

interface Report {
  id: string;
  content: string;
  status: 'pending' | 'resolved';
  created_at: string;
  resolved_at: string | null;
  user_name?: string;
}

export default function ManagerReports() {
  const [items, setItems] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.get('/reports');
      setItems(res.data.reports ?? res.data.data ?? []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function resolve(id: string) {
    try {
      await api.patch(`/reports/${id}/resolve`);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Báo cáo lỗi hệ thống</h1>
      {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded mb-3">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Người gửi</th>
              <th className="px-4 py-3 text-left">Nội dung</th>
              <th className="px-4 py-3 text-left">Trạng thái</th>
              <th className="px-4 py-3 text-left">Thời gian</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Đang tải...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Không có báo cáo.</td></tr>
            ) : items.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900">{r.user_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{r.content}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {r.status === 'resolved' ? 'Đã xử lý' : 'Chờ xử lý'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(r.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  {r.status === 'pending' && (
                    <button onClick={() => resolve(r.id)} className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700">Xử lý xong</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
