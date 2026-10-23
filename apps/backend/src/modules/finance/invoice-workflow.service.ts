import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { Invoice, InvoiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { OptionalNoteDto, RequiredNoteDto } from '../procurement/dto/review-note.dto';
import { formatRupees } from '../procurement/purchase-order-history.service';
import { toNumber } from '../procurement/procurement-math';
import { CANCELLABLE_INVOICE_STATUSES, COMMITTED_PAYMENT_STATUSES, EDITABLE_INVOICE_STATUSES } from './finance.constants';
import { FinanceActivityType, FinanceHistoryService } from './finance-history.service';
import { InvoiceMatchService } from './invoice-match.service';
import { InvoiceDetailView } from './invoice.mapper';
import { InvoicesService } from './invoices.service';

interface InvoiceTransition {
  invoice: Invoice;
  actorId: string;
  from: InvoiceStatus[];
  to: InvoiceStatus;
  changes?: Omit<Prisma.InvoiceUncheckedUpdateManyInput, 'status'>;
  activity: { type: FinanceActivityType; title: string; description: string };
}

/**
 * Vendor bill approval: DRAFT → PENDING_APPROVAL → APPROVED | REJECTED. Maker-checker: whoever entered the
 * bill can't approve or reject it. A bill that fails the 3-way match can still be approved, but only with a
 * note explaining the override.
 */
@Injectable()
export class InvoiceWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoices: InvoicesService,
    private readonly matcher: InvoiceMatchService,
    private readonly history: FinanceHistoryService,
  ) {}

  async submit(id: string, organizationId: string, userId: string): Promise<InvoiceDetailView> {
    const invoice = await this.invoices.findInvoiceOrThrow(id, organizationId);
    if (!EDITABLE_INVOICE_STATUSES.includes(invoice.status)) throw new ConflictException('Only draft invoices can be submitted.');
    const lineCount = await this.prisma.invoiceItem.count({ where: { invoiceId: id } });
    if (lineCount === 0) throw new BadRequestException('Add at least one line before submitting.');

    await this.transition({
      invoice,
      actorId: userId,
      from: EDITABLE_INVOICE_STATUSES,
      to: 'PENDING_APPROVAL',
      changes: { submittedAt: new Date() },
      activity: {
        type: 'update',
        title: 'Invoice submitted for approval',
        description: `${invoice.invoiceNumber} from ${invoice.vendorName} (${formatRupees(toNumber(invoice.totalAmount))}) is awaiting approval.`,
      },
    });
    return this.invoices.findOne(id, organizationId);
  }

  async approve(id: string, organizationId: string, userId: string, dto: OptionalNoteDto): Promise<InvoiceDetailView> {
    const invoice = await this.findReviewable(id, organizationId, userId);
    const note = dto.note?.trim();

    const items = await this.prisma.invoiceItem.findMany({ where: { invoiceId: id } });
    const match = (await this.matcher.matchInvoices([{ id, purchaseOrderId: invoice.purchaseOrderId, items }])).get(id);
    if (match?.status === 'VARIANCE' && !note) {
      throw new BadRequestException("This invoice doesn't match the PO and receipts. Add a note explaining why it's approved anyway.");
    }

    await this.transition({
      invoice,
      actorId: userId,
      from: ['PENDING_APPROVAL'],
      to: 'APPROVED',
      changes: { reviewedById: userId, reviewedAt: new Date(), reviewNote: note || null },
      activity: {
        type: 'approval',
        title: match?.status === 'VARIANCE' ? 'Invoice approved with variance' : 'Invoice approved',
        description: `${invoice.invoiceNumber} from ${invoice.vendorName} was approved for payment.${note ? ` Note: ${note}` : ''}`,
      },
    });
    return this.invoices.findOne(id, organizationId);
  }

  async reject(id: string, organizationId: string, userId: string, dto: RequiredNoteDto): Promise<InvoiceDetailView> {
    const invoice = await this.findReviewable(id, organizationId, userId);
    const note = dto.note.trim();
    await this.transition({
      invoice,
      actorId: userId,
      from: ['PENDING_APPROVAL'],
      to: 'REJECTED',
      changes: { reviewedById: userId, reviewedAt: new Date(), reviewNote: note },
      activity: {
        type: 'alert',
        title: 'Invoice rejected',
        description: `${invoice.invoiceNumber} from ${invoice.vendorName} was rejected: ${note}`,
      },
    });
    return this.invoices.findOne(id, organizationId);
  }

  /** Whoever entered a bill can withdraw it until approval; anyone else's, or an approved bill, needs approver rights. */
  async cancel(
    id: string,
    organizationId: string,
    userId: string,
    dto: OptionalNoteDto,
    isApprover: boolean,
  ): Promise<InvoiceDetailView> {
    const invoice = await this.invoices.findInvoiceOrThrow(id, organizationId);
    if (!CANCELLABLE_INVOICE_STATUSES.includes(invoice.status)) throw new ConflictException('This invoice is already closed.');
    if (invoice.status === 'APPROVED' && !isApprover) {
      throw new ForbiddenException('Only invoice approvers can cancel an approved invoice.');
    }
    if (invoice.createdById !== userId && !isApprover) {
      throw new ForbiddenException('Only whoever entered this invoice or an invoice approver can cancel it.');
    }
    const scheduled = await this.prisma.payment.count({ where: { invoiceId: id, status: { in: COMMITTED_PAYMENT_STATUSES } } });
    if (scheduled > 0) {
      throw new ConflictException('Payments are scheduled or made against this invoice. Cancel those payments first.');
    }

    const note = dto.note?.trim();
    await this.transition({
      invoice,
      actorId: userId,
      from: CANCELLABLE_INVOICE_STATUSES,
      to: 'CANCELLED',
      changes: { reviewNote: note || invoice.reviewNote },
      activity: {
        type: 'alert',
        title: 'Invoice cancelled',
        description: `${invoice.invoiceNumber} from ${invoice.vendorName} was cancelled.${note ? ` ${note}` : ''}`,
      },
    });
    return this.invoices.findOne(id, organizationId);
  }

  private async findReviewable(id: string, organizationId: string, userId: string): Promise<Invoice> {
    const invoice = await this.invoices.findInvoiceOrThrow(id, organizationId);
    if (invoice.status !== 'PENDING_APPROVAL') throw new ConflictException('Only invoices awaiting approval can be reviewed.');
    if (invoice.createdById === userId) {
      throw new ForbiddenException("You can't review an invoice you entered. Ask another approver.");
    }
    return invoice;
  }

  private async transition({ invoice, actorId, from, to, changes, activity }: InvoiceTransition): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.invoice.updateMany({
        where: { id: invoice.id, status: { in: from } },
        data: { ...changes, status: to },
      });
      if (count === 0) throw new ConflictException('This invoice was just updated by someone else. Refresh and try again.');
      await this.history.record(tx, { invoice, actorId, ...activity });
    });
  }
}
