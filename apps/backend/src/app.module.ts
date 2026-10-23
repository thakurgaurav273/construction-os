import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';

import { AiModule } from './modules/ai/ai.module';
import { AuditModule } from './modules/audit/audit.module';
import { DataImportModule } from './modules/data-import/data-import.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { WorkforceModule } from './modules/workforce/workforce.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { StorageModule } from './common/storage/storage.module';
import { JobsModule } from './common/jobs';
import { DailyReportsModule } from './modules/daily-reports/daily-reports.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { FinanceModule } from './modules/finance/finance.module';
import { BillingModule } from './modules/billing/billing.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 100 }],
      errorMessage: 'Too many attempts. Wait a minute and try again.',
    }),
    DatabaseModule,
    AuthModule,
    AuditModule,
    AiModule,
    ProjectsModule,
    DashboardModule,
    WorkforceModule,
    MaterialsModule,
    InventoryModule,
    ProcurementModule,
    StorageModule,
    JobsModule,
    DailyReportsModule,
    DocumentsModule,
    FinanceModule,
    BillingModule,
    NotificationsModule,
    ReportsModule,
    SettingsModule,
    DataImportModule,
  ],
})
export class AppModule {}
