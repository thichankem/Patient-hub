import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../../lib/api';

interface Dashboard {
  total_patients?: number;
  total_appointments?: number;
  total_appointments_today?: number;
  total_revenue?: number;
  pending_reports?: number;
  [key: string]: unknown;
}

export default function ManagerDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/manager/dashboard');
        setData(res.data);
      } catch (err) {
        setError(apiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-gray-400 text-sm p-4">Đang tải...</div>;
  if (error) return <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded">{error}</div>;

  const cards = [
    { label: 'Tổng bệnh nhân', value: data?.total_patients ?? '—', color: 'border-blue-500' },
    { label: 'Lịch hẹn hôm nay', value: data?.total_appointments_today ?? '—', color: 'border-emerald-500' },
    { label: 'Tổng lịch hẹn', value: data?.total_appointments ?? '—', color: 'border-violet-500' },
    { label: 'Báo cáo chờ xử lý', value: data?.pending_reports ?? '—', color: 'border-amber-500' },
  ];

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Tổng quan hệ thống</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className={`bg-white rounded-lg border-l-4 ${c.color} border border-gray-200 p-4`}>
            <div className="text-2xl font-bold text-gray-900">{c.value}</div>
            <div className="text-xs text-gray-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Raw data for debugging */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-medium text-gray-700 mb-2">Dữ liệu chi tiết</h2>
        <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 rounded p-3 overflow-auto max-h-96">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}
