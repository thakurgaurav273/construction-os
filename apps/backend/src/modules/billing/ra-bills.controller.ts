import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import type { Permission } from '@sitepilot/types';
import { Audit } from '../../common/audit';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  BillNoteDto, CertifyRaBillDto, RaBillQueryDto, ReplaceMeasurementsDto, RequiredBillNoteDto, UpdateRaBillDto,
} from './dto/ra-bill.dto';
import { RecordReceiptDto, VoidReceiptDto } from './dto/settlement.dto';
import { RaBillReceiptsService } from './ra-bill-receipts.service';
import { RaBillWorkflowService } from './ra-bill-workflow.service';
import { RaBillDetailView, RaBillSummaryView } from './ra-bill.mapper';
import { RaBillsService } from './ra-bills.service';

interface AuthUser { id: string; organizationId: string; permissions: Permission[] }

@Controller('ra-bills')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('billing.view')
export class RaBillsController {
  constructor(
    private readonly bills: RaBillsService,
    private readonly workflow: RaBillWorkflowService,
    private readonly receipts: RaBillReceiptsService,
  ) {}

  @Get()
  findAll(@Query() query: RaBillQueryDto, @CurrentUser() user: AuthUser): Promise<RaBillSummaryView[]> {
    return this.bills.findAll(user.organizationId, query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<RaBillDetailView> {
    return this.bills.findOne(id, user.organizationId);
  }

  @RequirePermission('billing.prepare')
  @Audit('ra_bill.updated')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRaBillDto, @CurrentUser() user: AuthUser): Promise<RaBillDetailView> {
    return this.bills.update(id, user.organizationId, dto);
  }

  @RequirePermission('billing.prepare')
  @Audit('ra_bill.measurements_updated')
  @Put(':id/items/:itemId/measurements')
  replaceMeasurements(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: ReplaceMeasurementsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RaBillDetailView> {
    return this.bills.replaceMeasurements(id, itemId, user.organizationId, dto);
  }

  @RequirePermission('billing.prepare')
  @Audit('ra_bill.submitted')
  @HttpCode(200)
  @Post(':id/submit')
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<RaBillDetailView> {
    return this.workflow.submit(id, user.organizationId, user.id);
  }

  @RequirePermission('billing.certify')
  @Audit('ra_bill.certified')
  @HttpCode(200)
  @Post(':id/certify')
  certify(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CertifyRaBillDto, @CurrentUser() user: AuthUser): Promise<RaBillDetailView> {
    return this.workflow.certify(id, user.organizationId, user.id, dto);
  }

  @RequirePermission('billing.certify')
  @Audit('ra_bill.changes_requested')
  @HttpCode(200)
  @Post(':id/request-changes')
  requestChanges(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequiredBillNoteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RaBillDetailView> {
    return this.workflow.requestChanges(id, user.organizationId, user.id, dto);
  }

  @RequirePermission('billing.certify')
  @Audit('ra_bill.reopened')
  @HttpCode(200)
  @Post(':id/reopen')
  reopen(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequiredBillNoteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RaBillDetailView> {
    return this.workflow.reopen(id, user.organizationId, user.id, dto);
  }

  @RequirePermission('billing.prepare')
  @Audit('ra_bill.cancelled')
  @HttpCode(200)
  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BillNoteDto, @CurrentUser() user: AuthUser): Promise<RaBillDetailView> {
    return this.workflow.cancel(id, user.organizationId, user.id, dto, user.permissions.includes('billing.certify'));
  }

  @RequirePermission('billing.receipts')
  @Audit('ra_bill.receipt_recorded')
  @Post(':id/receipts')
  async recordReceipt(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RecordReceiptDto, @CurrentUser() user: AuthUser): Promise<RaBillDetailView> {
    await this.receipts.record(id, user.organizationId, user.id, dto);
    return this.bills.findOne(id, user.organizationId);
  }

  @RequirePermission('billing.receipts')
  @Audit('ra_bill.receipt_voided')
  @HttpCode(200)
  @Post(':id/receipts/:receiptId/void')
  async voidReceipt(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('receiptId', ParseUUIDPipe) receiptId: string,
    @Body() dto: VoidReceiptDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RaBillDetailView> {
    await this.receipts.void(id, receiptId, user.organizationId, user.id, dto);
    return this.bills.findOne(id, user.organizationId);
  }
}
