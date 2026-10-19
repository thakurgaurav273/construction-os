import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { toNumber } from '../procurement/procurement-math';

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

export interface CashFlowView {
  id: string;
  month: number;
  year: number;
  inflow: number;
  outflow: number;
  net: number;
  forecastInflow: number;
  forecastOutflow: number;
  forecastNet: number;
}

/** Read models for project budgets and the monthly cash flow ledger. */
@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getBudget(organizationId: string): Promise<BudgetLineView[]> {
    const rows = await this.prisma.budgetItem.findMany({
      where: { organizationId },
      include: { project: { select: { id: true, name: true } } },
      orderBy: [{ projectId: 'asc' }, { category: 'asc' }],
    });
    return rows.map((row) => {
      const allocated = toNumber(row.allocated);
      const spent = toNumber(row.spent);
      const committed = toNumber(row.committed);
      return {
        id: row.id,
        projectId: row.projectId,
        projectName: row.project.name,
        category: row.category,
        allocated,
        spent,
        committed,
        remaining: allocated - spent - committed,
        variance: allocated - spent,
        utilizationPercent: allocated > 0 ? Math.round((spent / allocated) * 100) : 0,
      };
    });
  }

  async getCashFlow(organizationId: string): Promise<CashFlowView[]> {
    const rows = await this.prisma.cashFlowEntry.findMany({
      where: { organizationId },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });
    return rows.map((row) => {
      const inflow = toNumber(row.inflow);
      const outflow = toNumber(row.outflow);
      const forecastInflow = toNumber(row.forecastInflow);
      const forecastOutflow = toNumber(row.forecastOutflow);
      return {
        id: row.id,
        month: row.month,
        year: row.year,
        inflow,
        outflow,
        net: inflow - outflow,
        forecastInflow,
        forecastOutflow,
        forecastNet: forecastInflow - forecastOutflow,
      };
    });
  }
}
