import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MaterialIssueType, Prisma } from '@prisma/client';
import { subDays } from 'date-fns';
import { assertProjectOpen, findOpenProject, findProjectInOrganization } from '../projects/project-guards';
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
    await findProjectInOrganization(this.prisma, projectId, organizationId);

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
    await findOpenProject(this.prisma, projectId, organizationId, 'plan materials for it');
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
    const project = await findProjectInOrganization(this.prisma, projectId, organizationId);
    // Leftover stock can still come back to the store after a site closes; nothing new goes out to it.
    if (type === MaterialIssueType.ISSUE) assertProjectOpen(project, 'issue material to it');
    const material = await this.findMaterial(dto.materialId, organizationId);
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, organizationId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!warehouse) throw new NotFoundException('Store not found.');

    const subcontract = dto.contractId ? await this.findSubcontract(dto.contractId, projectId, organizationId) : null;
    // A return is credited at the rate the material was charged at, unless another is given.
    const issuedRate = subcontract && type === MaterialIssueType.RETURN
      ? await this.assertReturnable(subcontract.id, material.id, dto.quantity, material.unit)
      : null;
    if (!subcontract && dto.recoveryRate !== undefined) throw new BadRequestException('A recovery rate needs the subcontract it is recovered from.');

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
          contractId: subcontract?.id ?? null,
          recoveryRate: subcontract ? dto.recoveryRate ?? issuedRate ?? material.unitCost : null,
          issuedById: userId,
          organizationId,
        },
        include: MATERIAL_ISSUE_INCLUDE,
      });
      await tx.activity.create({
        data: {
          type: 'update',
          title: document.title,
          description: `${code}: ${dto.quantity} ${material.unit} of ${material.name} ${document.verb} ${warehouse.name}${subcontract ? ` (${type === MaterialIssueType.ISSUE ? 'to' : 'from'} ${subcontract.vendorName}, ${subcontract.code})` : ''}.`,
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

  /** Only an active subcontract on the same project can receive material to be recovered. */
  private async findSubcontract(contractId: string, projectId: string, organizationId: string): Promise<{ id: string; code: string; vendorName: string }> {
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, organizationId },
      select: { id: true, code: true, direction: true, status: true, projectId: true, vendor: { select: { name: true } } },
    });
    if (!contract || contract.direction !== 'SUBCONTRACT') throw new NotFoundException('Subcontract not found.');
    if (contract.projectId !== projectId) throw new BadRequestException(`${contract.code} belongs to a different project.`);
    if (contract.status !== 'ACTIVE') throw new BadRequestException(`${contract.code} is closed.`);
    return { id: contract.id, code: contract.code, vendorName: contract.vendor?.name ?? 'the subcontractor' };
  }

  /** A subcontractor can't return more of a material than they were issued. Returns the latest issue's rate. */
  private async assertReturnable(contractId: string, materialId: string, quantity: number, unit: string): Promise<Prisma.Decimal | null> {
    const moved = await this.prisma.materialIssue.groupBy({
      by: ['type'],
      where: { contractId, materialId },
      _sum: { quantity: true },
    });
    const total = (type: MaterialIssueType): number => num(moved.find((entry) => entry.type === type)?._sum.quantity ?? null);
    const held = total(MaterialIssueType.ISSUE) - total(MaterialIssueType.RETURN);
    if (quantity > held + 0.0005) throw new BadRequestException(`Only ${Math.max(0, held)} ${unit} of this material was issued to that subcontractor.`);
    const lastIssue = await this.prisma.materialIssue.findFirst({
      where: { contractId, materialId, type: MaterialIssueType.ISSUE },
      orderBy: { issuedOn: 'desc' },
      select: { recoveryRate: true },
    });
    return lastIssue?.recoveryRate ?? null;
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
