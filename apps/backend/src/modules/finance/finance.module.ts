import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { FinanceController } from './finance.controller';
import { FinanceHistoryService } from './finance-history.service';
import { FinanceService } from './finance.service';
import { FinanceSummaryService } from './finance-summary.service';
import { InvoiceMatchService } from './invoice-match.service';
import { InvoiceWorkflowService } from './invoice-workflow.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [FinanceController, InvoicesController, PaymentsController],
  providers: [
    FinanceService,
    FinanceSummaryService,
    FinanceHistoryService,
    InvoiceMatchService,
    InvoicesService,
    InvoiceWorkflowService,
    PaymentsService,
  ],
})
export class FinanceModule {}
