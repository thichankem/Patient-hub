import { Navigate, Route, Routes } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import PatientLayout from './layouts/PatientLayout';
import StaffLayout from './layouts/StaffLayout';
import { ProtectedRoute } from './auth/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

import HomePage from './pages/public/HomePage';
import AboutPage from './pages/public/AboutPage';
import ServicesPage from './pages/public/ServicesPage';
import DepartmentsPage from './pages/public/DepartmentsPage';
import ContactPage from './pages/public/ContactPage';

import ChatbotPage from './pages/patient/ChatbotPage';
import AppointmentsPage from './pages/patient/AppointmentsPage';
import TestsPage from './pages/patient/TestsPage';
import MedicalRecordPage from './pages/patient/MedicalRecordPage';
import ProfilePage from './pages/patient/ProfilePage';
import InvoicesPage from './pages/patient/InvoicesPage';
import NotificationsPage from './pages/patient/NotificationsPage';
import ReportsPage from './pages/patient/ReportsPage';

// Staff — Doctor
import DoctorAppointments from './pages/staff/doctor/DoctorAppointments';
import DoctorExaminations from './pages/staff/doctor/DoctorExaminations';
import DoctorPrescriptions from './pages/staff/doctor/DoctorPrescriptions';
import DoctorTestOrders from './pages/staff/doctor/DoctorTestOrders';
import DoctorPatients from './pages/staff/doctor/DoctorPatients';

// Staff — Technician
import TechnicianQueue from './pages/staff/technician/TechnicianQueue';

// Staff — Manager
import ManagerDashboard from './pages/staff/manager/ManagerDashboard';
import ManagerStaff from './pages/staff/manager/ManagerStaff';
import ManagerAppointments from './pages/staff/manager/ManagerAppointments';
import ManagerDepartments from './pages/staff/manager/ManagerDepartments';
import ManagerLabRooms from './pages/staff/manager/ManagerLabRooms';
import ManagerLibrary from './pages/staff/manager/ManagerLibrary';
import ManagerRevenue from './pages/staff/manager/ManagerRevenue';
import ManagerReports from './pages/staff/manager/ManagerReports';

// Staff — Receptionist
import ReceptionistPatients from './pages/staff/receptionist/ReceptionistPatients';
import ReceptionistAppointments from './pages/staff/receptionist/ReceptionistAppointments';

// Staff — Cashier
import CashierInvoices from './pages/staff/cashier/CashierInvoices';

// Staff — Shared
import StaffChat from './pages/staff/shared/StaffChat';
import StaffNotifications from './pages/staff/shared/StaffNotifications';
import StaffBroadcast from './pages/staff/shared/StaffBroadcast';

import { useAuth } from './auth/AuthContext';

// Redirect helper: sends staff to their default page inside /staff
function StaffIndex() {
  const { user } = useAuth();
  const defaultPages: Record<string, string> = {
    doctor: 'doctor/appointments',
    technician: 'technician/queue',
    manager: 'manager/dashboard',
    receptionist: 'receptionist/patients',
    cashier: 'cashier/invoices',
  };
  const target = user ? defaultPages[user.role] ?? 'notifications' : 'notifications';
  return <Navigate to={target} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Auth standalone */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Public site */}
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="gioi-thieu" element={<AboutPage />} />
        <Route path="dich-vu" element={<ServicesPage />} />
        <Route path="chuyen-khoa" element={<DepartmentsPage />} />
        <Route path="lien-he" element={<ContactPage />} />
        <Route path="tra-cuu" element={<ContactPage />} />
      </Route>

      {/* Patient area */}
      <Route
        path="patient"
        element={
          <ProtectedRoute roles={['patient']}>
            <PatientLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="chatbot" replace />} />
        <Route path="chatbot" element={<ChatbotPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="tests" element={<TestsPage />} />
        <Route path="records" element={<MedicalRecordPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>

      {/* Staff / Internal hospital system */}
      <Route
        path="staff"
        element={
          <ProtectedRoute roles={['doctor', 'technician', 'manager', 'receptionist', 'cashier']}>
            <StaffLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StaffIndex />} />

        {/* Doctor */}
        <Route path="doctor/appointments" element={<DoctorAppointments />} />
        <Route path="doctor/examinations" element={<DoctorExaminations />} />
        <Route path="doctor/prescriptions" element={<DoctorPrescriptions />} />
        <Route path="doctor/test-orders" element={<DoctorTestOrders />} />
        <Route path="doctor/patients" element={<DoctorPatients />} />

        {/* Technician */}
        <Route path="technician/queue" element={<TechnicianQueue />} />

        {/* Manager */}
        <Route path="manager/dashboard" element={<ManagerDashboard />} />
        <Route path="manager/staff" element={<ManagerStaff />} />
        <Route path="manager/appointments" element={<ManagerAppointments />} />
        <Route path="manager/departments" element={<ManagerDepartments />} />
        <Route path="manager/lab-rooms" element={<ManagerLabRooms />} />
        <Route path="manager/library" element={<ManagerLibrary />} />
        <Route path="manager/revenue" element={<ManagerRevenue />} />
        <Route path="manager/reports" element={<ManagerReports />} />

        {/* Receptionist */}
        <Route path="receptionist/patients" element={<ReceptionistPatients />} />
        <Route path="receptionist/appointments" element={<ReceptionistAppointments />} />

        {/* Cashier */}
        <Route path="cashier/invoices" element={<CashierInvoices />} />

        {/* Shared */}
        <Route path="chat" element={<StaffChat />} />
        <Route path="notifications" element={<StaffNotifications />} />
        <Route path="broadcast" element={<StaffBroadcast />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
