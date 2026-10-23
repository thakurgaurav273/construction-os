import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { AuditController } from './audit.controller';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';
import { DomainEventsService } from '../../common/events';

@Global()
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AuditController],
  providers: [AuditService, DomainEventsService, { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }],
  exports: [AuditService, DomainEventsService],
})
export class AuditModule {}
