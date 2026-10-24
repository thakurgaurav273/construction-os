import { InvoiceStatus, Prisma } from '@prisma/client';
import { roundMoney, toNumber } from '../procurement/procurement-math';

/** Bills that count as spent: approved, whether or not they have been paid yet. */
export const SPENT_BILL_STATUSES: InvoiceStatus[] = ['APPROVED', 'PARTIALLY_PAID', 'PAID'];

/** Works with the Prisma service and inside a transaction. */
type InvoiceReader = Pick<Prisma.TransactionClient, 'invoice'>;

/**
 * What each project has spent: its approved, part-paid and paid vendor bills incl. GST, the same figure the
 * budget heads add up to (plus anything unbudgeted). Never stored, so it can't drift from Finance.
 * Projects without bills are missing from the map; read them as 0.
 */
export async function projectSpend(db: InvoiceReader, organizationId: string, projectIds?: string[]): Promise<Map<string, number>> {
  const rows = await db.invoice.groupBy({
    by: ['projectId'],
    where: {
      organizationId,
      status: { in: SPENT_BILL_STATUSES },
      projectId: projectIds ? { in: projectIds } : { not: null },
    },
    _sum: { totalAmount: true },
  });
  return new Map(rows.flatMap((row) => (row.projectId ? [[row.projectId, roundMoney(toNumber(row._sum.totalAmount))] as const] : [])));
}
