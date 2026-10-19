import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalNoteDto, RequiredNoteDto } from '../procurement/dto/review-note.dto';
import { CreatePaymentDto, MarkPaidDto, PaymentQueryDto } from './dto/payment.dto';
import { PaymentView } from './payment.mapper';
import { PaymentsService } from './payments.service';

interface AuthUser { id: string; organizationId: string; role: string }

@Controller('finance/payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  findAll(@Query() query: PaymentQueryDto, @CurrentUser() user: AuthUser): Promise<PaymentView[]> {
    return this.payments.findAll(user.organizationId, query);
  }

  @Post()
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: AuthUser): Promise<PaymentView> {
    return this.payments.create(user.organizationId, user.id, dto);
  }

  @Post(':id/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OptionalNoteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PaymentView> {
    return this.payments.approve(id, user.organizationId, user.id, dto);
  }

  @Post(':id/reject')
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequiredNoteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PaymentView> {
    return this.payments.reject(id, user.organizationId, user.id, dto);
  }

  @Post(':id/paid')
  markPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkPaidDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PaymentView> {
    return this.payments.markPaid(id, user.organizationId, user.id, dto);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OptionalNoteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PaymentView> {
    return this.payments.cancel(id, user.organizationId, user.id, dto);
  }
}
