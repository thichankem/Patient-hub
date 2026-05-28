import { FormEvent, useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../../lib/api';

interface LabRoom {
  id: string;
  name: string;
  description?: string;
}

export default function ManagerLabRooms() {
  const [items, setItems] = useState<LabRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LabRoom | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await api.get('/lab-rooms');
      setItems(res.data.rooms ?? res.data.data ?? []);
    } catch (err) { setError(apiErrorMessage(err)); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm({ name: '', description: '' }); setShowForm(true); }
  function openEdit(r: LabRoom) { setEditing(r); setForm({ name: r.name, description: r.description ?? '' }); setShowForm(true); }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) { await api.patch(`/lab-rooms/${editing.id}`, form); }
      else { await api.post('/lab-rooms', form); }
      setShowForm(false);
      await load();
    } catch (err) { alert(apiErrorMessage(err)); } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm('Xóa phòng xét nghiệm này?')) return;
    try { await api.delete(`/lab-rooms/${id}`); await load(); } catch (err) { alert(apiErrorMessage(err)); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Phòng xét nghiệm</h1>
        <button onClick={openCreate} className="px-3 py-1.5 text-sm bg-brand-600 text-white rounded hover:bg-brand-700">+ Thêm phòng</button>
      </div>
      {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded mb-3">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Tên phòng</th>
              <th className="px-4 py-3 text-left">Mô tả</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">Đang tải...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">Chưa có phòng nào.</td></tr>
            ) : items.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                <td className="px-4 py-3 text-gray-600">{r.description ?? '—'}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => openEdit(r)} className="text-xs text-brand-600 hover:underline">Sửa</button>
                  <button onClick={() => remove(r.id)} className="text-xs text-red-600 hover:underline">Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-gray-900 mb-4">{editing ? 'Sửa phòng' : 'Thêm phòng mới'}</h2>
            <form onSubmit={submit} className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Tên phòng</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                  className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Mô tả</span>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm" rows={3} />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Hủy</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50">
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
