import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalNoteDto, RequiredNoteDto } from '../procurement/dto/review-note.dto';
import { BillableLinesQueryDto, CreateInvoiceDto, InvoiceQueryDto, UpdateInvoiceDto } from './dto/invoice.dto';
import { BillableLine } from './invoice-match.service';
import { InvoiceDetailView, InvoiceView } from './invoice.mapper';
import { InvoiceWorkflowService } from './invoice-workflow.service';
import { InvoicesService } from './invoices.service';

interface AuthUser { id: string; organizationId: string; role: string }

@Controller('finance/invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(
    private readonly invoices: InvoicesService,
    private readonly workflow: InvoiceWorkflowService,
  ) {}

  @Get()
  findAll(@Query() query: InvoiceQueryDto, @CurrentUser() user: AuthUser): Promise<InvoiceView[]> {
    return this.invoices.findAll(user.organizationId, query);
  }

  /** Received-but-unbilled quantities on a purchase order, for prefilling a vendor bill. */
  @Get('billable-lines')
  billableLines(@Query() query: BillableLinesQueryDto, @CurrentUser() user: AuthUser): Promise<BillableLine[]> {
    return this.invoices.billableLines(query.purchaseOrderId, user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<InvoiceDetailView> {
    return this.invoices.findOne(id, user.organizationId);
  }

  @Post()
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: AuthUser): Promise<InvoiceDetailView> {
    return this.invoices.create(user.organizationId, user.id, dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvoiceDto,
    @CurrentUser() user: AuthUser,
  ): Promise<InvoiceDetailView> {
    return this.invoices.update(id, user.organizationId, dto);
  }

  @Post(':id/submit')
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<InvoiceDetailView> {
    return this.workflow.submit(id, user.organizationId, user.id);
  }

  @Post(':id/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OptionalNoteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<InvoiceDetailView> {
    return this.workflow.approve(id, user.organizationId, user.id, dto);
  }

  @Post(':id/reject')
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequiredNoteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<InvoiceDetailView> {
    return this.workflow.reject(id, user.organizationId, user.id, dto);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OptionalNoteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<InvoiceDetailView> {
    return this.workflow.cancel(id, user.organizationId, user.id, dto);
  }
}
