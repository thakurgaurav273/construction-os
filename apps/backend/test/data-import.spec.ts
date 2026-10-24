import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Workbook } from 'exceljs';
import { parseDate, parseNumber, parseOption } from '../src/modules/data-import/cell-parsers';
import { MATERIAL_IMPORT, PURCHASE_ORDER_IMPORT, VENDOR_IMPORT } from '../src/modules/data-import/import-definitions';
import {
  applyMapping, guessMapping, missingRequiredFields, parseMappingSuggestion, sanitizeMapping, toSheetRow,
} from '../src/modules/data-import/import-mapping';
import {
  dataRows, detectHeaderRow, headerSignature, headingsAt, parseCsv, readSpreadsheet,
} from '../src/modules/data-import/sheet-reader';
import { parseRow } from '../src/modules/data-import/importers/entity-importer';

describe('sheet reading', () => {
  it('parses quoted CSV and guesses the delimiter', () => {
    assert.deepEqual(parseCsv('﻿Name,Rate\r\n"Cement, OPC 53",420\n"6"" pipe",15\n'), [
      ['Name', 'Rate'], ['Cement, OPC 53', '420'], ['6" pipe', '15'],
    ]);
    assert.deepEqual(parseCsv('Item;Qty\nSand;12'), [['Item', 'Qty'], ['Sand', '12']]);
  });

  it('finds the header row below a title block', () => {
    const rows = [['ABC Builders – Stock Register'], ['As of 31/03/2026'], [], ['Item Code', 'Item Desc', 'UOM', 'Rate'], ['CEM-01', 'Cement', 'Bags', '420']];
    assert.equal(detectHeaderRow(rows), 4);
    assert.deepEqual(dataRows(rows, 4).map((row) => row.rowNumber), [5]);
  });

  it('names blank and repeated headings uniquely', () => {
    assert.deepEqual(headingsAt([['Qty', '', 'Qty', 'Rate', '', '']], 1), ['Qty', 'Column B', 'Qty (2)', 'Rate']);
  });

  it('recognises the same layout despite case and punctuation', () => {
    assert.equal(headerSignature(['Item Code', 'U.O.M']), headerSignature(['item code ', 'U O M']));
    assert.notEqual(headerSignature(['Code', 'Name']), headerSignature(['Name', 'Code']));
  });

  it('reads xlsx dates, formulas and rich text as text', async () => {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Register');
    sheet.addRow(['Stock register']);
    sheet.addRow(['Item', 'Received', 'Qty', 'Value']);
    sheet.addRow([{ richText: [{ text: 'Ce' }, { text: 'ment' }] }, new Date(Date.UTC(2026, 10, 5)), 10, { formula: 'C3*2', result: 20 }]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const spreadsheet = await readSpreadsheet(buffer, 'stock.xlsx');
    assert.equal(spreadsheet.sheetName, 'Register');
    assert.deepEqual(spreadsheet.rows[2], ['Cement', '2026-11-05', '10', '20']);
  });

  it('refuses legacy .xls files with a clear message', async () => {
    await assert.rejects(readSpreadsheet(Buffer.from('x'), 'old.xls'), /\.xlsx/);
  });
});

describe('cell parsers', () => {
  it('reads Indian-formatted money and quantities', () => {
    assert.equal(parseNumber('₹ 1,25,000.50'), 125000.5);
    assert.equal(parseNumber('Rs. 420'), 420);
    assert.equal(parseNumber('18%'), 18);
    assert.equal(parseNumber(''), undefined);
    assert.equal(parseNumber('ten'), null);
  });

  it('reads day-first, ISO, Excel serial and named dates', () => {
    assert.equal(parseDate('05/11/2026'), '2026-11-05');
    assert.equal(parseDate('5-11-26'), '2026-11-05');
    assert.equal(parseDate('2026-11-05'), '2026-11-05');
    assert.equal(parseDate('46331'), '2026-11-05');
    assert.equal(parseDate('5 Nov 2026'), '2026-11-05');
    assert.equal(parseDate('31/02/2026'), null);
  });

  it('matches options regardless of case and spacing', () => {
    assert.equal(parseOption('high', ['LOW', 'HIGH']), 'HIGH');
    assert.equal(parseOption('urgent', ['LOW', 'HIGH']), null);
  });
});

describe('column mapping', () => {
  const headings = ['Item Code', 'Item Desc', 'UOM', 'Rate (₹)', 'Brand', 'Grade'];

  it('matches common headings by name when AI is unavailable', () => {
    const mapping = guessMapping(MATERIAL_IMPORT, headings);
    assert.equal(mapping.columns.sku, 'Item Code');
    assert.equal(mapping.columns.unit, 'UOM');
    assert.equal(mapping.columns.unitCost, 'Rate (₹)');
  });

  it('keeps only known fields, real headings and allowed options from AI output', () => {
    const text = 'Here you go:\n```json\n{"columns":{"name":"item desc","sku":"Item Code","unit":"UOM","bogus":"Brand","unitCost":"Price"},'
      + '"values":{"unit":{"Nos":"pcs"}},"extras":["Brand","Grade","Item Code","Nope"]}\n```';
    const mapping = parseMappingSuggestion(text, MATERIAL_IMPORT, headings);
    assert.deepEqual(mapping?.columns, { name: 'Item Desc', sku: 'Item Code', unit: 'UOM' });
    assert.deepEqual(mapping?.values, { unit: { Nos: 'pcs' } });
    assert.deepEqual(mapping?.extras, ['Brand', 'Grade']);
    assert.equal(parseMappingSuggestion('no json here', MATERIAL_IMPORT, headings), null);
  });

  it('rejects option translations outside the allowed list', () => {
    const mapping = sanitizeMapping({ values: { priority: { Urgent: 'critical', Soon: 'ASAP' } } }, PURCHASE_ORDER_IMPORT, []);
    assert.deepEqual(mapping.values, { priority: { Urgent: 'CRITICAL' } });
  });

  it('lists required fields that have neither a column nor a fixed value', () => {
    const mapping = sanitizeMapping({ columns: { name: 'Vendor' } }, VENDOR_IMPORT, ['Vendor']);
    assert.deepEqual(missingRequiredFields(VENDOR_IMPORT, mapping), []);
    assert.deepEqual(missingRequiredFields(MATERIAL_IMPORT, sanitizeMapping({ columns: { name: 'Item Desc' } }, MATERIAL_IMPORT, headings))
      .map((field) => field.key), ['sku', 'unit']);
  });

  it('applies defaults and translations, then reverses them for export', () => {
    const poHeadings = ['PO No', 'Urgency', 'Item'];
    const mapping = sanitizeMapping({
      columns: { reference: 'PO No', priority: 'Urgency', itemDescription: 'Item' },
      defaults: { project: 'PRJ-1' },
      values: { priority: { Urgent: 'CRITICAL' } },
    }, PURCHASE_ORDER_IMPORT, poHeadings);

    const mapped = applyMapping(PURCHASE_ORDER_IMPORT, mapping, poHeadings, { rowNumber: 2, cells: ['PO/101', 'urgent', 'Cement'] });
    assert.equal(mapped.values.priority, 'CRITICAL');
    assert.equal(mapped.values.project, 'PRJ-1');

    const parsed = parseRow(PURCHASE_ORDER_IMPORT, mapped);
    assert.equal(parsed.text('priority'), 'CRITICAL');
    assert.ok(parsed.errors.includes('Vendor is missing.'));

    assert.deepEqual(toSheetRow(mapping, poHeadings, { reference: 'PO/101', priority: 'CRITICAL', itemDescription: 'Cement' }), ['PO/101', 'Urgent', 'Cement']);
  });
});
