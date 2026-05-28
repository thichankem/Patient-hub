import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { PageHero } from './AboutPage';

const ALL_DOCTORS = [
  { name: 'PGS.TS Nguyễn Văn An', specialty: 'Tim mạch', exp: '25', position: 'Trưởng khoa', dept: 'Tim mạch', color: 'from-blue-400 to-blue-600' },
  { name: 'TS.BS Trần Thị Hương', specialty: 'Sản phụ khoa', exp: '20', position: 'Trưởng khoa', dept: 'Sản', color: 'from-pink-400 to-rose-600' },
  { name: 'BS.CKII Lê Quang Minh', specialty: 'Nhi khoa', exp: '18', position: 'Trưởng khoa', dept: 'Nhi', color: 'from-amber-400 to-orange-600' },
  { name: 'TS.BS Phạm Đức Cường', specialty: 'Ngoại tổng quát', exp: '28', position: 'Phó Giám đốc', dept: 'Ngoại', color: 'from-emerald-400 to-teal-600' },
  { name: 'BS.CKI Đỗ Minh Tuấn', specialty: 'Cấp cứu', exp: '15', position: 'Phó khoa', dept: 'Cấp cứu', color: 'from-red-400 to-rose-600' },
  { name: 'PGS.TS Vũ Thị Lan', specialty: 'Ung bướu', exp: '22', position: 'Trưởng khoa', dept: 'Ung bướu', color: 'from-emerald-400 to-green-600' },
  { name: 'TS.BS Bùi Anh Tú', specialty: 'Thần kinh', exp: '19', position: 'Trưởng khoa', dept: 'Thần kinh', color: 'from-indigo-400 to-blue-600' },
  { name: 'BS.CKII Hoàng Mai', specialty: 'Tai Mũi Họng', exp: '17', position: 'Trưởng khoa', dept: 'TMH', color: 'from-teal-400 to-cyan-600' },
];

const FILTERS = ['Tất cả', 'Tim mạch', 'Sản phụ khoa', 'Nhi khoa', 'Ngoại tổng quát', 'Cấp cứu', 'Ung bướu'];

export default function DoctorsPage() {
  const [filter, setFilter] = useState('Tất cả');
  const visible = filter === 'Tất cả' ? ALL_DOCTORS : ALL_DOCTORS.filter((d) => d.specialty === filter);

  return (
    <div>
      <PageHero
        title="Đội ngũ Y bác sĩ"
        subtitle="Hơn 200 bác sĩ chuyên môn cao, tận tâm với nghề"
        breadcrumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Y bác sĩ' }]}
      />

      <section className="max-w-7xl mx-auto px-4 lg:px-6 py-14">
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm rounded-full border ${
                filter === f
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {visible.map((d) => (
            <div key={d.name} className="card overflow-hidden hover:border-brand-500 transition group">
              <div className="h-48 bg-brand-50 border-b border-slate-200 relative flex items-center justify-center">
                <Icon.User size={64} className="text-brand-300" />
                <span className="absolute top-3 left-3 badge bg-white border border-slate-200 text-slate-700 text-[10px]">
                  {d.position}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-slate-900 group-hover:text-brand-700">{d.name}</h3>
                <div className="text-sm text-brand-600 mt-0.5">{d.specialty}</div>
                <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <Icon.Award size={12} /> {d.exp} năm kinh nghiệm
                </div>
                <button className="text-sm text-brand-600 hover:text-brand-700 mt-3 inline-flex items-center gap-1">
                  Xem chi tiết <Icon.ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
