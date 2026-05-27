import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import { formatDate, formatDateTime } from '../../lib/format';

interface Session {
  id: string;
  doctor_name?: string;
  doctor?: { full_name: string };
  diagnosis: string | null;
  treatment_plan: string | null;
  is_finalized: boolean;
  created_at: string;
  finalized_at: string | null;
}

interface HistoryItem {
  session_id: string;
  diagnosis: string;
  finalized_at: string;
  doctor_name?: string;
}

interface SessionDetail extends Session {
  test_orders?: Array<{
    id: string;
    note?: string | null;
    items: Array<{
      id: string;
      test_type?: { name: string };
      test_type_name?: string;
      status: string;
      result_data?: Record<string, unknown> | null;
    }>;
  }>;
  prescription?: {
    id: string;
    general_note?: string | null;
    items: Array<{
      medicine_name?: string;
      medicine?: { name: string };
      quantity: number;
      usage_instruction: string;
    }>;
  } | null;
}

type Tab = 'sessions' | 'history';

export default function MedicalRecordPage() {
  const [tab, setTab] = useState<Tab>('sessions');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [s, h] = await Promise.all([
        api.get<{ data: Session[] } | { sessions: Session[] }>('/examination-sessions/me'),
        api
          .get<{ data: HistoryItem[] }>('/examination-sessions/me/medical-history')
          .catch(() => ({ data: { data: [] } })),
      ]);
      const list =
        (s.data as { sessions?: Session[]; data?: Session[] }).sessions ??
        (s.data as { data?: Session[] }).data ??
        [];
      setSessions(list);
      setHistory(h.data.data ?? []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-slate-900">Hồ sơ bệnh án</h1>
        <p className="text-sm text-slate-500">
          Toàn bộ lịch sử khám, chẩn đoán, đơn thuốc và kết quả xét nghiệm của bạn.
        </p>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit mb-4">
        <button
          className={`px-4 py-1.5 text-sm rounded-md ${
            tab === 'sessions' ? 'bg-white shadow-sm font-medium' : 'text-slate-600'
          }`}
          onClick={() => setTab('sessions')}
        >
          Các đợt khám
        </button>
        <button
          className={`px-4 py-1.5 text-sm rounded-md ${
            tab === 'history' ? 'bg-white shadow-sm font-medium' : 'text-slate-600'
          }`}
          onClick={() => setTab('history')}
        >
          Tiền sử bệnh
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <Skeleton />
      ) : tab === 'sessions' ? (
        sessions.length === 0 ? (
          <EmptyState label="Chưa có đợt khám nào." icon={<Icon.FileText size={26} />} />
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <SessionCard key={s.id} session={s} onOpen={() => setActive(s.id)} />
            ))}
          </div>
        )
      ) : history.length === 0 ? (
        <EmptyState label="Chưa có tiền sử bệnh." icon={<Icon.FileText size={26} />} />
      ) : (
        <div className="card divide-y divide-slate-100">
          {history.map((h) => (
            <div key={h.session_id} className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Icon.AlertCircle size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900">{h.diagnosis}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Chẩn đoán bởi BS. {h.doctor_name ?? '—'} · {formatDate(h.finalized_at)}
                </div>
              </div>
              <button
                className="text-sm text-brand-600 hover:underline"
                onClick={() => {
                  setTab('sessions');
                  setActive(h.session_id);
                }}
              >
                Xem đợt khám →
              </button>
            </div>
          ))}
        </div>
      )}

      {active && <SessionDetailModal id={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function SessionCard({
  session,
  onOpen,
}: {
  session: Session;
  onOpen: () => void;
}) {
  const doctor = session.doctor?.full_name ?? session.doctor_name ?? '—';
  return (
    <button
      onClick={onOpen}
      className="card w-full p-4 flex items-start gap-4 text-left hover:border-brand-300"
    >
      <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
        <Icon.FileText size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-slate-900">
            Đợt khám {formatDate(session.finalized_at ?? session.created_at)}
          </div>
          {!session.is_finalized && (
            <span className="badge bg-amber-100 text-amber-800">Chưa hoàn tất</span>
          )}
        </div>
        <div className="text-sm text-slate-600 mt-1">
          BS. {doctor}
          {session.diagnosis && (
            <span className="text-slate-400"> · {session.diagnosis}</span>
          )}
        </div>
      </div>
      <Icon.FileText className="text-slate-300" />
    </button>
  );
}

function SessionDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .get<{ session?: SessionDetail; data?: SessionDetail } & SessionDetail>(
        `/examination-sessions/${id}`,
      )
      .then((res) => {
        if (!alive) return;
        const d = (res.data as { session?: SessionDetail; data?: SessionDetail }).session ??
          (res.data as { data?: SessionDetail }).data ??
          (res.data as SessionDetail);
        setDetail(d);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex items-start justify-between sticky top-0 bg-white">
          <div>
            <h3 className="font-semibold text-slate-900">Chi tiết đợt khám</h3>
            {detail && (
              <p className="text-xs text-slate-500 mt-0.5">
                {formatDateTime(detail.finalized_at ?? detail.created_at)} · BS.{' '}
                {detail.doctor?.full_name ?? detail.doctor_name ?? '—'}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <Icon.X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="p-5 text-sm text-slate-500">Đang tải...</div>
        ) : error ? (
          <div className="p-5 text-sm text-red-600">{error}</div>
        ) : detail ? (
          <div className="p-5 space-y-5">
            <Section title="Chẩn đoán">
              <p className="whitespace-pre-line text-sm text-slate-800">
                {detail.diagnosis ?? <span className="text-slate-400">Chưa có</span>}
              </p>
            </Section>
            <Section title="Kế hoạch điều trị">
              <p className="whitespace-pre-line text-sm text-slate-800">
                {detail.treatment_plan ?? <span className="text-slate-400">Chưa có</span>}
              </p>
            </Section>
            {detail.test_orders && detail.test_orders.length > 0 && (
              <Section title="Kết quả xét nghiệm">
                <div className="space-y-2">
                  {detail.test_orders.flatMap((to) =>
                    to.items.map((it) => (
                      <div
                        key={it.id}
                        className="bg-slate-50 rounded-lg p-3 border border-slate-100"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm text-slate-900">
                            {it.test_type?.name ?? it.test_type_name}
                          </div>
                          <span className="text-xs text-slate-500">{it.status}</span>
                        </div>
                        {it.result_data && (
                          <pre className="mt-2 text-xs text-slate-700 whitespace-pre-wrap">
                            {JSON.stringify(it.result_data, null, 2)}
                          </pre>
                        )}
                      </div>
                    )),
                  )}
                </div>
              </Section>
            )}
            {detail.prescription && (
              <Section title="Đơn thuốc">
                <div className="space-y-2">
                  {detail.prescription.items.map((it, i) => (
                    <div
                      key={i}
                      className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-sm"
                    >
                      <div className="font-medium text-slate-900">
                        {it.medicine?.name ?? it.medicine_name}{' '}
                        <span className="text-slate-500">× {it.quantity}</span>
                      </div>
                      <div className="text-slate-600 mt-1">{it.usage_instruction}</div>
                    </div>
                  ))}
                  {detail.prescription.general_note && (
                    <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <strong>Lưu ý chung:</strong> {detail.prescription.general_note}
                    </div>
                  )}
                </div>
              </Section>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs uppercase text-slate-500 font-semibold mb-2">{title}</h4>
      {children}
    </div>
  );
}

function EmptyState({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="card p-10 text-center">
      <div className="w-14 h-14 rounded-full bg-brand-50 text-brand-600 mx-auto flex items-center justify-center">
        {icon}
      </div>
      <h3 className="mt-3 font-medium text-slate-900">{label}</h3>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-1/3" />
          <div className="h-3 bg-slate-100 rounded w-1/2 mt-2" />
        </div>
      ))}
    </div>
  );
}
