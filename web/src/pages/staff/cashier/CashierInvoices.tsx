import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../../lib/api';
import { formatDateTime, formatVnd } from '../../../lib/format';

interface Invoice {
  id: string;
  patient_name?: string;
  total_amount: number;
  insurance_discount?: number;
  final_amount: number;
  status: string;
  payment_method?: string;
  created_at: string;
  items?: { description: string; amount: number }[];
}

export default function CashierInvoices() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Invoice | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  // Generate invoice
  const [genSessionId, setGenSessionId] = useState('');
  const [generating, setGenerating] = useState(false);

  async function load() {
    try {
      const res = await api.get('/invoices');
      setItems(res.data.invoices ?? res.data.data ?? []);
    } catch (err) { setError(apiErrorMessage(err)); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function payCash(id: string) {
    if (!confirm('Xác nhận thanh toán tiền mặt?')) return;
    setPaying(id);
    try {
      await api.post(`/invoices/${id}/pay-cash`);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setPaying(null);
    }
  }

  async function generate() {
    if (!genSessionId.trim()) return;
    setGenerating(true);
    try {
      await api.post('/invoices/generate', { session_id: genSessionId.trim() });
      setGenSessionId('');
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  async function viewDetail(id: string) {
    try {
      const res = await api.get(`/invoices/${id}`);
      setDetail(res.data.invoice ?? res.data);
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Chờ TT', cls: 'bg-amber-100 text-amber-700' },
    paid: { label: 'Đã TT', cls: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: 'Hủy', cls: 'bg-red-100 text-red-700' },
  };

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Quản lý hóa đơn</h1>

      {/* Generate section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="text-sm font-medium text-gray-700 mb-2">Tạo hóa đơn từ đợt khám</div>
        <div className="flex gap-2">
          <input value={genSessionId} onChange={(e) => setGenSessionId(e.target.value)}
            placeholder="Nhập session_id..." className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
          <button onClick={generate} disabled={generating} className="px-4 py-2 text-sm bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50">
            {generating ? 'Đang tạo...' : 'Tạo hóa đơn'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded mb-3">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Mã HĐ</th>
              <th className="px-4 py-3 text-left">Bệnh nhân</th>
              <th className="px-4 py-3 text-right">Tổng</th>
              <th className="px-4 py-3 text-right">Thành tiền</th>
              <th className="px-4 py-3 text-left">Trạng thái</th>
              <th className="px-4 py-3 text-left">Ngày tạo</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Đang tải...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Không có hóa đơn.</td></tr>
            ) : items.map((inv) => {
              const st = STATUS_MAP[inv.status] ?? { label: inv.status, cls: 'bg-gray-100 text-gray-600' };
              return (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{inv.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-gray-900">{inv.patient_name ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatVnd(inv.total_amount)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{formatVnd(inv.final_amount)}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${st.cls}`}>{st.label}</span></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(inv.created_at)}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => viewDetail(inv.id)} className="text-xs text-brand-600 hover:underline">Chi tiết</button>
                    {inv.status === 'pending' && (
                      <button onClick={() => payCash(inv.id)} disabled={paying === inv.id}
                        className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50">
                        {paying === inv.id ? '...' : 'TT tiền mặt'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Chi tiết hóa đơn</h2>
            <div className="text-xs text-gray-500 mb-3">Mã: {detail.id}</div>
            {detail.items && detail.items.length > 0 && (
              <table className="w-full text-sm mb-3">
                <thead className="text-xs text-gray-500 border-b">
                  <tr><th className="text-left py-1">Mô tả</th><th className="text-right py-1">Số tiền</th></tr>
                </thead>
                <tbody>
                  {detail.items.map((it, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-1.5">{it.description}</td>
                      <td className="py-1.5 text-right">{formatVnd(it.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Tổng:</span><span>{formatVnd(detail.total_amount)}</span></div>
              {detail.insurance_discount != null && detail.insurance_discount > 0 && (
                <div className="flex justify-between"><span className="text-gray-500">BHYT giảm:</span><span className="text-emerald-600">-{formatVnd(detail.insurance_discount)}</span></div>
              )}
              <div className="flex justify-between font-medium border-t pt-1"><span>Thành tiền:</span><span>{formatVnd(detail.final_amount)}</span></div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setDetail(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
