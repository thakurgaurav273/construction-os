export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
export const PASSWORD_RESET_TTL_MINUTES = 60;

/**
 * Tokens live in HttpOnly cookies so page scripts can never read them. The refresh cookie is only sent
 * to /api/auth. The session cookie carries no secret; it tells the frontend middleware that a session
 * exists while the short-lived access cookie is being refreshed.
 */
export const AUTH_COOKIES = {
  access: 'access_token',
  refresh: 'refresh_token',
  session: 'sp_session',
} as const;

export const REFRESH_COOKIE_PATH = '/api/auth';

/** Login and password endpoints are public, so they get a much tighter limit than the API default. */
export const AUTH_RATE_LIMIT = { default: { limit: 10, ttl: 60_000 } };
