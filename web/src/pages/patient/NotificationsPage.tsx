import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import { formatTimeAgo } from '../../lib/format';

interface Notification {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  target_scope: string | null;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ notifications?: Notification[]; data?: Notification[] }>(
        '/notifications',
      );
      setItems(res.data.notifications ?? res.data.data ?? []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id: string) {
    try {
      await api.patch(`/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function markAllRead() {
    try {
      await api.patch('/notifications/mark-all-read');
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  const visible = items.filter((n) => (filter === 'unread' ? !n.is_read : true));
  const unreadCount = items.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Thông báo</h1>
          <p className="text-sm text-slate-500">
            {unreadCount > 0
              ? `Bạn có ${unreadCount} thông báo chưa đọc.`
              : 'Tất cả thông báo đã được đọc.'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary">
            <Icon.Check size={16} /> Đánh dấu đã đọc
          </button>
        )}
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit mb-4">
        <button
          className={`px-4 py-1.5 text-sm rounded-md ${
            filter === 'all' ? 'bg-white shadow-sm font-medium' : 'text-slate-600'
          }`}
          onClick={() => setFilter('all')}
        >
          Tất cả
        </button>
        <button
          className={`px-4 py-1.5 text-sm rounded-md ${
            filter === 'unread' ? 'bg-white shadow-sm font-medium' : 'text-slate-600'
          }`}
          onClick={() => setFilter('unread')}
        >
          Chưa đọc {unreadCount > 0 && `(${unreadCount})`}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <Skeleton />
      ) : visible.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-brand-50 text-brand-600 mx-auto flex items-center justify-center">
            <Icon.Bell size={26} />
          </div>
          <h3 className="mt-3 font-medium text-slate-900">
            {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo'}
          </h3>
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {visible.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.is_read && markRead(n.id)}
              className={`w-full p-4 text-left flex items-start gap-3 hover:bg-slate-50 transition ${
                !n.is_read ? 'bg-brand-50/30' : ''
              }`}
            >
              <div
                className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                  n.is_read ? 'bg-transparent' : 'bg-brand-500'
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`font-medium ${
                      n.is_read ? 'text-slate-700' : 'text-slate-900'
                    }`}
                  >
                    {n.title}
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0">
                    {formatTimeAgo(n.created_at)}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-0.5 whitespace-pre-line">{n.body}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="card divide-y divide-slate-100">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-1/3" />
          <div className="h-3 bg-slate-100 rounded w-2/3 mt-2" />
        </div>
      ))}
    </div>
  );
}
