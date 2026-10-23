import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { firstRunAt, isValidTimeZone, nextRunAfter, zonedTimeToUtc } from '../src/modules/reports/schedule-timing';
import { elapsedShare, scheduleHealth } from '../src/modules/reports/content/builders/schedule.builder';
import { readIssues } from '../src/modules/reports/content/builders/safety.builder';
import type { ReportDocument } from '../src/modules/reports/content/report-document';
import { renderReportExcel } from '../src/modules/reports/render/excel-renderer';
import { renderReportPdf } from '../src/modules/reports/render/pdf-renderer';
import { reportPeriod } from '../src/modules/reports/reports.service';

describe('report schedule timing', () => {
  it('runs at the wall-clock time in the schedule’s zone, not the server’s', () => {
    assert.equal(zonedTimeToUtc({ year: 2026, month: 10, day: 24 }, 9, 0, 'Asia/Kolkata').toISOString(), '2026-10-24T03:30:00.000Z');
    assert.equal(zonedTimeToUtc({ year: 2026, month: 7, day: 1 }, 9, 0, 'America/New_York').toISOString(), '2026-07-01T13:00:00.000Z');
  });

  it('starts today when the time is still ahead, otherwise tomorrow', () => {
    const now = new Date('2026-10-24T02:00:00Z'); // 07:30 in Kolkata
    assert.equal(firstRunAt('09:00', 'Asia/Kolkata', now).toISOString(), '2026-10-24T03:30:00.000Z');
    assert.equal(firstRunAt('07:00', 'Asia/Kolkata', now).toISOString(), '2026-10-25T01:30:00.000Z');
  });

  it('keeps 09:00 local across a DST change', () => {
    const previous = new Date('2026-10-31T13:00:00Z'); // Sat 09:00 EDT
    const next = nextRunAfter('DAILY', '09:00', 'America/New_York', previous, previous);
    assert.equal(next?.toISOString(), '2026-11-01T14:00:00.000Z'); // Sun 09:00 EST
  });

  it('steps weekly and monthly, clamping to short months', () => {
    const previous = new Date('2026-01-31T03:30:00Z');
    assert.equal(nextRunAfter('WEEKLY', '09:00', 'Asia/Kolkata', previous, previous)?.toISOString(), '2026-02-07T03:30:00.000Z');
    assert.equal(nextRunAfter('MONTHLY', '09:00', 'Asia/Kolkata', previous, previous)?.toISOString(), '2026-02-28T03:30:00.000Z');
  });

  it('skips runs missed while the server was down', () => {
    const previous = new Date('2026-10-01T03:30:00Z');
    const now = new Date('2026-10-24T05:00:00Z');
    assert.equal(nextRunAfter('DAILY', '09:00', 'Asia/Kolkata', previous, now)?.toISOString(), '2026-10-25T03:30:00.000Z');
  });

  it('has no next run for one-off schedules, and rejects unknown zones', () => {
    assert.equal(nextRunAfter('ONCE', '09:00', 'Asia/Kolkata', new Date(), new Date()), null);
    assert.equal(isValidTimeZone('Asia/Kolkata'), true);
    assert.equal(isValidTimeZone('Mars/Olympus'), false);
  });
});

describe('report content', () => {
  const project = { status: 'ACTIVE' as const, startDate: new Date('2026-01-01'), expectedCompletion: new Date('2026-12-31') };

  it('compares progress with the share of the timeline elapsed', () => {
    const midYear = new Date('2026-07-02');
    assert.equal(elapsedShare({ ...project, progress: 0 }, midYear), 50);
    assert.equal(scheduleHealth({ ...project, progress: 45 }, midYear), 'On track');
    assert.equal(scheduleHealth({ ...project, progress: 30 }, midYear), 'Behind');
    assert.equal(scheduleHealth({ ...project, progress: 90 }, new Date('2027-01-10')), 'Overdue');
    assert.equal(scheduleHealth({ ...project, startDate: null, progress: 10 }, midYear), 'Not scheduled');
  });

  it('reads only well-formed site issues from daily reports', () => {
    assert.deepEqual(
      readIssues([{ severity: 'high', description: 'Scaffold loose' }, { severity: 'severe', description: 'x' }, 'text', null]),
      [{ severity: 'high', description: 'Scaffold loose' }],
    );
    assert.deepEqual(readIssues(null), []);
  });
});

describe('report rendering', () => {
  const document: ReportDocument = {
    type: 'EXECUTIVE',
    title: 'Executive Summary',
    subtitle: 'Portfolio health.',
    organizationName: 'Acme Infra',
    generatedAt: '2026-10-24T03:30:00.000Z',
    period: { from: '2026-10-01T00:00:00.000Z', to: '2026-10-24T23:59:59.999Z' },
    projectNames: ['Ring Road'],
    allProjects: false,
    metrics: [{ label: 'Spent', value: 1234567, kind: 'money' }],
    sections: [
      { title: 'Risks', bullets: ['Ring Road is over budget.'] },
      { title: 'Projects', table: { columns: [{ key: 'name', label: 'Project', kind: 'text' }], rows: [{ name: 'Ring Road' }], emptyText: 'None' } },
    ],
    aiSummary: null,
  };
  const branding = { organizationName: 'Acme Infra', currency: 'INR', timezone: 'Asia/Kolkata', brandColor: '#2563EB', logo: null };

  it('renders a PDF and an Excel workbook without changing the stored content', async () => {
    const before = JSON.stringify(document);
    const [pdf, excel] = await Promise.all([renderReportPdf(document, branding), renderReportExcel(document, branding)]);
    assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
    assert.equal(excel.subarray(0, 2).toString(), 'PK');
    assert.equal(JSON.stringify(document), before);
  });
});

describe('report period', () => {
  const now = new Date('2026-10-24T10:00:00Z');

  it('covers whole days and defaults to the last 30', () => {
    const chosen = reportPeriod('2026-10-01', '2026-10-24', now);
    assert.equal(chosen.from.toISOString(), '2026-10-01T00:00:00.000Z');
    assert.equal(chosen.to.toISOString(), '2026-10-24T23:59:59.999Z');
    const fallback = reportPeriod(undefined, undefined, now);
    assert.equal(fallback.from.toISOString(), '2026-09-25T00:00:00.000Z');
    assert.equal(fallback.to, now);
  });

  it('rejects reversed and over-long periods', () => {
    assert.throws(() => reportPeriod('2026-10-10', '2026-10-01', now), /on or before/);
    assert.throws(() => reportPeriod('2024-01-01', '2026-10-01', now), /at most 366 days/);
  });
});
