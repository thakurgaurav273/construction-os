import { Module } from '@nestjs/common';
import { WorkforceController, ProjectWorkforceController } from './workforce.controller';
import { WorkforceService } from './workforce.service';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [WorkforceController, ProjectWorkforceController],
  providers: [WorkforceService],
})
export class WorkforceModule {}
