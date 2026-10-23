import {
  Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportEntity } from '@prisma/client';
import { Audit } from '../../../common/audit';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PermissionsGuard, RequirePermission } from '../../../common/permissions';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { DataImportService, ImportEntityView, SheetAnalysisView } from '../../data-import/data-import.service';
import { MAX_IMPORT_FILE_BYTES } from '../../data-import/import-definitions';
import { ImportTemplateView } from '../../data-import/import-templates.service';
import { ContractsService } from '../contracts.service';
import { BillingSheetDto, BoqImportDto, MeasurementImportDto, SaveBillingLayoutDto } from '../dto/billing-import.dto';
import { RaBillsService } from '../ra-bills.service';
import { BoqImportService, BoqImportView } from './boq-import.service';
import { MeasurementImportService, MeasurementImportView } from './measurement-import.service';
import { BillExportView, RaBillExportService } from './ra-bill-export.service';

type Upload = Express.Multer.File | undefined;

const sheetUpload = FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_FILE_BYTES } });

/**
 * Sheets in, sheets out for Billing: a contract's BOQ, an RA bill's measurement book, and the bill as a
 * workbook. Layouts are the same saved templates as Settings → Data Import, so each format is learned once.
 */
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('billing.view')
export class BillingImportController {
  constructor(
    private readonly dataImport: DataImportService,
    private readonly contracts: ContractsService,
    private readonly bills: RaBillsService,
    private readonly boqImport: BoqImportService,
    private readonly measurementImport: MeasurementImportService,
    private readonly exporter: RaBillExportService,
  ) {}

  /** The BOQ and measurement book field lists, for column mapping. Doesn't need the Data Import permission. */
  @Get('billing-import/definitions')
  definitions(@CurrentUser() user: AuthenticatedUser): ImportEntityView[] {
    return this.dataImport.entities(user).filter((definition) => definition.context);
  }

  /* ---------- BOQ on a contract ---------- */

  /** Recognises a saved layout or proposes a mapping. Writes nothing; AI use is logged in ai_usage. */
  @RequirePermission('contract.manage')
  @HttpCode(200)
  @Post('contracts/:id/boq-import/analyze')
  @UseInterceptors(sheetUpload)
  async analyzeBoq(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BillingSheetDto,
    @UploadedFile() file: Upload,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SheetAnalysisView> {
    await this.contracts.findContractOrThrow(id, user.organizationId);
    return this.dataImport.analyze(user, file, { ...dto, entity: ImportEntity.BOQ });
  }

  @RequirePermission('contract.manage')
  @Audit('import.template_saved')
  @Post('contracts/:id/boq-import/layouts')
  saveBoqLayout(@Param('id', ParseUUIDPipe) _id: string, @Body() dto: SaveBillingLayoutDto, @CurrentUser() user: AuthenticatedUser): Promise<ImportTemplateView> {
    return this.dataImport.createTemplate(user, { ...dto, entity: ImportEntity.BOQ });
  }

  @RequirePermission('contract.manage')
  @Audit('import.template_saved')
  @Put('contracts/:id/boq-import/layouts/:templateId')
  updateBoqLayout(
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body() dto: SaveBillingLayoutDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ImportTemplateView> {
    return this.dataImport.updateTemplate(user, templateId, dto);
  }

  /** Dry run: what the import would add, update or skip. Writes nothing. */
  @RequirePermission('contract.manage')
  @HttpCode(200)
  @Post('contracts/:id/boq-import/preview')
  @UseInterceptors(sheetUpload)
  previewBoq(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BoqImportDto, @UploadedFile() file: Upload, @CurrentUser() user: AuthenticatedUser): Promise<BoqImportView> {
    return this.boqImport.preview(user, id, file, dto);
  }

  @RequirePermission('contract.manage')
  @Audit('contract.boq_imported')
  @HttpCode(200)
  @Post('contracts/:id/boq-import')
  @UseInterceptors(sheetUpload)
  importBoq(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BoqImportDto, @UploadedFile() file: Upload, @CurrentUser() user: AuthenticatedUser): Promise<BoqImportView> {
    return this.boqImport.commit(user, id, file, dto);
  }

  /* ---------- Measurement book on an RA bill ---------- */

  /** Recognises a saved layout or proposes a mapping. Writes nothing; AI use is logged in ai_usage. */
  @RequirePermission('billing.prepare')
  @HttpCode(200)
  @Post('ra-bills/:id/measurement-import/analyze')
  @UseInterceptors(sheetUpload)
  async analyzeMeasurements(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BillingSheetDto,
    @UploadedFile() file: Upload,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SheetAnalysisView> {
    await this.bills.findBillOrThrow(id, user.organizationId);
    return this.dataImport.analyze(user, file, { ...dto, entity: ImportEntity.MEASUREMENT_BOOK });
  }

  @RequirePermission('billing.prepare')
  @Audit('import.template_saved')
  @Post('ra-bills/:id/measurement-import/layouts')
  saveMeasurementLayout(@Param('id', ParseUUIDPipe) _id: string, @Body() dto: SaveBillingLayoutDto, @CurrentUser() user: AuthenticatedUser): Promise<ImportTemplateView> {
    return this.dataImport.createTemplate(user, { ...dto, entity: ImportEntity.MEASUREMENT_BOOK });
  }

  @RequirePermission('billing.prepare')
  @Audit('import.template_saved')
  @Put('ra-bills/:id/measurement-import/layouts/:templateId')
  updateMeasurementLayout(
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body() dto: SaveBillingLayoutDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ImportTemplateView> {
    return this.dataImport.updateTemplate(user, templateId, dto);
  }

  /** Dry run: items found, matched to the BOQ and checked against the sheet's own totals. Writes nothing. */
  @RequirePermission('billing.prepare')
  @HttpCode(200)
  @Post('ra-bills/:id/measurement-import/preview')
  @UseInterceptors(sheetUpload)
  previewMeasurements(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MeasurementImportDto,
    @UploadedFile() file: Upload,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MeasurementImportView> {
    return this.measurementImport.preview(user, id, file, dto);
  }

  @RequirePermission('billing.prepare')
  @Audit('ra_bill.measurements_imported')
  @HttpCode(200)
  @Post('ra-bills/:id/measurement-import')
  @UseInterceptors(sheetUpload)
  importMeasurements(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MeasurementImportDto,
    @UploadedFile() file: Upload,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MeasurementImportView> {
    return this.measurementImport.commit(user, id, file, dto);
  }

  /* ---------- Bill as a workbook ---------- */

  @Get('ra-bills/:id/export')
  exportBill(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser): Promise<BillExportView> {
    return this.exporter.export(id, user.organizationId);
  }
}
