import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../../src/common/mail/mail.service';
import { JobsService } from '../../src/common/jobs/jobs.service';
import type { PrismaService } from '../../src/database/prisma.service';
import { TokenService } from '../../src/modules/auth/token.service';
import { NotificationRecipientsService } from '../../src/modules/notifications/notification-recipients.service';
import { NotificationsGateway } from '../../src/modules/notifications/notifications.gateway';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { PushService } from '../../src/modules/notifications/push/push.service';
import { shiftDateKey, dateKeyToDbDate } from '../../src/modules/workforce/attendance-dates';
import { AttendanceInsightsService } from '../../src/modules/workforce/attendance-insights.service';
import { CertificationRemindersService } from '../../src/modules/workforce/certification-reminders.service';
import { WorkerCertificationsService } from '../../src/modules/workforce/worker-certifications.service';
import { WorkforceService } from '../../src/modules/workforce/workforce.service';
import { connectTestDatabase } from './support/test-database';
import { OrganizationFixture, createOrganization, createProject, createWorker, settleTogether } from './support/fixtures';
import { AccessService } from '../../src/common/permissions';

/** 11:30 in India; the calendar day there is the same as the UTC day. */
const MORNING = new Date('2026-11-01T06:00:00.000Z');
const TODAY = '2026-11-01';
/** 06:30 in India: too early for reminders. */
const DAWN = new Date('2026-11-01T01:00:00.000Z');

describe('certification reminders', () => {
  let prisma: PrismaService;
  let reminders: CertificationRemindersService;
  let certifications: WorkerCertificationsService;
  let org: OrganizationFixture;
  let unassignedWorker: string;
  let siteWorker: string;

  before(async () => {
    prisma = await connectTestDatabase();
    const config = new ConfigService({
      FRONTEND_URL: 'http://localhost:5173',
      JWT_ACCESS_SECRET: 'integration-access-secret-0123456789abcdef',
      JWT_REFRESH_SECRET: 'integration-refresh-secret-0123456789abcdef',
    });
    const push = new PushService(prisma, { sendToTokens: async () => ({ invalidTokens: [] }) });
    const gateway = new NotificationsGateway(new TokenService(new JwtService(), prisma, config));
    const notifications = new NotificationsService(prisma, push, gateway, new MailService(), config);
    reminders = new CertificationRemindersService(prisma, new JobsService(config), notifications, new NotificationRecipientsService(prisma, new AccessService(prisma)));
    certifications = new WorkerCertificationsService(prisma, new WorkforceService(prisma, new AttendanceInsightsService(prisma)));

    org = await createOrganization(prisma, 'Reminders');
    // The manager is on the project team, so that project's digest goes to them rather than everyone.
    await prisma.projectMember.create({ data: { projectId: org.projectId, userId: org.manager.id, role: 'MANAGER' } });
    siteWorker = await createWorker(prisma, org.organizationId, 'Ravi Kumar', { projectId: org.projectId });
    unassignedWorker = await createWorker(prisma, org.organizationId, 'Sunil Rao');
    const add = (workerId: string, name: string, days: number | null) => prisma.workerCertification.create({
      data: { workerId, organizationId: org.organizationId, name, expiresOn: days === null ? null : dateKeyToDbDate(shiftDateKey(TODAY, days)) },
    });
    await add(siteWorker, 'First Aid', 20);
    await add(siteWorker, 'Height Safety', 5);
    await add(siteWorker, 'Medical Fitness', -3);
    await add(siteWorker, 'Crane Licence', 60);
    await add(siteWorker, 'Induction', null);
    await add(unassignedWorker, 'Welding Licence', 2);
    const leaver = await createWorker(prisma, org.organizationId, 'Former Hand', { deactivated: true });
    await add(leaver, 'Old Pass', -10);
  });
  after(() => prisma.$disconnect());

  const remindersFor = (userId: string) => prisma.notification.findMany({
    where: { organizationId: org.organizationId, userId, category: 'reminders' },
    orderBy: { createdAt: 'asc' },
  });
  const stageOf = async (name: string) => (await prisma.workerCertification.findFirstOrThrow({ where: { organizationId: org.organizationId, name } })).remindedStage;

  it('waits for the morning in the organization’s time zone', async () => {
    await reminders.sendDueReminders(DAWN);
    assert.equal((await remindersFor(org.manager.id)).length, 0);
    assert.equal(await stageOf('First Aid'), null);
  });

  it('sends one digest per project, to its team, with the most urgent first', async () => {
    await reminders.sendDueReminders(MORNING);

    const managerInbox = await remindersFor(org.manager.id);
    const siteDigest = managerInbox.find((notification) => notification.title.includes('Ring Road'));
    assert.ok(siteDigest, 'the project team hears about its own workers');
    assert.equal(siteDigest.title, '3 certificates on Ring Road need renewal');
    assert.equal(siteDigest.message, 'Ravi Kumar: Medical Fitness expired 3 days ago, Height Safety expires in 5 days, First Aid expires in 20 days.');
    assert.equal(siteDigest.type, 'ERROR', 'an expired certificate makes it urgent');
    assert.equal(siteDigest.link, '/dashboard/workforce');

    const ownerInbox = await remindersFor(org.owner.id);
    assert.ok(!ownerInbox.some((notification) => notification.title.includes('Ring Road')), 'project digests prefer the project team');
    const unassigned = ownerInbox.find((notification) => notification.title.startsWith('Sunil Rao'));
    assert.ok(unassigned, 'workers without a project go to everyone who manages the workforce');
    assert.equal(unassigned.title, "Sunil Rao's Welding Licence expires in 2 days");
    assert.equal(unassigned.type, 'WARNING');
    assert.equal(unassigned.entityType, 'worker_certification');

    const engineerInbox = await remindersFor(org.engineer.id);
    assert.ok(!engineerInbox.some((notification) => notification.title.includes('Ring Road')), 'project digests go to the project team only');
    assert.ok(engineerInbox.some((notification) => notification.title.startsWith('Sunil Rao')), 'site engineers manage the workforce, so they hear about unassigned workers');
    assert.equal(await stageOf('First Aid'), 'EXPIRING_SOON');
    assert.equal(await stageOf('Height Safety'), 'EXPIRING_THIS_WEEK');
    assert.equal(await stageOf('Medical Fitness'), 'EXPIRED');
    assert.equal(await stageOf('Crane Licence'), null);
    assert.equal(await stageOf('Induction'), null);
    assert.equal(await stageOf('Old Pass'), null, 'deactivated workers are left alone');
  });

  it('never repeats a stage, however often it runs, even concurrently', async () => {
    const before = (await remindersFor(org.manager.id)).length;
    await settleTogether([() => reminders.sendDueReminders(MORNING), () => reminders.sendDueReminders(MORNING)]);
    await reminders.sendDueReminders(new Date(MORNING.getTime() + 3 * 3600 * 1000));
    assert.equal((await remindersFor(org.manager.id)).length, before);
  });

  it('reminds again as each certificate reaches its next stage', async () => {
    const before = (await remindersFor(org.manager.id)).length;
    const sixteenDaysLater = new Date(MORNING.getTime() + 16 * 86_400_000);
    await reminders.sendDueReminders(sixteenDaysLater);

    const latest = (await remindersFor(org.manager.id)).slice(before);
    const siteDigests = latest.filter((notification) => notification.title.includes('Ring Road'));
    assert.equal(siteDigests.length, 1);
    assert.equal(siteDigests[0].title, '2 certificates on Ring Road need renewal');
    assert.match(siteDigests[0].message, /^Ravi Kumar: Height Safety expired 11 days ago, First Aid expires in 4 days\.$/);
    assert.ok(latest.some((notification) => notification.title === "Sunil Rao's Welding Licence expired 14 days ago"), 'the unassigned worker’s licence has now expired too');
    assert.equal(await stageOf('First Aid'), 'EXPIRING_THIS_WEEK');
    assert.equal(await stageOf('Height Safety'), 'EXPIRED');
  });

  it('starts over when a certificate is renewed', async () => {
    const medical = await prisma.workerCertification.findFirstOrThrow({ where: { organizationId: org.organizationId, name: 'Medical Fitness' } });
    await certifications.update(siteWorker, medical.id, org.organizationId, org.manager.id, { name: 'Medical Fitness (renewed)' });
    assert.equal(await stageOf('Medical Fitness (renewed)'), 'EXPIRED', 'other edits keep the reminder history');

    await certifications.update(siteWorker, medical.id, org.organizationId, org.manager.id, { expiresOn: shiftDateKey(TODAY, 365) });
    assert.equal(await stageOf('Medical Fitness (renewed)'), null);
  });

  it('keeps a long digest readable: grouped by worker, five certificates named, the rest counted', async () => {
    const projectId = await createProject(prisma, org.organizationId, org.owner.id, 'Metro Yard');
    const asha = await createWorker(prisma, org.organizationId, 'Asha Devi', { projectId });
    const mohan = await createWorker(prisma, org.organizationId, 'Mohan Lal', { projectId });
    const add = (workerId: string, name: string, days: number) => prisma.workerCertification.create({
      data: { workerId, organizationId: org.organizationId, name, expiresOn: dateKeyToDbDate(shiftDateKey(TODAY, days)) },
    });
    await add(asha, 'A1', -9);
    await add(mohan, 'M1', -5);
    await add(asha, 'A2', 3);
    await add(mohan, 'M2', 10);
    await add(asha, 'A3', 12);
    await add(mohan, 'M3', 25);
    await add(asha, 'A4', 28);
    await reminders.sendDueReminders(MORNING);

    const digest = (await remindersFor(org.owner.id)).find((notification) => notification.title.includes('Metro Yard'));
    assert.ok(digest);
    assert.equal(digest.title, '7 certificates on Metro Yard need renewal');
    assert.equal(digest.message, 'Asha Devi: A1 expired 9 days ago, A2 expires in 3 days, A3 expires in 12 days; Mohan Lal: M1 expired 5 days ago, M2 expires in 10 days; and 2 more.');
  });

  it('keeps organizations apart', async () => {
    const other = await createOrganization(prisma, 'Reminders Other');
    const projectId = await createProject(prisma, other.organizationId, other.owner.id, 'Elsewhere');
    const worker = await createWorker(prisma, other.organizationId, 'Other Worker', { projectId });
    await prisma.workerCertification.create({ data: { workerId: worker, organizationId: other.organizationId, name: 'Their Pass', expiresOn: dateKeyToDbDate(shiftDateKey(TODAY, 3)) } });
    await reminders.sendDueReminders(MORNING);

    const theirs = await prisma.notification.findMany({ where: { organizationId: other.organizationId, category: 'reminders' } });
    assert.ok(theirs.length > 0);
    assert.ok(theirs.every((notification) => [other.owner.id, other.manager.id, other.engineer.id].includes(notification.userId)));
    assert.ok(!(await remindersFor(org.manager.id)).some((notification) => notification.message.includes('Their Pass') || notification.title.includes('Other Worker')));
  });
});
