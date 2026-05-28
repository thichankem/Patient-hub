import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiErrorMessage } from '../lib/api';

const roleHome: Record<string, string> = {
  patient: '/patient',
  doctor: '/staff/doctor/appointments',
  technician: '/staff/technician/queue',
  manager: '/staff/manager/dashboard',
  receptionist: '/staff/receptionist/patients',
  cashier: '/staff/cashier/invoices',
};

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const user = await login(username.trim(), password);
      const fromState = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(fromState ?? roleHome[user.role] ?? '/', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="PatientHub" className="h-16 w-auto" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">PatientHub</h1>
          <p className="mt-1 text-sm text-slate-500">
            Hệ thống quản lý bệnh viện
          </p>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Đăng nhập</h2>
          <p className="text-sm text-slate-500 mb-6">
            Sử dụng tài khoản được cấp bởi bệnh viện
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Tên đăng nhập / Số điện thoại
              </label>
              <input
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-20"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-brand-600 hover:text-brand-700 px-2 py-1"
                >
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>

            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-brand-600 hover:text-brand-700"
              >
                Quên mật khẩu?
              </Link>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Chưa có tài khoản? Vui lòng đến quầy tiếp tân để đăng ký.
        </p>
      </div>
    </div>
  );
}
