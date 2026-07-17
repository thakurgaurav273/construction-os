import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
import { UpdateTransferDto } from './dto/update-transfer.dto';
import { InventoryAdjustmentsService } from './inventory-adjustments.service';
import { InventoryDashboardService } from './inventory-dashboard.service';
import { InventoryItemsService } from './inventory-items.service';
import { InventoryTransactionsService } from './inventory-transactions.service';
import { InventoryTransfersService } from './inventory-transfers.service';
import { InventoryWarehousesService } from './inventory-warehouses.service';

interface AuthUser {
  id: string;
  organizationId: string;
  role: string;
}

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(
    private readonly items: InventoryItemsService,
    private readonly warehouses: InventoryWarehousesService,
    private readonly transfers: InventoryTransfersService,
    private readonly transactions: InventoryTransactionsService,
    private readonly adjustments: InventoryAdjustmentsService,
    private readonly dashboard: InventoryDashboardService,
  ) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.dashboard.getDashboard(user.organizationId);
  }

  @Get('analytics')
  getAnalytics(@CurrentUser() user: AuthUser) {
    return this.dashboard.getAnalytics(user.organizationId);
  }

  @Get('items')
  getItems(@Query() query: InventoryItemQueryDto, @CurrentUser() user: AuthUser) {
    return this.items.findAll(user.organizationId, query);
  }

  @Get('items/:id')
  getItem(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.items.findOne(id, user.organizationId);
  }

  @Patch('items/:id')
  updateItem(@Param('id') id: string, @Body() dto: UpdateInventoryItemDto, @CurrentUser() user: AuthUser) {
    return this.items.update(id, user.organizationId, dto);
  }

  @Get('warehouses')
  getWarehouses(@CurrentUser() user: AuthUser) {
    return this.warehouses.findAll(user.organizationId);
  }

  @Get('warehouses/:id')
  getWarehouse(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.warehouses.findOne(id, user.organizationId);
  }

  @Get('transfers')
  getTransfers(@Query() query: TransferQueryDto, @CurrentUser() user: AuthUser) {
    return this.transfers.findAll(user.organizationId, query);
  }

  @Get('transfers/:id')
  getTransfer(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.transfers.findOne(id, user.organizationId);
  }

  @Post('transfers')
  createTransfer(@Body() dto: CreateTransferDto, @CurrentUser() user: AuthUser) {
    return this.transfers.create(user.organizationId, dto);
  }

  @Patch('transfers/:id')
  updateTransfer(@Param('id') id: string, @Body() dto: UpdateTransferDto, @CurrentUser() user: AuthUser) {
    return this.transfers.updateStatus(id, user.organizationId, dto);
  }

  @Get('transactions')
  getTransactions(@Query() query: TransactionQueryDto, @CurrentUser() user: AuthUser) {
    return this.transactions.findAll(user.organizationId, query);
  }

  @Get('adjustments')
  getAdjustments(@Query('warehouseId') warehouseId: string | undefined, @CurrentUser() user: AuthUser) {
    return this.adjustments.findAll(user.organizationId, warehouseId);
  }

  @Post('adjustments')
  createAdjustment(@Body() dto: CreateAdjustmentDto, @CurrentUser() user: AuthUser) {
    return this.adjustments.create(user.organizationId, dto);
  }
}
