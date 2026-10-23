import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { toNumber } from '../procurement/procurement-math';
import { findProjectInOrganization } from '../projects/project-guards';
import { BudgetFigures, BudgetHeadFigures, computeBudget } from './budget-math';
import { CreateBudgetHeadDto, UpdateBudgetHeadDto } from './dto/budget.dto';

/** Bills that count as spent: approved, whether or not they have been paid yet. */
const SPENT_BILL_STATUSES: InvoiceStatus[] = ['APPROVED', 'PARTIALLY_PAID', 'PAID'];

export interface BudgetLineView {
  id: string;
  projectId: string;
  projectName: string;
  category: string;
  allocated: number;
  spent: number;
  committed: number;
  remaining: number;
  variance: number;
  utilizationPercent: number;
}

export interface ProjectBudgetView {
  projectId: string;
  /** The overall budget set on the project; heads may not add up to it. */
  projectBudget: number | null;
  heads: BudgetHeadFigures[];
  unbudgeted: BudgetFigures;
  totals: { allocated: number; committed: number; spent: number; remaining: number };
}

/**
 * Project budgets as heads (Steel, Electrical, Subcontract…) with an allocation each. What is committed and
 * spent is never typed in: it comes from approved purchase orders and vendor bills in the matching category.
 */
@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  async forProject(projectId: string, organizationId: string): Promise<ProjectBudgetView> {
    await findProjectInOrganization(this.prisma, projectId, organizationId);
    const [project, { heads, unbudgeted }] = await Promise.all([
      this.prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { budget: true } }),
      this.figures(organizationId, { id: projectId }),
    ]);
    const sum = (field: 'allocated' | 'committed' | 'spent'): number => heads.reduce((total, head) => total + head[field], 0);
    const allocated = sum('allocated');
    const committed = sum('committed');
    const spent = sum('spent');
    return {
      projectId,
      projectBudget: project.budget === null ? null : toNumber(project.budget),
      heads,
      unbudgeted: unbudgeted.get(projectId) ?? { committed: 0, spent: 0 },
      totals: { allocated, committed, spent, remaining: allocated - committed - spent },
    };
  }

  /** Every head across the organization, for Finance and reports. */
  async lines(organizationId: string, projectIds?: string[]): Promise<BudgetLineView[]> {
    const where: Prisma.ProjectWhereInput = projectIds ? { id: { in: projectIds } } : {};
    const [{ heads }, projects] = await Promise.all([
      this.figures(organizationId, where),
      this.prisma.project.findMany({ where: { organizationId, ...where }, select: { id: true, name: true } }),
    ]);
    const names = new Map(projects.map((project) => [project.id, project.name]));
    return heads.map((head) => ({
      ...head,
      projectName: names.get(head.projectId) ?? '',
      variance: head.allocated - head.spent,
    }));
  }

  /** Head names only, so anyone raising an order or bill can file it under the right head. */
  async categories(projectId: string, organizationId: string): Promise<string[]> {
    await findProjectInOrganization(this.prisma, projectId, organizationId);
    const heads = await this.prisma.budgetItem.findMany({ where: { projectId, organizationId }, select: { category: true }, orderBy: { category: 'asc' } });
    return heads.map((head) => head.category);
  }

  async createHead(projectId: string, organizationId: string, dto: CreateBudgetHeadDto): Promise<ProjectBudgetView> {
    await findProjectInOrganization(this.prisma, projectId, organizationId);
    await this.assertUniqueName(projectId, dto.category);
    await this.prisma.budgetItem.create({ data: { projectId, organizationId, category: dto.category, allocated: dto.allocated } });
    return this.forProject(projectId, organizationId);
  }

  async updateHead(projectId: string, headId: string, organizationId: string, dto: UpdateBudgetHeadDto): Promise<ProjectBudgetView> {
    const head = await this.findHead(projectId, headId, organizationId);
    if (dto.category !== undefined && dto.category.toLowerCase() !== head.category.toLowerCase()) {
      await this.assertUniqueName(projectId, dto.category);
    }
    await this.prisma.budgetItem.update({ where: { id: head.id }, data: { category: dto.category, allocated: dto.allocated } });
    return this.forProject(projectId, organizationId);
  }

  /** Removing a head deletes no orders or bills; their amounts move to Unbudgeted. */
  async deleteHead(projectId: string, headId: string, organizationId: string): Promise<ProjectBudgetView> {
    const head = await this.findHead(projectId, headId, organizationId);
    await this.prisma.budgetItem.delete({ where: { id: head.id } });
    return this.forProject(projectId, organizationId);
  }

  private async figures(organizationId: string, project: Prisma.ProjectWhereInput): Promise<ReturnType<typeof computeBudget>> {
    const scope = { organizationId, project: { ...project, organizationId, deletedAt: null } };
    const [heads, orders, bills] = await Promise.all([
      this.prisma.budgetItem.findMany({ where: scope, orderBy: [{ projectId: 'asc' }, { category: 'asc' }] }),
      this.prisma.purchaseOrder.findMany({ where: { ...scope, status: 'APPROVED' }, select: { id: true, projectId: true, category: true, amount: true } }),
      this.prisma.invoice.findMany({
        where: { ...scope, status: { in: SPENT_BILL_STATUSES } },
        select: { projectId: true, category: true, totalAmount: true, purchaseOrderId: true },
      }),
    ]);
    return computeBudget(
      heads.map((head) => ({ id: head.id, projectId: head.projectId, category: head.category, allocated: toNumber(head.allocated) })),
      orders.flatMap((order) => (order.projectId ? [{ id: order.id, projectId: order.projectId, category: order.category, amount: toNumber(order.amount) }] : [])),
      bills.flatMap((bill) => (bill.projectId
        ? [{ projectId: bill.projectId, category: bill.category, totalAmount: toNumber(bill.totalAmount), purchaseOrderId: bill.purchaseOrderId }]
        : [])),
    );
  }

  private async findHead(projectId: string, headId: string, organizationId: string): Promise<{ id: string; category: string }> {
    const head = await this.prisma.budgetItem.findFirst({ where: { id: headId, projectId, organizationId }, select: { id: true, category: true } });
    if (!head) throw new NotFoundException('Budget head not found.');
    return head;
  }

  private async assertUniqueName(projectId: string, category: string): Promise<void> {
    const existing = await this.prisma.budgetItem.findFirst({
      where: { projectId, category: { equals: category, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) throw new ConflictException(`This project already has a “${category}” budget head.`);
  }
}
