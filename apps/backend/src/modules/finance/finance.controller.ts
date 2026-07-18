import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FinanceService } from './finance.service';

interface AuthUser {
  id: string;
  organizationId: string;
  role: string;
}

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('stats')
  getStats(@CurrentUser() user: AuthUser) {
    return this.financeService.getStats(user.organizationId);
  }

  @Get('invoices')
  getInvoices(@CurrentUser() user: AuthUser) {
    return this.financeService.getInvoices(user.organizationId);
  }

  @Get('payments')
  getPayments(@CurrentUser() user: AuthUser) {
    return this.financeService.getPayments(user.organizationId);
  }

  @Get('budget')
  getBudget(@CurrentUser() user: AuthUser) {
    return this.financeService.getBudget(user.organizationId);
  }

  @Get('cash-flow')
  getCashFlow(@CurrentUser() user: AuthUser) {
    return this.financeService.getCashFlow(user.organizationId);
  }

  @Get('insights')
  getInsights(@CurrentUser() user: AuthUser) {
    return this.financeService.getInsights(user.organizationId);
  }
}
