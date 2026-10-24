import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Rfq, RfqItem } from '@prisma/client';
import { findOpenProject } from '../projects/project-guards';
import { PrismaService } from '../../database/prisma.service';
import { normalizeOptionalText } from '../../common/utils/normalize-text';
import { withDocumentNumberRetry } from './document-numbers';
import { AwardRfqDto, QuoteItemDto, RecordQuoteDto } from './dto/rfq.dto';
import { OPEN_RFQ_STATUSES, PO_EVENTS } from './procurement.constants';
import { addUtcDays, formatDay, roundMoney, startOfUtcDay, toNumber, wholeDaysBetween } from './procurement-math';
import { formatRupees } from './purchase-order-history.service';
import { PurchaseOrdersService } from './purchase-orders.service';
import { RfqDetailView } from './rfq.mapper';
import { RfqsService } from './rfqs.service';

type RfqWithItems = Rfq & { items: RfqItem[] };

/** Records vendor quotes against an RFQ and turns the winning quote into a draft purchase order. */
@Injectable()
export class RfqQuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rfqs: RfqsService,
    private readonly orders: PurchaseOrdersService,
  ) {}

  async recordQuote(
    rfqId: string,
    invitationId: string,
    organizationId: string,
    dto: RecordQuoteDto,
  ): Promise<RfqDetailView> {
    const rfq = await this.findQuotableRfq(rfqId, organizationId);
    await this.findInvitationOrThrow(invitationId, rfqId);
    const rates = matchRatesToItems(rfq.items, dto.items);
    const subtotal = rfq.items.reduce((sum, item) => sum + toNumber(item.quantity) * (rates.get(item.id) ?? 0), 0);

    await this.prisma.$transaction(async (tx) => {
      await tx.rfqQuoteItem.deleteMany({ where: { invitationId } });
      await tx.rfqQuoteItem.createMany({
        data: rfq.items.map((item) => ({ invitationId, rfqItemId: item.id, rate: rates.get(item.id) ?? 0 })),
      });
      await tx.rfqInvitation.update({
        where: { id: invitationId },
        data: {
          status: 'QUOTED',
          respondedAt: new Date(),
          leadTimeDays: dto.leadTimeDays,
          validUntil: dto.validUntil ? startOfUtcDay(new Date(dto.validUntil)) : null,
          taxPercent: dto.taxPercent,
          notes: normalizeOptionalText(dto.notes) ?? null,
          quotedAmount: roundMoney(subtotal * (1 + dto.taxPercent / 100)),
        },
      });
    });
    return this.rfqs.findOne(rfqId, organizationId);
  }

  async decline(rfqId: string, invitationId: string, organizationId: string): Promise<RfqDetailView> {
    await this.findQuotableRfq(rfqId, organizationId);
    await this.findInvitationOrThrow(invitationId, rfqId);

    await this.prisma.$transaction([
      this.prisma.rfqQuoteItem.deleteMany({ where: { invitationId } }),
      this.prisma.rfqInvitation.update({
        where: { id: invitationId },
        data: { status: 'DECLINED', respondedAt: new Date(), quotedAmount: null, leadTimeDays: null, validUntil: null },
      }),
    ]);
    return this.rfqs.findOne(rfqId, organizationId);
  }

  /** Awards the RFQ to one quote and raises a draft purchase order priced at the quoted rates. */
  async award(rfqId: string, organizationId: string, userId: string, dto: AwardRfqDto): Promise<RfqDetailView> {
    const rfq = await this.findQuotableRfq(rfqId, organizationId);
    if (!rfq.projectId) throw new BadRequestException('Assign the RFQ to a project before awarding it.');
    const projectId = rfq.projectId;
    await findOpenProject(this.prisma, projectId, organizationId, 'award orders for it');

    const invitation = await this.prisma.rfqInvitation.findFirst({
      where: { id: dto.invitationId, rfqId },
      include: { vendor: true, quoteItems: true },
    });
    if (!invitation) throw new NotFoundException('Quote not found on this RFQ.');
    if (invitation.status !== 'QUOTED') throw new BadRequestException('Only vendors who have quoted can be awarded.');
    if (invitation.vendor.status !== 'ACTIVE') {
      throw new BadRequestException(`${invitation.vendor.name} is inactive. Reactivate the vendor before awarding.`);
    }
    if (invitation.validUntil && wholeDaysBetween(invitation.validUntil, new Date()) > 0) {
      throw new BadRequestException(
        `This quote expired on ${formatDay(invitation.validUntil)}. Record a fresh quote before awarding.`,
      );
    }

    const project = await this.prisma.project.findFirst({ where: { id: projectId }, select: { location: true } });
    const rates = new Map(invitation.quoteItems.map((quoteItem) => [quoteItem.rfqItemId, toNumber(quoteItem.rate)]));
    const quotedAmount = toNumber(invitation.quotedAmount);

    await withDocumentNumberRetry(() => this.prisma.$transaction(async (tx) => {
      const order = await this.orders.createDraft(tx, {
        organizationId,
        requesterId: userId,
        projectId,
        vendorId: invitation.vendorId,
        category: rfq.category,
        priority: rfq.priority,
        expectedDelivery: addUtcDays(new Date(), invitation.leadTimeDays ?? 0),
        deliveryAddress: project?.location ?? '',
        notes: `Awarded from ${rfq.rfqNumber}: ${rfq.title}`,
        items: rfq.items.map((item) => ({
          description: item.description,
          category: rfq.category,
          unit: item.unit,
          quantity: toNumber(item.quantity),
          rate: rates.get(item.id) ?? 0,
          taxPercent: invitation.taxPercent,
          discountPercent: 0,
        })),
        origin: { stage: PO_EVENTS.awarded, note: `${rfq.rfqNumber} awarded to ${invitation.vendor.name}` },
      });

      const { count } = await tx.rfq.updateMany({
        where: { id: rfqId, status: { in: OPEN_RFQ_STATUSES } },
        data: { status: 'AWARDED', awardedAt: new Date(), awardedVendorId: invitation.vendorId, purchaseOrderId: order.id },
      });
      if (count === 0) throw new ConflictException('This RFQ was just awarded or cancelled. Refresh to see the latest.');

      await tx.activity.create({
        data: {
          type: 'approval',
          title: 'RFQ awarded',
          description: `${rfq.rfqNumber} awarded to ${invitation.vendor.name} at ${formatRupees(quotedAmount)}. Draft ${order.poNumber} raised for approval.`,
          entityType: 'rfq',
          entityId: rfqId,
          actorId: userId,
          projectId,
          organizationId,
        },
      });
    }));
    return this.rfqs.findOne(rfqId, organizationId);
  }

  private async findQuotableRfq(rfqId: string, organizationId: string): Promise<RfqWithItems> {
    const rfq = await this.prisma.rfq.findFirst({
      where: { id: rfqId, organizationId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!rfq) throw new NotFoundException('RFQ not found.');
    if (!OPEN_RFQ_STATUSES.includes(rfq.status)) {
      throw new ConflictException('This RFQ has already been awarded or cancelled.');
    }
    return rfq;
  }

  private async findInvitationOrThrow(invitationId: string, rfqId: string): Promise<void> {
    const invitation = await this.prisma.rfqInvitation.findFirst({ where: { id: invitationId, rfqId }, select: { id: true } });
    if (!invitation) throw new NotFoundException('This vendor was not invited to the RFQ.');
  }
}

/** A quote must price every RFQ item exactly once. */
function matchRatesToItems(items: RfqItem[], quoteItems: QuoteItemDto[]): Map<string, number> {
  const itemIds = new Set(items.map((item) => item.id));
  const rates = new Map<string, number>();
  for (const quoteItem of quoteItems) {
    if (!itemIds.has(quoteItem.rfqItemId) || rates.has(quoteItem.rfqItemId)) {
      throw new BadRequestException('Each quoted rate must match one item on the RFQ.');
    }
    rates.set(quoteItem.rfqItemId, quoteItem.rate);
  }
  if (rates.size !== itemIds.size) throw new BadRequestException('Enter a rate for every item on the RFQ.');
  return rates;
}
