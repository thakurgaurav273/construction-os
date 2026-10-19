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

interface AuthUser { id: string; organizationId: string; role: string }

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard)
export class PurchaseOrdersController {
  constructor(
    private readonly orders: PurchaseOrdersService,
    private readonly workflow: PurchaseOrderWorkflowService,
    private readonly deliveries: DeliveriesService,
  ) {}

  @Get()
  findAll(@Query() query: PurchaseOrderQueryDto, @CurrentUser() user: AuthUser): Promise<PurchaseOrderView[]> {
    return this.orders.findAll(user.organizationId, query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<PurchaseOrderDetailView> {
    return this.orders.findOne(id, user.organizationId);
  }

  @Post()
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: AuthUser): Promise<PurchaseOrderDetailView> {
    return this.orders.create(user.organizationId, user.id, dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PurchaseOrderDetailView> {
    return this.orders.update(id, user.organizationId, dto);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<PurchaseOrderDetailView> {
    return this.orders.duplicate(id, user.organizationId, user.id);
  }

  @Post(':id/submit')
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<PurchaseOrderDetailView> {
    return this.workflow.submit(id, user.organizationId, user.id);
  }

  @Post(':id/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OptionalNoteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PurchaseOrderDetailView> {
    return this.workflow.approve(id, user.organizationId, user.id, dto);
  }

  @Post(':id/reject')
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequiredNoteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PurchaseOrderDetailView> {
    return this.workflow.reject(id, user.organizationId, user.id, dto);
  }

  @Post(':id/request-changes')
  requestChanges(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequiredNoteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PurchaseOrderDetailView> {
    return this.workflow.requestChanges(id, user.organizationId, user.id, dto);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OptionalNoteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PurchaseOrderDetailView> {
    return this.workflow.cancel(id, user.organizationId, user.id, dto);
  }

  @Post(':id/deliveries')
  scheduleDelivery(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleDeliveryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<DeliveryView> {
    return this.deliveries.schedule(id, user.organizationId, user.id, dto);
  }

  @Post(':id/receipts')
  receiveGoods(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceiveGoodsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<DeliveryView> {
    return this.deliveries.receive(id, user.organizationId, user.id, dto);
  }
}
