import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import type { Permission } from '@sitepilot/types';
import { Audit } from '../../common/audit';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  BillNoteDto, CertifyRaBillDto, RaBillQueryDto, ReplaceMeasurementsDto, RequiredBillNoteDto, UpdateRaBillDto,
} from './dto/ra-bill.dto';
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

  @RequirePermission('billing.prepare')
  @Audit('ra_bill.cancelled')
  @HttpCode(200)
  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BillNoteDto, @CurrentUser() user: AuthUser): Promise<RaBillDetailView> {
    return this.workflow.cancel(id, user.organizationId, user.id, dto, user.permissions.includes('billing.certify'));
  }

}
