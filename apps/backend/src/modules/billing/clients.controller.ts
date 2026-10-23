import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { Audit } from '../../common/audit';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientView, ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

interface AuthUser { id: string; organizationId: string }

@Controller('clients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('billing.view')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser): Promise<ClientView[]> {
    return this.clients.findAll(user.organizationId);
  }

  @RequirePermission('contract.manage')
  @Audit('client.created')
  @Post()
  create(@Body() dto: CreateClientDto, @CurrentUser() user: AuthUser): Promise<ClientView> {
    return this.clients.create(user.organizationId, user.id, dto);
  }

  @RequirePermission('contract.manage')
  @Audit('client.updated')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateClientDto, @CurrentUser() user: AuthUser): Promise<ClientView> {
    return this.clients.update(id, user.organizationId, dto);
  }
}
