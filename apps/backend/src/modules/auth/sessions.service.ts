import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { hashToken } from './token.service';

export interface SessionView {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  startedAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  current: boolean;
}

/**
 * A member's signed-in devices. Ending a session deletes its tokens rather than marking them revoked: a
 * revoked token that comes back looks like a stolen one and would end every session (see TokenService.rotate),
 * whereas a deleted one is simply unknown, so the ended device is signed out and nothing else is.
 */
@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, currentRefreshToken: string | undefined): Promise<SessionView[]> {
    const [tokens, currentSessionId] = await Promise.all([
      this.prisma.refreshToken.findMany({
        where: { userId, revoked: false, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      }),
      this.currentSessionId(userId, currentRefreshToken),
    ]);
    // Normally one live token per session; during a rotation race keep the newest.
    const sessions = new Map<string, SessionView>();
    for (const token of tokens) {
      if (sessions.has(token.sessionId)) continue;
      sessions.set(token.sessionId, {
        id: token.sessionId,
        userAgent: token.userAgent,
        ipAddress: token.ipAddress,
        startedAt: token.sessionStartedAt,
        lastActiveAt: token.createdAt,
        expiresAt: token.expiresAt,
        current: token.sessionId === currentSessionId,
      });
    }
    return [...sessions.values()].sort((a, b) => Number(b.current) - Number(a.current));
  }

  async end(userId: string, sessionId: string, currentRefreshToken: string | undefined): Promise<void> {
    if (sessionId === (await this.currentSessionId(userId, currentRefreshToken))) {
      throw new BadRequestException('This is the session you are using. Sign out instead.');
    }
    const { count } = await this.prisma.refreshToken.deleteMany({ where: { userId, sessionId } });
    if (count === 0) throw new NotFoundException('That session has already ended.');
  }

  /** Signs the member out everywhere except here. Returns how many sessions were ended. */
  async endOthers(userId: string, currentRefreshToken: string | undefined): Promise<number> {
    const currentSessionId = await this.currentSessionId(userId, currentRefreshToken);
    if (!currentSessionId) throw new BadRequestException('Your session has expired. Sign in again.');
    const otherSessions = { userId, sessionId: { not: currentSessionId } };
    const live = await this.prisma.refreshToken.findMany({
      where: { ...otherSessions, revoked: false, expiresAt: { gt: new Date() } },
      select: { sessionId: true },
      distinct: ['sessionId'],
    });
    await this.prisma.refreshToken.deleteMany({ where: otherSessions });
    return live.length;
  }

  private async currentSessionId(userId: string, refreshToken: string | undefined): Promise<string | null> {
    if (!refreshToken) return null;
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: hashToken(refreshToken) },
      select: { userId: true, sessionId: true },
    });
    return stored?.userId === userId ? stored.sessionId : null;
  }
}
