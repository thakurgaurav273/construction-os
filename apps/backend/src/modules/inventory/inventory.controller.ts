import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import {
  InventoryItemQueryDto,
  TransactionQueryDto,
  TransferQueryDto,
} from './dto/inventory-query.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import {
  CreateLocationDto, CreateWarehouseDto, UpdateLocationDto, UpdateWarehouseDto,
} from './dto/warehouse.dto';
import { OptionalNoteDto, RequiredNoteDto } from '../procurement/dto/review-note.dto';
import { AdjustmentView } from './inventory-adjustments.service';
import { InventoryTransferWorkflowService } from './inventory-transfer-workflow.service';
import { TransferDetailView } from './transfer.mapper';
import { LocationView, WarehouseSetupService } from './warehouse-setup.service';
import { InventoryAdjustmentsService } from './inventory-adjustments.service';
import { InventoryDashboardService } from './inventory-dashboard.service';
import { InventoryItemsService } from './inventory-items.service';
import { InventoryTransactionsService } from './inventory-transactions.service';
import { InventoryTransfersService } from './inventory-transfers.service';
import { InventoryWarehousesService } from './inventory-warehouses.service';
import { InventoryReorderService, ReorderSuggestion } from './inventory-reorder.service';
import { ReorderQueryDto } from './dto/reorder-query.dto';
import { PermissionsGuard, RequirePermission, RequireAnyPermission } from '../../common/permissions';
import { Audit } from '../../common/audit';

interface AuthUser {
  id: string;
  organizationId: string;
  role: string;
}

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(
    private readonly items: InventoryItemsService,
    private readonly warehouses: InventoryWarehousesService,
    private readonly transfers: InventoryTransfersService,
    private readonly transactions: InventoryTransactionsService,
    private readonly adjustments: InventoryAdjustmentsService,
    private readonly dashboard: InventoryDashboardService,
    private readonly reorder: InventoryReorderService,
    private readonly transferWorkflow: InventoryTransferWorkflowService,
    private readonly warehouseSetup: WarehouseSetupService,
  ) {}

  /** Suggested quantity, vendor and rate for restocking a material, used to prefill a draft purchase order. */
  @RequireAnyPermission('inventory.view', 'material.view')
  @Get('reorder-suggestion')
  getReorderSuggestion(@Query() query: ReorderQueryDto, @CurrentUser() user: AuthUser): Promise<ReorderSuggestion> {
    return this.reorder.suggest(user.organizationId, query.materialId, query.warehouseId);
  }

  @RequirePermission('inventory.view')
  @Get('dashboard')
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.dashboard.getDashboard(user.organizationId);
  }

  @RequirePermission('inventory.view')
  @Get('analytics')
  getAnalytics(@CurrentUser() user: AuthUser) {
    return this.dashboard.getAnalytics(user.organizationId);
  }

  @RequireAnyPermission('inventory.view', 'material.view')
  @Get('items')
  getItems(@Query() query: InventoryItemQueryDto, @CurrentUser() user: AuthUser) {
    return this.items.findAll(user.organizationId, query);
  }

  @RequirePermission('inventory.view')
  @Get('items/:id')
  getItem(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.items.findOne(id, user.organizationId);
  }

  @RequirePermission('inventory.adjust')
  @Audit('inventory_item.updated')
  @Patch('items/:id')
  updateItem(@Param('id') id: string, @Body() dto: UpdateInventoryItemDto, @CurrentUser() user: AuthUser) {
    return this.items.update(id, user.organizationId, dto);
  }

  @RequireAnyPermission('inventory.view', 'material.view', 'procurement.view')
  @Get('warehouses')
  getWarehouses(@CurrentUser() user: AuthUser) {
    return this.warehouses.findAll(user.organizationId);
  }

  @RequirePermission('inventory.view')
  @Get('warehouses/:id')
  getWarehouse(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.warehouses.findOne(id, user.organizationId);
  }

  @RequirePermission('warehouse.manage')
  @Audit('warehouse.created')
  @Post('warehouses')
  createWarehouse(@Body() dto: CreateWarehouseDto, @CurrentUser() user: AuthUser): Promise<{ id: string }> {
    return this.warehouseSetup.create(user.organizationId, dto);
  }

  @RequirePermission('warehouse.manage')
  @Audit('warehouse.updated')
  @Patch('warehouses/:id')
  updateWarehouse(
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ id: string }> {
    return this.warehouseSetup.update(id, user.organizationId, dto);
  }

  @RequirePermission('warehouse.manage')
  @Audit('warehouse.archived')
  @Delete('warehouses/:id')
  archiveWarehouse(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<{ id: string }> {
    return this.warehouseSetup.archive(id, user.organizationId);
  }

  @RequirePermission('warehouse.manage')
  @Audit('warehouse_location.created')
  @Post('warehouses/:id/locations')
  createLocation(
    @Param('id') id: string,
    @Body() dto: CreateLocationDto,
    @CurrentUser() user: AuthUser,
  ): Promise<LocationView> {
    return this.warehouseSetup.createLocation(id, user.organizationId, dto);
  }

  @RequirePermission('warehouse.manage')
  @Audit('warehouse_location.updated')
  @Patch('warehouses/:id/locations/:locationId')
  updateLocation(
    @Param('id') id: string,
    @Param('locationId') locationId: string,
    @Body() dto: UpdateLocationDto,
    @CurrentUser() user: AuthUser,
  ): Promise<LocationView> {
    return this.warehouseSetup.updateLocation(id, locationId, user.organizationId, dto);
  }

  @RequirePermission('warehouse.manage')
  @Audit('warehouse_location.removed')
  @Delete('warehouses/:id/locations/:locationId')
  removeLocation(
    @Param('id') id: string,
    @Param('locationId') locationId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ id: string }> {
    return this.warehouseSetup.removeLocation(id, locationId, user.organizationId);
  }

  @RequirePermission('inventory.view')
  @Get('transfers')
  getTransfers(@Query() query: TransferQueryDto, @CurrentUser() user: AuthUser) {
    return this.transfers.findAll(user.organizationId, query);
  }

  @RequirePermission('inventory.view')
  @Get('transfers/:id')
  getTransfer(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.transfers.findOne(id, user.organizationId);
  }

  @RequirePermission('inventory.transfer')
  @Audit('transfer.requested')
  @Post('transfers')
  createTransfer(@Body() dto: CreateTransferDto, @CurrentUser() user: AuthUser): Promise<TransferDetailView> {
    return this.transfers.create(user.organizationId, user.id, dto);
  }

  @RequirePermission('inventory.transfer')
  @Audit('transfer.approved')
  @Post('transfers/:id/approve')
  approveTransfer(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<TransferDetailView> {
    return this.transferWorkflow.approve(id, user.organizationId, user.id);
  }

  @RequirePermission('inventory.transfer')
  @Audit('transfer.rejected')
  @Post('transfers/:id/reject')
  rejectTransfer(
    @Param('id') id: string,
    @Body() dto: RequiredNoteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<TransferDetailView> {
    return this.transferWorkflow.reject(id, user.organizationId, user.id, dto.note);
  }

  @RequirePermission('inventory.transfer')
  @Audit('transfer.cancelled')
  @Post('transfers/:id/cancel')
  cancelTransfer(
    @Param('id') id: string,
    @Body() dto: OptionalNoteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<TransferDetailView> {
    return this.transferWorkflow.cancel(id, user.organizationId, user.id, dto.note);
  }

  @RequirePermission('inventory.transfer')
  @Audit('transfer.received')
  @Post('transfers/:id/complete')
  completeTransfer(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<TransferDetailView> {
    return this.transferWorkflow.complete(id, user.organizationId, user.id);
  }

  @RequirePermission('inventory.view')
  @Get('transactions')
  getTransactions(@Query() query: TransactionQueryDto, @CurrentUser() user: AuthUser) {
    return this.transactions.findAll(user.organizationId, query);
  }

  @RequirePermission('inventory.view')
  @Get('adjustments')
  getAdjustments(@Query('warehouseId') warehouseId: string | undefined, @CurrentUser() user: AuthUser) {
    return this.adjustments.findAll(user.organizationId, warehouseId);
  }

  @RequirePermission('inventory.adjust')
  @Audit('stock.adjusted')
  @Post('adjustments')
  createAdjustment(@Body() dto: CreateAdjustmentDto, @CurrentUser() user: AuthUser): Promise<AdjustmentView> {
    return this.adjustments.create(user.organizationId, user.id, dto);
  }
}
