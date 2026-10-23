import { InvoiceStatus } from '@prisma/client';
import { PAYABLE_INVOICE_STATUSES } from '../../../finance/finance.constants';
import { MONTH_LABELS, roundMoney, toNumber, wholeDaysBetween } from '../../../procurement/procurement-math';
import { ReportBuilder, col, inPeriod, isoDay, projectIds, projectLabel, share, table } from '../report-document';

const BILLED_STATUSES: InvoiceStatus[] = ['APPROVED', 'PARTIALLY_PAID', 'PAID'];

/** Payables, receivables, cash movement and budget use, for people with finance access. */
export const buildFinancialReport: ReportBuilder = async (scope) => {
  const ids = projectIds(scope);
  const now = new Date();
  const [invoices, payments, cashFlow, projects, receivables] = await Promise.all([
    scope.prisma.invoice.findMany({
      where: { organizationId: scope.organizationId, projectId: { in: ids }, status: { in: BILLED_STATUSES } },
      select: {
        invoiceNumber: true, vendorName: true, projectId: true, totalAmount: true, status: true, issuedDate: true, dueDate: true,
        payments: { where: { status: 'PAID' }, select: { amount: true } },
      },
    }),
    scope.prisma.payment.findMany({
      where: { organizationId: scope.organizationId, projectId: { in: ids }, status: 'PAID', paidDate: inPeriod(scope) },
      select: { amount: true },
    }),
    scope.prisma.cashFlowEntry.findMany({
      where: { organizationId: scope.organizationId, ...(scope.allProjects ? {} : { projectId: { in: ids } }) },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    }),
    scope.prisma.project.findMany({
      where: { organizationId: scope.organizationId, id: { in: ids } },
      select: { name: true, budget: true, spent: true },
    }),
    scope.receivables.findAll(scope.organizationId),
  ]);

  const payables = invoices
    .filter((invoice) => PAYABLE_INVOICE_STATUSES.includes(invoice.status))
    .map((invoice) => {
      const paid = invoice.payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
      return {
        invoice: invoice.invoiceNumber,
        vendor: invoice.vendorName,
        project: projectLabel(scope, invoice.projectId),
        due: isoDay(invoice.dueDate),
        daysOverdue: Math.max(0, wholeDaysBetween(invoice.dueDate, now)),
        outstanding: roundMoney(toNumber(invoice.totalAmount) - paid),
      };
    })
    .filter((row) => row.outstanding > 0)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
  const billedInPeriod = invoices.filter((invoice) => invoice.issuedDate >= scope.from && invoice.issuedDate <= scope.to);
  const owedToVendors = roundMoney(payables.reduce((sum, row) => sum + row.outstanding, 0));
  const overdueToVendors = roundMoney(payables.filter((row) => row.daysOverdue > 0).reduce((sum, row) => sum + row.outstanding, 0));
  const paidInPeriod = roundMoney(payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0));
  const clientBills = receivables.items.filter((item) => ids.includes(item.project.id));
  const owedByClients = roundMoney(clientBills.reduce((sum, item) => sum + item.outstanding, 0));

  const periodStart = scope.from.getUTCFullYear() * 12 + scope.from.getUTCMonth();
  const periodEnd = scope.to.getUTCFullYear() * 12 + scope.to.getUTCMonth();
  const months = new Map<number, { inflow: number; outflow: number }>();
  for (const entry of cashFlow) {
    const index = entry.year * 12 + (entry.month - 1);
    if (index < periodStart || index > periodEnd) continue;
    const month = months.get(index) ?? { inflow: 0, outflow: 0 };
    months.set(index, { inflow: month.inflow + toNumber(entry.inflow), outflow: month.outflow + toNumber(entry.outflow) });
  }
  const totalBudget = projects.reduce((sum, project) => sum + toNumber(project.budget), 0);
  const totalSpent = projects.reduce((sum, project) => sum + toNumber(project.spent), 0);

  return {
    subtitle: 'What the business owes, is owed, has paid and has spent against budget.',
    metrics: [
      { label: 'Owed to vendors', value: owedToVendors, kind: 'money' },
      { label: 'Overdue to vendors', value: overdueToVendors, kind: 'money', tone: overdueToVendors > 0 ? 'bad' : 'good' },
      { label: 'Owed by clients', value: owedByClients, kind: 'money', hint: 'Certified client bills not yet received' },
      { label: 'Paid in period', value: paidInPeriod, kind: 'money' },
      { label: 'Budget used', value: share(totalSpent, totalBudget), kind: 'percent' },
    ],
    sections: [
      {
        title: 'Cash flow',
        table: table(
          [col('month', 'Month'), col('inflow', 'Inflow', 'money'), col('outflow', 'Outflow', 'money'), col('net', 'Net', 'money')],
          [...months].sort((a, b) => a[0] - b[0]).map(([index, month]) => ({
            month: `${MONTH_LABELS[index % 12]} ${Math.floor(index / 12)}`,
            inflow: roundMoney(month.inflow),
            outflow: roundMoney(month.outflow),
            net: roundMoney(month.inflow - month.outflow),
          })),
          'No cash flow was recorded for this period.',
        ),
      },
      {
        title: 'Budget utilisation',
        table: table(
          [col('project', 'Project'), col('budget', 'Budget', 'money'), col('spent', 'Spent', 'money'), col('used', 'Used', 'percent')],
          projects.map((project) => ({
            project: project.name,
            budget: roundMoney(toNumber(project.budget)),
            spent: roundMoney(toNumber(project.spent)),
            used: share(toNumber(project.spent), toNumber(project.budget)),
          })),
          'No projects in scope.',
          { project: 'Total', budget: roundMoney(totalBudget), spent: roundMoney(totalSpent), used: share(totalSpent, totalBudget) },
        ),
      },
      {
        title: 'Vendor bills outstanding',
        description: `${billedInPeriod.length} vendor bills were issued in this period.`,
        table: table(
          [col('invoice', 'Bill'), col('vendor', 'Vendor'), col('project', 'Project'), col('due', 'Due', 'date'), col('daysOverdue', 'Days overdue', 'number'), col('outstanding', 'Outstanding', 'money')],
          payables,
          'Nothing is owed to vendors.',
          { invoice: 'Total', outstanding: owedToVendors },
        ),
      },
      {
        title: 'Client bills outstanding',
        table: table(
          [col('bill', 'Bill'), col('client', 'Client'), col('project', 'Project'), col('due', 'Due', 'date'), col('daysOverdue', 'Days overdue', 'number'), col('outstanding', 'Outstanding', 'money')],
          clientBills.map((item) => ({
            bill: item.invoiceNumber ?? item.code,
            client: item.partyName,
            project: item.project.name,
            due: isoDay(item.dueDate),
            daysOverdue: item.daysOverdue,
            outstanding: item.outstanding,
          })),
          'Clients have paid every certified bill.',
          { bill: 'Total', outstanding: owedByClients },
        ),
      },
    ],
  };
};
