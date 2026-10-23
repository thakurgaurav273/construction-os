import { roundMoney, toNumber } from '../../../procurement/procurement-math';
import { ReportBuilder, col, inPeriod, isoDay, projectIds, share, table } from '../report-document';
import { readIssues } from './safety.builder';
import { scheduleHealth } from './schedule.builder';

const STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Planning', ACTIVE: 'Active', ON_HOLD: 'On hold', COMPLETED: 'Completed', CANCELLED: 'Cancelled', ARCHIVED: 'Archived',
};

/** One page for leadership: portfolio health, money, people and the risks worth a conversation. */
export const buildExecutiveReport: ReportBuilder = async (scope) => {
  const ids = projectIds(scope);
  const [projects, attendance, pendingOrders, reports] = await Promise.all([
    scope.prisma.project.findMany({
      where: { organizationId: scope.organizationId, id: { in: ids } },
      select: { id: true, name: true, code: true, status: true, progress: true, budget: true, spent: true, startDate: true, expectedCompletion: true },
      orderBy: { name: 'asc' },
    }),
    scope.prisma.attendance.findMany({
      where: { organizationId: scope.organizationId, projectId: { in: ids }, date: inPeriod(scope) },
      select: { status: true },
    }),
    scope.prisma.purchaseOrder.count({ where: { organizationId: scope.organizationId, projectId: { in: ids }, status: 'PENDING' } }),
    scope.prisma.dailyReport.findMany({
      where: { organizationId: scope.organizationId, projectId: { in: ids }, date: inPeriod(scope) },
      select: { projectId: true, issues: true },
    }),
  ]);

  const asOf = scope.to < new Date() ? scope.to : new Date();
  const rows = projects.map((project) => {
    const budget = toNumber(project.budget);
    const spent = toNumber(project.spent);
    return {
      project: `${project.code} · ${project.name}`,
      status: STATUS_LABELS[project.status] ?? project.status,
      health: scheduleHealth(project, asOf),
      progress: project.progress,
      budget: roundMoney(budget),
      spent: roundMoney(spent),
      used: share(spent, budget),
      due: isoDay(project.expectedCompletion),
      overBudget: budget > 0 && spent > budget,
      highIssues: reports
        .filter((report) => report.projectId === project.id)
        .reduce((count, report) => count + readIssues(report.issues).filter((issue) => issue.severity === 'high').length, 0),
    };
  });
  const totalBudget = rows.reduce((sum, row) => sum + row.budget, 0);
  const totalSpent = rows.reduce((sum, row) => sum + row.spent, 0);
  const attended = attendance.filter((record) => record.status === 'PRESENT' || record.status === 'LATE' || record.status === 'HALF_DAY').length;
  const live = rows.filter((row) => row.status === 'Active' || row.status === 'Planning' || row.status === 'On hold');

  const risks = [
    ...rows.filter((row) => row.overBudget).map((row) => `${row.project} has spent ${row.used}% of its budget.`),
    ...rows.filter((row) => row.health === 'Overdue').map((row) => `${row.project} is past its due date at ${row.progress}% complete.`),
    ...rows.filter((row) => row.health === 'Behind').map((row) => `${row.project} is behind its planned timeline at ${row.progress}% complete.`),
    ...rows.filter((row) => row.highIssues > 0).map((row) => `${row.project} reported ${row.highIssues} high-severity site issue${row.highIssues === 1 ? '' : 's'}.`),
    ...(pendingOrders > 0 ? [`${pendingOrders} purchase order${pendingOrders === 1 ? ' is' : 's are'} waiting for approval.`] : []),
  ];

  return {
    subtitle: 'Portfolio health, spend, workforce and the risks that need a decision.',
    metrics: [
      { label: 'Live projects', value: live.length, kind: 'number', hint: `${rows.length} in scope` },
      { label: 'Average progress', value: live.length ? Math.round(live.reduce((sum, row) => sum + row.progress, 0) / live.length) : null, kind: 'percent' },
      { label: 'Budget', value: roundMoney(totalBudget), kind: 'money' },
      { label: 'Spent', value: roundMoney(totalSpent), kind: 'money', hint: `${share(totalSpent, totalBudget) ?? 0}% of budget` },
      { label: 'Attendance rate', value: share(attended, attendance.length), kind: 'percent' },
    ],
    sections: [
      {
        title: 'Risks',
        bullets: risks.length ? risks : ['No project is over budget, late or reporting high-severity issues.'],
      },
      {
        title: 'Projects',
        table: table(
          [
            col('project', 'Project'), col('status', 'Status'), col('health', 'Schedule'), col('progress', 'Progress', 'percent'),
            col('budget', 'Budget', 'money'), col('spent', 'Spent', 'money'), col('used', 'Used', 'percent'), col('due', 'Due', 'date'),
          ],
          rows.map((row) => ({
            project: row.project, status: row.status, health: row.health, progress: row.progress,
            budget: row.budget, spent: row.spent, used: row.used, due: row.due,
          })),
          'No projects in scope.',
          { project: 'Total', budget: roundMoney(totalBudget), spent: roundMoney(totalSpent), used: share(totalSpent, totalBudget) },
        ),
      },
    ],
  };
};
