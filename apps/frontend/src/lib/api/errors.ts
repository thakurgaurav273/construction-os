import { isAxiosError } from 'axios';

/** Returns the backend's user-facing message (see GlobalExceptionFilter) or the given fallback. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError<{ message?: string; errors?: string[] }>(error)) return fallback;
  const body = error.response?.data;
  return body?.errors?.[0] ?? body?.message ?? fallback;
}
