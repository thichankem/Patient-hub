import { FormEvent, useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../../lib/api';

interface StaffAccount {
  id: string;
  username: string;
  role: string;
  is_active: boolean;
  full_name?: string;
  department_name?: string;
}

type Tab = 'accounts' | 'create';

export default function ManagerStaff() {
  const [tab, setTab] = useState<Tab>('accounts');
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [createRole, setCreateRole] = useState('doctor');
  const [form, setForm] = useState({ username: '', password: '', full_name: '', department_id: '', lab_room_id: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadAccounts() {
    try {
      const res = await api.get('/staff/accounts');
      setAccounts(res.data.accounts ?? res.data.data ?? []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAccounts(); }, []);

  async function toggleActive(id: string, active: boolean) {
    try {
      await api.patch(`/staff/accounts/${id}`, { is_active: !active });
      await loadAccounts();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  async function resetPassword(id: string) {
    const newPw = prompt('Nhập mật khẩu mới:');
    if (!newPw) return;
    try {
      await api.post(`/staff/accounts/${id}/reset-password`, { new_password: newPw });
      alert('Đã đặt lại mật khẩu.');
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const endpoint = createRole === 'doctor' ? '/staff/doctors'
        : createRole === 'technician' ? '/staff/technicians'
        : createRole === 'cashier' ? '/staff/cashiers'
        : '/staff/receptionists';
      const body: Record<string, string> = { username: form.username, password: form.password, full_name: form.full_name };
      if (createRole === 'doctor' && form.department_id) body.department_id = form.department_id;
      if (createRole === 'technician' && form.lab_room_id) body.lab_room_id = form.lab_room_id;
      await api.post(endpoint, body);
      setSuccess(`Tạo tài khoản ${createRole} thành công.`);
      setForm({ username: '', password: '', full_name: '', department_id: '', lab_room_id: '' });
      await loadAccounts();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const ROLE_LABEL: Record<string, string> = {
    doctor: 'Bác sĩ', technician: 'KTV', manager: 'Quản lý', receptionist: 'Tiếp tân', cashier: 'Thu ngân', patient: 'Bệnh nhân',
  };

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Quản lý nhân sự</h1>

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        <button onClick={() => setTab('accounts')} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'accounts' ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Danh sách tài khoản
        </button>
        <button onClick={() => setTab('create')} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'create' ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Tạo tài khoản
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded mb-3">{error}</div>}
      {success && <div className="bg-emerald-50 text-emerald-700 text-sm px-3 py-2 rounded mb-3">{success}</div>}

      {tab === 'accounts' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Username</th>
                <th className="px-4 py-3 text-left">Họ tên</th>
                <th className="px-4 py-3 text-left">Vai trò</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Đang tải...</td></tr>
              ) : accounts.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Không có tài khoản.</td></tr>
              ) : accounts.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{a.username}</td>
                  <td className="px-4 py-3 text-gray-900">{a.full_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {ROLE_LABEL[a.role] ?? a.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${a.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {a.is_active ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => toggleActive(a.id, a.is_active)} className="text-xs text-gray-600 hover:underline">
                      {a.is_active ? 'Khóa' : 'Kích hoạt'}
                    </button>
                    <button onClick={() => resetPassword(a.id)} className="text-xs text-brand-600 hover:underline">Reset MK</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'create' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-lg">
          <form onSubmit={handleCreate} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Vai trò</span>
              <select value={createRole} onChange={(e) => setCreateRole(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm">
                <option value="doctor">Bác sĩ</option>
                <option value="technician">Kỹ thuật viên</option>
                <option value="receptionist">Tiếp tân</option>
                <option value="cashier">Thu ngân</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Username</span>
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required
                className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Mật khẩu</span>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required
                className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Họ tên</span>
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required
                className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </label>
            {createRole === 'doctor' && (
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Mã khoa (department_id)</span>
                <input value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </label>
            )}
            {createRole === 'technician' && (
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Mã phòng XN (lab_room_id)</span>
                <input value={form.lab_room_id} onChange={(e) => setForm({ ...form, lab_room_id: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </label>
            )}
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50">
              {saving ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
