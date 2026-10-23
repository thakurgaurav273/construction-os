import { BadRequestException } from '@nestjs/common';
import { CellValue, Workbook } from 'exceljs';

export interface Spreadsheet {
  sheetNames: string[];
  sheetName: string;
  /** Every cell as trimmed text; dates as YYYY-MM-DD. Rows keep their sheet position (index 0 is row 1). */
  rows: string[][];
}

/** Title blocks above the real header row rarely run longer than this. */
const HEADER_SEARCH_ROWS = 20;

export async function readSpreadsheet(buffer: Buffer, fileName: string, sheetName?: string): Promise<Spreadsheet> {
  const extension = fileName.toLowerCase().split('.').pop();
  if (extension === 'csv' || extension === 'txt') {
    return { sheetNames: ['Sheet1'], sheetName: 'Sheet1', rows: parseCsv(buffer.toString('utf8')) };
  }
  if (extension !== 'xlsx') {
    throw new BadRequestException('Upload an Excel (.xlsx) or CSV file. Older .xls files can be saved as .xlsx from Excel.');
  }

  const workbook = new Workbook();
  try {
    // exceljs types its input as a plain ArrayBuffer; copying into a fresh Uint8Array gives exactly that.
    await workbook.xlsx.load(new Uint8Array(buffer).buffer);
  } catch {
    throw new BadRequestException('This file could not be read as an Excel workbook. Re-save it as .xlsx and try again.');
  }
  const sheets = workbook.worksheets.filter((sheet) => sheet.actualRowCount > 0);
  if (sheets.length === 0) throw new BadRequestException('The workbook has no data.');

  const sheet = sheets.find((candidate) => candidate.name === sheetName) ?? sheets[0];
  const rows: string[][] = [];
  for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const cells: string[] = [];
    for (let column = 1; column <= sheet.columnCount; column += 1) cells.push(cellText(row.getCell(column).value));
    rows.push(cells);
  }
  return { sheetNames: sheets.map((candidate) => candidate.name), sheetName: sheet.name, rows };
}

function cellText(value: CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return value.trim();
  if ('richText' in value) return value.richText.map((part) => part.text).join('').trim();
  if ('formula' in value || 'sharedFormula' in value) {
    const result = value.result;
    return result === undefined || (typeof result === 'object' && !(result instanceof Date)) ? '' : cellText(result);
  }
  if ('text' in value) return typeof value.text === 'string' ? value.text.trim() : cellText(value.text);
  return '';
}

/** RFC 4180 CSV, with the delimiter (comma, semicolon or tab) guessed from the first line. */
export function parseCsv(content: string): string[][] {
  const textBody = content.replace(/^\uFEFF/, '');
  const firstLine = textBody.slice(0, textBody.indexOf('\n') === -1 ? undefined : textBody.indexOf('\n'));
  const delimiter = [',', ';', '\t'].reduce((best, candidate) => (
    firstLine.split(candidate).length > firstLine.split(best).length ? candidate : best
  ), ',');

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < textBody.length; index += 1) {
    const char = textBody[index];
    if (quoted) {
      if (char === '"' && textBody[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell.trim());
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && textBody[index + 1] === '\n') index += 1;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows;
}

/**
 * The header row is the one near the top with the most text labels. Title blocks ("ABC Builders – Stock
 * Register") have one or two cells, and data rows are mostly numbers, so both lose to the real headings.
 */
export function detectHeaderRow(rows: string[][]): number {
  let bestRow = 1;
  let bestScore = 0;
  rows.slice(0, HEADER_SEARCH_ROWS).forEach((row, index) => {
    const score = row.filter((cell) => cell !== '' && Number.isNaN(Number(cell))).length;
    if (score > bestScore) {
      bestScore = score;
      bestRow = index + 1;
    }
  });
  return bestRow;
}

function columnLetter(index: number): string {
  let letters = '';
  for (let remaining = index + 1; remaining > 0; remaining = Math.floor((remaining - 1) / 26)) {
    letters = String.fromCharCode(65 + ((remaining - 1) % 26)) + letters;
  }
  return letters;
}

/**
 * Headings are how mappings refer to columns, so each must be unique: blanks become "Column C" and a
 * repeated heading gets a number ("Qty (2)").
 */
export function headingsAt(rows: string[][], headerRow: number): string[] {
  const cells = rows[headerRow - 1] ?? [];
  let lastUsed = cells.length;
  while (lastUsed > 0 && cells[lastUsed - 1] === '') lastUsed -= 1;

  const seen = new Map<string, number>();
  return cells.slice(0, lastUsed).map((cell, index) => {
    const heading = cell === '' ? `Column ${columnLetter(index)}` : cell;
    const count = (seen.get(normalizeHeading(heading)) ?? 0) + 1;
    seen.set(normalizeHeading(heading), count);
    return count === 1 ? heading : `${heading} (${count})`;
  });
}

export function normalizeHeading(heading: string): string {
  return heading.toLowerCase().replace(/[^a-z0-9%]+/g, ' ').trim();
}

/** Identifies a layout by its headings in order, ignoring case, spacing and punctuation. */
export function headerSignature(headings: string[]): string {
  return headings.map(normalizeHeading).join('|');
}

export interface SheetRow {
  /** Row number as shown in the spreadsheet, for error messages. */
  rowNumber: number;
  cells: string[];
}

export function dataRows(rows: string[][], headerRow: number): SheetRow[] {
  return rows
    .map((cells, index) => ({ rowNumber: index + 1, cells }))
    .filter((row) => row.rowNumber > headerRow && row.cells.some((cell) => cell !== ''));
}
