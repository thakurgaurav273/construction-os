import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Audit } from '../../../common/audit';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PermissionsGuard, RequirePermission } from '../../../common/permissions';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ContractDetailView } from '../contract.mapper';
import { ContractsService } from '../contracts.service';
import { ItemLinksDto, MarginQueryDto, RecoverMaterialsDto } from '../dto/margin.dto';
import { RaBillDetailView } from '../ra-bill.mapper';
import { RaBillsService } from '../ra-bills.service';
import { MaterialRecoveryService, MaterialRecoveryView } from '../recovery/material-recovery.service';
import { ItemLinkOptionsView, ItemLinksService } from './item-links.service';
import { MarginService, MarginView } from './margin.service';

interface AuthUser { id: string; organizationId: string }

/** Margin per item (client billing against subcontract cost) and recovery of material issued to subcontractors. */
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('billing.view')
export class MarginController {
  constructor(
    private readonly margin: MarginService,
    private readonly links: ItemLinksService,
    private readonly recovery: MaterialRecoveryService,
    private readonly contracts: ContractsService,
    private readonly bills: RaBillsService,
  ) {}

  /** Money in against money out, so it also needs the finance view. */
  @RequirePermission('finance.view')
  @Get('billing/margin')
  forProject(@Query() query: MarginQueryDto, @CurrentUser() user: AuthUser): Promise<MarginView> {
    return this.margin.forProject(user.organizationId, query.projectId);
  }

  @Get('contracts/:id/item-links')
  linkOptions(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<ItemLinkOptionsView> {
    return this.links.options(id, user.organizationId);
  }

  @RequirePermission('contract.manage')
  @Audit('contract.items_linked')
  @Put('contracts/:id/item-links')
  async saveLinks(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ItemLinksDto, @CurrentUser() user: AuthUser): Promise<ContractDetailView> {
    await this.links.save(id, user.organizationId, dto);
    return this.contracts.findOne(id, user.organizationId);
  }

  @Get('ra-bills/:id/material-recovery')
  recoveryForBill(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<MaterialRecoveryView> {
    return this.recovery.forBill(id, user.organizationId);
  }

  @RequirePermission('billing.prepare')
  @Audit('ra_bill.material_recovered')
  @HttpCode(200)
  @Post('ra-bills/:id/material-recovery')
  async recover(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RecoverMaterialsDto, @CurrentUser() user: AuthUser): Promise<RaBillDetailView> {
    await this.recovery.recover(id, user.organizationId, dto.materialIds);
    return this.bills.findOne(id, user.organizationId);
  }

  @RequirePermission('billing.prepare')
  @Audit('ra_bill.material_recovery_removed')
  @Delete('ra-bills/:id/material-recovery/:adjustmentId')
  async removeRecovery(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('adjustmentId', ParseUUIDPipe) adjustmentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<RaBillDetailView> {
    await this.recovery.release(id, adjustmentId, user.organizationId);
    return this.bills.findOne(id, user.organizationId);
  }
}
