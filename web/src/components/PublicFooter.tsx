import { Link } from 'react-router-dom';
import { Icon } from './Icon';

export function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      {/* CTA stripe */}
      <div className="bg-red-900/30 border-y border-red-800/40">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-red-500/20 text-red-300 flex items-center justify-center">
              <Icon.AlertCircle size={20} />
            </span>
            <div>
              <div className="font-semibold text-white">Đường dây cấp cứu 24/7</div>
              <div className="text-sm text-slate-400">
                Bác sĩ trực liên tục, tiếp nhận bệnh nhân bất cứ lúc nào
              </div>
            </div>
          </div>
          <a
            href="tel:0904751399"
            className="bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-2.5 rounded-md flex items-center gap-2"
          >
            <Icon.Phone size={16} /> Gọi ngay: 0904 751 399
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <div className="mb-4">
            <img src="/logo.png" alt="PatientHub" className="h-12 w-auto" />
          </div>
          <p className="text-sm leading-relaxed">
            42 P. Thanh Nhàn, Phường Bạch Mai, Hà Nội
          </p>
        </div>

        <FooterCol title="Điều hướng">
          <FooterLink to="/dich-vu">Dịch vụ y tế</FooterLink>
          <FooterLink to="/chuyen-khoa">Chuyên khoa</FooterLink>
          <FooterLink to="/gioi-thieu">Giới thiệu</FooterLink>
          <FooterLink to="/tra-cuu">Tra cứu kết quả</FooterLink>
          <FooterLink to="/lien-he">Liên hệ</FooterLink>
        </FooterCol>

        <FooterCol title="Chuyên khoa nổi bật">
          <FooterLink to="/chuyen-khoa">Cấp cứu 24/7</FooterLink>
          <FooterLink to="/chuyen-khoa">Sản phụ khoa</FooterLink>
          <FooterLink to="/chuyen-khoa">Ngoại thần kinh</FooterLink>
          <FooterLink to="/chuyen-khoa">Ung bướu</FooterLink>
          <FooterLink to="/chuyen-khoa">Chẩn đoán hình ảnh</FooterLink>
        </FooterCol>

        <FooterCol title="Liên hệ nhanh">
          <li className="flex items-center gap-2 text-sm">
            <Icon.Phone size={14} className="text-emerald-400" /> 0904 751 399
          </li>
          <li className="flex items-center gap-2 text-sm">
            <Icon.Mail size={14} className="text-emerald-400" /> dophuhung.hn@gmail.com
          </li>
        </FooterCol>
      </div>

      <div className="border-t border-slate-800 py-4">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>© 2026 PatientHub — All rights reserved.</div>
          <div>patienthub.vn</div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-white uppercase mb-4">{title}</h4>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <Link to={to} className="text-sm hover:text-white transition">
        {children}
      </Link>
    </li>
  );
}

