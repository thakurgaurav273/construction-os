import { Controller, Get, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReceivablesService, ReceivablesView } from './receivables.service';

interface AuthUser { id: string; organizationId: string }

@Controller('receivables')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('billing.view')
export class ReceivablesController {
  constructor(private readonly receivables: ReceivablesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('projectId', new ParseUUIDPipe({ optional: true })) projectId?: string): Promise<ReceivablesView> {
    return this.receivables.findAll(user.organizationId, projectId);
  }
}
