import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../lib/api';
import { INVOICE_STATUS, StatusBadge } from '../../components/StatusBadge';
import { Icon } from '../../components/Icon';
import { formatDateTime, formatVnd } from '../../lib/format';

interface InvoiceItem {
  service_label: string;
  unit_price: number;
  discounted_price: number;
  quantity: number;
  subtotal: number;
}

interface Invoice {
  id: string;
  session_id: string | null;
  total_amount: number;
  insurance_discount: number;
  final_amount: number;
  payment_method: string | null;
  payment_status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  created_at: string;
  paid_at: string | null;
  items?: InvoiceItem[];
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ invoices?: Invoice[]; data?: Invoice[] }>('/invoices');
      setInvoices(res.data.invoices ?? res.data.data ?? []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function payViaVnpay(id: string) {
    setPaying(id);
    try {
      const res = await api.post<{ pay_url?: string; data?: { pay_url: string } }>(
        `/invoices/${id}/pay-vnpay`,
        {},
      );
      const url = res.data.pay_url ?? res.data.data?.pay_url;
      if (url) {
        window.location.href = url;
      } else {
        setError('Không nhận được link thanh toán');
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setPaying(null);
    }
  }

  async function payViaPayos(id: string) {
    setPaying(id);
    try {
      const res = await api.post<{ pay_url?: string; checkoutUrl?: string }>(
        `/invoices/${id}/pay-payos`,
      );
      const url = res.data.pay_url ?? res.data.checkoutUrl;
      if (url) {
        window.location.href = url;
      } else {
        setError('Không nhận được link thanh toán');
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setPaying(null);
    }
  }

  const pending = invoices.filter((i) => i.payment_status === 'pending');
  const paid = invoices.filter((i) => i.payment_status !== 'pending');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-slate-900">Thanh toán & Hóa đơn</h1>
        <p className="text-sm text-slate-500">
          Thanh toán online qua VNPay / Visa. Hệ thống tự áp dụng giảm BHYT (nếu còn hạn).
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <Skeleton />
      ) : (
        <>
          {pending.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-medium text-slate-700 uppercase mb-2">
                Cần thanh toán
              </h2>
              <div className="space-y-3">
                {pending.map((inv) => (
                  <PendingInvoiceCard
                    key={inv.id}
                    invoice={inv}
                    paying={paying === inv.id}
                    onOpen={() => setActive(inv.id)}
                    onPayVnpay={() => payViaVnpay(inv.id)}
                    onPayPayos={() => payViaPayos(inv.id)}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-sm font-medium text-slate-700 uppercase mb-2">Lịch sử hóa đơn</h2>
            {paid.length === 0 ? (
              <div className="card p-8 text-center text-sm text-slate-500">
                Chưa có hóa đơn nào.
              </div>
            ) : (
              <div className="card divide-y divide-slate-100">
                {paid.map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => setActive(inv.id)}
                    className="w-full p-4 flex items-center gap-4 text-left hover:bg-slate-50"
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Icon.Receipt size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900">
                        Hóa đơn #{inv.id.slice(0, 8)}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {formatDateTime(inv.paid_at ?? inv.created_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-900">
                        {formatVnd(inv.final_amount)}
                      </div>
                      <StatusBadge
                        tone={INVOICE_STATUS[inv.payment_status]?.tone ?? 'gray'}
                      >
                        {INVOICE_STATUS[inv.payment_status]?.label ?? inv.payment_status}
                      </StatusBadge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {active && <InvoiceDetailModal id={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function PendingInvoiceCard({
  invoice,
  paying,
  onOpen,
  onPayVnpay,
  onPayPayos,
}: {
  invoice: Invoice;
  paying: boolean;
  onOpen: () => void;
  onPayVnpay: () => void;
  onPayPayos: () => void;
}) {
  return (
    <div className="card p-5 border-amber-200 bg-amber-50/30">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
          <Icon.Receipt size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-semibold text-slate-900">Hóa đơn #{invoice.id.slice(0, 8)}</div>
              <div className="text-xs text-slate-500">
                Tạo lúc {formatDateTime(invoice.created_at)}
              </div>
            </div>
            <button
              onClick={onOpen}
              className="text-sm text-brand-600 hover:underline"
            >
              Xem chi tiết
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xs text-slate-500">Tổng tiền</div>
              <div className="font-medium text-slate-700">{formatVnd(invoice.total_amount)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Giảm BHYT</div>
              <div className="font-medium text-emerald-700">
                {invoice.insurance_discount > 0
                  ? `- ${formatVnd(invoice.insurance_discount)}`
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Phải trả</div>
              <div className="font-semibold text-slate-900 text-base">
                {formatVnd(invoice.final_amount)}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="btn-primary"
              onClick={onPayVnpay}
              disabled={paying}
            >
              {paying ? 'Đang xử lý...' : 'Thanh toán VNPay'}
            </button>
            <button className="btn-secondary" onClick={onPayPayos} disabled={paying}>
              QR PayOS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoiceDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [inv, setInv] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ invoice?: Invoice; data?: Invoice } & Invoice>(`/invoices/${id}`)
      .then((res) => {
        const d = (res.data as { invoice?: Invoice; data?: Invoice }).invoice ??
          (res.data as { data?: Invoice }).data ??
          (res.data as Invoice);
        setInv(d);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Chi tiết hóa đơn</h3>
            {inv && (
              <p className="text-xs text-slate-500 mt-0.5">#{inv.id.slice(0, 8)}</p>
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
        ) : inv ? (
          <div className="p-5 space-y-4">
            {inv.items && inv.items.length > 0 && (
              <div>
                <h4 className="text-xs uppercase text-slate-500 font-semibold mb-2">
                  Dịch vụ đã dùng
                </h4>
                <div className="space-y-2">
                  {inv.items.map((it, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between bg-slate-50 rounded-lg p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900">
                          {it.service_label}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {formatVnd(it.discounted_price)} × {it.quantity}
                          {it.discounted_price < it.unit_price && (
                            <span className="ml-1 line-through text-slate-400">
                              {formatVnd(it.unit_price)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-slate-900">
                        {formatVnd(it.subtotal)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-slate-100 pt-4 space-y-1.5 text-sm">
              <Row label="Tổng tiền" value={formatVnd(inv.total_amount)} />
              <Row
                label="Giảm BHYT"
                value={
                  inv.insurance_discount > 0
                    ? `- ${formatVnd(inv.insurance_discount)}`
                    : '—'
                }
              />
              <div className="flex justify-between pt-2 border-t border-slate-100">
                <span className="font-semibold text-slate-900">Thành tiền</span>
                <span className="font-bold text-lg text-slate-900">
                  {formatVnd(inv.final_amount)}
                </span>
              </div>
            </div>

            <div className="text-sm text-slate-600">
              <div>
                Trạng thái:{' '}
                <StatusBadge tone={INVOICE_STATUS[inv.payment_status]?.tone ?? 'gray'}>
                  {INVOICE_STATUS[inv.payment_status]?.label ?? inv.payment_status}
                </StatusBadge>
              </div>
              {inv.payment_method && (
                <div className="mt-1">
                  Phương thức: <span className="text-slate-900">{inv.payment_method}</span>
                </div>
              )}
              {inv.paid_at && (
                <div className="mt-1">
                  Thanh toán lúc:{' '}
                  <span className="text-slate-900">{formatDateTime(inv.paid_at)}</span>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-600">{label}</span>
      <span className="text-slate-900 font-medium">{value}</span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-1/3" />
          <div className="h-3 bg-slate-100 rounded w-1/2 mt-2" />
        </div>
      ))}
    </div>
  );
}
