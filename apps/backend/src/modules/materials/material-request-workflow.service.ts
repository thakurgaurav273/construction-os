import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { MaterialIssueType, MaterialRequest, MaterialRequestStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { normalizeOptionalText } from '../../common/utils/normalize-text';
import { withDocumentNumberRetry } from '../procurement/document-numbers';
import { isFutureDay } from '../procurement/procurement-math';
import { assertProjectOpen, findProjectInOrganization } from '../projects/project-guards';
import { IssueAgainstRequestDto } from './dto/material-request.dto';
import {
  ISSUABLE_REQUEST_STATUSES, MaterialRequestDetailView, QUANTITY_TOLERANCE, describeRequestStatus, remainingQuantity,
} from './material-request.mapper';
import { MaterialRequestsService } from './material-requests.service';
import { ProjectMaterialsService } from './project-materials.service';

type StatusChange = Pick<Prisma.MaterialRequestUncheckedUpdateManyInput,
  'status' | 'reviewNote' | 'reviewedById' | 'reviewedAt' | 'closedById' | 'closedAt'>;

/**
 * Request lifecycle: PENDING → APPROVED → PARTLY_ISSUED → ISSUED. Exits: REJECTED (by the stores, before
 * approval), CANCELLED (by the requester, before anything is issued) and CLOSED (by the stores, when the rest
 * won't be supplied). Maker-checker: whoever raised a request can't approve or reject it.
 */
@Injectable()
export class MaterialRequestWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requests: MaterialRequestsService,
    private readonly siteStock: ProjectMaterialsService,
  ) {}

  async approve(id: string, organizationId: string, userId: string): Promise<MaterialRequestDetailView> {
    const request = await this.findRequest(id, organizationId);
    assertNotRequester(request, userId, 'approve');
    const project = await findProjectInOrganization(this.prisma, request.projectId, organizationId);
    assertProjectOpen(project, 'approve material for it');
    await this.move(request, ['PENDING'], { status: 'APPROVED', reviewedById: userId, reviewedAt: new Date() }, {
      title: 'Material request approved',
      description: `${request.code} approved for issue from the stores.`,
      userId,
    });
    return this.requests.findOne(id, organizationId);
  }

  async reject(id: string, organizationId: string, userId: string, note: string): Promise<MaterialRequestDetailView> {
    const request = await this.findRequest(id, organizationId);
    assertNotRequester(request, userId, 'reject');
    const reviewNote = note.trim();
    await this.move(request, ['PENDING'], { status: 'REJECTED', reviewNote, reviewedById: userId, reviewedAt: new Date() }, {
      title: 'Material request rejected',
      description: `${request.code} rejected: ${reviewNote}`,
      userId,
    });
    return this.requests.findOne(id, organizationId);
  }

  /** The requester withdraws it; only possible while nothing has been issued against it. */
  async cancel(id: string, organizationId: string, userId: string, note?: string): Promise<MaterialRequestDetailView> {
    const request = await this.findRequest(id, organizationId);
    if (request.requestedById !== userId) {
      throw new ForbiddenException('Only the person who raised this request can cancel it. Reject or close it instead.');
    }
    await this.move(request, ['PENDING', 'APPROVED'], {
      status: 'CANCELLED', reviewNote: normalizeOptionalText(note) ?? null, closedById: userId, closedAt: new Date(),
    });
    return this.requests.findOne(id, organizationId);
  }

  /** The stores won't supply what's left, e.g. the site found it elsewhere. What was issued stays issued. */
  async close(id: string, organizationId: string, userId: string, note: string): Promise<MaterialRequestDetailView> {
    const request = await this.findRequest(id, organizationId);
    const reviewNote = note.trim();
    await this.move(request, ISSUABLE_REQUEST_STATUSES, { status: 'CLOSED', reviewNote, closedById: userId, closedAt: new Date() }, {
      title: 'Material request closed',
      description: `${request.code} closed without issuing the rest: ${reviewNote}`,
      userId,
    });
    return this.requests.findOne(id, organizationId);
  }

  /**
   * Issues lines of an approved request from one store. Each line becomes a numbered issue note through the
   * stock ledger, so the store's availability check and the project's consumption work exactly as for a
   * direct issue. A line can't be issued beyond what was requested.
   */
  async issue(id: string, organizationId: string, userId: string, dto: IssueAgainstRequestDto): Promise<MaterialRequestDetailView> {
    const request = await this.findRequest(id, organizationId);
    const project = await findProjectInOrganization(this.prisma, request.projectId, organizationId);
    assertProjectOpen(project, 'issue material to it');
    if (!ISSUABLE_REQUEST_STATUSES.includes(request.status)) {
      throw new ConflictException(`${describeRequestStatus(request.code, request.status)}, so nothing can be issued against it.`);
    }

    const itemIds = dto.lines.map((line) => line.itemId);
    if (new Set(itemIds).size !== itemIds.length) throw new BadRequestException('Each request line can appear only once.');
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, organizationId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!warehouse) throw new NotFoundException('Store not found.');
    const issuedOn = dto.issuedOn ? new Date(dto.issuedOn) : new Date();
    if (isFutureDay(issuedOn)) throw new BadRequestException("The date can't be in the future.");
    const note = normalizeOptionalText(dto.note) ?? null;

    await withDocumentNumberRetry(() => this.prisma.$transaction(async (tx) => {
      // Locking the request makes two people issuing at once take turns, so a line can't be over-issued.
      await tx.$queryRaw`SELECT id FROM material_requests WHERE id = ${request.id} FOR UPDATE`;
      const current = await tx.materialRequest.findUniqueOrThrow({
        where: { id: request.id },
        include: { items: { include: { material: { select: { id: true, name: true, unit: true, unitCost: true } } } } },
      });
      if (!ISSUABLE_REQUEST_STATUSES.includes(current.status)) {
        throw new ConflictException(`${describeRequestStatus(current.code, current.status)}, so nothing can be issued against it.`);
      }

      for (const line of dto.lines) {
        const item = current.items.find((candidate) => candidate.id === line.itemId);
        if (!item) throw new BadRequestException(`That line isn't part of ${current.code}.`);
        const remaining = remainingQuantity(item);
        if (line.quantity > remaining + QUANTITY_TOLERANCE) {
          throw new BadRequestException(
            remaining > 0
              ? `Only ${remaining} ${item.material.unit} of ${item.material.name} is still owed on ${current.code}.`
              : `${item.material.name} on ${current.code} has already been issued in full.`,
          );
        }
        await this.siteStock.writeNote(tx, {
          type: MaterialIssueType.ISSUE,
          organizationId,
          userId,
          project,
          material: item.material,
          warehouse,
          quantity: line.quantity,
          issuedOn,
          note,
          requestItemId: item.id,
          requestCode: current.code,
        });
        await tx.materialRequestItem.update({ where: { id: item.id }, data: { issuedQuantity: { increment: line.quantity } } });
      }

      const items = await tx.materialRequestItem.findMany({ where: { requestId: current.id } });
      const status: MaterialRequestStatus = items.every((item) => remainingQuantity(item) === 0) ? 'ISSUED' : 'PARTLY_ISSUED';
      await tx.materialRequest.update({ where: { id: current.id }, data: { status } });
    }));
    return this.requests.findOne(id, organizationId);
  }

  private async findRequest(id: string, organizationId: string): Promise<MaterialRequest> {
    const request = await this.prisma.materialRequest.findFirst({ where: { id, organizationId } });
    if (!request) throw new NotFoundException('Material request not found.');
    return request;
  }

  /** Conditional update so two people acting on the same request can't both win. */
  private async move(
    request: MaterialRequest,
    from: MaterialRequestStatus[],
    data: StatusChange,
    activity?: { title: string; description: string; userId: string },
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.materialRequest.updateMany({ where: { id: request.id, status: { in: from } }, data });
      if (count === 0) throw new ConflictException(`${describeRequestStatus(request.code, request.status)} and can't be changed this way.`);
      if (!activity) return;
      await tx.activity.create({
        data: {
          type: 'update',
          title: activity.title,
          description: activity.description,
          entityType: 'material_request',
          entityId: request.id,
          metadata: { code: request.code },
          actorId: activity.userId,
          projectId: request.projectId,
          organizationId: request.organizationId,
        },
      });
    });
  }
}

function assertNotRequester(request: MaterialRequest, userId: string, action: string): void {
  if (request.requestedById === userId) {
    throw new ForbiddenException(`You raised ${request.code}, so someone else has to ${action} it.`);
  }
}
