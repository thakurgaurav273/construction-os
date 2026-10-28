import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DeliveriesService } from './deliveries.service';
import { DeliveryView } from './delivery.mapper';
import { ReceiveGoodsDto, ScheduleDeliveryDto } from './dto/delivery.dto';
import { CreatePurchaseOrderDto, PurchaseOrderQueryDto, UpdatePurchaseOrderDto } from './dto/purchase-order.dto';
import { OptionalNoteDto, RequiredNoteDto } from './dto/review-note.dto';
import { PurchaseOrderWorkflowService } from './purchase-order-workflow.service';
import { PurchaseOrderDetailView, PurchaseOrderView } from './purchase-order.mapper';
import { PurchaseOrdersService } from './purchase-orders.service';
import type { Permission } from '@sitepilot/types';
import { PermissionsGuard, RequirePermission, RequireAnyPermission } from '../../common/permissions';
import { Audit } from '../../common/audit';

interface AuthUser { id: string; organizationId: string; role: string; permissions: Permission[] }

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchaseOrdersController {
  constructor(
    private readonly orders: PurchaseOrdersService,
    private readonly workflow: PurchaseOrderWorkflowService,
    private readonly deliveries: DeliveriesService,
  ) {}

  @RequireAnyPermission('procurement.view', 'finance.view')
  @Get()
  findAll(@Query() query: PurchaseOrderQueryDto, @CurrentUser() user: AuthUser): Promise<PurchaseOrderView[]> {
    return this.orders.findAll(user.organizationId, query);
  }

  @RequireAnyPermission('procurement.view', 'finance.view')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<PurchaseOrderDetailView> {
    return this.orders.findOne(id, user.organizationId);
  }

  @RequirePermission('po.create')
  @Audit('purchase_order.created')
  @Post()
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: AuthUser): Promise<PurchaseOrderDetailView> {
    return this.orders.create(user.organizationId, user.id, dto);
  }

  @RequirePermission('po.create')
  @Audit('purchase_order.updated')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PurchaseOrderDetailView> {
    return this.orders.update(id, user.organizationId, dto);
  }

  @RequirePermission('po.create')
  @Audit('purchase_order.duplicated')
  @Post(':id/duplicate')
  duplicate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<PurchaseOrderDetailView> {
    return this.orders.duplicate(id, user.organizationId, user.id);
  }

  @RequirePermission('po.create')
  @Audit('purchase_order.submitted')
  @Post(':id/submit')
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<PurchaseOrderDetailView> {
    return this.workflow.submit(id, user.organizationId, user.id);
  }

  @RequirePermission('po.approve')
  @Audit('purchase_order.approved')
  @Post(':id/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OptionalNoteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PurchaseOrderDetailView> {
    return this.workflow.approve(id, user.organizationId, user.id, dto);
  }

  @RequirePermission('po.approve')
  @Audit('purchase_order.rejected')
  @Post(':id/reject')
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequiredNoteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PurchaseOrderDetailView> {
    return this.workflow.reject(id, user.organizationId, user.id, dto);
  }

  @RequirePermission('po.approve')
  @Audit('purchase_order.changes_requested')
  @Post(':id/request-changes')
  requestChanges(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequiredNoteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PurchaseOrderDetailView> {
    return this.workflow.requestChanges(id, user.organizationId, user.id, dto);
  }

  @RequirePermission('po.create')
  @Audit('purchase_order.cancelled')
  @Post(':id/cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OptionalNoteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PurchaseOrderDetailView> {
    return this.workflow.cancel(id, user.organizationId, user.id, dto, user.permissions.includes('po.approve'));
  }

  @RequirePermission('delivery.receive')
  @Audit('delivery.scheduled')
  @Post(':id/deliveries')
  scheduleDelivery(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleDeliveryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<DeliveryView> {
    return this.deliveries.schedule(id, user.organizationId, user.id, dto);
  }

  @RequirePermission('delivery.receive')
  @Audit('delivery.goods_received')
  @Post(':id/receipts')
  receiveGoods(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceiveGoodsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<DeliveryView> {
    return this.deliveries.receive(id, user.organizationId, user.id, dto);
  }
}
