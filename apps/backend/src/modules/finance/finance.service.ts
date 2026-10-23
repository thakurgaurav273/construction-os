import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { toNumber } from '../procurement/procurement-math';

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

/** Read model for the monthly cash flow ledger. Budgets live in BudgetService. */
@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

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
