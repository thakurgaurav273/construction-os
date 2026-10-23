import { roundMoney, toNumber } from '../../../procurement/procurement-math';
import { ReportBuilder, col, inPeriod, projectIds, projectLabel, share, sumBy, table } from '../report-document';

const BUDGET_COLUMNS = [
  col('allocated', 'Allocated', 'money'),
  col('committed', 'Committed', 'money'),
  col('spent', 'Spent', 'money'),
  col('remaining', 'Remaining', 'money'),
  col('used', 'Used', 'percent'),
];

interface BudgetTotals { allocated: number; committed: number; spent: number }

function budgetRow(totals: BudgetTotals): Record<string, number | null> {
  return {
    allocated: roundMoney(totals.allocated),
    committed: roundMoney(totals.committed),
    spent: roundMoney(totals.spent),
    remaining: roundMoney(totals.allocated - totals.committed - totals.spent),
    used: share(totals.spent + totals.committed, totals.allocated),
  };
}

/** Budget lines against commitments and spend, and what procurement approved in the period. */
export const buildCostReport: ReportBuilder = async (scope) => {
  const ids = projectIds(scope);
  const [lines, approvedOrders] = await Promise.all([
    scope.budgets.lines(scope.organizationId, ids),
    scope.prisma.purchaseOrder.findMany({
      where: { organizationId: scope.organizationId, projectId: { in: ids }, status: 'APPROVED', requestedDate: inPeriod(scope) },
      select: { category: true, amount: true },
    }),
  ]);

  const total = (selected: typeof lines): BudgetTotals => ({
    allocated: selected.reduce((sum, line) => sum + line.allocated, 0),
    committed: selected.reduce((sum, line) => sum + line.committed, 0),
    spent: selected.reduce((sum, line) => sum + line.spent, 0),
  });
  const overall = total(lines);
  const overBudget = lines.filter((line) => line.spent + line.committed > line.allocated && line.allocated > 0);
  const categories = [...new Set(lines.map((line) => line.category))];
  const procurementByCategory = sumBy(approvedOrders, (order) => order.category, (order) => toNumber(order.amount));

  return {
    subtitle: 'Budget allocation, commitments and spend by category and project.',
    metrics: [
      { label: 'Budget allocated', value: roundMoney(overall.allocated), kind: 'money' },
      { label: 'Committed', value: roundMoney(overall.committed), kind: 'money', hint: 'Approved but not yet spent' },
      { label: 'Spent', value: roundMoney(overall.spent), kind: 'money' },
      { label: 'Budget used', value: share(overall.spent + overall.committed, overall.allocated), kind: 'percent' },
      { label: 'Lines over budget', value: overBudget.length, kind: 'number', tone: overBudget.length > 0 ? 'bad' : 'good' },
    ],
    sections: [
      {
        title: 'By category',
        table: table(
          [col('category', 'Category'), ...BUDGET_COLUMNS],
          categories.map((category) => ({ category, ...budgetRow(total(lines.filter((line) => line.category === category))) })),
          'No budget lines yet. Add a budget in Finance to see cost analysis.',
          { category: 'Total', ...budgetRow(overall) },
        ),
      },
      {
        title: 'By project',
        table: table(
          [col('project', 'Project'), ...BUDGET_COLUMNS],
          scope.projects
            .map((project) => ({ project: project.name, lines: lines.filter((line) => line.projectId === project.id) }))
            .filter((entry) => entry.lines.length > 0)
            .map((entry) => ({ project: entry.project, ...budgetRow(total(entry.lines)) })),
          'No project has a budget yet.',
        ),
      },
      {
        title: 'Over-budget lines',
        description: 'Commitments plus spend exceed the allocation.',
        table: table(
          [col('project', 'Project'), col('category', 'Category'), ...BUDGET_COLUMNS],
          overBudget.map((line) => ({ project: projectLabel(scope, line.projectId), category: line.category, ...budgetRow(line) })),
          'Every budget line is within its allocation.',
        ),
      },
      {
        title: 'Purchase orders approved in the period',
        table: table(
          [col('category', 'Category'), col('amount', 'Approved value', 'money')],
          [...procurementByCategory].map(([category, amount]) => ({ category, amount: roundMoney(amount) })),
          'No purchase orders were approved in this period.',
        ),
      },
    ],
  };
};
