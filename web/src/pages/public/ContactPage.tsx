import { FormEvent, useState } from 'react';
import { Icon } from '../../components/Icon';
import { PageHero } from './AboutPage';

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div>
      <PageHero
        title="Liên hệ với chúng tôi"
        subtitle="Chúng tôi luôn sẵn sàng phục vụ 24/7"
        breadcrumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Liên hệ' }]}
      />

      <section className="max-w-7xl mx-auto px-4 lg:px-6 py-14">
        <div className="grid lg:grid-cols-3 gap-5 mb-10">
          <InfoCard icon={<Icon.Phone size={22} />} color="bg-emerald-100 text-emerald-600" title="Hotline 24/7">
            <div>Tổng đài: <strong>0904 751 399</strong></div>
          </InfoCard>
          <InfoCard icon={<Icon.Mail size={22} />} color="bg-blue-100 text-blue-600" title="Email">
            <div>dophuhung.hn@gmail.com</div>
          </InfoCard>
          <InfoCard icon={<Icon.MapPin size={22} />} color="bg-rose-100 text-rose-600" title="Địa chỉ">
            <div>42 P. Thanh Nhàn</div>
            <div>Phường Bạch Mai, Hà Nội</div>
          </InfoCard>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-900">Gửi tin nhắn cho chúng tôi</h3>
            <p className="text-sm text-slate-500 mt-1">
              Điền form bên dưới và đội ngũ chăm sóc khách hàng sẽ liên hệ lại trong 24h.
            </p>
            {sent ? (
              <div className="mt-5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-4 text-sm">
                <Icon.Check size={18} className="inline mr-2" />
                Cảm ơn bạn! Chúng tôi đã nhận được tin nhắn và sẽ phản hồi sớm.
              </div>
            ) : (
              <form onSubmit={submit} className="mt-5 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Họ và tên">
                    <input className="input" required />
                  </Field>
                  <Field label="Số điện thoại">
                    <input className="input" required />
                  </Field>
                </div>
                <Field label="Email">
                  <input className="input" type="email" />
                </Field>
                <Field label="Chủ đề">
                  <select className="input">
                    <option>Tư vấn dịch vụ</option>
                    <option>Đặt lịch khám</option>
                    <option>Góp ý, phản hồi</option>
                    <option>Khác</option>
                  </select>
                </Field>
                <Field label="Nội dung">
                  <textarea className="input min-h-[120px]" required />
                </Field>
                <button type="submit" className="btn-primary w-full">
                  <Icon.Send size={16} /> Gửi tin nhắn
                </button>
              </form>
            )}
          </div>

          <div className="card overflow-hidden min-h-[500px] relative">
            <iframe
              title="Bản đồ PatientHub"
              src="https://www.openstreetmap.org/export/embed.html?bbox=105.8447%2C20.9942%2C105.8607%2C21.0058&layer=mapnik&marker=21.0000%2C105.8527"
              className="absolute inset-0 w-full h-full border-0"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <section className="bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-14">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
            Giờ làm việc
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            <ScheduleCard
              title="Khám ngoại trú"
              icon={<Icon.User size={22} />}
              color="bg-blue-100 text-blue-600"
              lines={['Thứ 2 – Thứ 7', '7:00 – 11:45 & 13:30 – 16:45']}
            />
            <ScheduleCard
              title="Khám bệnh"
              icon={<Icon.Stethoscope size={22} />}
              color="bg-emerald-100 text-emerald-600"
              lines={['Thứ 2 – Chủ nhật', '7:30 – 12:00 & 13:30 – 17:00']}
            />
            <ScheduleCard
              title="Cấp cứu & Sản khoa"
              icon={<Icon.AlertCircle size={22} />}
              color="bg-rose-100 text-rose-600"
              lines={['24/7 – Tất cả các ngày', 'Bao gồm ngày lễ Tết']}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function InfoCard({
  icon,
  color,
  title,
  children,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-900">{title}</div>
        <div className="text-sm text-slate-600 mt-1 space-y-0.5">{children}</div>
      </div>
    </div>
  );
}

function ScheduleCard({
  title,
  icon,
  color,
  lines,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  lines: string[];
}) {
  return (
    <div className="card p-6 text-center">
      <div className={`w-14 h-14 rounded-xl mx-auto flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900 mt-3">{title}</h3>
      <div className="text-sm text-slate-600 mt-2 space-y-0.5">
        {lines.map((l) => (
          <div key={l}>{l}</div>
        ))}
      </div>
    </div>
  );
}
