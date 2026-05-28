import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../../lib/api';
import { formatDateTime } from '../../../lib/format';

interface Notification {
  id: string;
  title?: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function StaffNotifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.get('/notifications');
      setItems(res.data.notifications ?? res.data.data ?? []);
    } catch (err) { setError(apiErrorMessage(err)); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function markRead(id: string) {
    try { await api.patch(`/notifications/${id}/read`); await load(); } catch { /* ignore */ }
  }

  async function markAllRead() {
    try { await api.patch('/notifications/mark-all-read'); await load(); } catch { /* ignore */ }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Thông báo</h1>
        <button onClick={markAllRead} className="text-xs text-brand-600 hover:underline">Đánh dấu tất cả đã đọc</button>
      </div>
      {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded mb-3">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
        {loading ? (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">Đang tải...</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">Không có thông báo.</div>
        ) : items.map((n) => (
          <div key={n.id} className={`px-4 py-3 flex items-start gap-3 hover:bg-gray-50 ${!n.is_read ? 'bg-blue-50/50' : ''}`}>
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.is_read ? 'bg-gray-300' : 'bg-brand-500'}`} />
            <div className="flex-1 min-w-0">
              {n.title && <div className="text-sm font-medium text-gray-900">{n.title}</div>}
              <div className="text-sm text-gray-600">{n.message}</div>
              <div className="text-xs text-gray-400 mt-1">{formatDateTime(n.created_at)}</div>
            </div>
            {!n.is_read && (
              <button onClick={() => markRead(n.id)} className="text-xs text-gray-400 hover:text-brand-600 flex-shrink-0">Đã đọc</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
