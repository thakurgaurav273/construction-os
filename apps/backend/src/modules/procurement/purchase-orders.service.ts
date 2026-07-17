import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreatePurchaseOrderDto, PurchaseOrderItemInput } from './dto/create-purchase-order.dto';

const PO_INCLUDE = {
  project: { select: { id: true, name: true } },
  vendor: { select: { id: true, name: true } },
  items: { orderBy: { sortOrder: 'asc' } },
  timeline: { orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.PurchaseOrderInclude;

type PurchaseOrderWithRels = Prisma.PurchaseOrderGetPayload<{ include: typeof PO_INCLUDE }>;

type ApprovalAction = 'approve' | 'reject' | 'request-changes';

function num(d: Prisma.Decimal | number | null | undefined): number {
  if (d == null) return 0;
  return typeof d === 'number' ? d : Number(d);
}

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function lineTotal(item: { quantity: number; rate: number; taxPercent?: number; discountPercent?: number }): number {
  const tax = item.taxPercent ?? 0;
  const discount = item.discountPercent ?? 0;
  return item.quantity * item.rate * (1 + tax / 100) * (1 - discount / 100);
}

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private mapPurchaseOrder(po: PurchaseOrderWithRels) {
    return {
      id: po.id,
      poNumber: po.poNumber,
      projectId: po.projectId ?? '',
      projectName: po.project?.name ?? '',
      vendorId: po.vendorId ?? '',
      vendorName: po.vendor?.name ?? '',
      category: po.category,
      createdBy: po.createdBy,
      approver: po.approver,
      requestedDate: iso(po.requestedDate),
      expectedDelivery: iso(po.expectedDelivery),
      amount: num(po.amount),
      approvalStatus: po.approvalStatus,
      deliveryStatus: po.deliveryStatus,
      priority: po.priority,
      deliveryAddress: po.deliveryAddress,
      items: po.items.map((it) => ({
        id: it.id,
        description: it.description,
        category: it.category,
        unit: it.unit,
        quantity: num(it.quantity),
        rate: num(it.rate),
        taxPercent: it.taxPercent,
        discountPercent: it.discountPercent,
      })),
      timeline: po.timeline.map((step) => ({
        stage: step.stage,
        actor: step.actor,
        date: iso(step.date),
        note: step.note,
      })),
      notes: po.notes,
    };
  }

  async findAll(organizationId: string) {
    const rows = await this.prisma.purchaseOrder.findMany({
      where: { organizationId },
      include: PO_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((po) => this.mapPurchaseOrder(po));
  }

  async create(organizationId: string, userId: string, dto: CreatePurchaseOrderDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const createdBy = user?.name ?? 'Unknown';

    const items = dto.items ?? [];
    const amount = items.reduce((sum, it) => sum + lineTotal(it), 0);
    const poNumber = dto.poNumber ?? (await this.generatePoNumber(organizationId));

    const now = new Date();
    const expectedDelivery = dto.expectedDelivery ? new Date(dto.expectedDelivery) : now;

    let vendorName = '';
    if (dto.vendorId) {
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: dto.vendorId, organizationId },
        select: { name: true },
      });
      vendorName = vendor?.name ?? '';
    }

    const po = await this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        category: dto.category,
        createdBy,
        approver: dto.approver ?? '',
        requestedDate: now,
        expectedDelivery,
        amount,
        approvalStatus: 'pending',
        deliveryStatus: 'not_started',
        priority: dto.priority ?? 'medium',
        deliveryAddress: dto.deliveryAddress ?? '',
        notes: dto.notes ?? '',
        projectId: dto.projectId || null,
        vendorId: dto.vendorId || null,
        organizationId,
        items: {
          create: items.map((it, index) => this.toLineItemData(it, index)),
        },
        timeline: {
          create: this.defaultTimeline(createdBy, dto.approver ?? '', vendorName, now),
        },
      },
      include: PO_INCLUDE,
    });

    return this.mapPurchaseOrder(po);
  }

  async approve(id: string, organizationId: string) {
    return this.transition(id, organizationId, 'approve');
  }

  async reject(id: string, organizationId: string) {
    return this.transition(id, organizationId, 'reject');
  }

  async requestChanges(id: string, organizationId: string) {
    return this.transition(id, organizationId, 'request-changes');
  }

  async duplicate(id: string, organizationId: string) {
    const source = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId },
      include: PO_INCLUDE,
    });
    if (!source) throw new NotFoundException('Purchase order not found');

    const poNumber = await this.uniquePoNumber(`${source.poNumber}-COPY`, organizationId);

    const clone = await this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        category: source.category,
        createdBy: source.createdBy,
        approver: source.approver,
        requestedDate: new Date(),
        expectedDelivery: source.expectedDelivery,
        amount: source.amount,
        approvalStatus: 'draft',
        deliveryStatus: 'not_started',
        priority: source.priority,
        deliveryAddress: source.deliveryAddress,
        notes: source.notes,
        projectId: source.projectId,
        vendorId: source.vendorId,
        organizationId,
        items: {
          create: source.items.map((it, index) => ({
            description: it.description,
            category: it.category,
            unit: it.unit,
            quantity: it.quantity,
            rate: it.rate,
            taxPercent: it.taxPercent,
            discountPercent: it.discountPercent,
            sortOrder: index,
          })),
        },
        timeline: {
          create: source.timeline.map((step, index) => ({
            stage: step.stage,
            actor: step.actor,
            date: step.stage === 'Created' ? new Date() : null,
            note: step.stage === 'Created' ? 'Duplicated from ' + source.poNumber : '',
            sortOrder: index,
          })),
        },
      },
      include: PO_INCLUDE,
    });

    return this.mapPurchaseOrder(clone);
  }

  private async transition(id: string, organizationId: string, action: ApprovalAction) {
    const existing = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId },
      include: { timeline: true },
    });
    if (!existing) throw new NotFoundException('Purchase order not found');

    const now = new Date();
    const statusByAction: Record<ApprovalAction, string> = {
      approve: 'approved',
      reject: 'rejected',
      'request-changes': 'changes_requested',
    };

    await this.prisma.purchaseOrder.update({
      where: { id },
      data: { approvalStatus: statusByAction[action] },
    });

    const targetStage = action === 'request-changes' ? 'Reviewed' : action === 'approve' ? 'Approved' : 'Reviewed';
    const noteByAction: Record<ApprovalAction, string> = {
      approve: 'Purchase order approved',
      reject: 'Purchase order rejected',
      'request-changes': 'Changes requested',
    };
    const step = existing.timeline.find((s) => s.stage === targetStage);
    if (step) {
      await this.prisma.poApprovalStep.update({
        where: { id: step.id },
        data: { date: now, note: noteByAction[action] },
      });
    }

    const updated = await this.prisma.purchaseOrder.findFirstOrThrow({
      where: { id, organizationId },
      include: PO_INCLUDE,
    });
    return this.mapPurchaseOrder(updated);
  }

  private toLineItemData(it: PurchaseOrderItemInput, index: number): Prisma.PoLineItemCreateWithoutPurchaseOrderInput {
    return {
      description: it.description,
      category: it.category,
      unit: it.unit,
      quantity: it.quantity,
      rate: it.rate,
      taxPercent: it.taxPercent ?? 0,
      discountPercent: it.discountPercent ?? 0,
      sortOrder: index,
    };
  }

  private defaultTimeline(
    createdBy: string,
    approver: string,
    vendorName: string,
    now: Date,
  ): Prisma.PoApprovalStepCreateWithoutPurchaseOrderInput[] {
    return [
      { stage: 'Created', actor: createdBy, date: now, note: 'Purchase order created', sortOrder: 0 },
      { stage: 'Submitted', actor: createdBy, date: now, note: 'Submitted for approval', sortOrder: 1 },
      { stage: 'Reviewed', actor: approver, date: null, note: '', sortOrder: 2 },
      { stage: 'Approved', actor: approver, date: null, note: '', sortOrder: 3 },
      { stage: 'Delivered', actor: vendorName, date: null, note: '', sortOrder: 4 },
    ];
  }

  private async generatePoNumber(organizationId: string): Promise<string> {
    const count = await this.prisma.purchaseOrder.count({ where: { organizationId } });
    return this.uniquePoNumber(`PO-${String(count + 1).padStart(4, '0')}`, organizationId);
  }

  private async uniquePoNumber(base: string, organizationId: string): Promise<string> {
    let candidate = base;
    let suffix = 2;
    while (await this.prisma.purchaseOrder.findFirst({ where: { poNumber: candidate, organizationId }, select: { id: true } })) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }
}
