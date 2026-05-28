import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Icon } from './Icon';
import { api } from '../lib/api';

const STAFF_ROLES = ['doctor', 'technician', 'manager', 'receptionist', 'cashier'];

const MAIN_NAV = [
  { to: '/', label: 'Trang chủ', end: true },
  { to: '/gioi-thieu', label: 'Giới thiệu' },
  { to: '/dich-vu', label: 'Dịch vụ Y tế' },
  { to: '/chuyen-khoa', label: 'Chuyên khoa' },
  { to: '/lien-he', label: 'Liên hệ' },
];

export function PublicHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [unread, setUnread] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const fetchUnread = async () => {
      try {
        const res = await api.get<{ count: number }>('/notifications/unread-count');
        if (alive) setUnread(res.data.count);
      } catch {
        /* ignore */
      }
    };
    fetchUnread();
    const t = setInterval(fetchUnread, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [user]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserMenu(false);
      }
    }
    if (userMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenu]);

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      {/* Topbar */}
      <div className="bg-slate-900 text-white text-xs">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-9 flex items-center justify-between">
          <div className="hidden sm:block text-slate-300">
            Chào mừng bạn đến với hệ thống <span className="text-white">PatientHub</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="flex items-center gap-1.5 hover:text-brand-300">
              <Icon.Mail size={12} /> dophuhung.hn@gmail.com
            </a>
            {(!user || !STAFF_ROLES.includes(user.role)) && (
              <Link
                to="/login"
                className="flex items-center gap-1.5 text-slate-300 hover:text-brand-300"
              >
                <Icon.Settings size={12} /> Đăng nhập nhân viên
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="PatientHub" className="h-12 w-auto" />
          </Link>

          <nav className="hidden lg:flex items-center gap-1 flex-1">
            {MAIN_NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `px-3 py-2 text-sm font-medium rounded-md transition ${
                    isActive
                      ? 'text-brand-700'
                      : 'text-slate-700 hover:text-brand-600'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2 ml-auto">
            <a
              href="tel:0904751399"
              className="flex items-center gap-2 text-sm text-slate-700"
            >
              <span className="w-9 h-9 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                <Icon.Phone size={16} />
              </span>
              <div className="leading-tight">
                <div className="text-[10px] text-slate-500 uppercase">Hotline</div>
                <div className="font-semibold text-brand-700">0904 751 399</div>
              </div>
            </a>

            {!user ? (
              <Link
                to="/login"
                className="ml-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-md"
              >
                Đặt khám ngay
              </Link>
            ) : (
              <div className="relative flex items-center gap-1" ref={dropdownRef}>
                {STAFF_ROLES.includes(user.role) && (
                  <Link
                    to="/staff"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-slate-700 hover:bg-slate-800 rounded-md mr-1"
                  >
                    <Icon.Settings size={14} />
                    Hệ thống
                  </Link>
                )}
                <NavLink
                  to="/patient/notifications"
                  className="relative p-2 text-slate-600 hover:text-brand-600 rounded-lg"
                  title="Thông báo"
                >
                  <Icon.Bell size={18} />
                  {unread > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-semibold flex items-center justify-center">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </NavLink>
                <button
                  onClick={() => setUserMenu((v) => !v)}
                  className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full hover:bg-slate-100"
                >
                  <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold">
                    {user.username?.[0]?.toUpperCase()}
                  </span>
                  <Icon.ChevronDown size={14} className="text-slate-500" />
                </button>

                {userMenu && (
                  <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <div className="text-sm font-medium text-slate-900">
                        {user.username}
                      </div>
                      <div className="text-xs text-slate-500 capitalize">{user.role}</div>
                    </div>
                    <UserMenuLink to="/patient/appointments" icon={<Icon.Calendar size={16} />}>
                      Lịch hẹn của tôi
                    </UserMenuLink>
                    <UserMenuLink to="/patient/tests" icon={<Icon.Beaker size={16} />}>
                      Lịch xét nghiệm
                    </UserMenuLink>
                    <UserMenuLink to="/patient/records" icon={<Icon.FileText size={16} />}>
                      Hồ sơ bệnh án
                    </UserMenuLink>
                    <UserMenuLink to="/patient/invoices" icon={<Icon.Receipt size={16} />}>
                      Hóa đơn
                    </UserMenuLink>
                    <UserMenuLink to="/patient/profile" icon={<Icon.User size={16} />}>
                      Thông tin cá nhân
                    </UserMenuLink>
                    <UserMenuLink to="/patient/reports" icon={<Icon.Report size={16} />}>
                      Gửi báo cáo lỗi
                    </UserMenuLink>
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Icon.LogOut size={16} /> Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            className="lg:hidden ml-auto text-slate-600 p-2"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon.Menu size={22} />
          </button>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="lg:hidden border-t border-slate-100 bg-white">
            <div className="max-w-7xl mx-auto px-4 py-2 space-y-1">
              {MAIN_NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `block px-3 py-2 text-sm rounded-md ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
              {!user ? (
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block mt-2 bg-emerald-500 text-white text-center font-medium px-4 py-2 rounded-md"
                >
                  Đặt khám ngay
                </Link>
              ) : STAFF_ROLES.includes(user.role) ? (
                <Link
                  to="/staff"
                  onClick={() => setMenuOpen(false)}
                  className="block mt-2 bg-slate-700 text-white text-center font-medium px-4 py-2 rounded-md"
                >
                  <Icon.Settings size={14} className="inline mr-1.5" />
                  Vào hệ thống nội bộ
                </Link>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function UserMenuLink({
  to,
  icon,
  children,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
    >
      <span className="text-slate-500">{icon}</span>
      {children}
    </Link>
  );
}
