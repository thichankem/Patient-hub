import { FormEvent, useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import { formatDateTime } from '../../lib/format';
import { StatusBadge } from '../../components/StatusBadge';

interface Report {
  id: string;
  content: string;
  status: 'pending' | 'resolved';
  created_at: string;
  resolved_at: string | null;
}

export default function ReportsPage() {
  const [items, setItems] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.get<{ reports?: Report[]; data?: Report[] }>('/reports');
      setItems(res.data.reports ?? res.data.data ?? []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/reports', { content: content.trim() });
      setContent('');
      setSuccess('Đã gửi báo cáo. Quản lý sẽ phản hồi sau khi xử lý.');
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-slate-900">Báo cáo lỗi hệ thống</h1>
        <p className="text-sm text-slate-500">
          Gặp lỗi khi sử dụng hệ thống? Hãy gửi báo cáo để chúng tôi xử lý nhanh nhất.
        </p>
      </div>

      <form onSubmit={submit} className="card p-5 mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Nội dung báo cáo
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="input min-h-[140px]"
          placeholder="Mô tả chi tiết lỗi bạn đang gặp phải..."
          required
        />

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 mt-3">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-3 py-2 mt-3">
            {success}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button type="submit" className="btn-primary" disabled={sending || !content.trim()}>
            <Icon.Send size={16} />
            {sending ? 'Đang gửi...' : 'Gửi báo cáo'}
          </button>
        </div>
      </form>

      <h2 className="text-sm font-medium text-slate-700 uppercase mb-2">Lịch sử báo cáo</h2>
      {loading ? (
        <div className="card p-4 animate-pulse">
          <div className="h-3 bg-slate-200 rounded w-1/3" />
        </div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-500">Chưa có báo cáo nào.</div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {items.map((r) => (
            <div key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-slate-800 whitespace-pre-line flex-1">{r.content}</p>
                <StatusBadge tone={r.status === 'resolved' ? 'green' : 'amber'}>
                  {r.status === 'resolved' ? 'Đã xử lý' : 'Đang xử lý'}
                </StatusBadge>
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Gửi lúc {formatDateTime(r.created_at)}
                {r.resolved_at && ` · Xử lý xong ${formatDateTime(r.resolved_at)}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
