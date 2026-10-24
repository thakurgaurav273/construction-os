import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../src/database/prisma.service';
import { shiftDateKey } from '../../src/modules/workforce/attendance-dates';
import { AttendanceInsightsService } from '../../src/modules/workforce/attendance-insights.service';
import { WorkerCertificationsService } from '../../src/modules/workforce/worker-certifications.service';
import { WorkforceService } from '../../src/modules/workforce/workforce.service';
import { connectTestDatabase } from './support/test-database';
import { OrganizationFixture, createOrganization, createWorker } from './support/fixtures';

describe('worker certifications', () => {
  let prisma: PrismaService;
  let workforce: WorkforceService;
  let certifications: WorkerCertificationsService;
  let org: OrganizationFixture;
  let otherOrg: OrganizationFixture;
  let today: string;

  before(async () => {
    prisma = await connectTestDatabase();
    const insights = new AttendanceInsightsService(prisma);
    workforce = new WorkforceService(prisma, insights);
    certifications = new WorkerCertificationsService(prisma, workforce);
    org = await createOrganization(prisma, 'Certifications');
    otherOrg = await createOrganization(prisma, 'Certifications Other');
    ({ today } = await insights.getOrganizationToday(org.organizationId));
  });
  after(() => prisma.$disconnect());

  it('adds certificates with a status derived from the expiry date, soonest first', async () => {
    const workerId = await createWorker(prisma, org.organizationId, 'Ravi Kumar', { projectId: org.projectId });
    await certifications.add(workerId, org.organizationId, org.manager.id, { name: '  Height Safety  ', issuer: 'NSC', expiresOn: shiftDateKey(today, 200) });
    await certifications.add(workerId, org.organizationId, org.manager.id, { name: 'Medical Fitness', expiresOn: shiftDateKey(today, 10) });
    await certifications.add(workerId, org.organizationId, org.manager.id, { name: 'First Aid', expiresOn: shiftDateKey(today, -3) });
    const worker = await certifications.add(workerId, org.organizationId, org.manager.id, { name: 'Induction' });

    assert.deepEqual(worker.certifications.map((entry) => [entry.name, entry.status, entry.daysToExpiry]), [
      ['First Aid', 'expired', -3],
      ['Medical Fitness', 'expiring', 10],
      ['Height Safety', 'valid', 200],
      ['Induction', 'valid', null],
    ]);
    assert.equal(worker.certifications[2].issuer, 'NSC');
    const stored = await prisma.workerCertification.findFirstOrThrow({ where: { workerId, name: 'Height Safety' } });
    assert.equal(stored.createdById, org.manager.id);
  });

  it('feeds the workforce stats: one count per worker for expiring and for expired', async () => {
    const before = await workforce.getStats(org.organizationId);
    const workerId = await createWorker(prisma, org.organizationId, 'Sunil Rao', { projectId: org.projectId });
    await certifications.add(workerId, org.organizationId, org.manager.id, { name: 'A', expiresOn: shiftDateKey(today, 5) });
    await certifications.add(workerId, org.organizationId, org.manager.id, { name: 'B', expiresOn: shiftDateKey(today, 6) });
    await certifications.add(workerId, org.organizationId, org.manager.id, { name: 'C', expiresOn: shiftDateKey(today, -30) });
    const after = await workforce.getStats(org.organizationId);
    assert.equal(after.expiringCerts - before.expiringCerts, 1);
    assert.equal(after.expiredCerts - before.expiredCerts, 1);
  });

  it('renews a certificate by moving its expiry date, and refuses expiry before issue', async () => {
    const workerId = await createWorker(prisma, org.organizationId, 'Asha Devi');
    const added = await certifications.add(workerId, org.organizationId, org.manager.id, { name: 'Induction', issuedOn: shiftDateKey(today, -400), expiresOn: shiftDateKey(today, -35) });
    const id = added.certifications[0].id;
    assert.equal(added.certifications[0].status, 'expired');

    const renewed = await certifications.update(workerId, id, org.organizationId, org.owner.id, { issuedOn: today, expiresOn: shiftDateKey(today, 365) });
    assert.equal(renewed.certifications[0].status, 'valid');
    assert.equal(renewed.certifications[0].name, 'Induction', 'fields left out stay as they were');
    assert.equal((await prisma.workerCertification.findUniqueOrThrow({ where: { id } })).updatedById, org.owner.id);

    await assert.rejects(certifications.update(workerId, id, org.organizationId, org.owner.id, { expiresOn: shiftDateKey(today, -1) }), BadRequestException);
    await assert.rejects(
      certifications.add(workerId, org.organizationId, org.owner.id, { name: 'Bad', issuedOn: today, expiresOn: shiftDateKey(today, -1) }),
      BadRequestException,
    );

    const cleared = await certifications.update(workerId, id, org.organizationId, org.owner.id, { expiresOn: null });
    assert.equal(cleared.certifications[0].expiresOn, null);
    assert.equal(cleared.certifications[0].status, 'valid');
  });

  it('removes a certificate, and only through its own worker', async () => {
    const workerId = await createWorker(prisma, org.organizationId, 'Mohan Lal');
    const otherWorkerId = await createWorker(prisma, org.organizationId, 'Kiran Bai');
    const added = await certifications.add(workerId, org.organizationId, org.manager.id, { name: 'Welding Licence' });
    const id = added.certifications[0].id;

    await assert.rejects(certifications.remove(otherWorkerId, id, org.organizationId), NotFoundException);
    const after = await certifications.remove(workerId, id, org.organizationId);
    assert.equal(after.certifications.length, 0);
  });

  it('keeps other organizations out', async () => {
    const workerId = await createWorker(prisma, org.organizationId, 'Gopal Das');
    const added = await certifications.add(workerId, org.organizationId, org.manager.id, { name: 'Crane Licence' });
    const id = added.certifications[0].id;

    await assert.rejects(certifications.add(workerId, otherOrg.organizationId, otherOrg.manager.id, { name: 'Sneaky' }), NotFoundException);
    await assert.rejects(certifications.update(workerId, id, otherOrg.organizationId, otherOrg.manager.id, { name: 'Changed' }), NotFoundException);
    await assert.rejects(certifications.remove(workerId, id, otherOrg.organizationId), NotFoundException);
    assert.equal((await prisma.workerCertification.findUniqueOrThrow({ where: { id } })).name, 'Crane Licence');
  });
});
