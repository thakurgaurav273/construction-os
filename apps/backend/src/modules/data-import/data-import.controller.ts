import {
  Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Audit } from '../../common/audit';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
  DataImportService, ImportEntityView, ImportExportView, ImportRunView, SheetAnalysisView,
} from './data-import.service';
import {
  AnalyzeSheetDto, ImportTemplateQueryDto, RunImportDto, SaveImportTemplateDto, UpdateImportTemplateDto,
} from './dto/data-import.dto';
import { MAX_IMPORT_FILE_BYTES } from './import-definitions';
import { ImportTemplateView, ImportTemplatesService } from './import-templates.service';

const sheetUpload = FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_FILE_BYTES } });

@Controller('imports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('data.import')
export class DataImportController {
  constructor(
    private readonly dataImport: DataImportService,
    private readonly templates: ImportTemplatesService,
  ) {}

  @Get('entities')
  entities(@CurrentUser() user: AuthenticatedUser): ImportEntityView[] {
    return this.dataImport.entities(user);
  }

  @Get('templates')
  findTemplates(@Query() query: ImportTemplateQueryDto, @CurrentUser() user: AuthenticatedUser): Promise<ImportTemplateView[]> {
    return this.templates.findAll(user.organizationId, query.entity);
  }

  @Get('templates/:id')
  findTemplate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<ImportTemplateView> {
    return this.templates.findOne(id, user.organizationId);
  }

  /** Reads an upload and recognises its layout or proposes a mapping. Writes nothing; AI use is logged in ai_usage. */
  @RequirePermission('data.import')
  @Post('analyze')
  @HttpCode(200)
  @UseInterceptors(sheetUpload)
  analyze(
    @Body() dto: AnalyzeSheetDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SheetAnalysisView> {
    return this.dataImport.analyze(user, file, dto);
  }

  @RequirePermission('data.import')
  @Audit('import.template_saved')
  @Post('templates')
  createTemplate(@Body() dto: SaveImportTemplateDto, @CurrentUser() user: AuthenticatedUser): Promise<ImportTemplateView> {
    return this.dataImport.createTemplate(user, dto);
  }

  @RequirePermission('data.import')
  @Audit('import.template_saved')
  @Put('templates/:id')
  updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateImportTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ImportTemplateView> {
    return this.dataImport.updateTemplate(user, id, dto);
  }

  @RequirePermission('data.import')
  @Audit('import.template_deleted')
  @Delete('templates/:id')
  deleteTemplate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<{ id: string }> {
    return this.dataImport.deleteTemplate(user, id);
  }

  /** Dry run: validates every row and reports what an import would do. Writes nothing. */
  @RequirePermission('data.import')
  @Post('templates/:id/preview')
  @HttpCode(200)
  @UseInterceptors(sheetUpload)
  preview(
    @Param('id') id: string,
    @Body() dto: RunImportDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ImportRunView> {
    return this.dataImport.preview(user, id, file, dto);
  }

  @RequirePermission('data.import')
  @Audit('import.completed')
  @Post('templates/:id/import')
  @HttpCode(200)
  @UseInterceptors(sheetUpload)
  runImport(
    @Param('id') id: string,
    @Body() dto: RunImportDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ImportRunView> {
    return this.dataImport.commit(user, id, file, dto);
  }

  @Get('templates/:id/export')
  exportData(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<ImportExportView> {
    return this.dataImport.exportData(user, id);
  }
}
