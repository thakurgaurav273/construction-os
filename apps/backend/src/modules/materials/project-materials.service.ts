import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MaterialIssueType, Prisma } from '@prisma/client';
import { subDays } from 'date-fns';
import { PrismaService } from '../../database/prisma.service';
import { SiteStockMovement, StockLedgerService } from '../inventory/stock-ledger.service';
import { nextDocumentNumber, withDocumentNumberRetry } from '../procurement/document-numbers';
import { isFutureDay } from '../procurement/procurement-math';
import { normalizeOptionalText } from '../../common/utils/normalize-text';
import { MaterialPlanDto, SiteStockMovementDto } from './dto/site-stock-movement.dto';
import { num } from './material.mapper';
import {
  MATERIAL_ISSUE_INCLUDE, MaterialIssueView, ProjectMaterialLine, ProjectMaterialsView, toMaterialIssueView,
} from './project-materials.mapper';

const RECENT_ISSUE_LIMIT = 15;

const ISSUE_DOCUMENTS: Record<MaterialIssueType, { prefix: string; verb: string; title: string }> = {
  ISSUE: { prefix: 'MIN', verb: 'issued from', title: 'Material issued' },
  RETURN: { prefix: 'MRN', verb: 'returned to', title: 'Material returned' },
};

/**
 * Material on a project site: what the plan says the project needs, what stores have issued to it,
 * and what came back unused. Every issue or return is a numbered note (MIN / MRN) that moves stock
 * through the ledger and appears on the project timeline.
 */
@Injectable()
export class ProjectMaterialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: StockLedgerService,
  ) {}

  async findForProject(projectId: string, organizationId: string): Promise<ProjectMaterialsView> {
    await this.assertProject(projectId, organizationId);

    const [usages, recentIssues, issuesThisWeek] = await Promise.all([
      this.prisma.materialProjectUsage.findMany({
        where: { projectId, organizationId, material: { deletedAt: null } },
        include: { material: { select: { id: true, name: true, sku: true, unit: true, unitCost: true, quantity: true, reserved: true } } },
        orderBy: { material: { name: 'asc' } },
      }),
      this.prisma.materialIssue.findMany({
        where: { projectId, organizationId },
        include: MATERIAL_ISSUE_INCLUDE,
        orderBy: [{ issuedOn: 'desc' }, { createdAt: 'desc' }],
        take: RECENT_ISSUE_LIMIT,
      }),
      this.prisma.materialIssue.count({
        where: { projectId, organizationId, type: MaterialIssueType.ISSUE, issuedOn: { gte: subDays(new Date(), 7) } },
      }),
    ]);

    const items: ProjectMaterialLine[] = usages.map((usage) => {
      const planned = num(usage.allocated);
      const consumed = num(usage.consumed);
      return {
        materialId: usage.material.id,
        name: usage.material.name,
        sku: usage.material.sku,
        unit: usage.material.unit,
        planned,
        consumed,
        remaining: planned - consumed,
        consumedValue: Math.round(consumed * num(usage.material.unitCost)),
        storeAvailable: Math.max(0, num(usage.material.quantity) - num(usage.material.reserved)),
      };
    });

    return {
      summary: {
        materialCount: items.length,
        consumedValue: items.reduce((sum, item) => sum + item.consumedValue, 0),
        overPlanCount: items.filter((item) => item.planned > 0 && item.remaining < 0).length,
        issuesThisWeek,
      },
      items,
      recentIssues: recentIssues.map(toMaterialIssueView),
    };
  }

  issue(projectId: string, organizationId: string, userId: string, dto: SiteStockMovementDto): Promise<MaterialIssueView> {
    return this.recordMovement(MaterialIssueType.ISSUE, projectId, organizationId, userId, dto);
  }

  returnToStore(projectId: string, organizationId: string, userId: string, dto: SiteStockMovementDto): Promise<MaterialIssueView> {
    return this.recordMovement(MaterialIssueType.RETURN, projectId, organizationId, userId, dto);
  }

  async setPlan(projectId: string, materialId: string, organizationId: string, dto: MaterialPlanDto): Promise<{ planned: number }> {
    await this.assertProject(projectId, organizationId);
    await this.findMaterial(materialId, organizationId);
    const usage = await this.prisma.materialProjectUsage.upsert({
      where: { materialId_projectId: { materialId, projectId } },
      create: { materialId, projectId, organizationId, allocated: dto.planned },
      update: { allocated: dto.planned },
    });
    return { planned: num(usage.allocated) };
  }

  private async recordMovement(
    type: MaterialIssueType,
    projectId: string,
    organizationId: string,
    userId: string,
    dto: SiteStockMovementDto,
  ): Promise<MaterialIssueView> {
    const project = await this.assertProject(projectId, organizationId);
    const material = await this.findMaterial(dto.materialId, organizationId);
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, organizationId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!warehouse) throw new NotFoundException('Store not found.');

    const issuedOn = dto.issuedOn ? new Date(dto.issuedOn) : new Date();
    if (isFutureDay(issuedOn)) throw new BadRequestException("The date can't be in the future.");

    const document = ISSUE_DOCUMENTS[type];
    const note = normalizeOptionalText(dto.note);

    const saved = await withDocumentNumberRetry(() => this.prisma.$transaction(async (tx) => {
      const code = await this.nextCode(tx, organizationId, document.prefix);
      const movement: SiteStockMovement = {
        organizationId,
        warehouseId: warehouse.id,
        materialId: material.id,
        projectId,
        quantity: dto.quantity,
        reference: code,
        note: note ?? `${document.title} — ${project.name}`,
        occurredAt: issuedOn,
      };
      if (type === MaterialIssueType.ISSUE) await this.ledger.issueToProject(tx, movement);
      else await this.ledger.returnFromProject(tx, movement);

      const issue = await tx.materialIssue.create({
        data: {
          code,
          type,
          quantity: dto.quantity,
          unitCost: material.unitCost,
          note,
          issuedOn,
          materialId: material.id,
          warehouseId: warehouse.id,
          projectId,
          issuedById: userId,
          organizationId,
        },
        include: MATERIAL_ISSUE_INCLUDE,
      });
      await tx.activity.create({
        data: {
          type: 'update',
          title: document.title,
          description: `${code}: ${dto.quantity} ${material.unit} of ${material.name} ${document.verb} ${warehouse.name}.`,
          entityType: 'material_issue',
          entityId: issue.id,
          metadata: { code, materialId: material.id, quantity: dto.quantity },
          actorId: userId,
          projectId,
          organizationId,
        },
      });
      return issue;
    }));
    return toMaterialIssueView(saved);
  }

  private async nextCode(tx: Prisma.TransactionClient, organizationId: string, prefix: string): Promise<string> {
    const existing = await tx.materialIssue.findMany({
      where: { organizationId, code: { startsWith: `${prefix}-` } },
      select: { code: true },
    });
    return nextDocumentNumber(prefix, existing.map((issue) => issue.code));
  }

  private async assertProject(projectId: string, organizationId: string): Promise<{ id: string; name: string }> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!project) throw new NotFoundException('Project not found.');
    return project;
  }

  private async findMaterial(materialId: string, organizationId: string): Promise<{ id: string; name: string; unit: string; unitCost: Prisma.Decimal }> {
    const material = await this.prisma.material.findFirst({
      where: { id: materialId, organizationId, deletedAt: null },
      select: { id: true, name: true, unit: true, unitCost: true },
    });
    if (!material) throw new NotFoundException('Material not found.');
    return material;
  }
}
