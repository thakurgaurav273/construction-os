import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BillingPayablesService, PayableLine } from '../finance/billing-payables.service';
import { addUtcDays } from '../procurement/procurement-math';
import { billTotals, roundMoney } from './billing-math';
import { billCode } from './contract.mapper';
import { payableQuantity } from './ra-bill-totals.service';

/** Invoice line descriptions are capped by the finance module. */
const MAX_LINE_DESCRIPTION = 200;

/**
 * What happens to money once a bill is certified. Every certified bill gets a due date from the contract's
 * payment terms. A subcontract bill also raises an approved vendor bill in Finance for its net amount, so it
 * is paid through the normal payment flow; a client bill becomes a receivable tracked here.
 */
@Injectable()
export class RaBillSettlementService {
  constructor(private readonly payables: BillingPayablesService) {}

  async settleCertifiedBill(tx: Prisma.TransactionClient, billId: string, certifierId: string, invoiceNumber?: string | null): Promise<void> {
    const bill = await tx.raBill.findUniqueOrThrow({
      where: { id: billId },
      include: {
        contract: { select: { code: true, title: true, direction: true, paymentTermDays: true, vendor: { select: { id: true, name: true } } } },
        lines: { include: { contractItem: { select: { itemNo: true, description: true, unit: true, sortOrder: true, rate: true } } } },
        adjustments: { orderBy: { sortOrder: 'asc' } },
      },
    });
    const certifiedAt = bill.certifiedAt ?? new Date();
    const dueDate = addUtcDays(certifiedAt, bill.contract.paymentTermDays);
    const isClient = bill.contract.direction === 'CLIENT';
    await tx.raBill.update({ where: { id: billId }, data: { dueDate, invoiceNumber: isClient ? invoiceNumber?.trim() || null : null } });
    if (isClient || !bill.contract.vendor) return;

    const workLines: PayableLine[] = [...bill.lines]
      .sort((a, b) => a.contractItem.sortOrder - b.contractItem.sortOrder)
      .filter((line) => payableQuantity(line) > 0)
      .map((line) => ({
        description: `${line.contractItem.itemNo} · ${line.contractItem.description}`.slice(0, MAX_LINE_DESCRIPTION),
        unit: line.contractItem.unit,
        quantity: payableQuantity(line),
        rate: (line.rate ?? line.contractItem.rate).toNumber(),
      }));
    const totals = billTotals(
      workLines.map((line) => roundMoney(line.quantity * line.rate)),
      bill.adjustments.map((adjustment) => ({ ...adjustment, value: adjustment.value.toNumber() })),
    );
    // Nothing is owed when nothing was certified (or fixed deductions exceed the work).
    if (totals.netAmount <= 0) return;

    const code = `${bill.contract.code}/${billCode(bill.sequence)}`;
    await this.payables.createForCertifiedBill(tx, {
      raBillId: bill.id,
      organizationId: bill.organizationId,
      projectId: bill.projectId,
      vendor: bill.contract.vendor,
      invoiceNumber: bill.reference?.trim() || code,
      fallbackNumber: code,
      description: `${billCode(bill.sequence)} on ${bill.contract.code}: ${bill.contract.title}`.slice(0, MAX_LINE_DESCRIPTION),
      issuedDate: certifiedAt,
      dueDate,
      lines: [
        ...workLines,
        ...bill.adjustments.map((adjustment, index) => ({
          description: adjustment.effect === 'DEDUCT' ? `Less: ${adjustment.label}` : adjustment.label,
          unit: 'LS',
          quantity: 1,
          rate: totals.adjustments[index],
        })),
      ],
      createdById: bill.preparedById,
      approvedById: certifierId,
      approvalNote: `Certified as ${billCode(bill.sequence)} on ${bill.contract.code}.`,
    });
  }
}
