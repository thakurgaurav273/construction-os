import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PurchaseOrdersService } from './purchase-orders.service';
import { ProcurementRefsService } from './procurement-refs.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';

interface AuthUser {
  id: string;
  organizationId: string;
  role: string;
}

@Controller()
@UseGuards(JwtAuthGuard)
export class ProcurementController {
  constructor(
    private readonly purchaseOrders: PurchaseOrdersService,
    private readonly refs: ProcurementRefsService,
  ) {}

  @Get('purchase-orders')
  findAll(@CurrentUser() user: AuthUser) {
    return this.purchaseOrders.findAll(user.organizationId);
  }

  @Post('purchase-orders')
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: AuthUser) {
    return this.purchaseOrders.create(user.organizationId, user.id, dto);
  }

  @Post('purchase-orders/:id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.purchaseOrders.approve(id, user.organizationId);
  }

  @Post('purchase-orders/:id/reject')
  reject(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.purchaseOrders.reject(id, user.organizationId);
  }

  @Post('purchase-orders/:id/request-changes')
  requestChanges(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.purchaseOrders.requestChanges(id, user.organizationId);
  }

  @Post('purchase-orders/:id/duplicate')
  duplicate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.purchaseOrders.duplicate(id, user.organizationId);
  }

  @Get('vendors')
  findVendors(@CurrentUser() user: AuthUser) {
    return this.refs.findVendors(user.organizationId);
  }

  @Get('rfqs')
  findRfqs(@CurrentUser() user: AuthUser) {
    return this.refs.findRfqs(user.organizationId);
  }

  @Get('deliveries')
  findDeliveries(@CurrentUser() user: AuthUser) {
    return this.refs.findDeliveries(user.organizationId);
  }
}
