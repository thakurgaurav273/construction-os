import { Workbook, Worksheet } from 'exceljs';
import type { ReportColumn, ReportDocument, ReportTable } from '../content/report-document';
import { ReportBranding, formatValue, periodLabel, projectsLabel, tint } from './report-format';

/** Excel sheet names: at most 31 characters, none of : \ / ? * [ ] */
function sheetName(title: string, used: Set<string>): string {
  const base = title.replace(/[:\\/?*[\]]/g, ' ').slice(0, 28).trim() || 'Sheet';
  let name = base;
  for (let copy = 2; used.has(name.toLowerCase()); copy += 1) name = `${base} ${copy}`;
  used.add(name.toLowerCase());
  return name;
}

function numberFormat(column: ReportColumn, currency: string): string | undefined {
  switch (column.kind) {
    case 'money': return currency === 'INR' ? '"₹"#,##,##0.00' : '#,##0.00';
    case 'percent': return '0.0"%"';
    case 'number': return '#,##0.###';
    default: return undefined;
  }
}

/** Dates stay real dates in Excel so people can sort and filter them. */
function cellValue(value: string | number | null | undefined, column: ReportColumn): string | number | Date | null {
  if (value === undefined || value === null) return null;
  if (column.kind === 'date' && typeof value === 'string') return new Date(value);
  return value;
}

function writeTable(sheet: Worksheet, table: ReportTable, branding: ReportBranding): void {
  const header = sheet.addRow(table.columns.map((column) => column.label));
  header.font = { bold: true };
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${tint(branding.brandColor, 0.85).slice(1)}` } };
  });
  if (table.rows.length === 0) sheet.addRow([table.emptyText]).font = { italic: true, color: { argb: 'FF64748B' } };
  for (const row of table.rows) sheet.addRow(table.columns.map((column) => cellValue(row[column.key], column)));
  if (table.totals) sheet.addRow(table.columns.map((column) => cellValue(table.totals?.[column.key], column))).font = { bold: true };

  table.columns.forEach((column, index) => {
    const sheetColumn = sheet.getColumn(index + 1);
    sheetColumn.numFmt = column.kind === 'date' ? 'dd mmm yyyy' : numberFormat(column, branding.currency) ?? '@';
    const longest = Math.max(column.label.length, ...table.rows.map((row) => String(row[column.key] ?? '').length));
    sheetColumn.width = Math.min(Math.max(longest + 2, 10), 60);
  });
  sheet.views = [{ state: 'frozen', ySplit: header.number }];
  if (table.rows.length > 0) {
    sheet.autoFilter = { from: { row: header.number, column: 1 }, to: { row: header.number, column: table.columns.length } };
  }
}

/** A summary sheet with the headline numbers, then one sheet per table with every row. */
export async function renderReportExcel(document: ReportDocument, branding: ReportBranding): Promise<Buffer> {
  const workbook = new Workbook();
  workbook.creator = 'SitePilot';
  workbook.company = branding.organizationName;
  workbook.created = new Date(document.generatedAt);
  const used = new Set<string>();

  const summary = workbook.addWorksheet(sheetName('Summary', used));
  summary.addRow([document.title]).font = { bold: true, size: 14 };
  summary.addRow([branding.organizationName]);
  summary.addRow([`${periodLabel(document.period)} · ${projectsLabel(document.projectNames, document.allProjects)}`]);
  summary.addRow([]);
  summary.addRow(['Measure', 'Value']).font = { bold: true };
  for (const metric of document.metrics) summary.addRow([metric.label, formatValue(metric.value, metric.kind, branding.currency)]);
  if (document.aiSummary) {
    summary.addRow([]);
    summary.addRow(['Summary']).font = { bold: true };
    summary.addRow([document.aiSummary]).alignment = { wrapText: true, vertical: 'top' };
  }
  for (const section of document.sections.filter((candidate) => candidate.bullets?.length)) {
    summary.addRow([]);
    summary.addRow([section.title]).font = { bold: true };
    section.bullets?.forEach((bullet) => summary.addRow([bullet]));
  }
  summary.getColumn(1).width = 48;
  summary.getColumn(2).width = 24;

  for (const section of document.sections) {
    if (!section.table) continue;
    writeTable(workbook.addWorksheet(sheetName(section.title, used)), section.table, branding);
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
