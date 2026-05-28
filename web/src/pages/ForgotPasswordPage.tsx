import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../lib/api';

export default function ForgotPasswordPage() {
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await api.post<{ message: string }>('/auth/forgot-password', {
        phone: phone.trim(),
      });
      setMessage(res.data.message);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            Quên mật khẩu
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Nhập số điện thoại đã đăng ký, mật khẩu mới sẽ được gửi qua SMS.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Số điện thoại
              </label>
              <input
                type="tel"
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoFocus
                disabled={submitting}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                {error}
              </div>
            )}
            {message && (
              <div className="rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2">
                {message}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={submitting}
            >
              {submitting ? 'Đang gửi...' : 'Gửi mật khẩu mới'}
            </button>

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-brand-600 hover:text-brand-700"
              >
                ← Quay lại đăng nhập
              </Link>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Nếu đã mất số điện thoại, vui lòng đến quầy tiếp tân để được hỗ trợ.
        </p>
      </div>
    </div>
  );
}
