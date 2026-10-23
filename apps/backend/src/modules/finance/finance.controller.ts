import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BudgetLineView, CashFlowView, FinanceService } from './finance.service';
import { FinanceSummary, FinanceSummaryService } from './finance-summary.service';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';

interface AuthUser { id: string; organizationId: string; role: string }

@Controller('finance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('finance.view')
export class FinanceController {
  constructor(
    private readonly finance: FinanceService,
    private readonly summary: FinanceSummaryService,
  ) {}

  @Get('summary')
  getSummary(@CurrentUser() user: AuthUser): Promise<FinanceSummary> {
    return this.summary.getSummary(user.organizationId);
  }

  @Get('budget')
  getBudget(@CurrentUser() user: AuthUser): Promise<BudgetLineView[]> {
    return this.finance.getBudget(user.organizationId);
  }

  @Get('cash-flow')
  getCashFlow(@CurrentUser() user: AuthUser): Promise<CashFlowView[]> {
    return this.finance.getCashFlow(user.organizationId);
  }
}
