import { FormEvent, useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../../lib/api';
import { formatDateTime } from '../../../lib/format';

interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medicine_id: string;
  medicine_name: string;
  quantity: number;
  usage_instruction: string | null;
}

interface Prescription {
  id: string;
  session_id: string;
  general_note: string | null;
  created_at: string;
  patient_id?: string;
  patient_name?: string;
  item_count?: number;
}

interface PrescriptionDetail extends Prescription {
  items: PrescriptionItem[];
}

interface Medicine {
  id: string;
  name: string;
  price: number;
}

interface Session {
  id: string;
  patient_name?: string;
  appointment_date?: string;
  is_finalized: boolean;
}

interface DraftItem {
  medicine_id: string;
  quantity: number;
  usage_instruction: string;
}

export default function DoctorPrescriptions() {
  const [items, setItems] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail] = useState<PrescriptionDetail | null>(null);

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [generalNote, setGeneralNote] = useState('');
  const [medItems, setMedItems] = useState<DraftItem[]>([
    { medicine_id: '', quantity: 1, usage_instruction: '' },
  ]);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await api.get<{ data: Prescription[] }>('/prescriptions/doctor/mine');
      setItems(res.data.data ?? []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function openCreate() {
    setShowCreate(true);
    try {
      const [meds, sess] = await Promise.all([
        api.get<{ data: Medicine[] }>('/library/medicines'),
        api.get<{ data: Session[] }>('/examination-sessions/doctor/mine'),
      ]);
      setMedicines(meds.data.data ?? []);
      setSessions(sess.data.data ?? []);
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  function addMedItem() {
    setMedItems([...medItems, { medicine_id: '', quantity: 1, usage_instruction: '' }]);
  }

  function updateMedItem<K extends keyof DraftItem>(i: number, field: K, value: DraftItem[K]) {
    const copy = [...medItems];
    copy[i] = { ...copy[i]!, [field]: value };
    setMedItems(copy);
  }

  function removeMedItem(i: number) {
    setMedItems(medItems.filter((_, idx) => idx !== i));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/prescriptions', {
        session_id: sessionId,
        general_note: generalNote || null,
        items: medItems.map((m) => ({
          medicine_id: m.medicine_id,
          quantity: m.quantity,
          usage_instruction: m.usage_instruction || null,
        })),
      });
      setShowCreate(false);
      setSessionId('');
      setGeneralNote('');
      setMedItems([{ medicine_id: '', quantity: 1, usage_instruction: '' }]);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function viewDetail(id: string) {
    try {
      const res = await api.get<{ data: PrescriptionDetail }>(`/prescriptions/${id}`);
      setDetail(res.data.data);
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Đơn thuốc</h1>
        <button onClick={openCreate} className="px-3 py-1.5 text-sm bg-brand-600 text-white rounded hover:bg-brand-700">
          + Tạo đơn thuốc
        </button>
      </div>
      {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded mb-3">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Mã đơn</th>
              <th className="px-4 py-3 text-left">Bệnh nhân</th>
              <th className="px-4 py-3 text-left">Số loại thuốc</th>
              <th className="px-4 py-3 text-left">Ngày tạo</th>
              <th className="px-4 py-3 text-right">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Đang tải...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Chưa có đơn thuốc nào.</td></tr>
            ) : items.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-gray-900">{p.patient_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{p.item_count ?? 0} loại</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(p.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => viewDetail(p.id)} className="text-brand-600 hover:underline text-xs">Xem</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Tạo đơn thuốc mới</h2>
            <form onSubmit={submit} className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Đợt khám</span>
                <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} required
                  className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm">
                  <option value="">— Chọn đợt khám đang diễn ra —</option>
                  {sessions.filter((s) => !s.is_finalized).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.patient_name ?? s.id.slice(0, 8)} · {s.appointment_date ?? ''}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Danh sách thuốc</div>
                {medItems.map((m, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-end">
                    <div className="col-span-5">
                      <select value={m.medicine_id} required
                        onChange={(e) => updateMedItem(i, 'medicine_id', e.target.value)}
                        className="block w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                        <option value="">— Chọn thuốc —</option>
                        {medicines.map((med) => (
                          <option key={med.id} value={med.id}>{med.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input type="number" min={1} placeholder="SL" value={m.quantity}
                        onChange={(e) => updateMedItem(i, 'quantity', Number(e.target.value))}
                        className="block w-full border border-gray-300 rounded px-2 py-1.5 text-sm" required />
                    </div>
                    <div className="col-span-4">
                      <input placeholder="Cách dùng (vd: 1 viên × 3 lần/ngày)" value={m.usage_instruction}
                        onChange={(e) => updateMedItem(i, 'usage_instruction', e.target.value)}
                        className="block w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div className="col-span-1">
                      {medItems.length > 1 && (
                        <button type="button" onClick={() => removeMedItem(i)} className="text-red-500 hover:text-red-700 text-sm">X</button>
                      )}
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addMedItem} className="text-sm text-brand-600 hover:underline">+ Thêm thuốc</button>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">Ghi chú chung</span>
                <textarea value={generalNote} onChange={(e) => setGeneralNote(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-sm" rows={2} />
              </label>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Hủy</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50">
                  {saving ? 'Đang lưu...' : 'Tạo đơn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Chi tiết đơn thuốc</h2>
            <div className="text-xs text-gray-500 mb-3">Mã: {detail.id}</div>
            {detail.items.length > 0 ? (
              <table className="w-full text-sm mb-3">
                <thead className="text-xs text-gray-500 border-b">
                  <tr>
                    <th className="text-left py-1">Thuốc</th>
                    <th className="text-left py-1">Cách dùng</th>
                    <th className="text-right py-1">SL</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map((m) => (
                    <tr key={m.id} className="border-b border-gray-50">
                      <td className="py-1.5">{m.medicine_name}</td>
                      <td className="py-1.5 text-gray-600">{m.usage_instruction ?? '—'}</td>
                      <td className="py-1.5 text-right">{m.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-sm text-gray-400 mb-3">Không có chi tiết thuốc.</p>}
            {detail.general_note && <p className="text-sm text-gray-600">Ghi chú: {detail.general_note}</p>}
            <div className="flex justify-end mt-4">
              <button onClick={() => setDetail(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
