import { Module } from '@nestjs/common';
import { WorkforceController, ProjectWorkforceController } from './workforce.controller';
import { WorkforceService } from './workforce.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceInsightsService } from './attendance-insights.service';
import { WorkerCertificationsController } from './worker-certifications.controller';
import { WorkerCertificationsService } from './worker-certifications.service';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [WorkforceController, ProjectWorkforceController, AttendanceController, WorkerCertificationsController],
  providers: [WorkforceService, AttendanceService, AttendanceInsightsService, WorkerCertificationsService],
  exports: [WorkforceService],
})
export class WorkforceModule {}
