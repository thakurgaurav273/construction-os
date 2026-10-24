import {
  BadRequestException, ConflictException, ForbiddenException, Injectable,
} from '@nestjs/common';
import { Prisma, PurchaseOrderStatus } from '@prisma/client';
import { findOpenProject } from '../projects/project-guards';
import { PrismaService } from '../../database/prisma.service';
import { OptionalNoteDto, RequiredNoteDto } from './dto/review-note.dto';
import { CANCELLABLE_PO_STATUSES, EDITABLE_PO_STATUSES, PO_EVENTS } from './procurement.constants';
import { toNumber } from './procurement-math';
import { HistoryEntry, PurchaseOrderHistoryService, formatRupees } from './purchase-order-history.service';
import { PurchaseOrderDetailView } from './purchase-order.mapper';
import { PurchaseOrderWithItems, PurchaseOrdersService } from './purchase-orders.service';
import { VendorsService } from './vendors.service';

interface OrderTransition {
  order: PurchaseOrderWithItems;
  actorId: string;
  from: PurchaseOrderStatus[];
  to: PurchaseOrderStatus;
  changes?: Omit<Prisma.PurchaseOrderUncheckedUpdateManyInput, 'status'>;
  stage: string;
  note?: string;
  activity: NonNullable<HistoryEntry['activity']>;
  /** Extra writes that must commit together with the status change. */
  onTransition?: (tx: Prisma.TransactionClient) => Promise<unknown>;
}

/**
 * Purchase order lifecycle: DRAFT → PENDING → APPROVED | REJECTED, or PENDING → CHANGES_REQUESTED → (edit) → PENDING.
 * Any open order can be CANCELLED until goods arrive. Approval is maker-checker: whoever raised the order
 * can never approve, reject or send it back.
 */
@Injectable()
export class PurchaseOrderWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: PurchaseOrdersService,
    private readonly vendors: VendorsService,
    private readonly history: PurchaseOrderHistoryService,
  ) {}

  async submit(id: string, organizationId: string, userId: string): Promise<PurchaseOrderDetailView> {
    const order = await this.orders.findOrderOrThrow(id, organizationId);
    if (!EDITABLE_PO_STATUSES.includes(order.status)) {
      throw new ConflictException('Only drafts and orders sent back for changes can be submitted.');
    }
    if (!order.projectId || !order.vendorId) throw new BadRequestException('Choose a project and vendor before submitting.');
    await findOpenProject(this.prisma, order.projectId, organizationId, 'order for it');
    if (order.items.length === 0) throw new BadRequestException('Add at least one line item before submitting.');
    await this.vendors.findActiveVendor(order.vendorId, organizationId);

    const isResubmission = order.status === 'CHANGES_REQUESTED';
    await this.transition({
      order,
      actorId: userId,
      from: EDITABLE_PO_STATUSES,
      to: 'PENDING',
      changes: { submittedAt: new Date(), reviewedById: null, reviewedAt: null, reviewNote: null },
      stage: PO_EVENTS.submitted,
      note: isResubmission ? 'Resubmitted after changes' : '',
      activity: {
        type: 'update',
        title: isResubmission ? 'Purchase order resubmitted' : 'Purchase order submitted',
        description: `${order.poNumber} (${formatRupees(toNumber(order.amount))}) is awaiting approval.`,
      },
    });
    return this.orders.findOne(id, organizationId);
  }

  async approve(id: string, organizationId: string, userId: string, dto: OptionalNoteDto): Promise<PurchaseOrderDetailView> {
    const order = await this.findReviewableOrder(id, organizationId, userId);
    // Approving commits new spend; rejecting or cancelling an order on an archived project stays possible.
    if (order.projectId) await findOpenProject(this.prisma, order.projectId, organizationId, 'approve orders for it');
    await this.transition({
      order,
      actorId: userId,
      from: ['PENDING'],
      to: 'APPROVED',
      changes: { reviewedById: userId, reviewedAt: new Date(), reviewNote: dto.note?.trim() || null },
      stage: PO_EVENTS.approved,
      note: dto.note,
      activity: {
        type: 'approval',
        title: 'Purchase order approved',
        description: `${order.poNumber} (${formatRupees(toNumber(order.amount))}) was approved and can be sent to the vendor.`,
      },
    });
    return this.orders.findOne(id, organizationId);
  }

  async reject(id: string, organizationId: string, userId: string, dto: RequiredNoteDto): Promise<PurchaseOrderDetailView> {
    const order = await this.findReviewableOrder(id, organizationId, userId);
    const note = dto.note.trim();
    await this.transition({
      order,
      actorId: userId,
      from: ['PENDING'],
      to: 'REJECTED',
      changes: { reviewedById: userId, reviewedAt: new Date(), reviewNote: note },
      stage: PO_EVENTS.rejected,
      note,
      activity: { type: 'alert', title: 'Purchase order rejected', description: `${order.poNumber} was rejected: ${note}` },
    });
    return this.orders.findOne(id, organizationId);
  }

  async requestChanges(
    id: string,
    organizationId: string,
    userId: string,
    dto: RequiredNoteDto,
  ): Promise<PurchaseOrderDetailView> {
    const order = await this.findReviewableOrder(id, organizationId, userId);
    const note = dto.note.trim();
    await this.transition({
      order,
      actorId: userId,
      from: ['PENDING'],
      to: 'CHANGES_REQUESTED',
      changes: { reviewedById: userId, reviewedAt: new Date(), reviewNote: note },
      stage: PO_EVENTS.changesRequested,
      note,
      activity: {
        type: 'alert',
        title: 'Changes requested on purchase order',
        description: `${order.poNumber} was sent back: ${note}`,
      },
    });
    return this.orders.findOne(id, organizationId);
  }

  /** Requesters can withdraw their own open orders; anyone else's, or an approved commitment, needs approver rights. */
  async cancel(
    id: string,
    organizationId: string,
    userId: string,
    dto: OptionalNoteDto,
    isApprover: boolean,
  ): Promise<PurchaseOrderDetailView> {
    const order = await this.orders.findOrderOrThrow(id, organizationId);
    if (!CANCELLABLE_PO_STATUSES.includes(order.status)) {
      throw new ConflictException('This purchase order is already closed.');
    }
    if (order.status === 'APPROVED' && !isApprover) {
      throw new ForbiddenException('Only purchase order approvers can cancel an approved order.');
    }
    if (order.requestedById !== userId && !isApprover) {
      throw new ForbiddenException('Only the requester or a purchase order approver can cancel this order.');
    }
    if (order.items.some((item) => toNumber(item.receivedQuantity) > 0)) {
      throw new ConflictException("Goods have already been received against this order, so it can't be cancelled.");
    }

    await this.transition({
      order,
      actorId: userId,
      from: CANCELLABLE_PO_STATUSES,
      to: 'CANCELLED',
      stage: PO_EVENTS.cancelled,
      note: dto.note,
      activity: {
        type: 'alert',
        title: 'Purchase order cancelled',
        description: dto.note?.trim() ? `${order.poNumber} was cancelled: ${dto.note.trim()}` : `${order.poNumber} was cancelled.`,
      },
      // Shipments still on their way are called off with the order.
      onTransition: (tx) => tx.delivery.updateMany({
        where: { purchaseOrderId: id, status: { in: ['SCHEDULED', 'IN_TRANSIT'] } },
        data: { status: 'CANCELLED' },
      }),
    });
    return this.orders.findOne(id, organizationId);
  }

  private async findReviewableOrder(id: string, organizationId: string, userId: string): Promise<PurchaseOrderWithItems> {
    const order = await this.orders.findOrderOrThrow(id, organizationId);
    if (order.status !== 'PENDING') throw new ConflictException('Only orders awaiting approval can be reviewed.');
    if (order.requestedById === userId) {
      throw new ForbiddenException("You can't review a purchase order you raised. Ask another approver.");
    }
    return order;
  }

  private async transition(transition: OrderTransition): Promise<void> {
    const { order, actorId, from, to, changes, stage, note, activity, onTransition } = transition;

    await this.prisma.$transaction(async (tx) => {
      // Matching on the expected status stops two reviewers acting on the same order at once.
      const { count } = await tx.purchaseOrder.updateMany({
        where: { id: order.id, status: { in: from } },
        data: { ...changes, status: to },
      });
      if (count === 0) {
        throw new ConflictException('This purchase order was just updated by someone else. Refresh and try again.');
      }
      await onTransition?.(tx);
      await this.history.record(tx, { order, actorId, stage, note, activity });
    });
  }
}
