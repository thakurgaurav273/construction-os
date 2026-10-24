import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../../src/common/storage/storage.service';
import type { PrismaService } from '../../src/database/prisma.service';
import { DocumentsService } from '../../src/modules/documents/documents.service';
import { DailyReportWorkflowService } from '../../src/modules/daily-reports/daily-report-workflow.service';
import { DailyReportsService } from '../../src/modules/daily-reports/daily-reports.service';
import { CreateDailyReportDto } from '../../src/modules/daily-reports/dto/create-daily-report.dto';
import { connectTestDatabase } from './support/test-database';
import { OrganizationFixture, archiveProject, createOrganization, createProject, settleTogether } from './support/fixtures';

describe('daily reports', () => {
  let prisma: PrismaService;
  let reports: DailyReportsService;
  let workflow: DailyReportWorkflowService;
  let org: OrganizationFixture;
  let otherOrg: OrganizationFixture;

  before(async () => {
    prisma = await connectTestDatabase();
    const storage = new StorageService(new ConfigService({ STORAGE_DRIVER: 'local', STORAGE_LOCAL_DIR: join(tmpdir(), 'sitepilot-integration') }));
    reports = new DailyReportsService(prisma, new DocumentsService(prisma, storage));
    workflow = new DailyReportWorkflowService(prisma, reports);
    org = await createOrganization(prisma, 'Daily Reports');
    otherOrg = await createOrganization(prisma, 'Daily Reports Other');
  });
  after(() => prisma.$disconnect());

  const reportContent = (work: string | null, date = '2026-10-20'): CreateDailyReportDto => ({
    date,
    workCompleted: work,
    labourDetails: { skilled: 4, unskilled: 10, supervisors: 1 },
    issues: [{ severity: 'medium', description: 'Concrete pump arrived two hours late.' }],
  });
  const draft = (work: string | null = 'Poured slab B2') => reports.create(org.projectId, org.organizationId, org.engineer.id, reportContent(work));

  const submitted = async () => {
    const report = await draft();
    return workflow.submit(org.projectId, report.id, org.organizationId, org.engineer.id);
  };

  it('starts as a draft the author can edit, and needs work described before submitting', async () => {
    const report = await draft(null);
    assert.equal(report.status, 'DRAFT');
    await assert.rejects(workflow.submit(org.projectId, report.id, org.organizationId, org.engineer.id), BadRequestException);

    const edited = await reports.update(org.projectId, report.id, org.organizationId, org.engineer.id, { workCompleted: 'Shuttering for columns C1–C8' });
    assert.equal(edited.workCompleted, 'Shuttering for columns C1–C8');
    await assert.rejects(
      reports.update(org.projectId, report.id, org.organizationId, org.manager.id, { workCompleted: 'Not mine' }),
      ForbiddenException,
    );
    const sent = await workflow.submit(org.projectId, report.id, org.organizationId, org.engineer.id);
    assert.equal(sent.status, 'SUBMITTED');
  });

  it('locks a submitted report', async () => {
    const report = await submitted();
    await assert.rejects(
      reports.update(org.projectId, report.id, org.organizationId, org.engineer.id, { workCompleted: 'Changed my mind' }),
      ConflictException,
    );
    await assert.rejects(workflow.submit(org.projectId, report.id, org.organizationId, org.engineer.id), ConflictException);
  });

  it('never lets the author review their own report', async () => {
    const report = await submitted();
    await assert.rejects(workflow.approve(org.projectId, report.id, org.organizationId, org.engineer.id, {}), ForbiddenException);
    await assert.rejects(workflow.reject(org.projectId, report.id, org.organizationId, org.engineer.id, { note: 'Self review' }), ForbiddenException);
  });

  it('approves once, recording the reviewer, and refuses a second review', async () => {
    const report = await submitted();
    const approved = await workflow.approve(org.projectId, report.id, org.organizationId, org.manager.id, { note: '  Good progress  ' });
    assert.equal(approved.status, 'APPROVED');
    const stored = await prisma.dailyReport.findUniqueOrThrow({ where: { id: report.id } });
    assert.equal(stored.reviewedById, org.manager.id);
    assert.equal(stored.reviewNote, 'Good progress');
    await assert.rejects(workflow.reject(org.projectId, report.id, org.organizationId, org.owner.id, { note: 'Too late' }), ConflictException);
  });

  it('sends a report back with a note, then takes the edited report again with the review cleared', async () => {
    const report = await submitted();
    const sentBack = await workflow.reject(org.projectId, report.id, org.organizationId, org.manager.id, { note: 'Add the labour split' });
    assert.equal(sentBack.status, 'REJECTED');

    await reports.update(org.projectId, report.id, org.organizationId, org.engineer.id, { labourDetails: { skilled: 5, unskilled: 9, supervisors: 1 } });
    const resubmitted = await workflow.submit(org.projectId, report.id, org.organizationId, org.engineer.id);
    assert.equal(resubmitted.status, 'SUBMITTED');
    const stored = await prisma.dailyReport.findUniqueOrThrow({ where: { id: report.id } });
    assert.equal(stored.reviewNote, null);
    assert.equal(stored.reviewedById, null);
  });

  it('writes the project timeline for each step', async () => {
    const report = await submitted();
    await workflow.reject(org.projectId, report.id, org.organizationId, org.manager.id, { note: 'Photos missing' });
    await workflow.submit(org.projectId, report.id, org.organizationId, org.engineer.id);
    await workflow.approve(org.projectId, report.id, org.organizationId, org.owner.id, {});

    const activity = await prisma.activity.findMany({ where: { entityId: report.id }, orderBy: { createdAt: 'asc' } });
    assert.deepEqual(activity.map((entry) => entry.title), [
      'Daily report submitted', 'Daily report sent back', 'Daily report submitted', 'Daily report approved',
    ]);
    assert.deepEqual(activity.map((entry) => entry.actorId), [org.engineer.id, org.manager.id, org.engineer.id, org.owner.id]);
    assert.match(activity[1].description ?? '', /Photos missing/);
  });

  it('lets only one of two reviewers acting at the same moment win', async () => {
    // Repeated because a race only shows up when both reviews read the report before either writes.
    for (let attempt = 0; attempt < 30; attempt++) {
      const report = await submitted();
      const { fulfilled, rejected } = await settleTogether([
        () => workflow.approve(org.projectId, report.id, org.organizationId, org.manager.id, {}),
        () => workflow.reject(org.projectId, report.id, org.organizationId, org.owner.id, { note: 'Redo the quantities' }),
      ]);
      assert.equal(fulfilled.length, 1, `exactly one review should succeed (attempt ${attempt + 1})`);
      assert.ok(rejected[0] instanceof ConflictException);

      const stored = await prisma.dailyReport.findUniqueOrThrow({ where: { id: report.id } });
      assert.equal(stored.status, fulfilled[0].status);
      const reviews = await prisma.activity.count({ where: { entityId: report.id, title: { not: 'Daily report submitted' } } });
      assert.equal(reviews, 1, 'only the winning review is on the timeline');
    }
  });

  it('keeps other organizations out', async () => {
    const report = await submitted();
    await assert.rejects(reports.findOne(org.projectId, report.id, otherOrg.organizationId), NotFoundException);
    await assert.rejects(workflow.approve(org.projectId, report.id, otherOrg.organizationId, otherOrg.manager.id, {}), NotFoundException);
    await assert.rejects(
      reports.create(org.projectId, otherOrg.organizationId, otherOrg.engineer.id, reportContent('Not our project')),
      NotFoundException,
    );
  });

  it('refuses new and edited reports on an archived project but still lets submitted ones be reviewed', async () => {
    const projectId = await createProject(prisma, org.organizationId, org.owner.id, 'Old Depot');
    const open = await reports.create(projectId, org.organizationId, org.engineer.id, reportContent('Fencing', '2026-10-19'));
    const waiting = await reports.create(projectId, org.organizationId, org.engineer.id, reportContent('Survey', '2026-10-18'));
    await workflow.submit(projectId, waiting.id, org.organizationId, org.engineer.id);
    await archiveProject(prisma, projectId);

    await assert.rejects(
      reports.create(projectId, org.organizationId, org.engineer.id, reportContent('Blocked', '2026-10-21')),
      ConflictException,
    );
    await assert.rejects(reports.update(projectId, open.id, org.organizationId, org.engineer.id, { workCompleted: 'More' }), ConflictException);
    const approved = await workflow.approve(projectId, waiting.id, org.organizationId, org.manager.id, {});
    assert.equal(approved.status, 'APPROVED');
  });
});
