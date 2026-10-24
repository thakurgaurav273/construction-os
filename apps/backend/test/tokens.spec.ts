import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../src/database/prisma.service';
import { TokenService, hashToken } from '../src/modules/auth/token.service';

interface StoredToken { id: string; token: string; userId: string; sessionId: string; expiresAt: Date; revoked: boolean }

/** Just enough of Prisma's refreshToken delegate to exercise issuing and rotation. */
function fakePrisma(): { prisma: PrismaService; rows: StoredToken[] } {
  const rows: StoredToken[] = [];
  const refreshToken = {
    create: async ({ data }: { data: Omit<StoredToken, 'id' | 'revoked'> }) => {
      if (rows.some((row) => row.token === data.token)) throw new Error('unique constraint');
      rows.push({ ...data, id: String(rows.length + 1), revoked: false });
    },
    findUnique: async ({ where }: { where: { token: string } }) => rows.find((row) => row.token === where.token) ?? null,
    updateMany: async ({ where }: { where: { id?: string; token?: string; userId?: string; revoked?: boolean } }) => {
      const matched = rows.filter((row) =>
        (where.id === undefined || row.id === where.id)
        && (where.token === undefined || row.token === where.token)
        && (where.userId === undefined || row.userId === where.userId)
        && (where.revoked === undefined || row.revoked === where.revoked));
      matched.forEach((row) => { row.revoked = true; });
      return { count: matched.length };
    },
  };
  // Rows change in place, so the "transaction" just runs the work against the same delegate.
  const $transaction = async <T>(work: (tx: { refreshToken: typeof refreshToken }) => Promise<T>): Promise<T> => work({ refreshToken });
  return { prisma: { refreshToken, $transaction } as unknown as PrismaService, rows };
}

/** ConfigService reads process.env first, which other specs may have filled from .env; a stub keeps tests isolated. */
function configWith(values: Record<string, string>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

function service(): { tokens: TokenService; rows: StoredToken[] } {
  const { prisma, rows } = fakePrisma();
  const config = configWith({ JWT_ACCESS_SECRET: 'access-secret-for-tests-0123456789abcdef', JWT_REFRESH_SECRET: 'refresh-secret-for-tests-0123456789abcdef' });
  return { tokens: new TokenService(new JwtService({}), prisma, config), rows };
}

describe('session tokens', () => {
  it('issues distinct tokens for logins in the same second', async () => {
    const { tokens } = service();
    const first = await tokens.issue('user-1', 'org-1');
    const second = await tokens.issue('user-1', 'org-1');
    assert.notEqual(first.refreshToken, second.refreshToken);
    assert.notEqual(first.accessToken, second.accessToken);
  });

  it('stores only a hash of the refresh token', async () => {
    const { tokens, rows } = service();
    const { refreshToken } = await tokens.issue('user-1', 'org-1');
    assert.equal(rows[0].token, hashToken(refreshToken));
    assert.notEqual(rows[0].token, refreshToken);
  });

  it('never accepts a refresh token as an access token, or the reverse', async () => {
    const { tokens } = service();
    const pair = await tokens.issue('user-1', 'org-1');
    assert.throws(() => tokens.verify(pair.refreshToken, 'access'), UnauthorizedException);
    assert.throws(() => tokens.verify(pair.accessToken, 'refresh'), UnauthorizedException);
    assert.equal(tokens.verify(pair.accessToken, 'access').type, 'access');
  });

  it('ends every session when a rotated refresh token is replayed', async () => {
    const { tokens, rows } = service();
    const original = await tokens.issue('user-1', 'org-1');
    const { tokens: rotated } = await tokens.rotate(original.refreshToken);
    await assert.rejects(tokens.rotate(original.refreshToken), UnauthorizedException);
    assert.ok(rows.every((row) => row.revoked), 'all sessions revoked after reuse');
    await assert.rejects(tokens.rotate(rotated.refreshToken), UnauthorizedException);
  });

  it('keeps one session across rotations, with the device it started on', async () => {
    const { tokens, rows } = service();
    const original = await tokens.issue('user-1', 'org-1', { userAgent: 'Firefox', ipAddress: '10.0.0.1' });
    const { tokens: rotated } = await tokens.rotate(original.refreshToken, { userAgent: null, ipAddress: '10.0.0.2' });
    assert.equal(rows.length, 2);
    assert.equal(rows[0].sessionId, rows[1].sessionId);
    assert.equal(tokens.verify(rotated.accessToken, 'access').sid, rows[0].sessionId);
    assert.deepEqual(rows.map((row) => row.revoked), [true, false]);
  });

  it('refuses to start when access and refresh secrets are the same', () => {
    const { prisma } = fakePrisma();
    const same = 'the-same-secret-for-both-0123456789abcdef';
    const config = configWith({ JWT_ACCESS_SECRET: same, JWT_REFRESH_SECRET: same });
    assert.throws(() => new TokenService(new JwtService({}), prisma, config), /must be different/);
  });

  it('refuses to start with a missing or short secret', () => {
    const { prisma } = fakePrisma();
    const strong = 'refresh-secret-for-tests-0123456789abcdef';
    assert.throws(() => new TokenService(new JwtService({}), prisma, configWith({ JWT_ACCESS_SECRET: '', JWT_REFRESH_SECRET: strong })), /JWT_ACCESS_SECRET/);
    assert.throws(() => new TokenService(new JwtService({}), prisma, configWith({ JWT_ACCESS_SECRET: 'short', JWT_REFRESH_SECRET: strong })), /at least 32/);
  });
});
