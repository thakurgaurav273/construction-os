import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Rfq, RfqStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { normalizeOptionalText } from '../../common/utils/normalize-text';
import { nextDocumentNumber, withDocumentNumberRetry } from './document-numbers';
import { CreateRfqDto, InviteVendorsDto } from './dto/rfq.dto';
import { DOCUMENT_PREFIX, MAX_RFQ_VENDORS, OPEN_RFQ_STATUSES } from './procurement.constants';
import { formatDay } from './procurement-math';
import { PurchaseOrdersService, parseFutureDate } from './purchase-orders.service';
import { RFQ_DETAIL_INCLUDE, RFQ_LIST_INCLUDE, RfqDetailView, RfqView, toRfqDetailView, toRfqView } from './rfq.mapper';
import { VendorsService } from './vendors.service';

/**
 * Request for quotation lifecycle: OPEN (inviting vendors, collecting quotes) → EVALUATING (bidding closed)
 * → AWARDED (a draft purchase order is raised for the winning quote). Open RFQs can be CANCELLED.
 */
@Injectable()
export class RfqsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vendors: VendorsService,
    private readonly orders: PurchaseOrdersService,
  ) {}

  async findAll(organizationId: string): Promise<RfqView[]> {
    const rfqs = await this.prisma.rfq.findMany({
      where: { organizationId },
      include: RFQ_LIST_INCLUDE,
      orderBy: [{ issuedDate: 'desc' }, { rfqNumber: 'desc' }],
    });
    const today = new Date();
    return rfqs.map((rfq) => toRfqView(rfq, today));
  }

  async findOne(id: string, organizationId: string): Promise<RfqDetailView> {
    const rfq = await this.prisma.rfq.findFirst({ where: { id, organizationId }, include: RFQ_DETAIL_INCLUDE });
    if (!rfq) throw new NotFoundException('RFQ not found.');
    return toRfqDetailView(rfq, new Date());
  }

  async create(organizationId: string, userId: string, dto: CreateRfqDto): Promise<RfqDetailView> {
    await this.orders.assertProjectInOrganization(dto.projectId, organizationId);
    await this.vendors.findActiveVendors(dto.vendorIds, organizationId);
    const closingDate = parseFutureDate(dto.closingDate, 'Closing date');
    const title = dto.title.trim();

    const rfq = await withDocumentNumberRetry(() => this.prisma.$transaction(async (tx) => {
      const created = await tx.rfq.create({
        data: {
          rfqNumber: await this.nextRfqNumber(tx, organizationId),
          title,
          description: normalizeOptionalText(dto.description),
          category: dto.category.trim(),
          priority: dto.priority ?? 'MEDIUM',
          closingDate,
          estimatedValue: dto.estimatedValue ?? 0,
          createdById: userId,
          projectId: dto.projectId,
          organizationId,
          items: {
            create: dto.items.map((item, index) => ({
              description: item.description.trim(),
              unit: item.unit.trim(),
              quantity: item.quantity,
              sortOrder: index,
            })),
          },
          invitations: { create: dto.vendorIds.map((vendorId) => ({ vendorId })) },
        },
      });
      await tx.activity.create({
        data: {
          type: 'update',
          title: 'RFQ issued',
          description: `${created.rfqNumber} · ${title} sent to ${dto.vendorIds.length} vendor${dto.vendorIds.length === 1 ? '' : 's'}, closing ${formatDay(closingDate)}.`,
          entityType: 'rfq',
          entityId: created.id,
          actorId: userId,
          projectId: dto.projectId,
          organizationId,
        },
      });
      return created;
    }));
    return this.findOne(rfq.id, organizationId);
  }

  async invite(id: string, organizationId: string, dto: InviteVendorsDto): Promise<RfqDetailView> {
    const rfq = await this.findRfqOrThrow(id, organizationId);
    if (rfq.status !== 'OPEN') throw new ConflictException('Vendors can only be invited while the RFQ is open.');
    await this.vendors.findActiveVendors(dto.vendorIds, organizationId);

    const invited = await this.prisma.rfqInvitation.findMany({ where: { rfqId: id }, select: { vendorId: true } });
    const total = new Set([...invited.map((invitation) => invitation.vendorId), ...dto.vendorIds]).size;
    if (total > MAX_RFQ_VENDORS) throw new BadRequestException(`An RFQ can have at most ${MAX_RFQ_VENDORS} vendors.`);

    await this.prisma.rfqInvitation.createMany({
      data: dto.vendorIds.map((vendorId) => ({ rfqId: id, vendorId })),
      skipDuplicates: true,
    });
    return this.findOne(id, organizationId);
  }

  /** Stops collecting quotes so the team can compare and award. */
  async close(id: string, organizationId: string): Promise<RfqDetailView> {
    return this.moveStatus(id, organizationId, ['OPEN'], 'EVALUATING', 'Only open RFQs can be closed for evaluation.');
  }

  async cancel(id: string, organizationId: string): Promise<RfqDetailView> {
    return this.moveStatus(id, organizationId, OPEN_RFQ_STATUSES, 'CANCELLED', 'This RFQ has already been awarded or cancelled.');
  }

  async findRfqOrThrow(id: string, organizationId: string): Promise<Rfq> {
    const rfq = await this.prisma.rfq.findFirst({ where: { id, organizationId } });
    if (!rfq) throw new NotFoundException('RFQ not found.');
    return rfq;
  }

  private async moveStatus(
    id: string,
    organizationId: string,
    from: RfqStatus[],
    to: RfqStatus,
    conflictMessage: string,
  ): Promise<RfqDetailView> {
    await this.findRfqOrThrow(id, organizationId);
    const { count } = await this.prisma.rfq.updateMany({ where: { id, status: { in: from } }, data: { status: to } });
    if (count === 0) throw new ConflictException(conflictMessage);
    return this.findOne(id, organizationId);
  }

  private async nextRfqNumber(tx: Prisma.TransactionClient, organizationId: string): Promise<string> {
    const rfqs = await tx.rfq.findMany({
      where: { organizationId, rfqNumber: { startsWith: `${DOCUMENT_PREFIX.rfq}-` } },
      select: { rfqNumber: true },
    });
    return nextDocumentNumber(DOCUMENT_PREFIX.rfq, rfqs.map((rfq) => rfq.rfqNumber));
  }
}
