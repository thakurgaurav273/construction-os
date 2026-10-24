import { ConflictException, Injectable } from '@nestjs/common';
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

  /**
   * A certified subcontract bill was reopened for correction. Its vendor bill is cancelled and unlinked, so
   * certifying the corrected bill raises a fresh one. Refused once any payment has been requested against it:
   * money already in motion has to be rejected or cancelled in Finance first.
   */
  async cancelForReopenedBill(tx: Prisma.TransactionClient, raBillId: string, actorId: string, reason: string): Promise<void> {
    // Payment requests lock the invoice the same way, so one can't slip in between this check and the cancel.
    await tx.$queryRaw`SELECT id FROM invoices WHERE "raBillId" = ${raBillId} FOR UPDATE`;
    const invoice = await tx.invoice.findUnique({
      where: { raBillId },
      include: { payments: { where: { status: { in: ['PENDING', 'APPROVED', 'PAID'] } }, select: { paymentNumber: true, status: true } } },
    });
    if (!invoice || invoice.status === 'CANCELLED') return;
    const [payment] = invoice.payments;
    if (payment) {
      throw new ConflictException(payment.status === 'PAID'
        ? `${payment.paymentNumber} has already been paid against vendor bill ${invoice.invoiceNumber}, so this bill can't be reopened.`
        : `${payment.paymentNumber} is waiting against vendor bill ${invoice.invoiceNumber}. Reject or cancel it in Finance first.`);
    }
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: 'CANCELLED', raBillId: null, reviewNote: `Withdrawn: the RA bill was reopened for correction. ${reason}` },
    });
    await this.history.record(tx, {
      invoice,
      actorId,
      type: 'alert',
      title: 'Subcontractor bill withdrawn',
      description: `${invoice.invoiceNumber} from ${invoice.vendorName} was cancelled because its RA bill was reopened: ${reason}`,
    });
  }

  private async create(
    tx: Prisma.TransactionClient,
    payable: BillingPayable,
    source: { raBillId?: string; retentionReleaseId?: string },
  ): Promise<{ id: string; invoiceNumber: string }> {
    const invoiceNumber = await this.freeInvoiceNumber(tx, payable);
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

  /** The preferred number, else the fallback, else the fallback with a revision (a reopened bill certified again). */
  private async freeInvoiceNumber(tx: Prisma.TransactionClient, payable: BillingPayable): Promise<string> {
    const isTaken = async (invoiceNumber: string): Promise<boolean> => Boolean(await tx.invoice.findFirst({
      where: { organizationId: payable.organizationId, vendorName: payable.vendor.name, invoiceNumber },
      select: { id: true },
    }));
    if (!(await isTaken(payable.invoiceNumber))) return payable.invoiceNumber;
    let candidate = payable.fallbackNumber;
    for (let revision = 2; await isTaken(candidate); revision += 1) candidate = `${payable.fallbackNumber}-R${revision}`;
    return candidate;
  }
}
