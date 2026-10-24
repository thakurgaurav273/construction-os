import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { wholeDaysBetween } from '../procurement/procurement-math';
import { roundMoney } from './billing-math';
import { RA_BILL_SUMMARY_INCLUDE, RaBillSummaryView, toRaBillSummary } from './ra-bill.mapper';

export interface ReceivableView extends RaBillSummaryView {
  invoiceNumber: string | null;
  dueDate: Date | null;
  received: number;
  outstanding: number;
  daysOverdue: number;
}

export interface AgeingBuckets {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  over90: number;
}

export interface ReceivablesView {
  items: ReceivableView[];
  totals: { outstanding: number; overdue: number; ageing: AgeingBuckets };
}

export function ageingBucket(daysOverdue: number): keyof AgeingBuckets {
  if (daysOverdue <= 0) return 'current';
  if (daysOverdue <= 30) return 'days1to30';
  if (daysOverdue <= 60) return 'days31to60';
  if (daysOverdue <= 90) return 'days61to90';
  return 'over90';
}

/** Works with the Prisma service and inside a transaction. */
type RaBillReader = Pick<Prisma.TransactionClient, 'raBill'>;

/** What clients still owe on certified client bills, oldest first, with ageing by days past due. Finance reads this too. */
export async function loadReceivables(db: RaBillReader, organizationId: string, projectId?: string): Promise<ReceivablesView> {
  const bills = await db.raBill.findMany({
    where: { organizationId, projectId, status: 'CERTIFIED', isOpeningBalance: false, contract: { direction: 'CLIENT' } },
    include: { ...RA_BILL_SUMMARY_INCLUDE, receipts: { where: { voidedAt: null }, select: { amount: true } } },
    orderBy: { dueDate: 'asc' },
  });
  const today = new Date();
  const ageing: AgeingBuckets = { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0 };

  const items = bills.flatMap((bill): ReceivableView[] => {
    const received = roundMoney(bill.receipts.reduce((sum, receipt) => sum + receipt.amount.toNumber(), 0));
    const outstanding = roundMoney(bill.netAmount.toNumber() - received);
    if (outstanding <= 0) return [];
    const daysOverdue = bill.dueDate ? Math.max(0, wholeDaysBetween(bill.dueDate, today)) : 0;
    const bucket = ageingBucket(daysOverdue);
    ageing[bucket] = roundMoney(ageing[bucket] + outstanding);
    return [{ ...toRaBillSummary(bill), invoiceNumber: bill.invoiceNumber, dueDate: bill.dueDate, received, outstanding, daysOverdue }];
  });

  const outstanding = roundMoney(items.reduce((sum, item) => sum + item.outstanding, 0));
  return { items, totals: { outstanding, overdue: roundMoney(outstanding - ageing.current), ageing } };
}

@Injectable()
export class ReceivablesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(organizationId: string, projectId?: string): Promise<ReceivablesView> {
    return loadReceivables(this.prisma, organizationId, projectId);
  }
}
