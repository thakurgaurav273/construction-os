import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../src/database/prisma.service';
import { dateKeyToDbDate, shiftDateKey, toLocalMinutes } from '../../src/modules/workforce/attendance-dates';
import { AttendanceInsightsService } from '../../src/modules/workforce/attendance-insights.service';
import { AttendanceService } from '../../src/modules/workforce/attendance.service';
import { LATE_GRACE_MINUTES, SHIFT_START_MINUTES } from '../../src/modules/workforce/workforce.constants';
import { connectTestDatabase } from './support/test-database';
import { OrganizationFixture, archiveProject, createOrganization, createProject, createWorker, settleTogether } from './support/fixtures';

describe('attendance', () => {
  let prisma: PrismaService;
  let attendance: AttendanceService;
  let org: OrganizationFixture;
  let otherOrg: OrganizationFixture;
  let secondSiteId: string;
  let today: string;
  let yesterday: string;

  before(async () => {
    prisma = await connectTestDatabase();
    const insights = new AttendanceInsightsService(prisma);
    attendance = new AttendanceService(prisma, insights);
    org = await createOrganization(prisma, 'Attendance');
    otherOrg = await createOrganization(prisma, 'Attendance Other');
    secondSiteId = await createProject(prisma, org.organizationId, org.owner.id, 'Metro Depot');
    ({ today } = await insights.getOrganizationToday(org.organizationId));
    yesterday = shiftDateKey(today, -1);
  });
  after(() => prisma.$disconnect());

  const crew = (count: number, label: string, projectId = org.projectId): Promise<string[]> => Promise.all(
    Array.from({ length: count }, (_, index) => createWorker(prisma, org.organizationId, `${label} ${index + 1}`, { projectId })),
  );

  it('marks a crew for a day, counts it, and records it on the project timeline', async () => {
    const [ravi, sunil, asha] = await crew(3, 'Crew A');
    const roster = await attendance.markAttendance(org.organizationId, org.projectId, org.engineer.id, {
      date: yesterday,
      entries: [
        { workerId: ravi, status: 'PRESENT' },
        { workerId: sunil, status: 'HALF_DAY' },
        { workerId: asha, status: 'ABSENT', notes: '  Fever  ' },
      ],
    });
    assert.equal(roster.date, yesterday);
    assert.equal(roster.summary.present, 1);
    assert.equal(roster.summary.halfDay, 1);
    assert.equal(roster.summary.absent, 1);
    assert.equal(roster.entries.find((entry) => entry.worker.id === asha)?.record?.notes, 'Fever');

    const timeline = await prisma.activity.findFirst({ where: { projectId: org.projectId, entityType: 'attendance' }, orderBy: { createdAt: 'desc' } });
    assert.match(timeline?.description ?? '', /2 on site, 1 absent/);
  });

  it('updates a day already marked instead of adding a second record', async () => {
    const [worker] = await crew(1, 'Crew B');
    const mark = (status: 'PRESENT' | 'LATE') => attendance.markAttendance(org.organizationId, org.projectId, org.engineer.id, {
      date: yesterday, entries: [{ workerId: worker, status }],
    });
    await mark('PRESENT');
    await mark('LATE');
    const records = await prisma.attendance.findMany({ where: { workerId: worker } });
    assert.equal(records.length, 1);
    assert.equal(records[0].status, 'LATE');
  });

  it('refuses future dates, repeated workers, and workers who are inactive or belong elsewhere', async () => {
    const [worker] = await crew(1, 'Crew C');
    const inactive = await createWorker(prisma, org.organizationId, 'Former Hand', { projectId: org.projectId, deactivated: true });
    const outsider = await createWorker(prisma, otherOrg.organizationId, 'Other Org Hand');
    const mark = (date: string, workerIds: string[]) => attendance.markAttendance(org.organizationId, org.projectId, org.engineer.id, {
      date, entries: workerIds.map((workerId) => ({ workerId, status: 'PRESENT' as const })),
    });

    await assert.rejects(mark(shiftDateKey(today, 1), [worker]), BadRequestException);
    await assert.rejects(mark(yesterday, [worker, worker]), BadRequestException);
    await assert.rejects(mark(yesterday, [inactive]), BadRequestException);
    await assert.rejects(mark(yesterday, [outsider]), BadRequestException);
    assert.equal(await prisma.attendance.count({ where: { workerId: { in: [worker, inactive, outsider] } } }), 0);
  });

  it('keeps a worker to one site per day', async () => {
    const [worker] = await crew(1, 'Crew D');
    await attendance.markAttendance(org.organizationId, org.projectId, org.engineer.id, { date: yesterday, entries: [{ workerId: worker, status: 'PRESENT' }] });
    await assert.rejects(
      attendance.markAttendance(org.organizationId, secondSiteId, org.engineer.id, { date: yesterday, entries: [{ workerId: worker, status: 'PRESENT' }] }),
      ConflictException,
    );
  });

  it('keeps a worker to one site even when two sites mark them at the same moment', async () => {
    for (let attempt = 0; attempt < 15; attempt++) {
      const worker = await createWorker(prisma, org.organizationId, `Contested ${attempt}`);
      const markAt = (projectId: string) => () => attendance.markAttendance(org.organizationId, projectId, org.engineer.id, {
        date: yesterday, entries: [{ workerId: worker, status: 'PRESENT' }],
      });
      const { fulfilled, rejected } = await settleTogether([markAt(org.projectId), markAt(secondSiteId)]);
      assert.equal(fulfilled.length, 1, `only one site should record the worker (attempt ${attempt + 1})`);
      assert.ok(rejected[0] instanceof ConflictException, `the other site is told why: ${String(rejected[0])}`);
      const winningSite = fulfilled[0].entries.some((entry) => entry.worker.id === worker && entry.record) ? 'reported' : 'missing';
      assert.equal(winningSite, 'reported', 'the site that succeeded shows the worker as marked');
    }
  });

  it('clears check-in times when someone is marked absent or on leave', async () => {
    const [worker] = await crew(1, 'Crew E');
    await attendance.checkIn(org.organizationId, org.projectId, org.engineer.id, worker);
    await attendance.markAttendance(org.organizationId, org.projectId, org.engineer.id, { date: today, entries: [{ workerId: worker, status: 'ON_LEAVE' }] });
    const record = await prisma.attendance.findUniqueOrThrow({ where: { workerId_date: { workerId: worker, date: dateKeyToDbDate(today) } } });
    assert.equal(record.checkInAt, null);
    assert.equal(record.status, 'ON_LEAVE');
  });

  it('checks in once, judging lateness against the shift in the organization’s time zone', async () => {
    const [worker] = await crew(1, 'Crew F');
    const before = new Date();
    const record = await attendance.checkIn(org.organizationId, org.projectId, org.engineer.id, worker);
    const late = toLocalMinutes(before, 'Asia/Kolkata') > SHIFT_START_MINUTES.DAY + LATE_GRACE_MINUTES;
    assert.equal(record.status, late ? 'LATE' : 'PRESENT');
    assert.ok(record.checkInAt);
    await assert.rejects(attendance.checkIn(org.organizationId, org.projectId, org.engineer.id, worker), ConflictException);
    await assert.rejects(attendance.checkIn(org.organizationId, secondSiteId, org.engineer.id, worker), ConflictException);
  });

  it('checks out only after checking in at the same site, once, and records the hours', async () => {
    const [worker] = await crew(1, 'Crew G');
    await assert.rejects(attendance.checkOut(org.organizationId, org.projectId, org.engineer.id, worker), ConflictException);
    await attendance.checkIn(org.organizationId, org.projectId, org.engineer.id, worker);
    await assert.rejects(attendance.checkOut(org.organizationId, secondSiteId, org.engineer.id, worker), ConflictException);

    const record = await attendance.checkOut(org.organizationId, org.projectId, org.engineer.id, worker);
    assert.ok(record.checkOutAt);
    assert.ok(record.hoursWorked !== null && record.hoursWorked >= 0 && record.hoursWorked < 0.1);
    await assert.rejects(attendance.checkOut(org.organizationId, org.projectId, org.engineer.id, worker), ConflictException);
  });

  it('lists the site’s crew plus anyone recorded there that day who has since moved', async () => {
    const siteId = await createProject(prisma, org.organizationId, org.owner.id, 'Flyover');
    const [stayed, moved] = await crew(2, 'Crew H', siteId);
    await attendance.markAttendance(org.organizationId, siteId, org.engineer.id, {
      date: yesterday, entries: [{ workerId: stayed, status: 'PRESENT' }, { workerId: moved, status: 'PRESENT' }],
    });
    await prisma.worker.update({ where: { id: moved }, data: { projectId: secondSiteId } });

    const roster = await attendance.getRoster(org.organizationId, siteId, yesterday);
    assert.deepEqual(roster.entries.map((entry) => entry.worker.id).sort(), [stayed, moved].sort());
    const todayRoster = await attendance.getRoster(org.organizationId, siteId, today);
    assert.deepEqual(todayRoster.entries.map((entry) => entry.worker.id), [stayed]);
    assert.equal(todayRoster.summary.notMarked, 1);
  });

  it('keeps archived projects readable but closed for marking, and other organizations out', async () => {
    const siteId = await createProject(prisma, org.organizationId, org.owner.id, 'Closed Yard');
    const [worker] = await crew(1, 'Crew I', siteId);
    await archiveProject(prisma, siteId);
    await assert.rejects(
      attendance.markAttendance(org.organizationId, siteId, org.engineer.id, { date: yesterday, entries: [{ workerId: worker, status: 'PRESENT' }] }),
      ConflictException,
    );
    await assert.rejects(attendance.checkIn(org.organizationId, siteId, org.engineer.id, worker), ConflictException);
    assert.equal((await attendance.getRoster(org.organizationId, siteId, yesterday)).entries.length, 1);
    await assert.rejects(attendance.getRoster(otherOrg.organizationId, siteId, yesterday), NotFoundException);
  });
});
