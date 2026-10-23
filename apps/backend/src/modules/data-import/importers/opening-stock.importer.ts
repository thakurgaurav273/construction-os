import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateAdjustmentDto } from '../../inventory/dto/create-adjustment.dto';
import { InventoryAdjustmentsService } from '../../inventory/inventory-adjustments.service';
import { OPENING_STOCK_IMPORT } from '../import-definitions';
import { MappedRow } from '../import-mapping';
import {
  EntityImporter, ExportRecord, ImportRunContext, PlannedRow, RowOutcome, parseRow, rowLabel,
  validateAgainstDto, writePlannedRows,
} from './entity-importer';
import { CodeOrNameLookup } from './code-or-name-lookup';

interface StockPayload {
  dto: CreateAdjustmentDto;
}

const IMPORT_NOTE = 'Opening stock imported from spreadsheet';

/**
 * Sets each store's on-hand quantity to the counted figure. It goes through stock adjustments, so the
 * warehouse ledger, the material total and the audit trail all record the change.
 */
@Injectable()
export class OpeningStockImporter implements EntityImporter {
  readonly definition = OPENING_STOCK_IMPORT;

  constructor(
    private readonly prisma: PrismaService,
    private readonly adjustments: InventoryAdjustmentsService,
  ) {}

  async preview(context: ImportRunContext, rows: MappedRow[]): Promise<RowOutcome[]> {
    return (await this.plan(context, rows)).map((planned) => planned.outcome);
  }

  async commit(context: ImportRunContext, rows: MappedRow[]): Promise<RowOutcome[]> {
    return writePlannedRows(await this.plan(context, rows), async ({ dto }) => {
      await this.adjustments.create(context.organizationId, context.userId, dto);
    });
  }

  async exportRecords(organizationId: string): Promise<ExportRecord[]> {
    const items = await this.prisma.inventoryItem.findMany({
      where: { organizationId, material: { deletedAt: null }, warehouse: { deletedAt: null } },
      include: { material: { select: { sku: true, name: true } }, warehouse: { select: { code: true, name: true } } },
      orderBy: [{ warehouse: { name: 'asc' } }, { material: { name: 'asc' } }],
    });
    return items.map((item) => ({
      values: { material: item.material.sku, warehouse: item.warehouse.code, quantity: item.quantity.toNumber() },
    }));
  }

  private async plan(context: ImportRunContext, rows: MappedRow[]): Promise<PlannedRow<StockPayload>[]> {
    const { organizationId } = context;
    const [materials, warehouses, items] = await Promise.all([
      this.prisma.material.findMany({ where: { organizationId, deletedAt: null }, select: { id: true, name: true, sku: true, unit: true } }),
      this.prisma.warehouse.findMany({ where: { organizationId, deletedAt: null }, select: { id: true, name: true, code: true } }),
      this.prisma.inventoryItem.findMany({ where: { organizationId }, select: { materialId: true, warehouseId: true, quantity: true } }),
    ]);
    const materialLookup = new CodeOrNameLookup(materials, (material) => material.sku);
    const warehouseLookup = new CodeOrNameLookup(warehouses, (warehouse) => warehouse.code);
    const onHand = new Map(items.map((item) => [`${item.materialId}:${item.warehouseId}`, item.quantity.toNumber()]));
    const firstRowByItem = new Map<string, number>();

    const planned: PlannedRow<StockPayload>[] = [];
    for (const row of rows) {
      const parsed = parseRow(this.definition, row);
      const materialRef = parsed.text('material');
      const warehouseRef = parsed.text('warehouse');
      const outcome: RowOutcome = {
        rowNumber: row.rowNumber,
        label: rowLabel(materialRef && warehouseRef ? `${materialRef} @ ${warehouseRef}` : materialRef),
        action: 'error',
        messages: [...parsed.errors],
      };
      const entry: PlannedRow<StockPayload> = { outcome };
      planned.push(entry);
      if (!materialRef || !warehouseRef || outcome.messages.length > 0) continue;

      const material = materialLookup.find(materialRef);
      const warehouse = warehouseLookup.find(warehouseRef);
      if (material === 'ambiguous') outcome.messages.push(`Several materials are named “${materialRef}”. Use the SKU instead.`);
      else if (!material) outcome.messages.push(`No material with SKU or name “${materialRef}”. Import materials first.`);
      if (warehouse === 'ambiguous') outcome.messages.push(`Several stores are named “${warehouseRef}”. Use the store code instead.`);
      else if (!warehouse) outcome.messages.push(`No store with code or name “${warehouseRef}”. Create it under Inventory first.`);
      if (typeof material !== 'object' || typeof warehouse !== 'object') continue;

      outcome.label = `${material.name} @ ${warehouse.name}`;
      const itemKey = `${material.id}:${warehouse.id}`;
      const firstRow = firstRowByItem.get(itemKey);
      if (firstRow) {
        outcome.messages.push(`This material and store are already on row ${firstRow} of this sheet.`);
        continue;
      }
      firstRowByItem.set(itemKey, row.rowNumber);

      const { dto, errors } = await validateAgainstDto(CreateAdjustmentDto, {
        warehouseId: warehouse.id,
        materialId: material.id,
        reason: 'CORRECTION',
        quantityAfter: parsed.number('quantity'),
        note: IMPORT_NOTE,
      }, this.definition, { quantityAfter: 'Quantity on hand' });
      if (errors.length > 0) {
        outcome.messages.push(...errors);
        continue;
      }

      const current = onHand.get(itemKey) ?? 0;
      if (current === dto.quantityAfter) {
        outcome.action = 'skip';
        outcome.messages = [`Already ${current} ${material.unit} in stock.`];
        continue;
      }
      if (current !== 0 && context.onExisting === 'skip') {
        outcome.action = 'skip';
        outcome.messages = [`The store already holds ${current} ${material.unit}.`];
        continue;
      }
      outcome.action = current === 0 ? 'create' : 'update';
      outcome.messages = current === 0 ? [] : [`Stock changes from ${current} to ${dto.quantityAfter} ${material.unit}.`];
      entry.payload = { dto };
    }
    return planned;
  }
}
