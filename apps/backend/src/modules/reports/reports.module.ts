import { Module } from '@nestjs/common';
import { MailService } from '../../common/mail/mail.service';
import { AiModule } from '../ai/ai.module';
import { BillingModule } from '../billing/billing.module';
import { FinanceModule } from '../finance/finance.module';
import { ReportDeliveryService } from './report-delivery.service';
import { ReportGenerationService } from './report-generation.service';
import { ReportSchedulerService } from './report-scheduler.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [AiModule, BillingModule, FinanceModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportGenerationService, ReportSchedulerService, ReportDeliveryService, MailService],
  exports: [ReportsService],
})
export class ReportsModule {}
