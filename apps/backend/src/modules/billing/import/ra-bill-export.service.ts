import { Injectable } from '@nestjs/common';
import { ImportEntity } from '@prisma/client';
import { Workbook, Worksheet } from 'exceljs';
import { PrismaService } from '../../../database/prisma.service';
import { ImportMapping, toSheetRow } from '../../data-import/import-mapping';
import { ImportTemplatesService } from '../../data-import/import-templates.service';
import { DIRECTION_PARTY } from '../billing.constants';
import { RaBillDetailView } from '../ra-bill.mapper';
import { RaBillsService } from '../ra-bills.service';

export interface BillExportView {
  fileName: string;
  /** An .xlsx workbook, base64-encoded so it travels in the usual JSON envelope. */
  contentBase64: string;
}

/** Used when the organization hasn't saved a measurement book layout of its own. */
const STANDARD_MB_HEADERS = ['Item No', 'Description', 'Nos', 'Length', 'Breadth', 'Height', 'Quantity'];
const STANDARD_MB_MAPPING: ImportMapping = {
  columns: { itemNo: 'Item No', description: 'Description', nos: 'Nos', length: 'Length', breadth: 'Breadth', height: 'Height', quantity: 'Quantity' },
  defaults: {},
  values: {},
  extras: [],
};

const ABSTRACT_HEADERS = [
  'Sr. No', 'Item No', 'Code', 'Description', 'Unit', 'BOQ Qty', 'Rate',
  'Qty: Upto Previous', 'Qty: This Bill', 'Qty: Up to Date', 'Amount: Upto Previous', 'Amount: This Bill', 'Amount: Up to Date',
];

const day = (date: Date): string => date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

function titleBlock(sheet: Worksheet, title: string, lines: string[]): void {
  sheet.addRow([title]).font = { bold: true, size: 13 };
  lines.forEach((line) => sheet.addRow([line]));
  sheet.addRow([]);
}

function boldRow(sheet: Worksheet, values: (string | number | null)[]): void {
  sheet.addRow(values).font = { bold: true };
}

/**
 * Writes an RA bill as a workbook with the two sheets contractors exchange: the Abstract and the
 * Measurement Book. The measurement book follows the organization's own saved layout when there is one,
 * so the file looks like the sheets they already send.
 */
@Injectable()
export class RaBillExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bills: RaBillsService,
    private readonly templates: ImportTemplatesService,
  ) {}

  async export(billId: string, organizationId: string): Promise<BillExportView> {
    const [bill, organization, layouts] = await Promise.all([
      this.bills.findOne(billId, organizationId),
      this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { name: true } }),
      this.templates.findAll(organizationId, ImportEntity.MEASUREMENT_BOOK),
    ]);
    const layout = [...layouts].sort((a, b) => (b.lastUsedAt?.getTime() ?? 0) - (a.lastUsedAt?.getTime() ?? 0))[0];
    const header = [
      `${DIRECTION_PARTY[bill.contract.direction]}: ${bill.partyName ?? '—'}`,
      `${bill.contract.code}${bill.contract.reference ? ` · WO/PO ${bill.contract.reference}` : ''} · ${bill.contract.title}`,
      `${bill.code}${bill.reference ? ` (${bill.reference})` : ''} · Period ${day(bill.periodFrom)} to ${day(bill.periodTo)} · ${bill.status}`,
    ];

    const workbook = new Workbook();
    workbook.creator = 'SitePilot';
    this.writeAbstract(workbook.addWorksheet('Abstract'), bill, organization.name, header);
    this.writeMeasurementBook(workbook.addWorksheet('Measurement Book'), bill, organization.name, header, layout?.headers ?? STANDARD_MB_HEADERS, layout?.mapping ?? STANDARD_MB_MAPPING);

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const safeCode = `${bill.contract.code}-${bill.code}`.replace(/[^A-Za-z0-9-]+/g, '-');
    return { fileName: `${safeCode}.xlsx`, contentBase64: buffer.toString('base64') };
  }

  private writeAbstract(sheet: Worksheet, bill: RaBillDetailView, organizationName: string, header: string[]): void {
    titleBlock(sheet, `${organizationName} · Abstract of RA bill`, header);
    boldRow(sheet, ABSTRACT_HEADERS);
    const billed = bill.lines.filter((line) => line.previousQuantity !== 0 || line.thisQuantity !== 0);
    billed.forEach((line, index) => sheet.addRow([
      index + 1, line.itemNo, line.rateCode, line.description, line.unit, line.boqQuantity, line.rate,
      line.previousQuantity, line.thisQuantity, line.upToDateQuantity, line.previousAmount, line.thisAmount, line.upToDateAmount,
    ]));
    boldRow(sheet, ['', '', '', 'Total', '', '', '', '', '', '', bill.totals.previousGross, bill.totals.grossAmount, bill.totals.upToDateGross]);
    sheet.addRow([]);
    boldRow(sheet, ['', '', '', 'Gross amount of this bill', '', '', '', '', '', '', '', bill.totals.grossAmount]);
    bill.adjustments.forEach((adjustment) => sheet.addRow(['', '', '', adjustment.effect === 'DEDUCT' ? `Less: ${adjustment.label}` : adjustment.label, '', '', '', '', '', '', '', adjustment.amount]));
    boldRow(sheet, ['', '', '', 'Net amount payable', '', '', '', '', '', '', '', bill.totals.netAmount]);
    sheet.addRow([]);
    sheet.addRow(['', '', '', `Prepared by: ${bill.preparedBy?.name ?? ''}`, '', '', '', '', `Certified by: ${bill.certifiedBy?.name ?? ''}`]);

    sheet.getColumn(4).width = 60;
    [6, 7, 8, 9, 10].forEach((column) => { sheet.getColumn(column).numFmt = '#,##0.000'; });
    [7, 11, 12, 13].forEach((column) => { sheet.getColumn(column).numFmt = '#,##0.00'; });
  }

  private writeMeasurementBook(
    sheet: Worksheet,
    bill: RaBillDetailView,
    organizationName: string,
    header: string[],
    headings: string[],
    mapping: ImportMapping,
  ): void {
    titleBlock(sheet, `${organizationName} · Measurement book`, header);
    boldRow(sheet, headings);
    const row = (values: Record<string, string | number | null>): (string | number | null)[] => toSheetRow(mapping, headings, values);

    for (const line of bill.lines.filter((candidate) => candidate.measurements.length > 0)) {
      boldRow(sheet, row({ itemNo: line.itemNo, description: line.description }));
      for (const measurement of line.measurements) {
        sheet.addRow(row({
          // Deductions show as negative quantities, as in a hand-kept measurement book.
          description: measurement.description,
          nos: measurement.nos,
          length: measurement.length,
          breadth: measurement.breadth,
          height: measurement.height,
          quantity: measurement.isDeduction ? -Math.abs(measurement.quantity) : measurement.quantity,
        }));
      }
      boldRow(sheet, row({ description: `Total quantity for item ${line.itemNo} (${line.unit})`, quantity: line.claimedQuantity }));
      if (line.certifiedQuantity !== null && line.certifiedQuantity !== line.claimedQuantity) {
        sheet.addRow(row({ description: `Quantity certified for item ${line.itemNo}`, quantity: line.certifiedQuantity }));
      }
      sheet.addRow([]);
    }
    const descriptionColumn = headings.indexOf(mapping.columns.description ?? '') + 1;
    if (descriptionColumn > 0) sheet.getColumn(descriptionColumn).width = 60;
  }
}
