import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, type UserRole } from '../auth/AuthContext';
import { Icon } from '../components/Icon';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const ROLE_LABEL: Record<string, string> = {
  doctor: 'Bác sĩ',
  technician: 'Kỹ thuật viên',
  manager: 'Quản lý',
  receptionist: 'Tiếp tân',
  cashier: 'Thu ngân',
};

function getNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case 'doctor':
      return [
        { to: '/staff/doctor/appointments', label: 'Lịch khám', icon: <Icon.Calendar size={16} /> },
        { to: '/staff/doctor/examinations', label: 'Đợt khám', icon: <Icon.Stethoscope size={16} /> },
        { to: '/staff/doctor/prescriptions', label: 'Đơn thuốc', icon: <Icon.FileText size={16} /> },
        { to: '/staff/doctor/test-orders', label: 'Yêu cầu XN', icon: <Icon.Beaker size={16} /> },
        { to: '/staff/doctor/patients', label: 'Tra cứu BN', icon: <Icon.Search size={16} /> },
      ];
    case 'technician':
      return [
        { to: '/staff/technician/queue', label: 'Hàng chờ XN', icon: <Icon.Microscope size={16} /> },
      ];
    case 'manager':
      return [
        { to: '/staff/manager/dashboard', label: 'Tổng quan', icon: <Icon.Activity size={16} /> },
        { to: '/staff/manager/staff', label: 'Nhân sự', icon: <Icon.User size={16} /> },
        { to: '/staff/manager/appointments', label: 'Lịch hẹn', icon: <Icon.Calendar size={16} /> },
        { to: '/staff/manager/departments', label: 'Khoa phòng', icon: <Icon.Plus size={16} /> },
        { to: '/staff/manager/lab-rooms', label: 'Phòng XN', icon: <Icon.Microscope size={16} /> },
        { to: '/staff/manager/library', label: 'Thư viện y tế', icon: <Icon.FileText size={16} /> },
        { to: '/staff/manager/revenue', label: 'Doanh thu', icon: <Icon.Receipt size={16} /> },
        { to: '/staff/manager/reports', label: 'Báo cáo lỗi', icon: <Icon.Report size={16} /> },
      ];
    case 'receptionist':
      return [
        { to: '/staff/receptionist/patients', label: 'Bệnh nhân', icon: <Icon.User size={16} /> },
        { to: '/staff/receptionist/appointments', label: 'Đặt lịch hẹn', icon: <Icon.Calendar size={16} /> },
      ];
    case 'cashier':
      return [
        { to: '/staff/cashier/invoices', label: 'Hóa đơn', icon: <Icon.Receipt size={16} /> },
      ];
    default:
      return [];
  }
}

function getSharedNav(role: UserRole): NavItem[] {
  const items: NavItem[] = [];
  if (['doctor', 'technician', 'manager'].includes(role)) {
    items.push({ to: '/staff/chat', label: 'Tin nhắn', icon: <Icon.Chat size={16} /> });
  }
  if (role === 'manager') {
    items.push({ to: '/staff/broadcast', label: 'Gửi thông báo', icon: <Icon.Send size={16} /> });
  }
  return items;
}

export default function StaffLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenu, setUserMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserMenu(false);
      }
    }
    if (userMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenu]);

  if (!user) return null;

  const navItems = [...getNavItems(user.role), ...getSharedNav(user.role)];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="sticky top-0 z-30 bg-slate-900 text-slate-200 shadow-md">
        {/* Top row: brand + user menu */}
        <div className="border-b border-slate-800">
          <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 h-14 flex items-center gap-4">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-8 h-8 rounded bg-brand-600 text-white flex items-center justify-center text-xs font-bold">
                PH
              </div>
              <div className="leading-tight">
                <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Hệ thống</div>
                <div className="text-sm font-semibold text-white">PatientHub</div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-slate-800">
              <span className="text-xs text-slate-500">Vai trò</span>
              <span className="text-sm font-medium text-white">{ROLE_LABEL[user.role] ?? user.role}</span>
            </div>

            <div className="ml-auto flex items-center gap-1">
              <NavLink
                to="/staff/notifications"
                className="relative p-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
                title="Thông báo"
              >
                <Icon.Bell size={18} />
              </NavLink>

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserMenu((v) => !v)}
                  className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded hover:bg-slate-800 transition"
                >
                  <span className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-semibold">
                    {user.username?.[0]?.toUpperCase()}
                  </span>
                  <span className="hidden sm:block text-sm text-white">{user.username}</span>
                  <Icon.ChevronDown size={14} className="text-slate-400" />
                </button>

                {userMenu && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50 text-slate-700">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <div className="text-sm font-medium text-slate-900">{user.username}</div>
                      <div className="text-xs text-slate-500">{ROLE_LABEL[user.role] ?? user.role}</div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Icon.LogOut size={16} /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>

              <button
                className="md:hidden ml-1 p-2 rounded hover:bg-slate-800 text-slate-300"
                onClick={() => setMobileOpen((v) => !v)}
              >
                <Icon.Menu size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom row: navigation */}
        <nav className="hidden md:block">
          <div className="max-w-screen-2xl mx-auto px-4 lg:px-6">
            <ul className="flex items-center gap-1 h-12 overflow-x-auto">
              {navItems.map((n) => (
                <li key={n.to} className="flex-shrink-0">
                  <NavLink
                    to={n.to}
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition whitespace-nowrap ${
                        isActive
                          ? 'bg-brand-600 text-white font-medium'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`
                    }
                  >
                    <span className="flex-shrink-0">{n.icon}</span>
                    {n.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900">
            <ul className="px-2 py-2 space-y-1">
              {navItems.map((n) => (
                <li key={n.to}>
                  <NavLink
                    to={n.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded text-sm ${
                        isActive
                          ? 'bg-brand-600 text-white font-medium'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`
                    }
                  >
                    {n.icon}
                    {n.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-screen-2xl w-full mx-auto p-4 lg:p-6">
        <Outlet />
      </main>
    </div>
  );
}
