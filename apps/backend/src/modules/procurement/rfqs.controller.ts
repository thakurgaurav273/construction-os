import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AwardRfqDto, CreateRfqDto, InviteVendorsDto, RecordQuoteDto } from './dto/rfq.dto';
import { RfqDetailView, RfqView } from './rfq.mapper';
import { RfqQuotesService } from './rfq-quotes.service';
import { RfqsService } from './rfqs.service';

interface AuthUser { id: string; organizationId: string; role: string }

@Controller('rfqs')
@UseGuards(JwtAuthGuard)
export class RfqsController {
  constructor(
    private readonly rfqs: RfqsService,
    private readonly quotes: RfqQuotesService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser): Promise<RfqView[]> {
    return this.rfqs.findAll(user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<RfqDetailView> {
    return this.rfqs.findOne(id, user.organizationId);
  }

  @Post()
  create(@Body() dto: CreateRfqDto, @CurrentUser() user: AuthUser): Promise<RfqDetailView> {
    return this.rfqs.create(user.organizationId, user.id, dto);
  }

  @Post(':id/invitations')
  invite(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InviteVendorsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RfqDetailView> {
    return this.rfqs.invite(id, user.organizationId, dto);
  }

  @Put(':id/invitations/:invitationId/quote')
  recordQuote(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @Body() dto: RecordQuoteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RfqDetailView> {
    return this.quotes.recordQuote(id, invitationId, user.organizationId, dto);
  }

  @Post(':id/invitations/:invitationId/decline')
  decline(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<RfqDetailView> {
    return this.quotes.decline(id, invitationId, user.organizationId);
  }

  @Post(':id/close')
  close(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<RfqDetailView> {
    return this.rfqs.close(id, user.organizationId);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<RfqDetailView> {
    return this.rfqs.cancel(id, user.organizationId);
  }

  @Post(':id/award')
  award(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AwardRfqDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RfqDetailView> {
    return this.quotes.award(id, user.organizationId, user.id, dto);
  }
}
