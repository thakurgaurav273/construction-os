import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Audit } from '../../common/audit';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ContractItemsService } from './contract-items.service';
import { ContractDetailView, ContractSummaryView } from './contract.mapper';
import { ContractsService } from './contracts.service';
import { ContractQueryDto, CreateContractDto, ReplaceContractItemsDto, UpdateContractDto } from './dto/contract.dto';
import { CreateRaBillDto } from './dto/ra-bill.dto';
import { RaBillDetailView } from './ra-bill.mapper';
import { RaBillsService } from './ra-bills.service';

interface AuthUser { id: string; organizationId: string }

@Controller('contracts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('billing.view')
export class ContractsController {
  constructor(
    private readonly contracts: ContractsService,
    private readonly items: ContractItemsService,
    private readonly bills: RaBillsService,
  ) {}

  @Get()
  findAll(@Query() query: ContractQueryDto, @CurrentUser() user: AuthUser): Promise<ContractSummaryView[]> {
    return this.contracts.findAll(user.organizationId, query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<ContractDetailView> {
    return this.contracts.findOne(id, user.organizationId);
  }

  @RequirePermission('contract.manage')
  @Audit('contract.created')
  @Post()
  create(@Body() dto: CreateContractDto, @CurrentUser() user: AuthUser): Promise<ContractDetailView> {
    return this.contracts.create(user.organizationId, user.id, dto);
  }

  @RequirePermission('contract.manage')
  @Audit('contract.updated')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateContractDto, @CurrentUser() user: AuthUser): Promise<ContractDetailView> {
    return this.contracts.update(id, user.organizationId, dto);
  }

  @RequirePermission('contract.manage')
  @Audit('contract.items_updated')
  @Put(':id/items')
  replaceItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceContractItemsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ContractDetailView> {
    return this.items.replaceItems(id, user.organizationId, dto);
  }

  @RequirePermission('contract.manage')
  @Audit('contract.closed')
  @HttpCode(200)
  @Post(':id/close')
  close(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<ContractDetailView> {
    return this.contracts.setStatus(id, user.organizationId, 'CLOSED');
  }

  @RequirePermission('contract.manage')
  @Audit('contract.reopened')
  @HttpCode(200)
  @Post(':id/reopen')
  reopen(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<ContractDetailView> {
    return this.contracts.setStatus(id, user.organizationId, 'ACTIVE');
  }

  @RequirePermission('billing.prepare')
  @Audit('ra_bill.created')
  @Post(':id/ra-bills')
  createBill(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateRaBillDto, @CurrentUser() user: AuthUser): Promise<RaBillDetailView> {
    return this.bills.create(id, user.organizationId, user.id, dto);
  }

}
