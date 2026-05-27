import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { PageHero } from './AboutPage';

const PACKAGES = [
  {
    name: 'Khám sức khỏe tổng quát',
    desc: 'Bao gồm khám lâm sàng, xét nghiệm máu, nước tiểu, siêu âm bụng tổng quát.',
    price: '950.000',
    duration: '120 phút',
    color: 'border-brand-200',
    badge: 'Phổ biến',
    badgeColor: 'bg-brand-100 text-brand-700',
  },
  {
    name: 'Gói khám tim mạch',
    desc: 'Điện tâm đồ, siêu âm tim, holter 24h, xét nghiệm men tim chuyên sâu.',
    price: '1.850.000',
    duration: '180 phút',
    color: 'border-rose-200',
  },
  {
    name: 'Gói khám tiền sản',
    desc: 'Khám sản khoa, siêu âm 4D, xét nghiệm di truyền, tư vấn dinh dưỡng thai kỳ.',
    price: '2.300.000',
    duration: '150 phút',
    color: 'border-pink-200',
    badge: 'Cao cấp',
    badgeColor: 'bg-pink-100 text-pink-700',
  },
  {
    name: 'Tầm soát ung thư',
    desc: 'Tầm soát các loại ung thư phổ biến cho nam/nữ theo lứa tuổi.',
    price: '3.500.000',
    duration: '240 phút',
    color: 'border-emerald-200',
  },
  {
    name: 'Khám sức khỏe học sinh',
    desc: 'Đo chiều cao cân nặng, thị lực, tim mạch, xét nghiệm cơ bản.',
    price: '350.000',
    duration: '60 phút',
    color: 'border-amber-200',
  },
  {
    name: 'Khám sức khỏe lái xe',
    desc: 'Cấp giấy chứng nhận sức khỏe theo tiêu chuẩn Bộ Y tế.',
    price: '250.000',
    duration: '45 phút',
    color: 'border-cyan-200',
  },
];

const SERVICES_BY_CAT = [
  {
    cat: 'Khám chữa bệnh',
    items: [
      'Khám đa khoa các chuyên khoa',
      'Khám và điều trị ngoại trú',
      'Khám và điều trị nội trú',
      'Cấp cứu 24/7',
    ],
  },
  {
    cat: 'Chẩn đoán hình ảnh',
    items: ['X-quang kỹ thuật số', 'Siêu âm 2D / 3D / 4D', 'Chụp CT scan', 'Chụp MRI', 'Nội soi'],
  },
  {
    cat: 'Xét nghiệm',
    items: [
      'Xét nghiệm máu sinh hóa',
      'Xét nghiệm nước tiểu',
      'Xét nghiệm vi sinh',
      'Xét nghiệm di truyền',
      'Xét nghiệm tầm soát ung thư',
    ],
  },
  {
    cat: 'Thủ thuật & Phẫu thuật',
    items: [
      'Phẫu thuật nội soi',
      'Phẫu thuật mở',
      'Phẫu thuật tim mạch can thiệp',
      'Phẫu thuật ung bướu',
    ],
  },
];

export default function ServicesPage() {
  return (
    <div>
      <PageHero
        title="Dịch vụ Y tế"
        subtitle="Các gói khám và dịch vụ chuyên môn tại PatientHub"
        breadcrumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Dịch vụ Y tế' }]}
      />

      <section className="max-w-7xl mx-auto px-4 lg:px-6 py-14">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-widest text-brand-600 font-semibold">
            Các gói khám
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mt-2">
            Gói khám sức khỏe nổi bật
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {PACKAGES.map((p) => (
            <div
              key={p.name}
              className={`card p-6 border-2 ${p.color} hover:shadow-md transition relative`}
            >
              {p.badge && (
                <span
                  className={`absolute top-4 right-4 badge ${p.badgeColor ?? 'bg-slate-100 text-slate-700'}`}
                >
                  {p.badge}
                </span>
              )}
              <h3 className="font-semibold text-lg text-slate-900">{p.name}</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed min-h-[60px]">{p.desc}</p>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-2xl font-bold text-brand-700">{p.price}</span>
                <span className="text-sm text-slate-500 pb-0.5">đ</span>
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Icon.Clock size={12} /> {p.duration}
              </div>
              <Link to="/login" className="btn-primary w-full mt-4 justify-center">
                Đặt khám
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-14">
          <div className="text-center mb-10">
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900">Danh mục dịch vụ</h2>
            <p className="text-slate-600 mt-2">Toàn bộ dịch vụ chuyên môn tại bệnh viện.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {SERVICES_BY_CAT.map((s) => (
              <div key={s.cat} className="card p-6">
                <h3 className="font-semibold text-slate-900 text-lg">{s.cat}</h3>
                <ul className="mt-3 space-y-2">
                  {s.items.map((it) => (
                    <li key={it} className="flex items-center gap-2 text-sm text-slate-700">
                      <Icon.Check size={14} className="text-emerald-500 flex-shrink-0" />
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-700 text-white">
        <div className="max-w-5xl mx-auto px-4 lg:px-6 py-12 text-center">
          <h2 className="text-2xl lg:text-3xl font-bold">Sẵn sàng chăm sóc sức khỏe của bạn</h2>
          <p className="text-brand-100 mt-3">
            Đặt lịch khám online ngay hôm nay — chỉ vài bước đơn giản.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 mt-6 bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold px-6 py-3 rounded-lg"
          >
            <Icon.Calendar size={18} /> Đặt khám ngay
          </Link>
        </div>
      </section>
    </div>
  );
}
