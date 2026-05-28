import { Icon } from '../../components/Icon';

export default function AboutPage() {
  return (
    <div>
      <PageHero
        title="Về PatientHub"
        subtitle="Hơn 60 năm phục vụ sức khỏe nhân dân"
        breadcrumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Giới thiệu' }]}
      />

      <section className="max-w-7xl mx-auto px-4 lg:px-6 py-14">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="text-xs uppercase tracking-widest text-brand-600 font-semibold">
              Giới thiệu
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mt-2">
              Bệnh viện đa khoa hạng I của Thủ đô
            </h2>
            <p className="text-slate-600 mt-4 leading-relaxed">
              PatientHub được thành lập từ năm 1965, là bệnh viện đa khoa tuyến cuối của Hà Nội, có
              nhiệm vụ khám chữa bệnh, đào tạo, nghiên cứu khoa học và chỉ đạo tuyến cho khu vực
              miền Bắc.
            </p>
            <p className="text-slate-600 mt-3 leading-relaxed">
              Với đội ngũ hơn 200 bác sĩ chuyên môn cao, trang thiết bị y tế hiện đại bậc nhất,
              chúng tôi tự hào phục vụ hơn 500.000 lượt khám mỗi năm, mang lại trải nghiệm chăm sóc
              sức khỏe toàn diện cho người dân.
            </p>

            <div className="grid grid-cols-3 gap-3 mt-6">
              <Stat value="60+" label="Năm hoạt động" />
              <Stat value="200+" label="Bác sĩ" />
              <Stat value="30+" label="Chuyên khoa" />
            </div>
          </div>

          <div className="relative">
            <div className="aspect-video rounded-md bg-brand-50 border border-brand-100 overflow-hidden flex items-center justify-center p-8">
              <img src="/logo.png" alt="PatientHub" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="absolute -bottom-4 -right-4 w-28 h-28 rounded-md bg-emerald-600 text-white flex flex-col items-center justify-center">
              <div className="text-2xl font-bold">60+</div>
              <div className="text-xs">Năm hoạt động</div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-14">
          <div className="text-center mb-10">
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900">
              Sứ mệnh — Tầm nhìn — Giá trị
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <ValueCard
              icon={<Icon.Heart size={26} />}
              color="bg-rose-50 text-rose-600"
              title="Sứ mệnh"
              desc="Chăm sóc sức khỏe toàn diện cho người dân với chất lượng tốt nhất, không phân biệt hoàn cảnh."
            />
            <ValueCard
              icon={<Icon.Star size={26} />}
              color="bg-amber-50 text-amber-600"
              title="Tầm nhìn"
              desc="Trở thành bệnh viện đa khoa hàng đầu khu vực Đông Nam Á về chất lượng điều trị và dịch vụ."
            />
            <ValueCard
              icon={<Icon.Shield size={26} />}
              color="bg-emerald-50 text-emerald-600"
              title="Giá trị cốt lõi"
              desc="Tận tâm — Chuyên nghiệp — Minh bạch — Đổi mới. Lấy bệnh nhân làm trung tâm."
            />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 lg:px-6 py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900">Hành trình phát triển</h2>
          <p className="text-slate-600 mt-2">Những cột mốc quan trọng trong lịch sử bệnh viện.</p>
        </div>
        <div className="relative">
          <div className="absolute left-4 lg:left-1/2 lg:-translate-x-1/2 top-0 bottom-0 w-px bg-slate-200" />
          <div className="space-y-8">
            {[
              {
                year: '1965',
                title: 'Thành lập bệnh viện',
                desc: 'Khởi đầu với 50 giường bệnh và 30 cán bộ y tế.',
              },
              {
                year: '1985',
                title: 'Mở rộng quy mô',
                desc: 'Tăng lên 300 giường, thành lập 12 khoa chuyên môn.',
              },
              {
                year: '2005',
                title: 'Hiện đại hóa',
                desc: 'Đầu tư hệ thống máy MRI, CT scan đầu tiên ở miền Bắc.',
              },
              {
                year: '2020',
                title: 'Bệnh viện hạng I',
                desc: 'Được công nhận là bệnh viện đa khoa hạng I của Bộ Y tế.',
              },
              {
                year: '2026',
                title: 'Số hóa toàn diện',
                desc: 'Triển khai hệ thống PatientHub — lấy bệnh nhân làm trung tâm.',
              },
            ].map((m, i) => (
              <div
                key={m.year}
                className={`relative lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center ${
                  i % 2 === 0 ? '' : 'lg:[&>*:first-child]:order-2'
                }`}
              >
                <div className="pl-12 lg:pl-0 lg:text-right">
                  <div className="text-3xl font-bold text-brand-600">{m.year}</div>
                  <h3 className="font-semibold text-slate-900 mt-1">{m.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{m.desc}</p>
                </div>
                <div className="hidden lg:block" />
                <div className="absolute left-4 lg:left-1/2 lg:-translate-x-1/2 top-1 w-4 h-4 rounded-full bg-brand-500 ring-4 ring-brand-100" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-14">
          <div className="text-center mb-10">
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900">Cơ sở vật chất hiện đại</h2>
            <p className="text-slate-600 mt-2">
              Trang thiết bị y tế tiên tiến, không gian khám chữa bệnh tiện nghi.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <FacilityCard
              icon={<Icon.Stethoscope size={28} />}
              title="Phòng khám chuyên khoa"
              desc="30+ phòng khám đạt chuẩn quốc tế"
            />
            <FacilityCard
              icon={<Icon.Microscope size={28} />}
              title="Trung tâm xét nghiệm"
              desc="Thiết bị tự động, kết quả nhanh chóng"
            />
            <FacilityCard
              icon={<Icon.Eye size={28} />}
              title="Chẩn đoán hình ảnh"
              desc="MRI, CT scan, X-quang kỹ thuật số"
            />
            <FacilityCard
              icon={<Icon.Activity size={28} />}
              title="Phòng mổ hiện đại"
              desc="10 phòng mổ vô khuẩn một chiều"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="card overflow-hidden">
              <div className="h-48 bg-brand-50 flex items-center justify-center">
                <div className="text-center">
                  <Icon.Heart size={40} className="mx-auto text-brand-600" />
                  <div className="mt-2 text-sm font-medium text-slate-900">Khu điều trị nội trú</div>
                  <div className="text-xs text-slate-600 mt-1">500 giường bệnh tiêu chuẩn</div>
                </div>
              </div>
            </div>
            <div className="card overflow-hidden">
              <div className="h-48 bg-brand-50 flex items-center justify-center">
                <div className="text-center">
                  <Icon.Baby size={40} className="mx-auto text-brand-600" />
                  <div className="mt-2 text-sm font-medium text-slate-900">Khoa Sản & Nhi</div>
                  <div className="text-xs text-slate-600 mt-1">Phòng sinh hiện đại 24/7</div>
                </div>
              </div>
            </div>
            <div className="card overflow-hidden">
              <div className="h-48 bg-brand-50 flex items-center justify-center">
                <div className="text-center">
                  <Icon.AlertCircle size={40} className="mx-auto text-brand-600" />
                  <div className="mt-2 text-sm font-medium text-slate-900">Trung tâm Cấp cứu</div>
                  <div className="text-xs text-slate-600 mt-1">Tiếp nhận 24/7, xe cứu thương</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FacilityCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="card overflow-hidden hover:border-brand-500 transition">
      <div className="h-32 bg-brand-50 border-b border-slate-200 flex items-center justify-center">
        <span className="text-brand-700">{icon}</span>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
        <p className="text-xs text-slate-500 mt-1">{desc}</p>
      </div>
    </div>
  );
}

function PageHero({
  title,
  subtitle,
  breadcrumbs,
}: {
  title: string;
  subtitle: string;
  breadcrumbs: Array<{ label: string; href?: string }>;
}) {
  return (
    <section className="bg-brand-700 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <nav className="text-xs text-brand-100 mb-3">
          {breadcrumbs.map((b, i) => (
            <span key={i}>
              {b.href ? (
                <a href={b.href} className="hover:text-white">
                  {b.label}
                </a>
              ) : (
                <span className="text-white">{b.label}</span>
              )}
              {i < breadcrumbs.length - 1 && <span className="mx-2 opacity-60">/</span>}
            </span>
          ))}
        </nav>
        <h1 className="text-3xl lg:text-4xl font-bold">{title}</h1>
        <p className="text-brand-100 mt-2">{subtitle}</p>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl font-bold text-brand-700">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function ValueCard({
  icon,
  title,
  desc,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <div className="card p-6">
      <div className={`w-12 h-12 rounded-md flex items-center justify-center ${color}`}>{icon}</div>
      <h3 className="font-semibold text-lg text-slate-900 mt-3">{title}</h3>
      <p className="text-sm text-slate-600 mt-2 leading-relaxed">{desc}</p>
    </div>
  );
}

export { PageHero };
