import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DomainEventsService } from '../../src/common/events';
import type { PrismaService } from '../../src/database/prisma.service';
import { AuditService } from '../../src/modules/audit/audit.service';
import { AuthService } from '../../src/modules/auth/auth.service';
import { OrganizationSwitchService } from '../../src/modules/auth/organization-switch.service';
import { TokenService } from '../../src/modules/auth/token.service';
import { connectTestDatabase } from './support/test-database';
import { OrganizationFixture, createOrganization } from './support/fixtures';

const PASSWORD = 'SitePilot@2026!';
const CLIENT = { userAgent: 'integration-test', ipAddress: '127.0.0.1' };

describe('switching organizations', () => {
  let prisma: PrismaService;
  let tokens: TokenService;
  let auth: AuthService;
  let switcher: OrganizationSwitchService;
  let home: OrganizationFixture;
  let second: OrganizationFixture;
  let stranger: OrganizationFixture;
  let email: string;
  let userId: string;

  before(async () => {
    prisma = await connectTestDatabase();
    const config = new ConfigService({
      JWT_ACCESS_SECRET: 'integration-access-secret-0123456789abcdef',
      JWT_REFRESH_SECRET: 'integration-refresh-secret-0123456789abcdef',
    });
    tokens = new TokenService(new JwtService(), prisma, config);
    auth = new AuthService(prisma, tokens);
    switcher = new OrganizationSwitchService(prisma, tokens, new AuditService(prisma, new DomainEventsService()));

    home = await createOrganization(prisma, 'Home Builders');
    second = await createOrganization(prisma, 'Second Site Co');
    stranger = await createOrganization(prisma, 'Stranger Infra');
    // The home organization's engineer also joins the second organization later, as its project manager.
    userId = home.engineer.id;
    const user = await prisma.user.update({ where: { id: userId }, data: { password: await bcrypt.hash(PASSWORD, 4) } });
    email = user.email;
    await prisma.userOrganization.create({ data: { userId, organizationId: second.organizationId, role: 'PROJECT_MANAGER', joinedAt: new Date(Date.now() + 1000) } });
  });
  after(() => prisma.$disconnect());

  const signIn = () => auth.login({ email, password: PASSWORD }, CLIENT);

  it('lists every organization the person belongs to, marking the current one', async () => {
    const list = await switcher.listMemberships(userId, home.organizationId);
    assert.deepEqual(list.map((entry) => [entry.name.split(' ')[0], entry.role, entry.isCurrent]).sort(), [
      ['Home', 'SITE_ENGINEER', true],
      ['Second', 'PROJECT_MANAGER', false],
    ]);
  });

  it('moves the session to another organization, keeping it the same session', async () => {
    const { tokens: start, session } = await signIn();
    assert.equal(session.organization?.id, home.organizationId, 'first sign-in opens the organization joined first');

    const switched = await switcher.switchTo(userId, start.refreshToken, second.organizationId, CLIENT);
    assert.equal(switched.session.organization?.id, second.organizationId);
    const before = tokens.verify(start.refreshToken, 'refresh');
    const after = tokens.verify(switched.tokens.accessToken, 'access');
    assert.equal(after.organizationId, second.organizationId);
    assert.equal(after.sid, before.sid, 'Settings → Security still shows one session');
    assert.ok(!('lastOrganizationId' in switched.session.user), 'internal fields stay out of the response');

    await assert.rejects(tokens.rotate(start.refreshToken, CLIENT), UnauthorizedException, 'the old refresh token is used up');
  });

  it('reopens the organization they used last at the next sign-in', async () => {
    const { session } = await signIn();
    assert.equal(session.organization?.id, second.organizationId);
  });

  it('falls back to the first organization when they have left the last one', async () => {
    await prisma.userOrganization.delete({ where: { userId_organizationId: { userId, organizationId: second.organizationId } } });
    const { session } = await signIn();
    assert.equal(session.organization?.id, home.organizationId);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).lastOrganizationId, home.organizationId);
    await prisma.userOrganization.create({ data: { userId, organizationId: second.organizationId, role: 'PROJECT_MANAGER' } });
  });

  it('refuses organizations they don’t belong to, without changing the session', async () => {
    const { tokens: start } = await signIn();
    await assert.rejects(switcher.switchTo(userId, start.refreshToken, stranger.organizationId, CLIENT), ForbiddenException);
    await assert.rejects(switcher.switchTo(userId, start.refreshToken, '00000000-0000-4000-8000-000000000000', CLIENT), ForbiddenException);
    const stillValid = await tokens.rotate(start.refreshToken, CLIENT);
    assert.equal(stillValid.payload.organizationId, home.organizationId);
  });

  it('refuses a refresh token that belongs to someone else, and a missing one', async () => {
    const other = await prisma.user.update({ where: { id: home.manager.id }, data: { password: await bcrypt.hash(PASSWORD, 4) } });
    await prisma.userOrganization.create({ data: { userId: other.id, organizationId: second.organizationId, role: 'VIEWER' } });
    const { tokens: theirs } = await auth.login({ email: other.email, password: PASSWORD }, CLIENT);
    await assert.rejects(switcher.switchTo(userId, theirs.refreshToken, second.organizationId, CLIENT), UnauthorizedException);
    const untouched = await tokens.rotate(theirs.refreshToken, CLIENT);
    assert.equal(untouched.payload.organizationId, home.organizationId, 'the other person’s session is left exactly as it was');
    await assert.rejects(switcher.switchTo(userId, undefined, second.organizationId, CLIENT), UnauthorizedException);
  });

  it('records the switch in the organization switched into', async () => {
    const { tokens: start } = await signIn();
    const target = (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).lastOrganizationId === home.organizationId ? second : home;
    await switcher.switchTo(userId, start.refreshToken, target.organizationId, CLIENT);
    const entry = await prisma.auditLog.findFirst({ where: { organizationId: target.organizationId, action: 'auth.switched_organization', actorId: userId } });
    assert.ok(entry);
    assert.equal(entry.ipAddress, '127.0.0.1');
  });

  it('refuses inactive accounts', async () => {
    const { tokens: start } = await signIn();
    await prisma.user.update({ where: { id: userId }, data: { status: 'INACTIVE' } });
    await assert.rejects(switcher.switchTo(userId, start.refreshToken, second.organizationId, CLIENT), UnauthorizedException);
    await prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } });
  });
});
