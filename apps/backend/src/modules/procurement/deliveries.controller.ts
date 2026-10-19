import { Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DeliveriesService } from './deliveries.service';
import { DeliveryView } from './delivery.mapper';
import { DeliveryQueryDto } from './dto/delivery.dto';

interface AuthUser { id: string; organizationId: string; role: string }

@Controller('deliveries')
@UseGuards(JwtAuthGuard)
export class DeliveriesController {
  constructor(private readonly deliveries: DeliveriesService) {}

  @Get()
  findAll(@Query() query: DeliveryQueryDto, @CurrentUser() user: AuthUser): Promise<DeliveryView[]> {
    return this.deliveries.findAll(user.organizationId, query);
  }

  @Post(':id/in-transit')
  markInTransit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<DeliveryView> {
    return this.deliveries.markInTransit(id, user.organizationId, user.id);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<DeliveryView> {
    return this.deliveries.cancel(id, user.organizationId, user.id);
  }
}
