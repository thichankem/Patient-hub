import { FormEvent, useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../../lib/api';
import { formatDate } from '../../../lib/format';

interface Patient {
  id: string;
  full_name: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  blood_type?: string;
  insurance_number?: string;
  priority_type?: string;
}

export default function ReceptionistPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    username: '', password: '', full_name: '', phone: '',
    date_of_birth: '', gender: 'male', blood_type: '',
    insurance_number: '', priority_type: 'normal',
  });

  async function load(q?: string) {
    setLoading(true);
    try {
      const res = await api.get('/patients', { params: q ? { search: q } : undefined });
      setPatients(res.data.patients ?? res.data.data ?? []);
    } catch (err) { setError(apiErrorMessage(err)); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ username: '', password: '', full_name: '', phone: '', date_of_birth: '', gender: 'male', blood_type: '', insurance_number: '', priority_type: 'normal' });
    setShowCreate(true);
  }

  function openEdit(p: Patient) {
    setEditing(p);
    setForm({
      username: '', password: '',
      full_name: p.full_name, phone: p.phone ?? '',
      date_of_birth: p.date_of_birth?.slice(0, 10) ?? '', gender: p.gender ?? 'male',
      blood_type: p.blood_type ?? '', insurance_number: p.insurance_number ?? '',
      priority_type: p.priority_type ?? 'normal',
    });
    setShowCreate(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (editing) {
        const { username: _u, password: _p, ...body } = form;
        await api.patch(`/patients/${editing.id}`, body);
        setSuccess('Cập nhật thành công.');
      } else {
        await api.post('/patients', form);
        setSuccess('Đăng ký bệnh nhân thành công.');
      }
      setShowCreate(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function resetPw(id: string) {
    const pw = prompt('Nhập mật khẩu mới cho bệnh nhân:');
    if (!pw) return;
    try {
      await api.post(`/patients/${id}/reset-password`, { new_password: pw });
      alert('Đã đặt lại mật khẩu.');
    } catch (err) { alert(apiErrorMessage(err)); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Quản lý bệnh nhân</h1>
        <button onClick={openCreate} className="px-3 py-1.5 text-sm bg-brand-600 text-white rounded hover:bg-brand-700">+ Đăng ký BN mới</button>
      </div>

      <div className="flex gap-2 mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(search)}
          placeholder="Tìm theo tên, SĐT..." className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
        <button onClick={() => load(search)} className="px-4 py-2 text-sm bg-gray-800 text-white rounded hover:bg-gray-900">Tìm</button>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded mb-3">{error}</div>}
      {success && <div className="bg-emerald-50 text-emerald-700 text-sm px-3 py-2 rounded mb-3">{success}</div>}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Họ tên</th>
              <th className="px-4 py-3 text-left">SĐT</th>
              <th className="px-4 py-3 text-left">Ngày sinh</th>
              <th className="px-4 py-3 text-left">BHYT</th>
              <th className="px-4 py-3 text-left">Ưu tiên</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Đang tải...</td></tr>
            ) : patients.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Không tìm thấy bệnh nhân.</td></tr>
            ) : patients.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{p.full_name}</td>
                <td className="px-4 py-3 text-gray-600">{p.phone ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{p.date_of_birth ? formatDate(p.date_of_birth) : '—'}</td>
                <td className="px-4 py-3 text-gray-600 text-xs font-mono">{p.insurance_number ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.priority_type === 'priority' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                    {p.priority_type === 'priority' ? 'Ưu tiên' : 'Thường'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => openEdit(p)} className="text-xs text-brand-600 hover:underline">Sửa</button>
                  <button onClick={() => resetPw(p.id)} className="text-xs text-gray-600 hover:underline">Reset MK</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-gray-900 mb-4">{editing ? 'Chỉnh sửa bệnh nhân' : 'Đăng ký bệnh nhân mới'}</h2>
            <form onSubmit={submit} className="space-y-3">
              {!editing && (
                <>
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
                </>
              )}
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Họ tên</span>
                <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required
                  className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">SĐT</span>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Ngày sinh</span>
                  <input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Giới tính</span>
                  <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm">
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Nhóm máu</span>
                  <input value={form.blood_type} onChange={(e) => setForm({ ...form, blood_type: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="A/B/O/AB" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Ưu tiên</span>
                  <select value={form.priority_type} onChange={(e) => setForm({ ...form, priority_type: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm">
                    <option value="normal">Thường</option>
                    <option value="priority">Ưu tiên</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Số BHYT</span>
                <input value={form.insurance_number} onChange={(e) => setForm({ ...form, insurance_number: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Hủy</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50">
                  {saving ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Đăng ký'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
