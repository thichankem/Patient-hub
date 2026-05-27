import { Icon } from '../../components/Icon';
import { PageHero } from './AboutPage';

const ALL_DEPARTMENTS = [
  {
    name: 'Cấp cứu 24/7',
    desc: 'Tiếp nhận và xử trí cấp cứu tất cả các trường hợp khẩn cấp.',
    icon: <Icon.AlertCircle size={26} />,
    color: 'bg-rose-100 text-rose-600',
    doctors: 25,
  },
  {
    name: 'Khoa Nội tổng quát',
    desc: 'Chẩn đoán và điều trị các bệnh lý nội khoa người lớn.',
    icon: <Icon.Stethoscope size={26} />,
    color: 'bg-blue-100 text-blue-600',
    doctors: 18,
  },
  {
    name: 'Khoa Ngoại tổng hợp',
    desc: 'Phẫu thuật tổng quát, phẫu thuật nội soi.',
    icon: <Icon.Activity size={26} />,
    color: 'bg-violet-100 text-violet-600',
    doctors: 22,
  },
  {
    name: 'Khoa Sản phụ khoa',
    desc: 'Chăm sóc sức khỏe sinh sản, sinh thường, sinh mổ.',
    icon: <Icon.Heart size={26} />,
    color: 'bg-pink-100 text-pink-600',
    doctors: 16,
  },
  {
    name: 'Khoa Nhi',
    desc: 'Khám và điều trị bệnh lý trẻ em từ 0–15 tuổi.',
    icon: <Icon.Baby size={26} />,
    color: 'bg-amber-100 text-amber-600',
    doctors: 14,
  },
  {
    name: 'Khoa Tim mạch',
    desc: 'Điện tâm đồ, siêu âm tim, can thiệp tim mạch.',
    icon: <Icon.Activity size={26} />,
    color: 'bg-red-100 text-red-600',
    doctors: 12,
  },
  {
    name: 'Khoa Thần kinh',
    desc: 'Điều trị các bệnh lý thần kinh, đột quỵ.',
    icon: <Icon.Brain size={26} />,
    color: 'bg-indigo-100 text-indigo-600',
    doctors: 10,
  },
  {
    name: 'Khoa Chấn thương chỉnh hình',
    desc: 'Điều trị chấn thương xương khớp, phẫu thuật cột sống.',
    icon: <Icon.Bone size={26} />,
    color: 'bg-orange-100 text-orange-600',
    doctors: 13,
  },
  {
    name: 'Khoa Mắt',
    desc: 'Khám và điều trị các bệnh lý về mắt, phẫu thuật khúc xạ.',
    icon: <Icon.Eye size={26} />,
    color: 'bg-cyan-100 text-cyan-600',
    doctors: 8,
  },
  {
    name: 'Khoa Tai Mũi Họng',
    desc: 'Khám và điều trị các bệnh lý tai mũi họng.',
    icon: <Icon.User size={26} />,
    color: 'bg-teal-100 text-teal-600',
    doctors: 9,
  },
  {
    name: 'Khoa Ung bướu',
    desc: 'Tầm soát, điều trị các loại ung thư theo phác đồ quốc tế.',
    icon: <Icon.Shield size={26} />,
    color: 'bg-emerald-100 text-emerald-600',
    doctors: 11,
  },
  {
    name: 'Khoa Chẩn đoán hình ảnh',
    desc: 'X-quang, siêu âm, CT, MRI, nội soi.',
    icon: <Icon.Microscope size={26} />,
    color: 'bg-fuchsia-100 text-fuchsia-600',
    doctors: 15,
  },
];

export default function DepartmentsPage() {
  return (
    <div>
      <PageHero
        title="Hệ thống chuyên khoa"
        subtitle="Hơn 30 chuyên khoa phục vụ đầy đủ nhu cầu khám và điều trị"
        breadcrumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Chuyên khoa' }]}
      />

      <section className="max-w-7xl mx-auto px-4 lg:px-6 py-14">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ALL_DEPARTMENTS.map((d) => (
            <div
              key={d.name}
              className="card p-6 hover:shadow-md hover:border-brand-300 transition cursor-pointer group"
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${d.color}`}>
                  {d.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 group-hover:text-brand-700">
                    {d.name}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{d.desc}</p>
                  <div className="text-xs text-slate-500 mt-3 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Icon.User size={12} /> {d.doctors} bác sĩ
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
