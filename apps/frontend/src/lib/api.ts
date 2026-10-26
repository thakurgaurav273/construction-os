import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth.store';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5174';

/**
 * Every request carries the session cookies (`withCredentials`). When the 15-minute access cookie expires,
 * the first 401 triggers one refresh call that rotates the cookies, and every request waiting on it retries.
 */
export const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

/** Auth endpoints answer 401 for wrong passwords or expired sessions; retrying them through a refresh would loop. */
const NO_REFRESH_PATHS = [
  '/auth/login', '/auth/register', '/auth/refresh', '/auth/logout', '/auth/forgot-password', '/auth/reset-password', '/invitations/',
];

// Older builds kept tokens in localStorage; clear them so they can't be read by page scripts.
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refreshToken');
  } catch {
    // Storage can be unavailable (private mode); nothing to clean up then.
  }
}

let refreshInFlight: Promise<void> | null = null;

function refreshSession(): Promise<void> {
  refreshInFlight ??= axios
    .post(`${API_URL}/api/auth/refresh`, {}, { withCredentials: true })
    .then(() => undefined)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

function redirectToLogin(): void {
  useAuthStore.getState().logout();
  if (typeof window === 'undefined' || window.location.pathname.startsWith('/login')) return;
  const redirect = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/login?redirect=${redirect}`;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isAuthCall = NO_REFRESH_PATHS.some((path) => request?.url?.startsWith(path));
    if (error.response?.status !== 401 || !request || request._retry || isAuthCall) {
      return Promise.reject(error);
    }

    request._retry = true;
    try {
      await refreshSession();
    } catch (refreshError) {
      redirectToLogin();
      return Promise.reject(refreshError);
    }
    return api(request);
  },
);
