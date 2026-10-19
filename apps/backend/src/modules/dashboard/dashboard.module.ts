import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { WorkforceModule } from '../workforce/workforce.module';

@Module({
  imports: [DatabaseModule, AuthModule, WorkforceModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
