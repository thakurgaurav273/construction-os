import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import {
  ACCESS_TOKEN_TTL_SECONDS, AUTH_COOKIES, REFRESH_COOKIE_PATH, REFRESH_TOKEN_TTL_SECONDS,
} from './auth.constants';
import type { TokenPair } from './token.service';

function baseOptions(config: ConfigService): CookieOptions {
  const domain = config.get<string>('COOKIE_DOMAIN')?.trim();
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.get<string>('COOKIE_SECURE') === 'true',
    // Browsers reject Domain=localhost, so local development uses host-only cookies.
    domain: domain && domain !== 'localhost' ? domain : undefined,
  };
}

export function setAuthCookies(res: Response, config: ConfigService, tokens: TokenPair): void {
  const options = baseOptions(config);
  res.cookie(AUTH_COOKIES.access, tokens.accessToken, { ...options, path: '/', maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000 });
  res.cookie(AUTH_COOKIES.refresh, tokens.refreshToken, {
    ...options,
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  });
  res.cookie(AUTH_COOKIES.session, '1', { ...options, path: '/', maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000 });
}

export function clearAuthCookies(res: Response, config: ConfigService): void {
  const options = baseOptions(config);
  res.clearCookie(AUTH_COOKIES.access, { ...options, path: '/' });
  res.clearCookie(AUTH_COOKIES.refresh, { ...options, path: REFRESH_COOKIE_PATH });
  res.clearCookie(AUTH_COOKIES.session, { ...options, path: '/' });
}

export function readCookie(req: Request, name: string): string | undefined {
  const cookies: Record<string, unknown> = req.cookies ?? {};
  const value = cookies[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** For raw cookie headers outside Express, e.g. a WebSocket handshake. */
export function readCookieFromHeader(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator > 0 && part.slice(0, separator).trim() === name) {
      const value = decodeURIComponent(part.slice(separator + 1).trim());
      return value.length > 0 ? value : undefined;
    }
  }
  return undefined;
}
