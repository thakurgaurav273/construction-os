import { Prisma } from '@prisma/client';
import { ISSUE_SEVERITIES } from '../../../daily-reports/daily-reports.constants';
import { hasExpiringCertification } from '../../../workforce/workforce.service';
import { ReportBuilder, col, inPeriod, isoDay, projectIds, projectLabel, share, table } from '../report-document';

type Severity = (typeof ISSUE_SEVERITIES)[number];

interface SiteIssue { severity: Severity; description: string }

const SEVERITY_LABELS: Record<Severity, string> = { minor: 'Minor', medium: 'Medium', high: 'High' };

/** Daily report issues are free JSON, so anything not shaped like an issue is skipped. */
export function readIssues(issues: Prisma.JsonValue): SiteIssue[] {
  if (!Array.isArray(issues)) return [];
  return issues.flatMap((issue): SiteIssue[] => {
    if (typeof issue !== 'object' || issue === null || Array.isArray(issue)) return [];
    const { severity, description } = issue;
    const known = ISSUE_SEVERITIES.find((candidate) => candidate === severity);
    return known && typeof description === 'string' ? [{ severity: known, description }] : [];
  });
}

/** Site issues raised in daily reports, PPE compliance and expiring certifications. */
export const buildSafetyReport: ReportBuilder = async (scope) => {
  const ids = projectIds(scope);
  const [reports, workers] = await Promise.all([
    scope.prisma.dailyReport.findMany({
      where: { organizationId: scope.organizationId, projectId: { in: ids }, date: inPeriod(scope) },
      select: { projectId: true, date: true, issues: true },
      orderBy: { date: 'desc' },
    }),
    scope.prisma.worker.findMany({
      where: { organizationId: scope.organizationId, projectId: { in: ids }, deactivatedAt: null },
      select: { name: true, trade: true, projectId: true, ppeCompliant: true, certifications: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const issues = reports.flatMap((report) => readIssues(report.issues).map((issue) => ({
    date: isoDay(report.date),
    project: projectLabel(scope, report.projectId),
    projectId: report.projectId,
    severity: issue.severity,
    description: issue.description,
  })));
  const high = issues.filter((issue) => issue.severity === 'high');
  const compliant = workers.filter((worker) => worker.ppeCompliant).length;
  const expiring = workers.filter((worker) => hasExpiringCertification(worker.certifications));

  return {
    subtitle: 'Site issues, PPE compliance and certification status.',
    metrics: [
      { label: 'Issues reported', value: issues.length, kind: 'number' },
      { label: 'High severity', value: high.length, kind: 'number', tone: high.length > 0 ? 'bad' : 'good' },
      { label: 'PPE compliance', value: share(compliant, workers.length), kind: 'percent' },
      { label: 'Certifications expiring', value: expiring.length, kind: 'number', tone: expiring.length > 0 ? 'bad' : undefined },
      { label: 'Reports with issues', value: reports.filter((report) => readIssues(report.issues).length > 0).length, kind: 'number', hint: `of ${reports.length} daily reports` },
    ],
    sections: [
      {
        title: 'Issues by project',
        table: table(
          [col('project', 'Project'), ...ISSUE_SEVERITIES.map((severity) => col(severity, SEVERITY_LABELS[severity], 'number')), col('total', 'Total', 'number')],
          scope.projects.map((project) => {
            const ofProject = issues.filter((issue) => issue.projectId === project.id);
            return {
              project: project.name,
              ...Object.fromEntries(ISSUE_SEVERITIES.map((severity) => [severity, ofProject.filter((issue) => issue.severity === severity).length])),
              total: ofProject.length,
            };
          }),
          'No projects in scope.',
        ),
      },
      {
        title: 'Issue log',
        table: table(
          [col('date', 'Date', 'date'), col('project', 'Project'), col('severity', 'Severity'), col('description', 'Issue')],
          issues.map((issue) => ({ date: issue.date, project: issue.project, severity: SEVERITY_LABELS[issue.severity], description: issue.description })),
          'No issues were reported in this period.',
        ),
      },
      {
        title: 'Worker compliance',
        table: table(
          [col('name', 'Worker'), col('trade', 'Trade'), col('project', 'Project'), col('issue', 'Issue')],
          [
            ...workers.filter((worker) => !worker.ppeCompliant).map((worker) => ({ name: worker.name, trade: worker.trade, project: projectLabel(scope, worker.projectId), issue: 'PPE not compliant' })),
            ...expiring.map((worker) => ({ name: worker.name, trade: worker.trade, project: projectLabel(scope, worker.projectId), issue: 'Certification expiring' })),
          ],
          'Every worker is PPE compliant and no certifications are expiring.',
        ),
      },
    ],
  };
};
