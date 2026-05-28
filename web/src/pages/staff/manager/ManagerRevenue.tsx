import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../../lib/api';
import { formatVnd } from '../../../lib/format';

interface RevenueData {
  total_revenue?: number;
  total_invoices?: number;
  paid_invoices?: number;
  pending_invoices?: number;
  by_date?: { date: string; revenue: number; count: number }[];
  [key: string]: unknown;
}

export default function ManagerRevenue() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await api.get('/invoices/revenue', { params });
      setData(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Thống kê doanh thu</h1>

      <div className="flex items-end gap-3 mb-4">
        <label className="block">
          <span className="text-xs text-gray-500">Từ ngày</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block border border-gray-300 rounded px-3 py-1.5 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">Đến ngày</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="mt-1 block border border-gray-300 rounded px-3 py-1.5 text-sm" />
        </label>
        <button onClick={load} className="px-4 py-1.5 text-sm bg-gray-800 text-white rounded hover:bg-gray-900">Lọc</button>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded mb-3">{error}</div>}

      {loading ? (
        <div className="text-gray-400 text-sm">Đang tải...</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Tổng doanh thu" value={data.total_revenue != null ? formatVnd(data.total_revenue) : '—'} color="border-emerald-500" />
            <StatCard label="Tổng hóa đơn" value={String(data.total_invoices ?? '—')} color="border-blue-500" />
            <StatCard label="Đã thanh toán" value={String(data.paid_invoices ?? '—')} color="border-green-500" />
            <StatCard label="Chờ thanh toán" value={String(data.pending_invoices ?? '—')} color="border-amber-500" />
          </div>

          {data.by_date && data.by_date.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b text-sm font-medium text-gray-700">Chi tiết theo ngày</div>
              <table className="w-full text-sm">
                <thead className="text-gray-600 text-xs uppercase border-b">
                  <tr>
                    <th className="px-4 py-2 text-left">Ngày</th>
                    <th className="px-4 py-2 text-right">Số hóa đơn</th>
                    <th className="px-4 py-2 text-right">Doanh thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.by_date.map((d) => (
                    <tr key={d.date} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-900">{d.date}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{d.count}</td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900">{formatVnd(d.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 p-4 mt-4">
            <h2 className="text-sm font-medium text-gray-700 mb-2">Dữ liệu gốc</h2>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 rounded p-3 overflow-auto max-h-64">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`bg-white rounded-lg border-l-4 ${color} border border-gray-200 p-4`}>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
