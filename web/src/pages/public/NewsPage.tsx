import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { PageHero } from './AboutPage';

const NEWS_ITEMS = [
  { cat: 'Y tế cộng đồng', title: 'Triển khai chiến dịch tiêm chủng mở rộng 2026', date: '20/05/2026', img: 'from-blue-300 to-blue-500', excerpt: 'Bệnh viện phối hợp với Sở Y tế triển khai chiến dịch tiêm chủng mở rộng cho trẻ em dưới 5 tuổi...' },
  { cat: 'Hoạt động', title: 'Khánh thành khoa Hồi sức tích cực mới', date: '12/05/2026', img: 'from-emerald-300 to-emerald-500', excerpt: 'Khoa Hồi sức tích cực được trang bị 30 giường bệnh hiện đại, đáp ứng nhu cầu...' },
  { cat: 'Hợp tác', title: 'Ký kết hợp tác chuyển giao công nghệ với Singapore', date: '02/05/2026', img: 'from-rose-300 to-rose-500', excerpt: 'PatientHub vừa ký kết thỏa thuận hợp tác với bệnh viện hàng đầu Singapore...' },
  { cat: 'Sự kiện', title: 'Hội nghị khoa học thường niên 2026', date: '28/04/2026', img: 'from-amber-300 to-amber-500', excerpt: 'Hội nghị quy tụ hơn 500 chuyên gia y tế trong và ngoài nước với 60 báo cáo khoa học...' },
  { cat: 'Đào tạo', title: 'Khai giảng khóa đào tạo phẫu thuật nội soi', date: '15/04/2026', img: 'from-violet-300 to-violet-500', excerpt: 'Khóa đào tạo nâng cao kỹ thuật phẫu thuật nội soi dành cho 30 bác sĩ trẻ...' },
  { cat: 'Y tế cộng đồng', title: 'Chương trình khám sức khỏe miễn phí cho người cao tuổi', date: '01/04/2026', img: 'from-teal-300 to-teal-500', excerpt: 'Chương trình khám và tư vấn sức khỏe miễn phí cho hơn 1000 người cao tuổi...' },
];

const CATS = ['Tất cả', 'Y tế cộng đồng', 'Hoạt động', 'Hợp tác', 'Sự kiện', 'Đào tạo'];

export default function NewsPage() {
  const [cat, setCat] = useState('Tất cả');
  const visible = cat === 'Tất cả' ? NEWS_ITEMS : NEWS_ITEMS.filter((n) => n.cat === cat);
  const featured = visible[0];
  const rest = visible.slice(1);

  return (
    <div>
      <PageHero
        title="Tin tức & Sự kiện"
        subtitle="Cập nhật thông tin mới nhất từ bệnh viện"
        breadcrumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Tin tức' }]}
      />

      <section className="max-w-7xl mx-auto px-4 lg:px-6 py-14">
        <div className="flex flex-wrap gap-2 mb-8">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-4 py-2 text-sm rounded-full border ${
                cat === c
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {featured && (
          <article className="card overflow-hidden mb-8 grid md:grid-cols-2 hover:border-brand-500 transition cursor-pointer">
            <div className="h-64 md:h-auto bg-brand-50 border-b md:border-b-0 md:border-r border-slate-200 relative flex items-center justify-center">
              <Icon.FileText size={48} className="text-brand-300" />
              <span className="absolute top-4 left-4 badge bg-white border border-slate-200 text-brand-700">
                {featured.cat}
              </span>
              <span className="absolute bottom-4 left-4 badge bg-amber-500 text-white">
                Tin nổi bật
              </span>
            </div>
            <div className="p-8">
              <div className="text-xs text-slate-500 flex items-center gap-1 mb-3">
                <Icon.Clock size={12} /> {featured.date}
              </div>
              <h2 className="text-xl font-bold text-slate-900 leading-snug">{featured.title}</h2>
              <p className="text-slate-600 mt-3 leading-relaxed">{featured.excerpt}</p>
              <button className="text-brand-600 hover:text-brand-700 font-medium text-sm mt-4 inline-flex items-center gap-1">
                Đọc tiếp <Icon.ArrowRight size={14} />
              </button>
            </div>
          </article>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rest.map((n) => (
            <article
              key={n.title}
              className="card overflow-hidden hover:border-brand-500 transition cursor-pointer group"
            >
              <div className="h-44 bg-brand-50 border-b border-slate-200 relative flex items-center justify-center">
                <Icon.FileText size={36} className="text-brand-300" />
                <span className="absolute top-3 left-3 badge bg-white border border-slate-200 text-brand-700">{n.cat}</span>
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-slate-900 leading-snug group-hover:text-brand-700 line-clamp-2">
                  {n.title}
                </h3>
                <p className="text-sm text-slate-600 mt-2 line-clamp-2">{n.excerpt}</p>
                <div className="text-xs text-slate-500 mt-3 flex items-center gap-1">
                  <Icon.Clock size={12} /> {n.date}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
