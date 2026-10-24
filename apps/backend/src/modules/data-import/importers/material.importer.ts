import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateMaterialDto } from '../../materials/dto/create-material.dto';
import { MaterialsService } from '../../materials/materials.service';
import { MATERIAL_IMPORT } from '../import-definitions';
import { MappedRow } from '../import-mapping';
import {
  EntityImporter, ExportRecord, ImportRunContext, PlannedRow, RowOutcome, lowerKey, parseRow, rowLabel,
  validateAgainstDto, writePlannedRows,
} from './entity-importer';

interface MaterialPayload {
  existingId: string | null;
  dto: CreateMaterialDto;
  category: string | undefined;
}

function stringEntries(value: Prisma.JsonValue | null): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}

@Injectable()
export class MaterialImporter implements EntityImporter {
  readonly definition = MATERIAL_IMPORT;

  constructor(
    private readonly prisma: PrismaService,
    private readonly materials: MaterialsService,
  ) {}

  async preview(context: ImportRunContext, rows: MappedRow[]): Promise<RowOutcome[]> {
    return (await this.plan(context, rows)).map((planned) => planned.outcome);
  }

  async commit(context: ImportRunContext, rows: MappedRow[]): Promise<RowOutcome[]> {
    const planned = await this.plan(context, rows);
    const categoryIds = await this.categoryIds(context.organizationId);
    return writePlannedRows(planned, async ({ existingId, dto, category }, outcome) => {
      const isNewCategory = category !== undefined && !categoryIds.has(lowerKey(category));
      const categoryId = category ? await this.ensureCategory(context.organizationId, category, categoryIds) : undefined;
      outcome.messages = isNewCategory ? [`Added category “${category}”.`] : [];
      if (existingId) await this.materials.update(existingId, context.organizationId, { ...dto, categoryId });
      else await this.materials.create(context.organizationId, { ...dto, categoryId });
    });
  }

  async exportRecords(organizationId: string): Promise<ExportRecord[]> {
    const materials = await this.prisma.material.findMany({
      where: { organizationId, deletedAt: null },
      include: { category: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
    return materials.map((material) => ({
      values: {
        name: material.name,
        sku: material.sku,
        unit: material.unit,
        unitCost: material.unitCost.toNumber(),
        minStock: material.minStock.toNumber(),
        maxStock: material.maxStock?.toNumber() ?? null,
        category: material.category?.name ?? null,
      },
      extras: stringEntries(material.specifications),
    }));
  }

  private async plan(context: ImportRunContext, rows: MappedRow[]): Promise<PlannedRow<MaterialPayload>[]> {
    const [existing, categoryIds] = await Promise.all([
      // Archived materials keep their SKU, so they are loaded too.
      this.prisma.material.findMany({
        where: { organizationId: context.organizationId },
        select: { id: true, sku: true, deletedAt: true, specifications: true },
      }),
      this.categoryIds(context.organizationId),
    ]);
    const bySku = new Map(existing.map((material) => [lowerKey(material.sku), material]));
    const firstRowBySku = new Map<string, number>();

    const planned: PlannedRow<MaterialPayload>[] = [];
    for (const row of rows) {
      const parsed = parseRow(this.definition, row);
      const sku = parsed.text('sku');
      const outcome: RowOutcome = {
        rowNumber: row.rowNumber, label: rowLabel(parsed.text('name'), sku), action: 'error', messages: [...parsed.errors],
      };
      const entry: PlannedRow<MaterialPayload> = { outcome };
      planned.push(entry);
      if (!sku || outcome.messages.length > 0) continue;

      const firstRow = firstRowBySku.get(lowerKey(sku));
      if (firstRow) {
        outcome.messages.push(`SKU ${sku} is already used on row ${firstRow} of this sheet.`);
        continue;
      }
      firstRowBySku.set(lowerKey(sku), row.rowNumber);

      const match = bySku.get(lowerKey(sku));
      if (match?.deletedAt) {
        outcome.messages.push(`SKU ${sku} belongs to an archived material. Use a different SKU.`);
        continue;
      }

      const hasExtras = Object.keys(parsed.extras).length > 0;
      const { dto, errors } = await validateAgainstDto(CreateMaterialDto, {
        name: parsed.text('name'),
        sku,
        unit: parsed.text('unit'),
        unitCost: parsed.number('unitCost'),
        minStock: parsed.number('minStock'),
        maxStock: parsed.number('maxStock'),
        specifications: hasExtras ? { ...stringEntries(match?.specifications ?? null), ...parsed.extras } : undefined,
      }, this.definition);
      if (errors.length > 0) {
        outcome.messages.push(...errors);
        continue;
      }

      const category = parsed.text('category');
      const notes = category && !categoryIds.has(lowerKey(category)) ? [`New category “${category}” will be created.`] : [];
      if (match && context.onExisting === 'skip') {
        outcome.action = 'skip';
        outcome.messages = [`SKU ${sku} is already in the catalogue.`];
        continue;
      }
      outcome.action = match ? 'update' : 'create';
      outcome.messages = notes;
      entry.payload = { existingId: match?.id ?? null, dto, category };
    }
    return planned;
  }

  private async categoryIds(organizationId: string): Promise<Map<string, string>> {
    const categories = await this.prisma.materialCategory.findMany({ where: { organizationId }, select: { id: true, name: true } });
    return new Map(categories.map((category) => [lowerKey(category.name), category.id]));
  }

  private async ensureCategory(organizationId: string, name: string, known: Map<string, string>): Promise<string> {
    const existing = known.get(lowerKey(name));
    if (existing) return existing;
    const category = await this.prisma.materialCategory.upsert({
      where: { name_organizationId: { name: name.trim(), organizationId } },
      create: { name: name.trim(), organizationId },
      update: {},
      select: { id: true },
    });
    known.set(lowerKey(name), category.id);
    return category.id;
  }
}
