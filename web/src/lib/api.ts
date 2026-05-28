import axios, { AxiosError } from 'axios';

// Base URL được inject lúc build qua VITE_API_BASE_URL.
// Dev: bỏ trống → fallback '/api' để vite proxy localhost:3000.
// Prod (production build với subdomain riêng): set VITE_API_BASE_URL=https://api.dophuhung.fun/api
const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ph_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ message?: string }>) => {
    if (error.response?.status === 401) {
      // Token hết hạn — chỉ xóa khi đã từng login (tránh ảnh hưởng login flow).
      const wasAuthed = !!localStorage.getItem('ph_token');
      if (wasAuthed) {
        localStorage.removeItem('ph_token');
        localStorage.removeItem('ph_user');
        if (location.pathname !== '/login') {
          location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message ?? err.message ?? 'Có lỗi xảy ra';
  }
  if (err instanceof Error) return err.message;
  return 'Có lỗi xảy ra';
}
