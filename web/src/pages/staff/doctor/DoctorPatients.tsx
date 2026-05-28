import { useEffect, useState } from 'react';
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
}

interface MedicalHistoryEntry {
  session_id: string;
  diagnosis: string;
  finalized_at: string;
}

export default function DoctorPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Patient | null>(null);
  const [history, setHistory] = useState<MedicalHistoryEntry[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  async function load(q?: string) {
    setLoading(true);
    try {
      const res = await api.get<{ data: Patient[] }>('/patients', {
        params: q ? { name: q } : undefined,
      });
      setPatients(res.data.data ?? []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function doSearch() { load(search); }

  async function viewHistory(p: Patient) {
    setDetail(p);
    setHistLoading(true);
    setHistory([]);
    try {
      const res = await api.get<{ data: MedicalHistoryEntry[] }>(
        `/examination-sessions/patient/${p.id}/medical-history`,
      );
      setHistory(res.data.data ?? []);
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setHistLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Tra cứu bệnh nhân</h1>
      <div className="flex gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doSearch()}
          placeholder="Tìm theo tên, SĐT..."
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
        />
        <button onClick={doSearch} className="px-4 py-2 text-sm bg-gray-800 text-white rounded hover:bg-gray-900">Tìm</button>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded mb-3">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Họ tên</th>
              <th className="px-4 py-3 text-left">SĐT</th>
              <th className="px-4 py-3 text-left">Ngày sinh</th>
              <th className="px-4 py-3 text-left">Giới tính</th>
              <th className="px-4 py-3 text-left">Nhóm máu</th>
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
                <td className="px-4 py-3 text-gray-600">{p.gender === 'male' ? 'Nam' : p.gender === 'female' ? 'Nữ' : '—'}</td>
                <td className="px-4 py-3 text-gray-600">{p.blood_type ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => viewHistory(p)} className="text-brand-600 hover:underline text-xs">Tiền sử</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* History modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setDetail(null); setHistory([]); }}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Tiền sử bệnh án</h2>
            <p className="text-sm text-gray-500 mb-4">{detail.full_name}</p>
            {histLoading ? (
              <p className="text-sm text-gray-400">Đang tải...</p>
            ) : history.length > 0 ? (
              <div className="space-y-3">
                {history.map((s) => (
                  <div key={s.session_id} className="border border-gray-200 rounded p-3">
                    <div className="text-xs text-gray-500 mb-1">{formatDate(s.finalized_at)}</div>
                    <div className="text-sm font-medium text-gray-900">{s.diagnosis}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Chưa có lịch sử khám đã chốt.</p>
            )}
            <div className="flex justify-end mt-4">
              <button onClick={() => { setDetail(null); setHistory([]); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
