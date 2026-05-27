import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../../lib/api';
import { APPOINTMENT_STATUS, StatusBadge } from '../../components/StatusBadge';
import { Icon } from '../../components/Icon';
import { formatDate } from '../../lib/format';

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  doctor_name?: string;
  department_name?: string;
  doctor?: { full_name: string; department_name?: string };
}

export default function AppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ appointments: Appointment[] } | { data: Appointment[] }>(
        '/appointments',
        { params: filter === 'all' ? { all: 'true' } : {} },
      );
      const list = (res.data as { appointments?: Appointment[]; data?: Appointment[] }).appointments ??
        (res.data as { data?: Appointment[] }).data ??
        [];
      setItems(list);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filter]);

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api.post(`/appointments/${cancelTarget.id}/cancel`);
      setCancelTarget(null);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  const visible = items.filter((a) => {
    if (filter === 'all') return true;
    return ['pending', 'confirmed', 'booked', 'in_progress', 'examining'].includes(a.status);
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Lịch hẹn</h1>
          <p className="text-sm text-slate-500">
            Quản lý các lịch hẹn khám của bạn với bác sĩ.
          </p>
        </div>
        <Link to="/patient/chatbot" className="btn-primary">
          <Icon.Chat size={16} /> Đặt lịch mới
        </Link>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit mb-4">
        <button
          className={`px-4 py-1.5 text-sm rounded-md ${
            filter === 'active' ? 'bg-white shadow-sm font-medium' : 'text-slate-600'
          }`}
          onClick={() => setFilter('active')}
        >
          Đang hoạt động
        </button>
        <button
          className={`px-4 py-1.5 text-sm rounded-md ${
            filter === 'all' ? 'bg-white shadow-sm font-medium' : 'text-slate-600'
          }`}
          onClick={() => setFilter('all')}
        >
          Tất cả
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <SkeletonList />
      ) : visible.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {visible.map((a) => (
            <AppointmentCard
              key={a.id}
              item={a}
              onCancel={() => setCancelTarget(a)}
            />
          ))}
        </div>
      )}

      {cancelTarget && (
        <Modal onClose={() => setCancelTarget(null)}>
          <h3 className="text-lg font-semibold text-slate-900">Xác nhận hủy lịch?</h3>
          <p className="text-sm text-slate-600 mt-2">
            Bạn có chắc muốn hủy lịch hẹn ngày{' '}
            <strong>{formatDate(cancelTarget.appointment_date)}</strong>?
          </p>
          <div className="mt-5 flex gap-2 justify-end">
            <button className="btn-secondary" onClick={() => setCancelTarget(null)}>
              Quay lại
            </button>
            <button className="btn-danger" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Đang hủy...' : 'Hủy lịch'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AppointmentCard({
  item,
  onCancel,
}: {
  item: Appointment;
  onCancel: () => void;
}) {
  const meta = APPOINTMENT_STATUS[item.status] ?? { label: item.status, tone: 'gray' as const };
  const doctor = item.doctor?.full_name ?? item.doctor_name ?? 'Đang sắp xếp';
  const dept = item.doctor?.department_name ?? item.department_name ?? '';
  const canCancel = ['pending', 'confirmed', 'booked'].includes(item.status);

  return (
    <div className="card p-4 flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center flex-shrink-0">
        <Icon.Calendar size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-semibold text-slate-900">{formatDate(item.appointment_date)}</div>
            <div className="text-sm text-slate-600 mt-0.5">
              BS. {doctor}
              {dept && <span className="text-slate-400"> · {dept}</span>}
            </div>
          </div>
          <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
        </div>
      </div>
      {canCancel && (
        <button
          onClick={onCancel}
          className="text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-md"
        >
          Hủy
        </button>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card p-10 text-center">
      <div className="w-14 h-14 rounded-full bg-brand-50 text-brand-600 mx-auto flex items-center justify-center">
        <Icon.Calendar size={26} />
      </div>
      <h3 className="mt-3 font-medium text-slate-900">Chưa có lịch hẹn</h3>
      <p className="text-sm text-slate-500 mt-1">
        Hãy bắt đầu bằng cách chat với trợ lý để đặt lịch.
      </p>
      <Link to="/patient/chatbot" className="btn-primary mt-4 inline-flex">
        <Icon.Chat size={16} /> Đặt lịch ngay
      </Link>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-200" />
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

export function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
