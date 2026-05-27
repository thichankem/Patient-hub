import { Outlet } from 'react-router-dom';
import { PublicHeader } from '../components/PublicHeader';
import { PublicFooter } from '../components/PublicFooter';

// Cùng chrome như public layout — chức năng người dùng được truy cập
// qua dropdown của avatar trên header, không phải sidebar.
export default function PatientLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <PublicHeader />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-6 py-6">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
