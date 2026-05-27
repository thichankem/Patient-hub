import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../lib/api';

export type UserRole =
  | 'patient'
  | 'doctor'
  | 'technician'
  | 'manager'
  | 'receptionist'
  | 'cashier';

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
}

interface AuthCtx {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem('ph_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  });
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('ph_token'),
  );
  const [loading, setLoading] = useState(false);

  // Refresh thông tin user khi reload (token còn hạn không).
  useEffect(() => {
    if (!token) return;
    let alive = true;
    api
      .get<{ user: AuthUser }>('/auth/me')
      .then((res) => {
        if (alive) {
          setUser(res.data.user);
          localStorage.setItem('ph_user', JSON.stringify(res.data.user));
        }
      })
      .catch(() => {
        // interceptor đã clear token nếu 401.
      });
    return () => {
      alive = false;
    };
  }, [token]);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: AuthUser }>(
        '/auth/login',
        { username, password },
      );
      localStorage.setItem('ph_token', res.data.token);
      localStorage.setItem('ph_user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ph_token');
    localStorage.removeItem('ph_user');
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({ user, token, loading, login, logout }),
    [user, token, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải nằm trong AuthProvider');
  return ctx;
}
