import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';
import { AuditLogQueryDto } from './dto/audit-query.dto';
import { AuditLogPage, AuditService } from './audit.service';

interface AuthUser { id: string; organizationId: string }

/** Read-only by design: there is no endpoint that edits or deletes audit entries. */
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('audit.view')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  findAll(@Query() query: AuditLogQueryDto, @CurrentUser() user: AuthUser): Promise<AuditLogPage> {
    return this.audit.findAll(user.organizationId, query);
  }
}
