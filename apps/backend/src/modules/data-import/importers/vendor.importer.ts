import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateVendorDto } from '../../procurement/dto/vendor.dto';
import { VendorsService } from '../../procurement/vendors.service';
import { VENDOR_IMPORT } from '../import-definitions';
import { MappedRow } from '../import-mapping';
import {
  EntityImporter, ExportRecord, ImportRunContext, PlannedRow, RowOutcome, lowerKey, parseRow, rowLabel,
  validateAgainstDto, writePlannedRows,
} from './entity-importer';

interface VendorPayload {
  existingId: string | null;
  dto: CreateVendorDto;
}

@Injectable()
export class VendorImporter implements EntityImporter {
  readonly definition = VENDOR_IMPORT;

  constructor(
    private readonly prisma: PrismaService,
    private readonly vendors: VendorsService,
  ) {}

  async preview(context: ImportRunContext, rows: MappedRow[]): Promise<RowOutcome[]> {
    return (await this.plan(context, rows)).map((planned) => planned.outcome);
  }

  async commit(context: ImportRunContext, rows: MappedRow[]): Promise<RowOutcome[]> {
    return writePlannedRows(await this.plan(context, rows), async ({ existingId, dto }) => {
      if (existingId) await this.vendors.update(existingId, context.organizationId, dto);
      else await this.vendors.create(context.organizationId, dto);
    });
  }

  async exportRecords(organizationId: string): Promise<ExportRecord[]> {
    const vendors = await this.prisma.vendor.findMany({ where: { organizationId }, orderBy: { name: 'asc' } });
    return vendors.map((vendor) => ({
      values: {
        name: vendor.name,
        code: vendor.code,
        categories: vendor.categories.join(', '),
        contactPerson: vendor.contactPerson,
        phone: vendor.phone,
        email: vendor.email,
        gstNumber: vendor.gstNumber,
        paymentTerms: vendor.paymentTerms,
        city: vendor.city,
        state: vendor.state,
      },
    }));
  }

  private async plan(context: ImportRunContext, rows: MappedRow[]): Promise<PlannedRow<VendorPayload>[]> {
    const existing = await this.prisma.vendor.findMany({
      where: { organizationId: context.organizationId },
      select: { id: true, code: true, name: true },
    });
    const byCode = new Map(existing.map((vendor) => [lowerKey(vendor.code), vendor.id]));
    const byName = new Map(existing.map((vendor) => [lowerKey(vendor.name), vendor.id]));
    const firstRowByVendor = new Map<string, number>();

    const planned: PlannedRow<VendorPayload>[] = [];
    for (const row of rows) {
      const parsed = parseRow(this.definition, row);
      const name = parsed.text('name');
      const code = parsed.text('code')?.toUpperCase();
      const outcome: RowOutcome = { rowNumber: row.rowNumber, label: rowLabel(name, code), action: 'error', messages: [...parsed.errors] };
      const entry: PlannedRow<VendorPayload> = { outcome };
      planned.push(entry);
      if (!name || outcome.messages.length > 0) continue;

      // Vendors are matched on their code when the sheet has one, otherwise on name.
      const sheetKey = code ? `code:${lowerKey(code)}` : `name:${lowerKey(name)}`;
      const firstRow = firstRowByVendor.get(sheetKey);
      if (firstRow) {
        outcome.messages.push(`This vendor is already on row ${firstRow} of this sheet.`);
        continue;
      }
      firstRowByVendor.set(sheetKey, row.rowNumber);

      const { dto, errors } = await validateAgainstDto(CreateVendorDto, {
        name,
        code,
        categories: parsed.list('categories'),
        contactPerson: parsed.text('contactPerson'),
        phone: parsed.text('phone'),
        email: parsed.text('email')?.toLowerCase(),
        gstNumber: parsed.text('gstNumber')?.replace(/\s+/g, '').toUpperCase(),
        paymentTerms: parsed.text('paymentTerms'),
        city: parsed.text('city'),
        state: parsed.text('state'),
      }, this.definition);
      if (errors.length > 0) {
        outcome.messages.push(...errors);
        continue;
      }

      const existingId = (code ? byCode.get(lowerKey(code)) : undefined) ?? byName.get(lowerKey(name)) ?? null;
      if (existingId && context.onExisting === 'skip') {
        outcome.action = 'skip';
        outcome.messages = ['This vendor is already in SitePilot.'];
        continue;
      }
      outcome.action = existingId ? 'update' : 'create';
      entry.payload = { existingId, dto };
    }
    return planned;
  }
}
