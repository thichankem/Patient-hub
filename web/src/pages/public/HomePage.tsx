import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';

export default function HomePage() {
  return (
    <div>
      <Hero />
      <QuickActions />
      <FeaturedServices />
      <Departments />
      <WhyUs />
      <Contact />
    </div>
  );
}

/* ───────────────────────── HERO ───────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 text-white">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_20%,white_0,transparent_50%),radial-gradient(circle_at_80%_60%,white_0,transparent_50%)]" />
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-16 lg:py-24 relative grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-medium mb-5">
            <Icon.Heart size={12} className="text-rose-300" />
            Vì sức khỏe cộng đồng
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">
            Bệnh viện <span className="text-amber-300">PatientHub</span>
          </h1>
          <p className="text-lg lg:text-xl mt-4 text-brand-50">
            Khám sức khỏe{' '}
            <span className="bg-white text-brand-700 px-2 py-0.5 rounded">chính xác</span>{' '}
            <span className="bg-white text-brand-700 px-2 py-0.5 rounded">nhanh chóng</span>{' '}
            <span className="bg-white text-brand-700 px-2 py-0.5 rounded">tiện lợi</span>
          </p>
          <p className="mt-5 text-brand-100 max-w-xl">
            Hơn 60 năm phục vụ sức khỏe nhân dân Thủ đô. Đội ngũ bác sĩ chuyên môn cao, trang thiết
            bị hiện đại, hoạt động 24/7.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-lg shadow-lg shadow-emerald-900/20 flex items-center gap-2"
            >
              <Icon.Calendar size={18} /> Đặt khám ngay
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-xl">
            <Stat value="60+" label="Năm thành lập" />
            <Stat value="200+" label="Bác sĩ chuyên môn" />
            <Stat value="30+" label="Chuyên khoa" />
            <Stat value="500K+" label="Lượt khám/năm" />
          </div>
        </div>

        <div className="relative hidden lg:block">
          <div className="absolute -top-6 -right-6 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="relative bg-white text-slate-900 rounded-2xl shadow-2xl p-6 max-w-md ml-auto">
            <div className="flex items-center gap-3 mb-4">
              <div>
                <div className="text-xs text-slate-500 uppercase">Sức khỏe hôm nay</div>
                <div className="font-bold text-brand-700">Vững bước ngày mai</div>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <HeroCard
                icon={<Icon.Microscope size={18} />}
                title="Tra cứu kết quả khám sức khỏe"
                desc="Tra cứu kết quả xét nghiệm, đơn thuốc và chẩn đoán hình ảnh của bạn."
                to="/tra-cuu"
              />
              <HeroCard
                icon={<Icon.Calendar size={18} />}
                title="Đặt lịch khám sức khỏe"
                desc="Đặt lịch trực tuyến — không cần chờ đợi lâu tại bệnh viện."
                to="/login"
                accent
              />
            </div>
            <div className="mt-4 text-xs text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Icon.Phone size={11} /> 0904 751 399
              </span>
              <span className="flex items-center gap-1">
                <Icon.Clock size={11} /> Giờ làm việc 7:00 - 17:00
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-white/5 backdrop-blur rounded-xl border border-white/10 px-4 py-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-brand-100">{label}</div>
    </div>
  );
}

function HeroCard({
  icon,
  title,
  desc,
  to,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  to: string;
  accent?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`group flex items-start gap-3 rounded-xl p-3 border transition ${
        accent
          ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600'
          : 'bg-slate-50 border-slate-100 hover:border-brand-300'
      }`}
    >
      <span
        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          accent ? 'bg-white/20 text-white' : 'bg-brand-100 text-brand-700'
        }`}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{title}</div>
        <div className={`text-xs mt-0.5 ${accent ? 'text-emerald-50' : 'text-slate-500'}`}>
          {desc}
        </div>
      </div>
      <Icon.ArrowRight
        size={16}
        className={`mt-1 transition group-hover:translate-x-0.5 ${
          accent ? 'text-white' : 'text-slate-400'
        }`}
      />
    </Link>
  );
}

/* ───────────────────────── QUICK ACTIONS ───────────────────────── */

const QUICK_ACTIONS = [
  {
    title: 'Khám sức khỏe lái xe',
    desc: 'Cấp giấy khám sức khỏe lái xe nhanh trong ngày.',
    icon: <Icon.Activity size={22} />,
    color: 'bg-rose-100 text-rose-600',
  },
  {
    title: 'Khám sức khỏe đi làm',
    desc: 'Khám sức khỏe đi làm, xin việc.',
    icon: <Icon.Shield size={22} />,
    color: 'bg-amber-100 text-amber-600',
  },
  {
    title: 'Khám sức khỏe học sinh',
    desc: 'Khám sức khỏe học sinh - sinh viên.',
    icon: <Icon.Award size={22} />,
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    title: 'Khám sức khỏe định kỳ',
    desc: 'Gói khám tổng quát theo năm.',
    icon: <Icon.Heart size={22} />,
    color: 'bg-violet-100 text-violet-600',
  },
];

function QuickActions() {
  return (
    <section className="bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-widest text-brand-600 font-semibold">
            Các gói khám sức khỏe
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mt-2">
            Lựa chọn nhanh dịch vụ phù hợp với bạn
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((q) => (
            <div
              key={q.title}
              className="card p-5 text-center hover:border-brand-300 hover:shadow-md transition"
            >
              <div
                className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center ${q.color}`}
              >
                {q.icon}
              </div>
              <h3 className="font-semibold text-slate-900 mt-3 text-sm">{q.title}</h3>
              <p className="text-xs text-slate-500 mt-1">{q.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── FEATURED SERVICES ───────────────────────── */

const SERVICES = [
  {
    title: 'Cấp cứu 24/7',
    desc: 'Đội cấp cứu trực 24/7, xe cứu thương và bác sĩ luôn sẵn sàng.',
    icon: <Icon.AlertCircle size={26} />,
    bg: 'bg-rose-50',
    color: 'text-rose-600',
  },
  {
    title: 'Phẫu thuật',
    desc: 'Phòng mổ hiện đại, nội soi, mổ hở và can thiệp ít xâm lấn.',
    icon: <Icon.Stethoscope size={26} />,
    bg: 'bg-violet-50',
    color: 'text-violet-600',
  },
  {
    title: 'Sản phụ khoa',
    desc: 'Khoa Sản 24/7, sinh thường, sinh mổ và lấy thai và chăm sóc thai sản.',
    icon: <Icon.Heart size={26} />,
    bg: 'bg-pink-50',
    color: 'text-pink-600',
  },
  {
    title: 'Nhi khoa',
    desc: 'Điều trị bệnh trẻ em, tiêm chủng và tư vấn dinh dưỡng.',
    icon: <Icon.Baby size={26} />,
    bg: 'bg-amber-50',
    color: 'text-amber-600',
  },
  {
    title: 'Tim mạch',
    desc: 'Điện tâm đồ, siêu âm tim, holter và điều trị bệnh tim mạch.',
    icon: <Icon.Activity size={26} />,
    bg: 'bg-cyan-50',
    color: 'text-cyan-600',
  },
  {
    title: 'Ung bướu',
    desc: 'Tầm soát và điều trị ung thư theo phác đồ quốc tế.',
    icon: <Icon.Shield size={26} />,
    bg: 'bg-emerald-50',
    color: 'text-emerald-600',
  },
  {
    title: 'Chẩn đoán hình ảnh',
    desc: 'X-quang, siêu âm, CT scan, MRI với kỹ thuật viên chuyên nghiệp.',
    icon: <Icon.Eye size={26} />,
    bg: 'bg-blue-50',
    color: 'text-blue-600',
  },
  {
    title: 'Xét nghiệm',
    desc: 'Xét nghiệm máu, nước tiểu, vi sinh với kết quả nhanh.',
    icon: <Icon.Microscope size={26} />,
    bg: 'bg-orange-50',
    color: 'text-orange-600',
  },
];

function FeaturedServices() {
  return (
    <section className="bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-14">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-widest text-brand-600 font-semibold">
            Dịch vụ y tế
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mt-2">
            Dịch vụ nổi bật
          </h2>
          <p className="text-slate-600 mt-2 max-w-2xl mx-auto">
            Trang thiết bị hiện đại, đội ngũ chuyên gia đầu ngành — phục vụ toàn diện mọi nhu cầu
            sức khỏe.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {SERVICES.map((s) => (
            <div
              key={s.title}
              className={`rounded-2xl p-5 ${s.bg} text-center hover:shadow-md transition`}
            >
              <div
                className={`w-14 h-14 rounded-full bg-white mx-auto flex items-center justify-center ${s.color} shadow-sm`}
              >
                {s.icon}
              </div>
              <h3 className="font-semibold text-slate-900 mt-3">{s.title}</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── DEPARTMENTS ───────────────────────── */

const DEPARTMENTS = [
  { name: 'Cấp cứu Ngoại', color: 'bg-red-500' },
  { name: 'Cấp cứu Nội Nhi', color: 'bg-amber-500' },
  { name: 'Ngoại thần kinh', color: 'bg-violet-500' },
  { name: 'Chấn thương chỉnh hình', color: 'bg-emerald-500' },
  { name: 'Hồi sức Ngoại', color: 'bg-rose-500' },
  { name: 'Ngoại tổng hợp I & II', color: 'bg-cyan-500' },
  { name: 'Sản phụ khoa I & II', color: 'bg-pink-500' },
  { name: 'Ung bướu', color: 'bg-orange-500' },
  { name: 'Tiết niệu - Thận', color: 'bg-blue-500' },
  { name: 'Chẩn đoán hình ảnh', color: 'bg-teal-500' },
  { name: 'Tai Mũi Họng', color: 'bg-indigo-500' },
  { name: 'Răng Hàm Mặt', color: 'bg-fuchsia-500' },
];

function Departments() {
  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-14">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-widest text-brand-600 font-semibold">
            Hệ thống khoa phòng
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mt-2">Các chuyên khoa</h2>
          <p className="text-slate-600 mt-2">
            Hơn 30 chuyên khoa phục vụ đầy đủ nhu cầu khám và điều trị.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {DEPARTMENTS.map((d) => (
            <div
              key={d.name}
              className="card flex items-center gap-3 px-4 py-3 hover:border-brand-300 hover:shadow-sm transition"
            >
              <span className={`w-1.5 h-8 rounded-full ${d.color}`} />
              <span className="text-sm font-medium text-slate-800">{d.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── WHY US ───────────────────────── */

function WhyUs() {
  const items = [
    {
      icon: <Icon.Award size={26} />,
      title: 'Chứng nhận chất lượng',
      desc: 'Đạt chuẩn chất lượng bệnh viện hạng I của Bộ Y tế.',
    },
    {
      icon: <Icon.Stethoscope size={26} />,
      title: 'Đội ngũ chuyên gia',
      desc: 'Hơn 200 bác sĩ với chuyên môn cao, nhiều năm kinh nghiệm.',
    },
    {
      icon: <Icon.Microscope size={26} />,
      title: 'Trang thiết bị hiện đại',
      desc: 'Máy chẩn đoán hình ảnh, xét nghiệm thế hệ mới nhập khẩu.',
    },
    {
      icon: <Icon.Clock size={26} />,
      title: 'Phục vụ 24/7',
      desc: 'Cấp cứu liên tục, tiếp nhận bệnh nhân không kể giờ giấc.',
    },
  ];
  return (
    <section className="bg-brand-700 text-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl lg:text-3xl font-bold">Vì sao chọn PatientHub?</h2>
          <p className="text-brand-100 mt-2">
            Cam kết mang lại trải nghiệm chăm sóc sức khỏe tốt nhất.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((it) => (
            <div
              key={it.title}
              className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5"
            >
              <div className="w-12 h-12 rounded-xl bg-white/10 text-amber-300 flex items-center justify-center">
                {it.icon}
              </div>
              <h3 className="font-semibold mt-3">{it.title}</h3>
              <p className="text-sm text-brand-100 mt-1">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── CONTACT ───────────────────────── */

function Contact() {
  return (
    <section className="bg-gradient-to-br from-brand-800 to-brand-900 text-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-14">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-widest text-amber-300 font-semibold">
            Liên hệ
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold mt-2">Thông tin liên hệ</h2>
          <p className="text-brand-100 mt-2">Chúng tôi luôn sẵn sàng phục vụ 24/7.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="space-y-3">
            <ContactCard
              icon={<Icon.MapPin size={20} />}
              title="Địa chỉ"
              lines={['42 P. Thanh Nhàn, Phường Bạch Mai, Hà Nội']}
            />
            <ContactCard
              icon={<Icon.Phone size={20} />}
              title="Điện thoại"
              lines={[
                'Tổng đài: 0904 751 399',
                'Cấp cứu 24/7: 0904 751 399',
              ]}
            />
            <ContactCard
              icon={<Icon.Mail size={20} />}
              title="Email"
              lines={['dophuhung.hn@gmail.com']}
            />
            <ContactCard
              icon={<Icon.Clock size={20} />}
              title="Giờ làm việc"
              lines={[
                'Khám ngoại trú: 7:00 – 11:45 & 13:30 – 16:45',
                'Khám bệnh: 7:30 – 12:00 & 13:30 – 17:00',
                'Cấp cứu & Sản khoa: 24/7 – Tất cả các ngày',
              ]}
            />
          </div>

          <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/10 min-h-[420px] flex items-center justify-center relative">
            <iframe
              title="Bản đồ"
              src="https://www.openstreetmap.org/export/embed.html?bbox=105.8447%2C20.9942%2C105.8607%2C21.0058&layer=mapnik&marker=21.0000%2C105.8527"
              className="absolute inset-0 w-full h-full border-0"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactCard({
  icon,
  title,
  lines,
}: {
  icon: React.ReactNode;
  title: string;
  lines: string[];
}) {
  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4 flex gap-4">
      <div className="w-11 h-11 rounded-xl bg-amber-300/20 text-amber-300 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-wider text-brand-200">{title}</div>
        <div className="space-y-0.5 mt-1">
          {lines.map((l) => (
            <div key={l} className="text-sm text-white">
              {l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
