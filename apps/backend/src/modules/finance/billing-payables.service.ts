import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { formatRupees } from '../procurement/purchase-order-history.service';
import { FinanceHistoryService } from './finance-history.service';
import { invoiceTotals } from './invoice.mapper';

export interface PayableLine {
  description: string;
  unit: string;
  quantity: number;
  /** Signed: deductions such as TDS or retention are negative lines. */
  rate: number;
}

interface BillingPayable {
  organizationId: string;
  projectId: string;
  vendor: { id: string; name: string };
  /** Preferred bill number, e.g. the subcontractor's own; replaced by `fallbackNumber` if already used. */
  invoiceNumber: string;
  fallbackNumber: string;
  description: string;
  issuedDate: Date;
  dueDate: Date;
  lines: PayableLine[];
  createdById: string | null;
  approvedById: string;
  approvalNote: string;
  activityTitle: string;
}

export type CertifiedBillPayable = Omit<BillingPayable, 'activityTitle'> & { raBillId: string };
export type RetentionPayable = Omit<BillingPayable, 'activityTitle'> & { retentionReleaseId: string };

/**
 * Raises vendor bills for money Billing has already approved: a certified subcontract RA bill, or released
 * subcontract retention. Certification is itself maker-checker, so these bills start APPROVED and go straight
 * to the usual payment request → approval → release flow. Totals equal the billing net to the paisa.
 */
@Injectable()
export class BillingPayablesService {
  constructor(private readonly history: FinanceHistoryService) {}

  createForCertifiedBill(tx: Prisma.TransactionClient, payable: CertifiedBillPayable): Promise<{ id: string; invoiceNumber: string }> {
    const { raBillId, ...rest } = payable;
    return this.create(tx, { ...rest, activityTitle: 'Subcontractor bill ready for payment' }, { raBillId });
  }

  createForRetentionRelease(tx: Prisma.TransactionClient, payable: RetentionPayable): Promise<{ id: string; invoiceNumber: string }> {
    const { retentionReleaseId, ...rest } = payable;
    return this.create(tx, { ...rest, activityTitle: 'Retention release ready for payment' }, { retentionReleaseId });
  }

  private async create(
    tx: Prisma.TransactionClient,
    payable: BillingPayable,
    source: { raBillId?: string; retentionReleaseId?: string },
  ): Promise<{ id: string; invoiceNumber: string }> {
    const taken = await tx.invoice.findFirst({
      where: { organizationId: payable.organizationId, vendorName: payable.vendor.name, invoiceNumber: payable.invoiceNumber },
      select: { id: true },
    });
    const invoiceNumber = taken ? payable.fallbackNumber : payable.invoiceNumber;
    const items = payable.lines.map((line) => ({ ...line, taxPercent: 0 }));
    const totals = invoiceTotals(items);
    const now = new Date();

    const invoice = await tx.invoice.create({
      data: {
        ...source,
        invoiceNumber,
        vendorId: payable.vendor.id,
        vendorName: payable.vendor.name,
        projectId: payable.projectId,
        organizationId: payable.organizationId,
        category: 'Subcontract',
        description: payable.description,
        ...totals,
        status: 'APPROVED',
        issuedDate: payable.issuedDate,
        dueDate: payable.dueDate,
        submittedAt: now,
        reviewedAt: now,
        reviewedById: payable.approvedById,
        reviewNote: payable.approvalNote,
        createdById: payable.createdById,
        items: { create: items.map((item, index) => ({ ...item, sortOrder: index })) },
      },
    });
    await this.history.record(tx, {
      invoice,
      actorId: payable.approvedById,
      type: 'approval',
      title: payable.activityTitle,
      description: `${invoiceNumber} from ${payable.vendor.name} for ${formatRupees(totals.totalAmount)}: ${payable.approvalNote}`,
    });
    return { id: invoice.id, invoiceNumber };
  }
}
