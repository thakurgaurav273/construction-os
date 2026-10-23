import { roundMoney, toNumber, wholeDaysBetween } from '../../../procurement/procurement-math';
import { ReportBuilder, col, inPeriod, isoDay, projectIds, projectLabel, share, sumBy, table } from '../report-document';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', PENDING: 'Awaiting approval', CHANGES_REQUESTED: 'Changes requested',
  APPROVED: 'Approved', REJECTED: 'Rejected', CANCELLED: 'Cancelled',
};

/** Purchase orders raised in the period, vendor spend, and how reliably deliveries arrived. */
export const buildProcurementReport: ReportBuilder = async (scope) => {
  const ids = projectIds(scope);
  const [orders, deliveries] = await Promise.all([
    scope.prisma.purchaseOrder.findMany({
      where: { organizationId: scope.organizationId, projectId: { in: ids }, requestedDate: inPeriod(scope) },
      select: {
        poNumber: true, status: true, amount: true, category: true, projectId: true, requestedDate: true, expectedDelivery: true,
        vendor: { select: { name: true } },
      },
      orderBy: { requestedDate: 'desc' },
    }),
    scope.prisma.delivery.findMany({
      where: {
        organizationId: scope.organizationId,
        purchaseOrder: { projectId: { in: ids } },
        scheduledDate: inPeriod(scope),
        status: { not: 'CANCELLED' },
      },
      select: { status: true, scheduledDate: true, receivedAt: true, purchaseOrder: { select: { poNumber: true, vendor: { select: { name: true } } } } },
    }),
  ]);

  const approved = orders.filter((order) => order.status === 'APPROVED');
  const approvedValue = approved.reduce((sum, order) => sum + toNumber(order.amount), 0);
  const awaiting = orders.filter((order) => order.status === 'PENDING');
  const received = deliveries.filter((delivery) => delivery.status === 'RECEIVED' && delivery.receivedAt);
  const onTime = received.filter((delivery) => delivery.receivedAt && wholeDaysBetween(delivery.scheduledDate, delivery.receivedAt) <= 0);
  const now = new Date();
  const late = deliveries.filter((delivery) => (delivery.receivedAt
    ? wholeDaysBetween(delivery.scheduledDate, delivery.receivedAt) > 0
    : delivery.scheduledDate < now));
  const vendorName = (order: { vendor: { name: string } | null }): string => order.vendor?.name ?? 'No vendor';
  const vendorSpend = sumBy(approved, vendorName, (order) => toNumber(order.amount));
  const statusCounts = sumBy(orders, (order) => order.status, () => 1);
  const statusValues = sumBy(orders, (order) => order.status, (order) => toNumber(order.amount));

  return {
    subtitle: 'Purchase orders, vendor spend and delivery performance.',
    metrics: [
      { label: 'Orders raised', value: orders.length, kind: 'number' },
      { label: 'Approved value', value: roundMoney(approvedValue), kind: 'money' },
      { label: 'Awaiting approval', value: awaiting.length, kind: 'number', tone: awaiting.length > 0 ? 'bad' : undefined },
      { label: 'On-time deliveries', value: share(onTime.length, received.length), kind: 'percent', hint: `${onTime.length} of ${received.length} received` },
      { label: 'Late deliveries', value: late.length, kind: 'number', tone: late.length > 0 ? 'bad' : 'good' },
    ],
    sections: [
      {
        title: 'Orders by status',
        table: table(
          [col('status', 'Status'), col('count', 'Orders', 'number'), col('value', 'Value', 'money')],
          [...statusCounts].map(([status, count]) => ({ status: STATUS_LABELS[status] ?? status, count, value: roundMoney(statusValues.get(status) ?? 0) })),
          'No purchase orders were raised in this period.',
        ),
      },
      {
        title: 'Approved spend by vendor',
        table: table(
          [col('vendor', 'Vendor'), col('value', 'Approved value', 'money'), col('share', 'Share', 'percent')],
          [...vendorSpend].sort((a, b) => b[1] - a[1]).map(([vendor, value]) => ({ vendor, value: roundMoney(value), share: share(value, approvedValue) })),
          'No purchase orders were approved in this period.',
        ),
      },
      {
        title: 'Late deliveries',
        table: table(
          [col('po', 'PO'), col('vendor', 'Vendor'), col('scheduled', 'Scheduled', 'date'), col('received', 'Received', 'date'), col('daysLate', 'Days late', 'number')],
          late.map((delivery) => ({
            po: delivery.purchaseOrder.poNumber,
            vendor: delivery.purchaseOrder.vendor?.name ?? 'No vendor',
            scheduled: isoDay(delivery.scheduledDate),
            received: isoDay(delivery.receivedAt),
            daysLate: wholeDaysBetween(delivery.scheduledDate, delivery.receivedAt ?? now),
          })),
          'Every delivery in this period arrived on schedule.',
        ),
      },
      {
        title: 'Purchase orders',
        table: table(
          [col('po', 'PO'), col('project', 'Project'), col('vendor', 'Vendor'), col('category', 'Category'), col('status', 'Status'), col('requested', 'Requested', 'date'), col('amount', 'Amount', 'money')],
          orders.map((order) => ({
            po: order.poNumber,
            project: projectLabel(scope, order.projectId),
            vendor: vendorName(order),
            category: order.category,
            status: STATUS_LABELS[order.status] ?? order.status,
            requested: isoDay(order.requestedDate),
            amount: roundMoney(toNumber(order.amount)),
          })),
          'No purchase orders were raised in this period.',
        ),
      },
    ],
  };
};
