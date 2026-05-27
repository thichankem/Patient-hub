import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth, type UserRole } from './AuthContext';

interface Props {
  roles?: UserRole[];
  children: ReactNode;
}

export function ProtectedRoute({ roles, children }: Props) {
  const { user, token } = useAuth();
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
