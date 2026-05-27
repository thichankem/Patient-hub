import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
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
        { to: '/staff/doctor/appointments', label: 'Lịch khám', icon: <Icon.Calendar size={18} /> },
        { to: '/staff/doctor/examinations', label: 'Đợt khám', icon: <Icon.Stethoscope size={18} /> },
        { to: '/staff/doctor/prescriptions', label: 'Đơn thuốc', icon: <Icon.FileText size={18} /> },
        { to: '/staff/doctor/test-orders', label: 'Yêu cầu XN', icon: <Icon.Beaker size={18} /> },
        { to: '/staff/doctor/patients', label: 'Tra cứu BN', icon: <Icon.Search size={18} /> },
      ];
    case 'technician':
      return [
        { to: '/staff/technician/queue', label: 'Hàng chờ XN', icon: <Icon.Microscope size={18} /> },
      ];
    case 'manager':
      return [
        { to: '/staff/manager/dashboard', label: 'Tổng quan', icon: <Icon.Activity size={18} /> },
        { to: '/staff/manager/staff', label: 'Nhân sự', icon: <Icon.User size={18} /> },
        { to: '/staff/manager/appointments', label: 'Lịch hẹn', icon: <Icon.Calendar size={18} /> },
        { to: '/staff/manager/departments', label: 'Khoa phòng', icon: <Icon.Plus size={18} /> },
        { to: '/staff/manager/lab-rooms', label: 'Phòng XN', icon: <Icon.Microscope size={18} /> },
        { to: '/staff/manager/library', label: 'Thư viện y tế', icon: <Icon.FileText size={18} /> },
        { to: '/staff/manager/revenue', label: 'Doanh thu', icon: <Icon.Receipt size={18} /> },
        { to: '/staff/manager/reports', label: 'Báo cáo lỗi', icon: <Icon.Report size={18} /> },
      ];
    case 'receptionist':
      return [
        { to: '/staff/receptionist/patients', label: 'Bệnh nhân', icon: <Icon.User size={18} /> },
        { to: '/staff/receptionist/appointments', label: 'Đặt lịch hẹn', icon: <Icon.Calendar size={18} /> },
      ];
    case 'cashier':
      return [
        { to: '/staff/cashier/invoices', label: 'Hóa đơn', icon: <Icon.Receipt size={18} /> },
      ];
    default:
      return [];
  }
}

function getSharedNav(role: UserRole): NavItem[] {
  const items: NavItem[] = [
    { to: '/staff/notifications', label: 'Thông báo', icon: <Icon.Bell size={18} /> },
  ];
  if (['doctor', 'technician', 'manager'].includes(role)) {
    items.unshift({ to: '/staff/chat', label: 'Tin nhắn', icon: <Icon.Chat size={18} /> });
  }
  if (role === 'manager') {
    items.push({ to: '/staff/broadcast', label: 'Gửi thông báo', icon: <Icon.Send size={18} /> });
  }
  return items;
}

export default function StaffLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const roleNav = getNavItems(user.role);
  const sharedNav = getSharedNav(user.role);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex flex-col bg-slate-900 text-slate-300 transition-all ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Brand */}
        <div className="h-14 flex items-center gap-2 px-4 border-b border-slate-800 flex-shrink-0">
          <div className="w-8 h-8 rounded bg-brand-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
            PH
          </div>
          {!collapsed && (
            <div className="leading-tight overflow-hidden">
              <div className="text-xs text-slate-500 font-medium">HỆ THỐNG</div>
              <div className="text-sm font-semibold text-white truncate">PatientHub</div>
            </div>
          )}
        </div>

        {/* Role badge */}
        {!collapsed && (
          <div className="px-4 py-3 border-b border-slate-800">
            <div className="text-xs text-slate-500">Vai trò</div>
            <div className="text-sm font-medium text-white">{ROLE_LABEL[user.role] ?? user.role}</div>
          </div>
        )}

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          {!collapsed && (
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Chức năng
            </div>
          )}
          {roleNav.map((n) => (
            <SidebarLink key={n.to} to={n.to} icon={n.icon} collapsed={collapsed}>
              {n.label}
            </SidebarLink>
          ))}

          <div className="my-3 border-t border-slate-800" />

          {!collapsed && (
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Chung
            </div>
          )}
          {sharedNav.map((n) => (
            <SidebarLink key={n.to} to={n.to} icon={n.icon} collapsed={collapsed}>
              {n.label}
            </SidebarLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-800 p-2 space-y-1 flex-shrink-0">
          <Link
            to="/"
            className="flex items-center gap-2 px-2 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
          >
            <Icon.ArrowRight size={14} className="rotate-180" />
            {!collapsed && 'Về trang chủ'}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-slate-800 rounded transition"
          >
            <Icon.LogOut size={14} />
            {!collapsed && 'Đăng xuất'}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className={`flex-1 flex flex-col transition-all ${collapsed ? 'ml-16' : 'ml-60'}`}>
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
            >
              <Icon.Menu size={18} />
            </button>
            <span className="text-sm text-gray-500 hidden sm:block">
              Xin chào, <span className="font-medium text-gray-900">{user.username}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NavLink
              to="/staff/notifications"
              className="relative p-2 rounded hover:bg-gray-100 text-gray-500"
            >
              <Icon.Bell size={18} />
            </NavLink>
            <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-sm font-semibold">
              {user.username?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarLink({
  to,
  icon,
  collapsed,
  children,
}: {
  to: string;
  icon: React.ReactNode;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-2.5 py-2 rounded text-sm transition ${
          isActive
            ? 'bg-brand-600 text-white font-medium'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        } ${collapsed ? 'justify-center' : ''}`
      }
      title={collapsed ? String(children) : undefined}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && children}
    </NavLink>
  );
}
