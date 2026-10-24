import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { sameUnit } from '../../inventory/units';
import { CreatePurchaseOrderDto } from '../../procurement/dto/purchase-order.dto';
import { PurchaseOrdersService } from '../../procurement/purchase-orders.service';
import { PURCHASE_ORDER_IMPORT } from '../import-definitions';
import { MappedRow } from '../import-mapping';
import { CodeOrNameLookup } from './code-or-name-lookup';
import {
  EntityImporter, ExportRecord, ImportRunContext, ParsedRow, PlannedRow, RowOutcome, lowerKey, parseRow,
  validateAgainstDto, writePlannedRows,
} from './entity-importer';

interface OrderPayload {
  reference: string;
  dto: CreatePurchaseOrderDto;
}

interface OrderGroup {
  reference: string;
  rows: ParsedRow[];
}

interface ReferenceData {
  projects: CodeOrNameLookup<{ id: string; name: string; code: string }>;
  vendors: CodeOrNameLookup<{ id: string; name: string; code: string; status: string }>;
  materialsBySku: Map<string, { id: string; name: string; unit: string }>;
  importedOrders: Map<string, string>;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Each distinct "your PO number" becomes one draft purchase order with a line per row. Orders are created
 * as drafts by the importer and go through the normal submit-and-approve flow. Already imported numbers
 * are skipped, so re-uploading the same sheet never duplicates orders.
 */
@Injectable()
export class PurchaseOrderImporter implements EntityImporter {
  readonly definition = PURCHASE_ORDER_IMPORT;

  constructor(
    private readonly prisma: PrismaService,
    private readonly purchaseOrders: PurchaseOrdersService,
  ) {}

  async preview(context: ImportRunContext, rows: MappedRow[]): Promise<RowOutcome[]> {
    return (await this.plan(context, rows)).map((planned) => planned.outcome);
  }

  async commit(context: ImportRunContext, rows: MappedRow[]): Promise<RowOutcome[]> {
    return writePlannedRows(await this.plan(context, rows), async ({ reference, dto }, outcome) => {
      const order = await this.purchaseOrders.create(context.organizationId, context.userId, dto, { externalReference: reference });
      outcome.messages = [`Created draft ${order.poNumber}.`];
    });
  }

  async exportRecords(organizationId: string): Promise<ExportRecord[]> {
    const orders = await this.prisma.purchaseOrder.findMany({
      where: { organizationId },
      include: {
        project: { select: { code: true } },
        vendor: { select: { code: true } },
        items: { orderBy: { sortOrder: 'asc' }, include: { material: { select: { sku: true } } } },
      },
      orderBy: [{ requestedDate: 'desc' }, { poNumber: 'desc' }],
    });
    return orders.flatMap((order) => order.items.map((item) => ({
      values: {
        reference: order.externalReference ?? order.poNumber,
        project: order.project?.code ?? null,
        vendor: order.vendor?.code ?? null,
        category: order.category,
        expectedDelivery: order.expectedDelivery.toISOString().slice(0, 10),
        priority: order.priority,
        deliveryAddress: order.deliveryAddress,
        notes: order.notes,
        itemDescription: item.description,
        itemMaterial: item.material?.sku ?? null,
        unit: item.unit,
        quantity: item.quantity.toNumber(),
        rate: item.rate.toNumber(),
        taxPercent: item.taxPercent,
        discountPercent: item.discountPercent,
      },
    })));
  }

  private async plan(context: ImportRunContext, rows: MappedRow[]): Promise<PlannedRow<OrderPayload>[]> {
    const references = await this.referenceData(context.organizationId);
    const planned: PlannedRow<OrderPayload>[] = [];
    const groups = new Map<string, OrderGroup>();

    for (const row of rows) {
      const parsed = parseRow(this.definition, row);
      const reference = parsed.text('reference');
      if (!reference) {
        planned.push({ outcome: { rowNumber: row.rowNumber, label: 'No PO number', action: 'error', messages: parsed.errors } });
        continue;
      }
      const group = groups.get(lowerKey(reference)) ?? { reference, rows: [] };
      group.rows.push(parsed);
      groups.set(lowerKey(reference), group);
    }

    for (const group of groups.values()) planned.push(await this.planOrder(group, references));
    return planned.sort((a, b) => a.outcome.rowNumber - b.outcome.rowNumber);
  }

  private async planOrder(group: OrderGroup, references: ReferenceData): Promise<PlannedRow<OrderPayload>> {
    const [header] = group.rows;
    const lineCount = group.rows.length;
    const outcome: RowOutcome = {
      rowNumber: header.rowNumber,
      label: `${group.reference} · ${lineCount} ${lineCount === 1 ? 'line' : 'lines'}`,
      action: 'error',
      messages: [],
    };

    const imported = references.importedOrders.get(lowerKey(group.reference));
    if (imported) {
      outcome.action = 'skip';
      outcome.messages = [`Already imported as ${imported}.`];
      return { outcome };
    }

    // Order details are read from the order's first row; line details from every row.
    for (const row of group.rows) {
      const prefix = lineCount > 1 ? `Row ${row.rowNumber}: ` : '';
      outcome.messages.push(...row.errors.map((error) => `${prefix}${error}`));
    }

    const projectRef = header.text('project');
    const vendorRef = header.text('vendor');
    const project = projectRef ? references.projects.find(projectRef) : undefined;
    const vendor = vendorRef ? references.vendors.find(vendorRef) : undefined;
    if (projectRef && project === 'ambiguous') outcome.messages.push(`Several projects are named “${projectRef}”. Use the project code.`);
    else if (projectRef && !project) outcome.messages.push(`No project with code or name “${projectRef}”.`);
    if (vendorRef && vendor === 'ambiguous') outcome.messages.push(`Several vendors are named “${vendorRef}”. Use the vendor code.`);
    else if (vendorRef && !vendor) outcome.messages.push(`No vendor with code or name “${vendorRef}”. Import vendors first.`);
    else if (typeof vendor === 'object' && vendor.status !== 'ACTIVE') outcome.messages.push(`${vendor.name} is inactive. Reactivate them before ordering.`);

    const expectedDelivery = header.text('expectedDelivery');
    if (expectedDelivery && expectedDelivery < todayIso()) outcome.messages.push(`Expected delivery ${expectedDelivery} is in the past.`);

    const items = group.rows.map((row) => {
      const sku = row.text('itemMaterial');
      const material = sku ? references.materialsBySku.get(lowerKey(sku)) : undefined;
      const unit = row.text('unit');
      if (sku && !material) outcome.messages.push(`Row ${row.rowNumber}: no material with SKU ${sku}.`);
      if (material && unit && !sameUnit(material.unit, unit)) {
        outcome.messages.push(`Row ${row.rowNumber}: ${material.name} is stocked in ${material.unit}, not ${unit}.`);
      }
      return {
        materialId: material?.id,
        description: row.text('itemDescription'),
        unit,
        quantity: row.number('quantity'),
        rate: row.number('rate'),
        taxPercent: row.number('taxPercent'),
        discountPercent: row.number('discountPercent'),
      };
    });
    if (outcome.messages.length > 0) return { outcome };

    const { dto, errors } = await validateAgainstDto(CreatePurchaseOrderDto, {
      projectId: typeof project === 'object' ? project.id : undefined,
      vendorId: typeof vendor === 'object' ? vendor.id : undefined,
      category: header.text('category'),
      priority: header.text('priority'),
      expectedDelivery,
      deliveryAddress: header.text('deliveryAddress'),
      notes: header.text('notes'),
      items,
    }, this.definition, { projectId: 'Project', vendorId: 'Vendor', description: 'Item description' });
    if (errors.length > 0) {
      outcome.messages = errors;
      return { outcome };
    }

    outcome.action = 'create';
    return { outcome, payload: { reference: group.reference, dto } };
  }

  private async referenceData(organizationId: string): Promise<ReferenceData> {
    const [projects, vendors, materials, importedOrders] = await Promise.all([
      this.prisma.project.findMany({ where: { organizationId, deletedAt: null }, select: { id: true, name: true, code: true } }),
      this.prisma.vendor.findMany({ where: { organizationId }, select: { id: true, name: true, code: true, status: true } }),
      this.prisma.material.findMany({ where: { organizationId, deletedAt: null }, select: { id: true, name: true, sku: true, unit: true } }),
      this.prisma.purchaseOrder.findMany({
        where: { organizationId, externalReference: { not: null } },
        select: { externalReference: true, poNumber: true },
      }),
    ]);
    return {
      projects: new CodeOrNameLookup(projects, (project) => project.code),
      vendors: new CodeOrNameLookup(vendors, (vendor) => vendor.code),
      materialsBySku: new Map(materials.map((material) => [lowerKey(material.sku), material])),
      importedOrders: new Map(importedOrders.map((order) => [lowerKey(order.externalReference ?? ''), order.poNumber])),
    };
  }
}
