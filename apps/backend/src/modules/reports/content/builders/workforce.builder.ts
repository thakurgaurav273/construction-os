import { AttendanceStatus } from '@prisma/client';
import { describeCertificationIssues, reportReferenceDay } from '../../../workforce/certification-status';
import { ReportBuilder, col, inPeriod, projectIds, share, table } from '../report-document';

/** Beyond a standard shift, hours count as overtime. */
const STANDARD_SHIFT_HOURS = 8;
const ATTENDED: AttendanceStatus[] = ['PRESENT', 'LATE', 'HALF_DAY'];

interface AttendanceTally { marked: number; attended: number; absent: number; hours: number; overtime: number }

function tally(records: { status: AttendanceStatus; hoursWorked: number | null }[]): AttendanceTally {
  return records.reduce<AttendanceTally>((totals, record) => {
    const hours = record.hoursWorked ?? 0;
    return {
      marked: totals.marked + 1,
      attended: totals.attended + (ATTENDED.includes(record.status) ? 1 : 0),
      absent: totals.absent + (record.status === 'ABSENT' ? 1 : 0),
      hours: totals.hours + hours,
      overtime: totals.overtime + Math.max(0, hours - STANDARD_SHIFT_HOURS),
    };
  }, { marked: 0, attended: 0, absent: 0, hours: 0, overtime: 0 });
}

function tallyRow(totals: AttendanceTally): Record<string, number | null> {
  return {
    marked: totals.marked,
    attended: totals.attended,
    absent: totals.absent,
    rate: share(totals.attended, totals.marked),
    hours: Math.round(totals.hours * 10) / 10,
    overtime: Math.round(totals.overtime * 10) / 10,
  };
}

const TALLY_COLUMNS = [
  col('marked', 'Days marked', 'number'),
  col('attended', 'Attended', 'number'),
  col('absent', 'Absent', 'number'),
  col('rate', 'Attendance', 'percent'),
  col('hours', 'Hours', 'number'),
  col('overtime', 'Overtime hours', 'number'),
];

/** Headcount by trade, attendance and overtime in the period, and compliance gaps. */
export const buildWorkforceReport: ReportBuilder = async (scope) => {
  const ids = projectIds(scope);
  const [workers, attendance] = await Promise.all([
    scope.prisma.worker.findMany({
      where: { organizationId: scope.organizationId, projectId: { in: ids }, deactivatedAt: null },
      select: { id: true, name: true, trade: true, type: true, ppeCompliant: true, certifications: { select: { name: true, expiresOn: true } }, projectId: true },
      orderBy: { name: 'asc' },
    }),
    scope.prisma.attendance.findMany({
      where: { organizationId: scope.organizationId, projectId: { in: ids }, date: inPeriod(scope) },
      select: { workerId: true, projectId: true, status: true, hoursWorked: true, worker: { select: { trade: true } } },
    }),
  ]);

  const overall = tally(attendance);
  const trades = [...new Set([...workers.map((worker) => worker.trade), ...attendance.map((record) => record.worker.trade)])].sort();
  const nonCompliant = workers.filter((worker) => !worker.ppeCompliant);
  const asOf = reportReferenceDay(scope.to);
  const certificateIssues = workers.flatMap((worker) => describeCertificationIssues(worker.certifications, asOf).map((issue) => ({ worker, issue })));

  return {
    subtitle: 'Headcount, attendance, overtime and compliance across the crew.',
    metrics: [
      { label: 'Active workers', value: workers.length, kind: 'number' },
      { label: 'Attendance rate', value: share(overall.attended, overall.marked), kind: 'percent' },
      { label: 'Hours worked', value: Math.round(overall.hours), kind: 'number' },
      { label: 'Overtime hours', value: Math.round(overall.overtime), kind: 'number', hint: `Beyond ${STANDARD_SHIFT_HOURS} hours a day` },
      { label: 'PPE gaps', value: nonCompliant.length, kind: 'number', tone: nonCompliant.length > 0 ? 'bad' : 'good' },
    ],
    sections: [
      {
        title: 'By trade',
        table: table(
          [col('trade', 'Trade'), col('workers', 'Workers', 'number'), ...TALLY_COLUMNS],
          trades.map((trade) => ({
            trade,
            workers: workers.filter((worker) => worker.trade === trade).length,
            ...tallyRow(tally(attendance.filter((record) => record.worker.trade === trade))),
          })),
          'No workers are assigned to these projects yet.',
          { trade: 'Total', workers: workers.length, ...tallyRow(overall) },
        ),
      },
      {
        title: 'By project',
        table: table(
          [col('project', 'Project'), col('workers', 'Workers', 'number'), ...TALLY_COLUMNS],
          scope.projects.map((project) => ({
            project: project.name,
            workers: workers.filter((worker) => worker.projectId === project.id).length,
            ...tallyRow(tally(attendance.filter((record) => record.projectId === project.id))),
          })),
          'No projects in scope.',
        ),
      },
      {
        title: 'Compliance',
        table: table(
          [col('name', 'Worker'), col('trade', 'Trade'), col('issue', 'Issue')],
          [
            ...nonCompliant.map((worker) => ({ name: worker.name, trade: worker.trade, issue: 'PPE not compliant' })),
            ...certificateIssues.map(({ worker, issue }) => ({ name: worker.name, trade: worker.trade, issue })),
          ],
          'Every worker is PPE compliant and every certificate is in date.',
        ),
      },
    ],
  };
};
