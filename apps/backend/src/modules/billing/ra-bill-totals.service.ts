import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { billTotals, roundMoney } from './billing-math';

/** The quantity a line is paid on: the certified quantity once there is one, the claim before that. */
export function payableQuantity(line: { claimedQuantity: Prisma.Decimal; certifiedQuantity: Prisma.Decimal | null }): number {
  return (line.certifiedQuantity ?? line.claimedQuantity).toNumber();
}

/**
 * Keeps a bill's stored gross and net in step with its lines and adjustments, so lists never recompute
 * bills. Open bills price lines at the current BOQ rate; certified lines carry their frozen rate.
 */
@Injectable()
export class RaBillTotalsService {
  async refresh(tx: Prisma.TransactionClient, billId: string): Promise<void> {
    const bill = await tx.raBill.findUniqueOrThrow({
      where: { id: billId },
      include: { lines: { include: { contractItem: { select: { rate: true } } } }, adjustments: { orderBy: { sortOrder: 'asc' } } },
    });
    const lineAmounts = bill.lines.map((line) => roundMoney(payableQuantity(line) * (line.rate ?? line.contractItem.rate).toNumber()));
    const totals = billTotals(lineAmounts, bill.adjustments.map((adjustment) => ({ ...adjustment, value: adjustment.value.toNumber() })));
    await tx.raBill.update({ where: { id: billId }, data: { grossAmount: totals.grossAmount, netAmount: totals.netAmount } });
  }
}
