import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { MappedRow } from '../src/modules/data-import/import-mapping';
import { measuredQuantity, normalizeItemNo, parseMeasurementBook } from '../src/modules/billing/import/measurement-book-parser';

type Cells = [itemNo: string, description: string, nos?: string, length?: string, breadth?: string, height?: string, quantity?: string];

function rows(...entries: [number, ...Cells][]): MappedRow[] {
  return entries.map(([rowNumber, itemNo, description, nos = '', length = '', breadth = '', height = '', quantity = '']) => ({
    rowNumber, values: { itemNo, description, nos, length, breadth, height, quantity }, extras: {},
  }));
}

// Rows from MIPL's "RA Bill 04" measurement book (columns: Po item no, Description, Nos, Length, Width, Height, Quantity).
const MIPL = rows(
  [1, '', 'Measurement Sheets'],
  [9, '50.1', 'Clearing grass and removal of the rubbish up to a distance of 50 m'],
  [10, '', 'RA Bill 1st'],
  [11, '', 'From Salon road to existing old school building', '1', '59.7', '25.9375', '', '1548.47'],
  [12, '', 'From back side of exicting building to NTPC boundary', '1', '155.1', '25.26875', '', '3919.18'],
  [13, '', 'Boundry wall and Exsting poul', '1', '17.7', '16.025', '', '283.64'],
  [14, '', 'Total payble quantity for Item no. 50.10 (In Sqm)', '', '', '', '', '5751.29'],
  [15, '', 'Total quantity to be hold in this bill for item no. 50.1', '', '', '', '', '283.64'],
  [16, '', 'Total quantity to be paid in this bill for item no. 50.1', '', '', '', '', '5467.65'],
  [50, '50.4', 'Demolishing brick work manually/ by mechanical means'],
  [51, '', 'RA Bill 1st'],
  [53, '', 'Height of wall= (3.75+3.96+3.8)/3= 3.840'],
  [54, '', 'Wall-1', '1', '8.16', '0.23', '3.84', '7.21'],
  [58, '', 'Deduction W1', '1', '1.2', '1.2', '0.23', '0.33'],
  [83, '', 'Desuction D2', '1', '1.2', '0.23', '2.15', '0.59'],
  [99, '', 'Total payble quantity for Extra item no.- 50.4', '', '', '', '', '8.13'],
  [103, '50.5', 'Mobile crane with driver and fuel'],
  [104, '', 'RA Bill 1st'],
  [105, '', 'Removal of existing roots of tree from area', '2', '', '', '', '2'],
  [106, '', 'RA Bill 2nd'],
  [107, '', 'The removal of malba, including building rubbish', '6', '', '', '', '6'],
  [108, '', 'Total payble quantity for Extra item no. 50.5', '', '', '', '', '8'],
  [109, '', 'Total quantity hold due to deviation for Extra item no. 50.5', '', '', '', '', '5'],
  [111, '50.6', 'Providing & fixing of tie bar# 12mm dia 640mm long'],
  [112, '', 'RA Bill 1st'],
  [113, '', 'TIE BARS', 'Dia of Bar (MM)', 'cutting length (M)', 'Total length (M)', 'Weigth Kg/m', 'Total weigth Kg/m'],
  [114, '', '12mm tie bar', '12', '0.64', '729.6', '0.89', '647.88'],
);

describe('measurement book import', () => {
  const book = parseMeasurementBook(MIPL);
  const item = (itemNo: string) => book.items.find((candidate) => candidate.itemNo === itemNo)!;

  it('finds each item and skips title, notes and the steel sub-heading', () => {
    assert.deepEqual(book.items.map((candidate) => candidate.itemNo), ['50.1', '50.4', '50.5', '50.6']);
    assert.equal(book.ignoredRows, 3);
  });

  it('keeps dimensions when they reproduce the sheet quantity', () => {
    const [first] = item('50.1').measurements;
    assert.equal(first.type, 'DIMENSIONS');
    assert.equal(first.breadth, 25.9375);
    // 1548.469 (from dimensions, the sheet shows 1548.47) + 3919.18 (kept, see below) + 283.643.
    assert.equal(measuredQuantity(item('50.1').measurements), 5751.292);
  });

  it('keeps the exact quantity when dimensions have more decimals than SitePilot stores', () => {
    const [, second] = item('50.1').measurements;
    assert.equal(second.type, 'DIRECT');
    assert.equal(second.quantity, 3919.18);
    assert.match(second.description, /\(1 × 155\.1 × 25\.26875\)$/);
  });

  it('reads the sheet’s own payable, hold and paid totals', () => {
    assert.deepEqual(item('50.1').sheetTotals, { payable: 5751.29, hold: 283.64, paid: 5467.65 });
    assert.deepEqual(item('50.5').sheetTotals, { payable: 8, hold: 5, paid: null });
  });

  it('treats Deduction and the misspelt Desuction rows as deductions', () => {
    const measurements = item('50.4').measurements;
    assert.deepEqual(measurements.map((row) => row.isDeduction), [false, true, true]);
    // The sheet adds its deductions (8.13); subtracting them gives 7.207 − 0.331 − 0.593, which the preview flags.
    assert.equal(measuredQuantity(measurements), 6.283);
    assert.notEqual(measuredQuantity(measurements), item('50.4').sheetTotals.payable);
  });

  it('keeps the sheet’s quantity when columns are reused for steel', () => {
    const [steel] = item('50.6').measurements;
    assert.equal(steel.type, 'DIRECT');
    assert.equal(steel.quantity, 647.88);
    assert.match(steel.note ?? '', /kept/);
  });

  it('records which bill section each row belongs to', () => {
    assert.deepEqual(book.sections, ['RA Bill 1st', 'RA Bill 2nd']);
    assert.deepEqual(item('50.5').measurements.map((row) => row.section), ['RA Bill 1st', 'RA Bill 2nd']);
  });

  it('puts rows outside any bill section in their own group', () => {
    const plain = parseMeasurementBook(rows([1, '7', 'Excavation'], [2, '', 'Pit 1', '1', '2', '2', '1.5', '6']));
    assert.deepEqual(plain.sections, ['No bill section']);
  });

  it('matches item numbers however they were typed', () => {
    assert.equal(normalizeItemNo(' 50.10 '), normalizeItemNo('50.1'));
    assert.equal(normalizeItemNo('NS 1.2'), 'ns1.2');
  });
});
