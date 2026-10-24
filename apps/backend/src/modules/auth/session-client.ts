import type { Request } from 'express';
import type { SessionClient } from './token.service';

export function sessionClientOf(req: Request): SessionClient {
  return { userAgent: req.get('user-agent') ?? null, ipAddress: req.ip ?? null };
}
