import { createHash, randomBytes, randomUUID } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } from './auth.constants';

export type TokenType = 'access' | 'refresh';

export interface TokenPayload {
  sub: string;
  organizationId: string;
  type: TokenType;
  jti: string;
  /** The sign-in session. Absent on tokens issued before sessions were tracked. */
  sid?: string;
}

/** The device a session was started from, shown to the member under Settings → Security. */
export interface SessionClient {
  userAgent: string | null;
  ipAddress: string | null;
}

export const UNKNOWN_CLIENT: SessionClient = { userAgent: null, ipAddress: null };

const MAX_USER_AGENT_LENGTH = 300;

interface SessionIdentity {
  sessionId: string;
  sessionStartedAt: Date;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const MIN_SECRET_LENGTH = 32;

/** There is deliberately no fallback: a missing or weak secret stops the API from starting. */
function requireSecret(config: ConfigService, name: string): string {
  const secret = config.get<string>(name)?.trim();
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`${name} must be set to a random value of at least ${MIN_SECRET_LENGTH} characters.`);
  }
  return secret;
}

/** Stored tokens are hashed, so a leaked database row can't be replayed as a session. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Issues and rotates session tokens. Access and refresh tokens use different secrets and carry a `type`
 * claim, so neither can stand in for the other. Every token has a random `jti`, which keeps two logins in
 * the same second from producing identical tokens.
 */
@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.accessSecret = requireSecret(config, 'JWT_ACCESS_SECRET');
    this.refreshSecret = requireSecret(config, 'JWT_REFRESH_SECRET');
    if (this.accessSecret === this.refreshSecret) {
      throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different.');
    }
  }

  get accessTokenSecret(): string {
    return this.accessSecret;
  }

  /** Starts a new session, e.g. on sign-in. */
  async issue(userId: string, organizationId: string, client: SessionClient = UNKNOWN_CLIENT): Promise<TokenPair> {
    const session: SessionIdentity = { sessionId: randomUUID(), sessionStartedAt: new Date() };
    const tokens = this.pair(userId, organizationId, session.sessionId);
    await this.prisma.refreshToken.create({ data: this.storedToken(tokens.refreshToken, userId, session, client) });
    return tokens;
  }

  /**
   * Swaps a refresh token for a new pair; the old one can't be used again. Presenting a refresh token
   * that was already rotated means it was copied, so every session of that user is ended.
   */
  async rotate(refreshToken: string, client: SessionClient = UNKNOWN_CLIENT): Promise<{ payload: TokenPayload; tokens: TokenPair }> {
    const payload = this.verify(refreshToken, 'refresh');
    const stored = await this.prisma.refreshToken.findUnique({ where: { token: hashToken(refreshToken) } });
    if (!stored || stored.userId !== payload.sub || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Your session has expired. Sign in again.');
    }

    const tokens = this.pair(payload.sub, payload.organizationId, stored.sessionId);
    const deviceNow: SessionClient = {
      userAgent: client.userAgent ?? stored.userAgent,
      ipAddress: client.ipAddress ?? stored.ipAddress,
    };
    // Claiming the old token and storing the next one together means the session always has exactly one
    // live token, which is what JwtStrategy checks on every request.
    const rotated = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.refreshToken.updateMany({ where: { id: stored.id, revoked: false }, data: { revoked: true } });
      if (count === 0) return false;
      await tx.refreshToken.create({ data: this.storedToken(tokens.refreshToken, payload.sub, stored, deviceNow) });
      return true;
    });
    if (!rotated) {
      await this.revokeAll(payload.sub);
      throw new UnauthorizedException('Your session has expired. Sign in again.');
    }
    return { payload, tokens };
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({ where: { token: hashToken(refreshToken) }, data: { revoked: true } });
  }

  async revokeAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true } });
  }

  /** Verifies signature, expiry and token type. Throws 401 for anything else. */
  verify(token: string, type: TokenType): TokenPayload {
    try {
      const payload = this.jwt.verify<TokenPayload>(token, {
        secret: type === 'access' ? this.accessSecret : this.refreshSecret,
      });
      if (payload.type !== type) throw new Error('Wrong token type');
      return payload;
    } catch {
      throw new UnauthorizedException('Your session has expired. Sign in again.');
    }
  }

  private pair(userId: string, organizationId: string, sessionId: string): TokenPair {
    return {
      accessToken: this.sign(userId, organizationId, sessionId, 'access'),
      refreshToken: this.sign(userId, organizationId, sessionId, 'refresh'),
    };
  }

  private storedToken(refreshToken: string, userId: string, session: SessionIdentity, client: SessionClient): Prisma.RefreshTokenUncheckedCreateInput {
    return {
      token: hashToken(refreshToken),
      userId,
      sessionId: session.sessionId,
      sessionStartedAt: session.sessionStartedAt,
      userAgent: client.userAgent?.slice(0, MAX_USER_AGENT_LENGTH) ?? null,
      ipAddress: client.ipAddress,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
    };
  }

  private sign(userId: string, organizationId: string, sessionId: string, type: TokenType): string {
    return this.jwt.sign(
      { sub: userId, organizationId, sid: sessionId, type },
      {
        secret: type === 'access' ? this.accessSecret : this.refreshSecret,
        expiresIn: type === 'access' ? ACCESS_TOKEN_TTL_SECONDS : REFRESH_TOKEN_TTL_SECONDS,
        jwtid: randomUUID(),
      },
    );
  }
}
