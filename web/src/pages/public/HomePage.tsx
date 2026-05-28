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
    <section className="bg-brand-700 text-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-14 lg:py-20 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
            Bệnh viện PatientHub
          </h1>
          <p className="text-lg lg:text-xl mt-4 text-brand-50 font-medium">
            Khám sức khỏe chính xác — nhanh chóng — tiện lợi
          </p>
          <p className="mt-4 text-brand-100 max-w-xl leading-relaxed">
            Hơn 60 năm phục vụ sức khỏe nhân dân Thủ đô. Đội ngũ bác sĩ chuyên môn cao,
            trang thiết bị hiện đại, hoạt động 24/7.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-md flex items-center gap-2"
            >
              <Icon.Calendar size={18} /> Đặt khám ngay
            </Link>
            <a
              href="tel:0904751399"
              className="bg-white text-brand-700 hover:bg-brand-50 font-semibold px-6 py-3 rounded-md flex items-center gap-2"
            >
              <Icon.Phone size={18} /> 0904 751 399
            </a>
          </div>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-xl">
            <Stat value="60+" label="Năm thành lập" />
            <Stat value="200+" label="Bác sĩ chuyên môn" />
            <Stat value="30+" label="Chuyên khoa" />
            <Stat value="500K+" label="Lượt khám/năm" />
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="bg-white text-slate-900 rounded-md border border-brand-800 p-6 max-w-md ml-auto">
            <div className="text-xs text-slate-500 uppercase tracking-wider">Sức khỏe hôm nay</div>
            <div className="font-bold text-brand-700 text-lg mt-0.5">Vững bước ngày mai</div>
            <div className="space-y-3 text-sm mt-4">
              <HeroCard
                title="Tra cứu kết quả khám sức khỏe"
                desc="Tra cứu kết quả xét nghiệm, đơn thuốc và chẩn đoán hình ảnh."
                to="/tra-cuu"
              />
              <HeroCard
                title="Đặt lịch khám sức khỏe"
                desc="Đặt lịch trực tuyến — không cần chờ đợi lâu tại bệnh viện."
                to="/login"
                accent
              />
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Icon.Phone size={11} /> 0904 751 399
              </span>
              <span className="flex items-center gap-1">
                <Icon.Clock size={11} /> 7:00 - 17:00
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
    <div className="border-l-2 border-brand-400 pl-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-brand-100">{label}</div>
    </div>
  );
}

function HeroCard({
  title,
  desc,
  to,
  accent,
}: {
  title: string;
  desc: string;
  to: string;
  accent?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`group flex items-start gap-3 rounded-md p-3 border transition ${
        accent
          ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600'
          : 'bg-slate-50 border-slate-200 hover:border-brand-400'
      }`}
    >
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
    icon: <img src="homePage/driver.jpg" alt="Khám sức khỏe lái xe" style={{ width: '100%', maxHeight: 160, objectFit: 'cover' }} />,
  },
  {
    title: 'Khám sức khỏe đi làm',
    desc: 'Khám sức khỏe đi làm, xin việc.',
    icon: <img src="homePage/work.jpg" alt="Khám sức khỏe đi làm" style={{ width: '100%', maxHeight: 160, objectFit: 'cover' }} />,
  },
  {
    title: 'Khám sức khỏe học sinh',
    desc: 'Khám sức khỏe học sinh - sinh viên.',
    icon: <img src="homePage/student.jpg" alt="Khám sức khỏe học sinh" style={{ width: '100%', maxHeight: 160, objectFit: 'cover' }} />,
  },
  {
    title: 'Khám sức khỏe định kỳ',
    desc: 'Gói khám tổng quát theo năm.',
    icon: <img src="homePage/healthyearly.jpg" alt="Khám sức khỏe định kỳ" style={{ width: '100%', maxHeight: 160, objectFit: 'cover' }} />,
  },
];

function QuickActions() {
  return (
    <section className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10">
        <div className="text-center mb-8">
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900">
            Các gói khám sức khỏe
          </h2>
          <p className="text-slate-600 mt-2">
            Lựa chọn nhanh dịch vụ phù hợp với bạn
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((q) => (
            <div
              key={q.title}
              className="bg-white border border-slate-200 rounded-md p-5 text-center hover:border-brand-500 transition"
            >
              <div className="w-18 h-18 rounded-md mx-auto flex items-center justify-center bg-brand-50 text-brand-700">
                {q.icon}
              </div>
              <h3 className="font-semibold text-slate-900 mt-3 text-base">{q.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{q.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── FEATURED SERVICES ───────────────────────── */

const SERVICES = [
  { title: 'Cấp cứu 24/7', desc: 'Đội cấp cứu trực 24/7, xe cứu thương và bác sĩ luôn sẵn sàng.', icon: <img src="homePage/cấp cứu.jpg" alt="Cấp cứu 24/7" style={{ width: '100%', maxHeight: 160, objectFit: 'cover' }} /> },
  { title: 'Phẫu thuật', desc: 'Phòng mổ hiện đại, nội soi, mổ hở và can thiệp ít xâm lấn.', icon: <img src="homePage/phẫu thuật.jpg" alt="Phẫu thuật" style={{ width: '100%', maxHeight: 160, objectFit: 'cover' }} /> },
  { title: 'Sản phụ khoa', desc: 'Khoa Sản 24/7, sinh thường, sinh mổ và chăm sóc thai sản.', icon: <img src="homePage/sản phụ khoa.jpg" alt="Sản phụ khoa" style={{ width: '100%', maxHeight: 160, objectFit: 'cover' }} /> },
  { title: 'Nhi khoa', desc: 'Điều trị bệnh trẻ em, tiêm chủng và tư vấn dinh dưỡng.', icon: <img src="homePage/nhi khoa.jpg" alt="Nhi khoa" style={{ width: '100%', maxHeight: 160, objectFit: 'cover' }} /> },
  { title: 'Tim mạch', desc: 'Điện tâm đồ, siêu âm tim, holter và điều trị bệnh tim mạch.', icon: <img src="homePage/tim mạch.jpg" alt="Tim mạch" style={{ width: '100%', maxHeight: 160, objectFit: 'cover' }} /> },
  { title: 'Ung bướu', desc: 'Tầm soát và điều trị ung thư theo phác đồ quốc tế.', icon: <img src="homePage/ung bướu.jpg" alt="ung bướu" style={{ width: '100%', maxHeight: 160, objectFit: 'cover' }} /> },
  { title: 'Chẩn đoán hình ảnh', desc: 'X-quang, siêu âm, CT scan, MRI với kỹ thuật viên chuyên nghiệp.', icon: <img src="homePage/chẩn đoán hình ảnh.jpg" alt="Chẩn đoán hình ảnh" style={{ width: '100%', maxHeight: 160, objectFit: 'cover' }} /> },
  { title: 'Xét nghiệm', desc: 'Xét nghiệm máu, nước tiểu, vi sinh với kết quả nhanh.', icon: <img src="homePage/xét nghiệm.jpg" alt="xét nghiệm" style={{ width: '100%', maxHeight: 160, objectFit: 'cover' }} /> },
];

function FeaturedServices() {
  return (
    <section className="bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900">
            Dịch vụ y tế nổi bật
          </h2>
          <p className="text-slate-600 mt-2 max-w-2xl mx-auto">
            Trang thiết bị hiện đại, đội ngũ chuyên gia đầu ngành — phục vụ toàn diện
            mọi nhu cầu sức khỏe.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {SERVICES.map((s) => (
            <div
              key={s.title}
              className="bg-white border border-slate-200 rounded-md p-5 hover:border-brand-500 transition"
            >
              <div className="w-30 h-30 rounded-md bg-brand-50 text-brand-700 flex items-center justify-center">
                {s.icon}
              </div>
              <h3 className="font-semibold text-slate-900 mt-3">{s.title}</h3>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── DEPARTMENTS ───────────────────────── */

const DEPARTMENTS = [
  'Cấp cứu Ngoại',
  'Cấp cứu Nội Nhi',
  'Ngoại thần kinh',
  'Chấn thương chỉnh hình',
  'Hồi sức Ngoại',
  'Ngoại tổng hợp I & II',
  'Sản phụ khoa I & II',
  'Ung bướu',
  'Tiết niệu - Thận',
  'Chẩn đoán hình ảnh',
  'Tai Mũi Họng',
  'Răng Hàm Mặt',
];

function Departments() {
  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900">Các chuyên khoa</h2>
          <p className="text-slate-600 mt-2">
            Hơn 30 chuyên khoa phục vụ đầy đủ nhu cầu khám và điều trị.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {DEPARTMENTS.map((name) => (
            <div
              key={name}
              className="flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-md hover:border-brand-500 transition"
            >
              <span className="w-1.5 h-6 rounded-sm bg-brand-600" />
              <span className="text-sm font-medium text-slate-800">{name}</span>
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
      icon: <img src="homePage/chứng chỉ.png" alt="Chứng nhận chất lượng" style={{ width: '100%', maxHeight: 160, objectFit: 'cover' }} />,
      title: 'Chứng nhận chất lượng',
      desc: 'Đạt chuẩn chất lượng bệnh viện hạng I của Bộ Y tế.',
    },
    {
      icon: <img src="homePage/đội ngũ bác sĩ.jpg" alt="Đội ngũ chuyên gia" style={{ width: '100%', maxHeight: 160, objectFit: 'cover' }} />,
      title: 'Đội ngũ chuyên gia',
      desc: 'Hơn 200 bác sĩ với chuyên môn cao, nhiều năm kinh nghiệm.',
    },
    {
      icon: <img src="homePage/trang thiết bị.jpg" alt="Trang thiết bị hiện đại" style={{ width: '100%', maxHeight: 160, objectFit: 'cover' }} />,
      title: 'Trang thiết bị hiện đại',
      desc: 'Máy chẩn đoán hình ảnh, xét nghiệm thế hệ mới nhập khẩu.',
    },
    {
      icon: <img src="homePage/phục vụ.jpg" alt="Phục vụ 24/7" style={{ width: '100%', maxHeight: 160, objectFit: 'cover' }} />,
      title: 'Phục vụ 24/7',
      desc: 'Cấp cứu liên tục, tiếp nhận bệnh nhân không kể giờ giấc.',
    },
  ];
  return (
    <section className="bg-slate-50 border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900">Vì sao chọn PatientHub?</h2>
          <p className="text-slate-600 mt-2">
            Cam kết mang lại trải nghiệm chăm sóc sức khỏe tốt nhất.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((it) => (
            <div
              key={it.title}
              className="bg-white border border-slate-200 rounded-md p-5"
            >
              <div className="w-18 h-18 rounded-md bg-brand-50 text-brand-700 flex items-center justify-center">
                {it.icon}
              </div>
              <h3 className="font-semibold text-slate-900 mt-3">{it.title}</h3>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">{it.desc}</p>
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
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900">Thông tin liên hệ</h2>
          <p className="text-slate-600 mt-2">Chúng tôi luôn sẵn sàng phục vụ 24/7.</p>
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

          <div className="border border-slate-200 rounded-md overflow-hidden min-h-[420px] relative">
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
    <div className="bg-white border border-slate-200 rounded-md p-4 flex gap-4">
      <div className="w-11 h-11 rounded-md bg-brand-50 text-brand-700 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{title}</div>
        <div className="space-y-0.5 mt-1">
          {lines.map((l) => (
            <div key={l} className="text-sm text-slate-700">
              {l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
