import { ConflictException, Injectable } from '@nestjs/common';
import { ImportEntity } from '@prisma/client';
import { DataImportService, ImportActor, UploadedSheet } from '../../data-import/data-import.service';
import { roundQuantity } from '../billing-math';
import { EDITABLE_BILL_STATUSES, MAX_MEASUREMENTS_PER_ITEM } from '../billing.constants';
import { MeasurementImportDto } from '../dto/billing-import.dto';
import { MeasurementDto } from '../dto/ra-bill.dto';
import { RaBillsService } from '../ra-bills.service';
import { ParsedMeasurement, measuredQuantity, normalizeItemNo, parseMeasurementBook } from './measurement-book-parser';

const MAX_DESCRIPTION = 300;

export interface MeasurementImportItemView {
  itemNo: string;
  heading: string;
  /** The BOQ line it lands on; null when the item number isn't in this contract's BOQ. */
  contractItem: { id: string; itemNo: string; description: string; unit: string } | null;
  rows: ParsedMeasurement[];
  measuredQuantity: number;
  sheetTotals: { payable: number | null; hold: number | null; paid: number | null };
  /** Rows already on the bill for this item; they are replaced. */
  replacesRows: number;
  warnings: string[];
  /** Set when the item can't be imported. */
  error: string | null;
}

export interface MeasurementImportView {
  sheetName: string;
  sections: { label: string; rows: number; selected: boolean }[];
  items: MeasurementImportItemView[];
  summary: { items: number; importable: number; unmatched: number; rows: number; warnings: number; ignoredRows: number };
}

/** Cross-checks shouldn't fire on rounding: sheets usually show two decimals. */
const totalsDiffer = (a: number, b: number): boolean => Math.abs(a - b) > Math.max(0.01, Math.abs(b) * 0.001);

/**
 * Imports a measurement book into a draft RA bill. The sheet is parsed by fixed rules (see the parser),
 * every item is checked against the sheet's own totals, and nothing is written until the preview is
 * accepted. Each item's rows replace that item's measurements on the bill, through the same path as the
 * measurement screen.
 */
@Injectable()
export class MeasurementImportService {
  constructor(
    private readonly dataImport: DataImportService,
    private readonly bills: RaBillsService,
  ) {}

  async preview(actor: ImportActor, billId: string, file: UploadedSheet | undefined, dto: MeasurementImportDto): Promise<MeasurementImportView> {
    return this.plan(actor, billId, file, dto);
  }

  async commit(actor: ImportActor, billId: string, file: UploadedSheet | undefined, dto: MeasurementImportDto): Promise<MeasurementImportView> {
    const view = await this.plan(actor, billId, file, dto);
    const multipleSections = view.sections.filter((section) => section.selected).length > 1;
    for (const item of view.items) {
      if (!item.contractItem || item.error || item.rows.length === 0) continue;
      await this.bills.replaceMeasurements(billId, item.contractItem.id, actor.organizationId, {
        rows: item.rows.map((row) => toMeasurementDto(row, multipleSections)),
      });
    }
    await this.dataImport.markTemplateUsed(dto.templateId);
    return view;
  }

  private async plan(actor: ImportActor, billId: string, file: UploadedSheet | undefined, dto: MeasurementImportDto): Promise<MeasurementImportView> {
    const bill = await this.bills.findBillOrThrow(billId, actor.organizationId);
    if (!EDITABLE_BILL_STATUSES.includes(bill.status)) {
      throw new ConflictException('Measurements can only be imported into drafts and bills sent back for changes.');
    }
    const { sheetName, rows } = await this.dataImport.readWithTemplate(actor, dto.templateId, file, dto.sheetName, ImportEntity.MEASUREMENT_BOOK);
    const book = parseMeasurementBook(rows);
    const selected = new Set(dto.sections?.length ? dto.sections : book.sections);
    const allSections = book.sections.every((section) => selected.has(section));
    const contractItems = new Map(bill.contract.items.map((item) => [normalizeItemNo(item.itemNo), item]));

    const items = book.items.map((parsed): MeasurementImportItemView => {
      const match = contractItems.get(normalizeItemNo(parsed.itemNo));
      const chosen = parsed.measurements.filter((row) => selected.has(row.section));
      const measured = measuredQuantity(chosen);
      const warnings: string[] = [];
      const { payable, hold } = parsed.sheetTotals;
      if (allSections && payable !== null && totalsDiffer(measured, payable)) {
        warnings.push(`The sheet’s total is ${roundQuantity(payable)}, but its rows add up to ${measured} with deductions subtracted. Check the deduction rows.`);
      }
      if (hold) warnings.push(`The sheet holds ${roundQuantity(hold)} of this item. Holding is done when certifying, so the full measurement is claimed here.`);
      const kept = chosen.filter((row) => row.note).length;
      if (kept > 0) warnings.push(`${kept} ${kept === 1 ? 'row is' : 'rows are'} kept as the sheet’s quantity (see each row’s note).`);

      let error: string | null = null;
      if (!match) error = `Item ${parsed.itemNo} isn’t in this contract’s BOQ. Add it to the BOQ first.`;
      else if (chosen.length > MAX_MEASUREMENTS_PER_ITEM) error = `More than ${MAX_MEASUREMENTS_PER_ITEM} rows; split this item.`;
      else if (measured < 0) error = 'Deductions add up to more than the measured quantity.';

      return {
        itemNo: parsed.itemNo,
        heading: parsed.heading,
        contractItem: match ? { id: match.id, itemNo: match.itemNo, description: match.description, unit: match.unit } : null,
        rows: chosen,
        measuredQuantity: measured,
        sheetTotals: parsed.sheetTotals,
        replacesRows: match ? bill.measurements.filter((row) => row.contractItemId === match.id).length : 0,
        warnings,
        error,
      };
    });

    const importable = items.filter((item) => item.contractItem && !item.error && item.rows.length > 0);
    return {
      sheetName,
      sections: book.sections.map((label) => ({
        label,
        rows: book.items.reduce((sum, item) => sum + item.measurements.filter((row) => row.section === label).length, 0),
        selected: selected.has(label),
      })),
      items,
      summary: {
        items: items.length,
        importable: importable.length,
        unmatched: items.filter((item) => !item.contractItem).length,
        rows: importable.reduce((sum, item) => sum + item.rows.length, 0),
        warnings: items.reduce((sum, item) => sum + item.warnings.length, 0),
        ignoredRows: book.ignoredRows,
      },
    };
  }
}

function toMeasurementDto(row: ParsedMeasurement, withSection: boolean): MeasurementDto {
  const description = (withSection ? `${row.section} · ${row.description}` : row.description).slice(0, MAX_DESCRIPTION);
  return row.type === 'DIMENSIONS'
    ? { description, type: 'DIMENSIONS', isDeduction: row.isDeduction, nos: row.nos, length: row.length, breadth: row.breadth, height: row.height }
    : { description, type: 'DIRECT', quantity: roundQuantity(row.quantity), isDeduction: row.isDeduction };
}
