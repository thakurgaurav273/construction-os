import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Payment, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { normalizeOptionalText } from '../../common/utils/normalize-text';
import { OptionalNoteDto, RequiredNoteDto } from '../procurement/dto/review-note.dto';
import { nextDocumentNumber, withDocumentNumberRetry } from '../procurement/document-numbers';
import { formatRupees } from '../procurement/purchase-order-history.service';
import { isFutureDay, roundMoney, toNumber } from '../procurement/procurement-math';
import { CreatePaymentDto, MarkPaidDto, PaymentQueryDto } from './dto/payment.dto';
import {
  CANCELLABLE_PAYMENT_STATUSES, COMMITTED_PAYMENT_STATUSES, PAYABLE_INVOICE_STATUSES, PAYMENT_PREFIX,
} from './finance.constants';
import { FinanceActivityType, FinanceHistoryService } from './finance-history.service';
import { PAYMENT_INCLUDE, PaymentView, toPaymentView } from './payment.mapper';

type PaymentWithInvoice = Payment & {
  invoice: { id: string; invoiceNumber: string; projectId: string | null; organizationId: string } | null;
};

interface PaymentTransition {
  payment: PaymentWithInvoice;
  actorId: string;
  from: PaymentStatus[];
  to: PaymentStatus;
  changes?: Omit<Prisma.PaymentUncheckedUpdateManyInput, 'status'>;
  activity: { type: FinanceActivityType; title: string; description: string };
}

/**
 * Payments are released against approved invoices: PENDING → APPROVED → PAID, or REJECTED / CANCELLED.
 * Maker-checker applies again: whoever requested a payment can't approve it. A payment can never exceed the
 * part of the invoice not already covered by other open or paid payments.
 */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: FinanceHistoryService,
  ) {}

  async findAll(organizationId: string, query: PaymentQueryDto): Promise<PaymentView[]> {
    const payments = await this.prisma.payment.findMany({
      where: { organizationId, status: query.status, invoiceId: query.invoiceId, vendorId: query.vendorId },
      include: PAYMENT_INCLUDE,
      orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
    });
    const today = new Date();
    return payments.map((payment) => toPaymentView(payment, today));
  }

  async findOne(id: string, organizationId: string): Promise<PaymentView> {
    const payment = await this.prisma.payment.findFirst({ where: { id, organizationId }, include: PAYMENT_INCLUDE });
    if (!payment) throw new NotFoundException('Payment not found.');
    return toPaymentView(payment, new Date());
  }

  async create(organizationId: string, userId: string, dto: CreatePaymentDto): Promise<PaymentView> {
    const payment = await withDocumentNumberRetry(() => this.prisma.$transaction(async (tx) => {
      // Lock the invoice so concurrent requests can't both claim the same remaining balance.
      await tx.$queryRaw`SELECT id FROM invoices WHERE id = ${dto.invoiceId} AND "organizationId" = ${organizationId} FOR UPDATE`;
      const invoice = await tx.invoice.findFirst({
        where: { id: dto.invoiceId, organizationId },
        include: { payments: { where: { status: { in: COMMITTED_PAYMENT_STATUSES } }, select: { amount: true } } },
      });
      if (!invoice) throw new NotFoundException('Invoice not found.');
      if (!PAYABLE_INVOICE_STATUSES.includes(invoice.status)) {
        throw new ConflictException('Payments can only be made against approved invoices with a balance due.');
      }

      const committed = invoice.payments.reduce((sum, existing) => sum + toNumber(existing.amount), 0);
      const available = roundMoney(toNumber(invoice.totalAmount) - committed);
      if (dto.amount > available + 0.005) {
        throw new BadRequestException(
          available <= 0
            ? 'The full invoice amount is already covered by scheduled or completed payments.'
            : `Only ${formatRupees(available)} of this invoice is left to schedule.`,
        );
      }

      const existingNumbers = await tx.payment.findMany({
        where: { organizationId, paymentNumber: { startsWith: `${PAYMENT_PREFIX}-` } },
        select: { paymentNumber: true },
      });
      const created = await tx.payment.create({
        data: {
          paymentNumber: nextDocumentNumber(PAYMENT_PREFIX, existingNumbers.map((row) => row.paymentNumber)),
          invoiceId: invoice.id,
          vendorId: invoice.vendorId,
          vendorName: invoice.vendorName,
          projectId: invoice.projectId,
          organizationId,
          category: invoice.category,
          amount: dto.amount,
          method: dto.method ?? 'bank_transfer',
          dueDate: dto.dueDate ? new Date(dto.dueDate) : invoice.dueDate,
          notes: dto.notes?.trim() ?? '',
          requestedById: userId,
        },
      });
      await this.history.record(tx, {
        invoice,
        actorId: userId,
        type: 'update',
        title: 'Payment requested',
        description: `${created.paymentNumber} for ${formatRupees(dto.amount)} to ${invoice.vendorName} is awaiting approval.`,
        paymentNumber: created.paymentNumber,
      });
      return created;
    }));
    return this.findOne(payment.id, organizationId);
  }

  async approve(id: string, organizationId: string, userId: string, dto: OptionalNoteDto): Promise<PaymentView> {
    const payment = await this.findReviewable(id, organizationId, userId);
    const note = dto.note?.trim();
    await this.transition({
      payment,
      actorId: userId,
      from: ['PENDING'],
      to: 'APPROVED',
      changes: { reviewedById: userId, reviewedAt: new Date(), reviewNote: note || null },
      activity: {
        type: 'approval',
        title: 'Payment approved',
        description: `${payment.paymentNumber} for ${formatRupees(toNumber(payment.amount))} to ${payment.vendorName} was approved for release.`,
      },
    });
    return this.findOne(id, organizationId);
  }

  async reject(id: string, organizationId: string, userId: string, dto: RequiredNoteDto): Promise<PaymentView> {
    const payment = await this.findReviewable(id, organizationId, userId);
    const note = dto.note.trim();
    await this.transition({
      payment,
      actorId: userId,
      from: ['PENDING'],
      to: 'REJECTED',
      changes: { reviewedById: userId, reviewedAt: new Date(), reviewNote: note },
      activity: {
        type: 'alert',
        title: 'Payment rejected',
        description: `${payment.paymentNumber} to ${payment.vendorName} was rejected: ${note}`,
      },
    });
    return this.findOne(id, organizationId);
  }

  async markPaid(id: string, organizationId: string, userId: string, dto: MarkPaidDto): Promise<PaymentView> {
    const payment = await this.findPaymentOrThrow(id, organizationId);
    if (payment.status !== 'APPROVED') throw new ConflictException('Only approved payments can be marked as paid.');
    const paidDate = new Date(dto.paidDate);
    if (isFutureDay(paidDate)) throw new BadRequestException("The payment date can't be in the future.");

    await this.transition({
      payment,
      actorId: userId,
      from: ['APPROVED'],
      to: 'PAID',
      changes: { paidDate, reference: dto.reference.trim(), method: dto.method ?? payment.method },
      activity: {
        type: 'update',
        title: 'Payment released',
        description: `${payment.paymentNumber}: ${formatRupees(toNumber(payment.amount))} paid to ${payment.vendorName} (ref ${dto.reference.trim()}).`,
      },
    });
    return this.findOne(id, organizationId);
  }

  async cancel(id: string, organizationId: string, userId: string, dto: OptionalNoteDto): Promise<PaymentView> {
    const payment = await this.findPaymentOrThrow(id, organizationId);
    if (!CANCELLABLE_PAYMENT_STATUSES.includes(payment.status)) {
      throw new ConflictException('Only payments that are not yet released can be cancelled.');
    }
    const note = normalizeOptionalText(dto.note);
    await this.transition({
      payment,
      actorId: userId,
      from: CANCELLABLE_PAYMENT_STATUSES,
      to: 'CANCELLED',
      changes: note ? { reviewNote: note } : undefined,
      activity: {
        type: 'alert',
        title: 'Payment cancelled',
        description: `${payment.paymentNumber} to ${payment.vendorName} was cancelled.${note ? ` ${note}` : ''}`,
      },
    });
    return this.findOne(id, organizationId);
  }

  private async findPaymentOrThrow(id: string, organizationId: string): Promise<PaymentWithInvoice> {
    const payment = await this.prisma.payment.findFirst({
      where: { id, organizationId },
      include: { invoice: { select: { id: true, invoiceNumber: true, projectId: true, organizationId: true } } },
    });
    if (!payment) throw new NotFoundException('Payment not found.');
    return payment;
  }

  private async findReviewable(id: string, organizationId: string, userId: string): Promise<PaymentWithInvoice> {
    const payment = await this.findPaymentOrThrow(id, organizationId);
    if (payment.status !== 'PENDING') throw new ConflictException('Only payments awaiting approval can be reviewed.');
    if (payment.requestedById === userId) {
      throw new ForbiddenException("You can't approve a payment you requested. Ask another approver.");
    }
    return payment;
  }

  private async transition({ payment, actorId, from, to, changes, activity }: PaymentTransition): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.payment.updateMany({ where: { id: payment.id, status: { in: from } }, data: { ...changes, status: to } });
      if (count === 0) throw new ConflictException('This payment was just updated by someone else. Refresh and try again.');
      if (!payment.invoice) return;
      // The invoice moves to PARTIALLY_PAID / PAID in the same transaction as the payment.
      if (to === 'PAID') await settleInvoice(tx, payment.invoice.id);
      await this.history.record(tx, { invoice: payment.invoice, actorId, ...activity, paymentNumber: payment.paymentNumber });
    });
  }
}

/** Recomputes an invoice's paid state from its released payments. */
async function settleInvoice(tx: Prisma.TransactionClient, invoiceId: string): Promise<void> {
  const invoice = await tx.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { payments: { where: { status: 'PAID' }, select: { amount: true, paidDate: true } } },
  });
  if (!PAYABLE_INVOICE_STATUSES.includes(invoice.status)) return;

  const paid = roundMoney(invoice.payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0));
  const isSettled = paid >= toNumber(invoice.totalAmount) - 0.005;
  const lastPaidDate = invoice.payments.reduce<Date | null>(
    (latest, payment) => (payment.paidDate && (!latest || payment.paidDate > latest) ? payment.paidDate : latest),
    null,
  );
  await tx.invoice.update({
    where: { id: invoiceId },
    data: isSettled ? { status: 'PAID', paidDate: lastPaidDate } : { status: 'PARTIALLY_PAID' },
  });
}
