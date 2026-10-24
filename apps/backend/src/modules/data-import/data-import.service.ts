import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ImportEntity } from '@prisma/client';
import type { Permission } from '@sitepilot/types';
import { PERMISSION_CATALOGUE } from '../../common/permissions';
import { ColumnMappingService, MappingSuggestion } from './column-mapping.service';
import {
  AnalyzeSheetDto, RunImportDto, SaveImportTemplateDto, UpdateImportTemplateDto,
} from './dto/data-import.dto';
import { IMPORT_DEFINITIONS, ImportEntityDefinition, MAX_IMPORT_ROWS } from './import-definitions';
import { applyMapping, toSheetRow } from './import-mapping';
import { ImportTemplateView, ImportTemplatesService } from './import-templates.service';
import { EntityImporter, RowAction, RowOutcome } from './importers/entity-importer';
import { MaterialImporter } from './importers/material.importer';
import { OpeningStockImporter } from './importers/opening-stock.importer';
import { PurchaseOrderImporter } from './importers/purchase-order.importer';
import { VendorImporter } from './importers/vendor.importer';
import {
  SheetRow, Spreadsheet, dataRows, detectHeaderRow, headerSignature, headingsAt, readSpreadsheet,
} from './sheet-reader';

export interface ImportActor {
  id: string;
  organizationId: string;
  permissions: Permission[];
}

export interface UploadedSheet {
  buffer: Buffer;
  originalname: string;
}

const SAMPLE_ROWS = 5;
/** Columns with more distinct values than this are free text, not a short list worth translating. */
const MAX_LISTED_VALUES = 25;

function shortListValues(headers: string[], rows: SheetRow[]): Record<string, string[]> {
  return Object.fromEntries(headers.flatMap((heading, index) => {
    const values = [...new Set(rows.map((row) => (row.cells[index] ?? '').trim()).filter((value) => value !== ''))];
    return values.length > 0 && values.length <= MAX_LISTED_VALUES ? [[heading, values]] : [];
  }));
}

export interface SheetAnalysisView {
  entity: ImportEntity;
  sheetNames: string[];
  sheetName: string;
  headerRow: number;
  headers: string[];
  sampleRows: string[][];
  totalRows: number;
  /** Distinct values of each short-list column, so the admin can translate their wording to SitePilot options. */
  columnValues: Record<string, string[]>;
  /** A saved layout this sheet matches; when set, no mapping work is needed. */
  template: ImportTemplateView | null;
  /** A proposed mapping for a layout seen for the first time. */
  suggestion: MappingSuggestion | null;
}

export interface ImportEntityView extends ImportEntityDefinition {
  /** Whether this member may import it (they hold the entity's own permission). */
  allowed: boolean;
}

export type ImportSummary = Record<RowAction, number>;

export interface ImportRunView {
  /** The template used; also the audited record. */
  id: string;
  entity: ImportEntity;
  sheetName: string;
  summary: ImportSummary;
  rows: RowOutcome[];
}

export interface ImportExportView {
  fileName: string;
  headers: string[];
  rows: (string | number | null)[][];
}

function summarize(rows: RowOutcome[]): ImportSummary {
  const summary: ImportSummary = { create: 0, update: 0, skip: 0, error: 0 };
  for (const row of rows) summary[row.action] += 1;
  return summary;
}

@Injectable()
export class DataImportService {
  private readonly importers: Record<ImportEntity, EntityImporter>;

  constructor(
    private readonly templates: ImportTemplatesService,
    private readonly columnMapping: ColumnMappingService,
    materials: MaterialImporter,
    vendors: VendorImporter,
    openingStock: OpeningStockImporter,
    purchaseOrders: PurchaseOrderImporter,
  ) {
    this.importers = { MATERIAL: materials, VENDOR: vendors, OPENING_STOCK: openingStock, PURCHASE_ORDER: purchaseOrders };
  }

  entities(actor: ImportActor): ImportEntityView[] {
    return Object.values(IMPORT_DEFINITIONS).map((definition) => ({
      ...definition,
      allowed: actor.permissions.includes(definition.permission),
    }));
  }

  /** Reads an upload and either recognises a saved layout or proposes a mapping for a new one. */
  async analyze(actor: ImportActor, file: UploadedSheet | undefined, dto: AnalyzeSheetDto): Promise<SheetAnalysisView> {
    const definition = this.allowedDefinition(actor, dto.entity);
    const upload = this.requireFile(file);
    const sheet = await readSpreadsheet(upload.buffer, upload.originalname, dto.sheetName);

    // An explicit header row means the admin is correcting the layout, so don't snap back to a saved one.
    const template = dto.headerRow ? null : await this.templates.findMatching(actor.organizationId, dto.entity, sheet.rows);
    const headerRow = template?.headerRow ?? dto.headerRow ?? detectHeaderRow(sheet.rows);
    const headers = headingsAt(sheet.rows, headerRow);
    if (headers.length === 0) throw new BadRequestException(`Row ${headerRow} has no column headings. Pick the row that does.`);

    const rows = dataRows(sheet.rows, headerRow);
    const sampleRows = rows.slice(0, SAMPLE_ROWS).map((row) => headers.map((_, index) => row.cells[index] ?? ''));
    const suggestion = template
      ? null
      : await this.columnMapping.suggest({ organizationId: actor.organizationId, userId: actor.id }, definition, headers, sampleRows);

    return {
      entity: dto.entity,
      sheetNames: sheet.sheetNames,
      sheetName: sheet.sheetName,
      headerRow,
      headers,
      sampleRows,
      totalRows: rows.length,
      columnValues: shortListValues(headers, rows),
      template,
      suggestion,
    };
  }

  preview(actor: ImportActor, templateId: string, file: UploadedSheet | undefined, dto: RunImportDto): Promise<ImportRunView> {
    return this.run(actor, templateId, file, dto, 'preview');
  }

  async commit(actor: ImportActor, templateId: string, file: UploadedSheet | undefined, dto: RunImportDto): Promise<ImportRunView> {
    const result = await this.run(actor, templateId, file, dto, 'commit');
    await this.templates.markUsed(templateId);
    return result;
  }

  /** The organization's current records laid out in the template's columns, ready to save as a sheet. */
  async exportData(actor: ImportActor, templateId: string): Promise<ImportExportView> {
    const template = await this.templates.findOne(templateId, actor.organizationId);
    const definition = this.allowedDefinition(actor, template.entity);
    const records = await this.importers[template.entity].exportRecords(actor.organizationId);
    return {
      fileName: `${definition.label.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`,
      headers: template.headers,
      rows: records.map((record) => toSheetRow(template.mapping, template.headers, record.values, record.extras)),
    };
  }

  createTemplate(actor: ImportActor, dto: SaveImportTemplateDto): Promise<ImportTemplateView> {
    this.allowedDefinition(actor, dto.entity);
    return this.templates.create(actor.organizationId, actor.id, dto);
  }

  async updateTemplate(actor: ImportActor, id: string, dto: UpdateImportTemplateDto): Promise<ImportTemplateView> {
    const template = await this.templates.findOne(id, actor.organizationId);
    this.allowedDefinition(actor, template.entity);
    return this.templates.update(id, actor.organizationId, actor.id, dto);
  }

  async deleteTemplate(actor: ImportActor, id: string): Promise<{ id: string }> {
    const template = await this.templates.findOne(id, actor.organizationId);
    this.allowedDefinition(actor, template.entity);
    return this.templates.remove(id, actor.organizationId);
  }

  private async run(
    actor: ImportActor,
    templateId: string,
    file: UploadedSheet | undefined,
    dto: RunImportDto,
    mode: 'preview' | 'commit',
  ): Promise<ImportRunView> {
    const template = await this.templates.findOne(templateId, actor.organizationId);
    const definition = this.allowedDefinition(actor, template.entity);
    const upload = this.requireFile(file);
    const sheet = await readSpreadsheet(upload.buffer, upload.originalname, dto.sheetName);
    const rows = this.templateRows(template, sheet);

    const importer = this.importers[template.entity];
    const context = {
      organizationId: actor.organizationId,
      userId: actor.id,
      onExisting: definition.canUpdateExisting ? dto.onExisting ?? 'skip' : 'skip',
    };
    const mapped = rows.map((row) => applyMapping(definition, template.mapping, template.headers, row));
    const outcomes = mode === 'preview' ? await importer.preview(context, mapped) : await importer.commit(context, mapped);
    return { id: template.id, entity: template.entity, sheetName: sheet.sheetName, summary: summarize(outcomes), rows: outcomes };
  }

  private templateRows(template: ImportTemplateView, sheet: Spreadsheet): SheetRow[] {
    const headings = headingsAt(sheet.rows, template.headerRow);
    if (headerSignature(headings) !== headerSignature(template.headers)) {
      throw new BadRequestException(
        `This sheet’s columns don’t match the “${template.name}” layout. Upload it again to map the new columns.`,
      );
    }
    const rows = dataRows(sheet.rows, template.headerRow);
    if (rows.length === 0) throw new BadRequestException('The sheet has no rows below the headings.');
    if (rows.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(`The sheet has ${rows.length} rows. Split it into files of up to ${MAX_IMPORT_ROWS} rows.`);
    }
    return rows;
  }

  private allowedDefinition(actor: ImportActor, entity: ImportEntity): ImportEntityDefinition {
    const definition = IMPORT_DEFINITIONS[entity];
    if (!actor.permissions.includes(definition.permission)) {
      throw new ForbiddenException(
        `Importing ${definition.label.toLowerCase()} needs permission to ${PERMISSION_CATALOGUE[definition.permission].label.toLowerCase()}. Ask an admin for access.`,
      );
    }
    return definition;
  }

  private requireFile(file: UploadedSheet | undefined): UploadedSheet {
    if (!file) throw new BadRequestException('Choose a spreadsheet to upload.');
    return file;
  }
}
