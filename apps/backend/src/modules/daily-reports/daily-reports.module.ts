import { Module } from '@nestjs/common';
import { DailyReportsController, OrganizationDailyReportsController } from './daily-reports.controller';
import { DailyReportsService } from './daily-reports.service';
import { DailyReportWorkflowService } from './daily-report-workflow.service';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [DatabaseModule, AuthModule, DocumentsModule],
  controllers: [OrganizationDailyReportsController, DailyReportsController],
  providers: [DailyReportsService, DailyReportWorkflowService],
})
export class DailyReportsModule {}
