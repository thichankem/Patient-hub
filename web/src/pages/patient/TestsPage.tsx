import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../lib/api';
import { StatusBadge, TEST_STATUS } from '../../components/StatusBadge';
import { Icon } from '../../components/Icon';
import { formatDateTime } from '../../lib/format';

interface TestItem {
  id: string;
  test_type_name?: string;
  test_type?: { name: string; estimated_minutes?: number };
  lab_room_name?: string;
  lab_room?: { name: string };
  status: string;
  schedule_order: number;
  updated_at?: string;
  result_data?: Record<string, unknown> | null;
  session_id?: string;
}

export default function TestsPage() {
  const [items, setItems] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<TestItem | null>(null);

  async function load() {
    try {
      setError(null);
      const res = await api.get<{ data: TestItem[] }>('/test-orders/me');
      setItems(res.data.data ?? []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // Cập nhật real-time mỗi 20s.
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, []);

  const sorted = [...items].sort((a, b) => a.schedule_order - b.schedule_order);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-slate-900">Lịch xét nghiệm</h1>
        <p className="text-sm text-slate-500">
          Hãy đến các phòng xét nghiệm theo đúng thứ tự bên dưới để tiết kiệm thời gian chờ.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <SkeletonList />
      ) : sorted.length === 0 ? (
        <EmptyState />
      ) : (
        <ol className="space-y-3">
          {sorted.map((it, idx) => {
            const meta = TEST_STATUS[it.status] ?? { label: it.status, tone: 'gray' as const };
            const name = it.test_type?.name ?? it.test_type_name ?? 'Xét nghiệm';
            const room = it.lab_room?.name ?? it.lab_room_name ?? '—';
            const isLast = idx === sorted.length - 1;
            return (
              <li key={it.id} className="relative">
                {!isLast && (
                  <div className="absolute left-5 top-12 bottom-[-12px] w-px bg-slate-200" />
                )}
                <button
                  onClick={() => setActive(it)}
                  className="card w-full p-4 flex items-start gap-4 text-left hover:border-brand-300"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      it.status === 'completed'
                        ? 'bg-emerald-500 text-white'
                        : it.status === 'processing'
                          ? 'bg-violet-500 text-white'
                          : it.status === 'waiting'
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {it.status === 'completed' ? <Icon.Check size={18} /> : it.schedule_order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="font-semibold text-slate-900">{name}</div>
                        <div className="text-sm text-slate-500 mt-0.5">
                          Phòng: <span className="text-slate-700">{room}</span>
                          {it.test_type?.estimated_minutes && (
                            <span className="ml-2 text-slate-400">
                              · ~{it.test_type.estimated_minutes} phút
                            </span>
                          )}
                        </div>
                      </div>
                      <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {active && <ResultModal item={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function ResultModal({ item, onClose }: { item: TestItem; onClose: () => void }) {
  const meta = TEST_STATUS[item.status] ?? { label: item.status, tone: 'gray' as const };
  const name = item.test_type?.name ?? item.test_type_name ?? 'Xét nghiệm';
  return (
    <div
      className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">{name}</h3>
            <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <Icon.X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <Row label="Phòng">{item.lab_room?.name ?? item.lab_room_name ?? '—'}</Row>
          <Row label="Cập nhật">{formatDateTime(item.updated_at)}</Row>
          {item.status === 'completed' && item.result_data ? (
            <div>
              <div className="text-slate-500 text-xs uppercase mb-2">Kết quả</div>
              <pre className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs whitespace-pre-wrap break-words">
                {JSON.stringify(item.result_data, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">
              Chưa có kết quả. Vui lòng làm theo thứ tự hệ thống xếp.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-24 text-slate-500 text-xs uppercase">{label}</div>
      <div className="flex-1 text-slate-800">{children}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card p-10 text-center">
      <div className="w-14 h-14 rounded-full bg-brand-50 text-brand-600 mx-auto flex items-center justify-center">
        <Icon.Beaker size={26} />
      </div>
      <h3 className="mt-3 font-medium text-slate-900">Chưa có lịch xét nghiệm</h3>
      <p className="text-sm text-slate-500 mt-1">
        Bác sĩ sẽ tạo yêu cầu sau khi khám cho bạn.
      </p>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
