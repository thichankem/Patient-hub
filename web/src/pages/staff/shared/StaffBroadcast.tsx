import { FormEvent, useState } from 'react';
import { api, apiErrorMessage } from '../../../lib/api';

export default function StaffBroadcast() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/notifications/broadcast', { title: title.trim() || undefined, message: message.trim() });
      setSuccess('Đã gửi thông báo đến toàn bộ hệ thống.');
      setTitle('');
      setMessage('');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Gửi thông báo toàn hệ thống</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Tiêu đề (tùy chọn)</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
              placeholder="VD: Thông báo bảo trì hệ thống" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Nội dung</span>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={4}
              className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm"
              placeholder="Nội dung thông báo..." />
          </label>

          {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded">{error}</div>}
          {success && <div className="bg-emerald-50 text-emerald-700 text-sm px-3 py-2 rounded">{success}</div>}

          <button type="submit" disabled={sending || !message.trim()}
            className="px-4 py-2 text-sm bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50">
            {sending ? 'Đang gửi...' : 'Gửi thông báo'}
          </button>
        </form>
      </div>
    </div>
  );
}
