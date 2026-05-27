import { Navigate, Route, Routes } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import PatientLayout from './layouts/PatientLayout';
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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
