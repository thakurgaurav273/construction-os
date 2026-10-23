import { ProjectStatus } from '@prisma/client';
import { wholeDaysBetween } from '../../../procurement/procurement-math';
import { ReportBuilder, ReportScope, col, inPeriod, isoDay, projectIds, table } from '../report-document';

/** Progress this far behind the elapsed share of the timeline counts as behind schedule. */
const BEHIND_TOLERANCE_POINTS = 10;
const FINISHED: ProjectStatus[] = ['COMPLETED', 'CANCELLED', 'ARCHIVED'];

export type ScheduleHealth = 'Completed' | 'Overdue' | 'Behind' | 'On track' | 'Not scheduled';

export interface ScheduleProject {
  status: ProjectStatus;
  progress: number;
  startDate: Date | null;
  expectedCompletion: Date | null;
}

/** Share of the planned timeline that has passed by `asOf`, 0–100. */
export function elapsedShare(project: ScheduleProject, asOf: Date): number | null {
  if (!project.startDate || !project.expectedCompletion) return null;
  const planned = project.expectedCompletion.getTime() - project.startDate.getTime();
  if (planned <= 0) return 100;
  const passed = Math.min(Math.max(asOf.getTime() - project.startDate.getTime(), 0), planned);
  return Math.round((passed / planned) * 100);
}

export function scheduleHealth(project: ScheduleProject, asOf: Date): ScheduleHealth {
  if (FINISHED.includes(project.status)) return 'Completed';
  const elapsed = elapsedShare(project, asOf);
  if (elapsed === null || !project.expectedCompletion) return 'Not scheduled';
  if (asOf > project.expectedCompletion && project.progress < 100) return 'Overdue';
  return project.progress + BEHIND_TOLERANCE_POINTS < elapsed ? 'Behind' : 'On track';
}

function asOfDate(scope: ReportScope): Date {
  const now = new Date();
  return scope.to < now ? scope.to : now;
}

/** Each project's progress against its planned timeline, and how regularly sites report. */
export const buildScheduleReport: ReportBuilder = async (scope) => {
  const asOf = asOfDate(scope);
  const [projects, reports] = await Promise.all([
    scope.prisma.project.findMany({
      where: { organizationId: scope.organizationId, id: { in: projectIds(scope) } },
      select: { id: true, name: true, code: true, status: true, progress: true, startDate: true, expectedCompletion: true, actualCompletion: true },
      orderBy: { expectedCompletion: 'asc' },
    }),
    scope.prisma.dailyReport.findMany({
      where: { organizationId: scope.organizationId, projectId: { in: projectIds(scope) }, date: inPeriod(scope) },
      select: { projectId: true, date: true },
    }),
  ]);

  const rows = projects.map((project) => {
    const elapsed = elapsedShare(project, asOf);
    const health = scheduleHealth(project, asOf);
    const projectReports = reports.filter((report) => report.projectId === project.id);
    const lastReport = projectReports.reduce<Date | null>((latest, report) => (!latest || report.date > latest ? report.date : latest), null);
    return {
      project: `${project.code} · ${project.name}`,
      health,
      progress: project.progress,
      elapsed,
      variance: elapsed === null ? null : project.progress - elapsed,
      start: isoDay(project.startDate),
      due: isoDay(project.expectedCompletion),
      daysLate: health === 'Overdue' && project.expectedCompletion ? wholeDaysBetween(project.expectedCompletion, asOf) : null,
      reports: projectReports.length,
      lastReport: isoDay(lastReport),
    };
  });
  const count = (health: ScheduleHealth): number => rows.filter((row) => row.health === health).length;
  const attention = rows.filter((row) => row.health === 'Overdue' || row.health === 'Behind');

  return {
    subtitle: 'Progress against each project’s planned timeline.',
    metrics: [
      { label: 'On track', value: count('On track'), kind: 'number', tone: 'good' },
      { label: 'Behind schedule', value: count('Behind'), kind: 'number', tone: count('Behind') > 0 ? 'bad' : undefined },
      { label: 'Overdue', value: count('Overdue'), kind: 'number', tone: count('Overdue') > 0 ? 'bad' : undefined },
      { label: 'Completed', value: count('Completed'), kind: 'number' },
      { label: 'Daily reports filed', value: reports.length, kind: 'number' },
    ],
    sections: [
      {
        title: 'Project timelines',
        description: `Variance compares progress with the share of the timeline elapsed; more than ${BEHIND_TOLERANCE_POINTS} points behind counts as behind.`,
        table: table(
          [
            col('project', 'Project'), col('health', 'Status'), col('progress', 'Progress', 'percent'),
            col('elapsed', 'Time elapsed', 'percent'), col('variance', 'Variance (pts)', 'number'),
            col('start', 'Start', 'date'), col('due', 'Due', 'date'), col('daysLate', 'Days late', 'number'),
          ],
          rows,
          'No projects in scope.',
        ),
      },
      {
        title: 'Site reporting',
        table: table(
          [col('project', 'Project'), col('reports', 'Daily reports', 'number'), col('lastReport', 'Last report', 'date')],
          rows.map((row) => ({ project: row.project, reports: row.reports, lastReport: row.lastReport })),
          'No projects in scope.',
        ),
      },
      {
        title: 'Needs attention',
        bullets: attention.length
          ? attention.map((row) => (row.health === 'Overdue'
            ? `${row.project} is ${row.daysLate ?? 0} days past its due date at ${row.progress}% complete.`
            : `${row.project} is ${Math.abs(row.variance ?? 0)} points behind its timeline (${row.progress}% done, ${row.elapsed}% of time used).`))
          : ['Every scheduled project is on track.'],
      },
    ],
  };
};
