import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { billTotals, measurementQuantity } from '../src/modules/billing/billing-math';

describe('measurement book', () => {
  it('multiplies dimensions, treating blanks as 1', () => {
    // MIPL RA 04, item 50.1: 1 × 59.7 × 25.94 m².
    assert.equal(measurementQuantity({ type: 'DIMENSIONS', nos: 1, length: 59.7, breadth: 25.9375, isDeduction: false }), 1548.469);
    assert.equal(measurementQuantity({ type: 'DIMENSIONS', nos: 6, isDeduction: false }), 6);
  });

  it('subtracts deductions', () => {
    assert.equal(measurementQuantity({ type: 'DIMENSIONS', nos: 1, length: 1.2, breadth: 1.2, height: 0.23, isDeduction: true }), -0.331);
  });

  it('weighs steel as nos × cut length × kg/m', () => {
    // 1140 tie bars × 0.64 m × 0.888 kg/m.
    assert.equal(measurementQuantity({ type: 'STEEL', nos: 1140, length: 0.64, unitWeight: 0.888, isDeduction: false }), 647.885);
  });

  it('takes direct quantities as entered', () => {
    assert.equal(measurementQuantity({ type: 'DIRECT', quantity: 2, isDeduction: false }), 2);
  });
});

describe('bill totals', () => {
  it('applies taxes and deductions on the gross', () => {
    const totals = billTotals([100_000, 50_000], [
      { effect: 'ADD', calculation: 'PERCENT', value: 9 },
      { effect: 'ADD', calculation: 'PERCENT', value: 9 },
      { effect: 'DEDUCT', calculation: 'PERCENT', value: 1 },
      { effect: 'DEDUCT', calculation: 'PERCENT', value: 10 },
      { effect: 'DEDUCT', calculation: 'FIXED', value: 5_000 },
    ]);
    assert.equal(totals.grossAmount, 150_000);
    assert.deepEqual(totals.adjustments, [13_500, 13_500, -1_500, -15_000, -5_000]);
    assert.equal(totals.netAmount, 155_500);
  });
});

describe('settlement', () => {
  it('raises a vendor bill whose total equals the RA bill net to the paisa', async () => {
    const { invoiceTotals } = await import('../src/modules/finance/invoice.mapper');
    const work = [{ quantity: 27.6, rate: 1833.33 }, { quantity: 647.885, rate: 85 }, { quantity: 0.331, rate: 400.07 }];
    const adjustments = [
      { effect: 'ADD' as const, calculation: 'PERCENT' as const, value: 9 },
      { effect: 'ADD' as const, calculation: 'PERCENT' as const, value: 9 },
      { effect: 'DEDUCT' as const, calculation: 'PERCENT' as const, value: 1 },
      { effect: 'DEDUCT' as const, calculation: 'PERCENT' as const, value: 5 },
      { effect: 'DEDUCT' as const, calculation: 'FIXED' as const, value: 2000 },
    ];
    const totals = billTotals(work.map((line) => Math.round(line.quantity * line.rate * 100) / 100), adjustments);
    const invoice = invoiceTotals([
      ...work.map((line) => ({ ...line, taxPercent: 0 })),
      ...totals.adjustments.map((amount) => ({ quantity: 1, rate: amount, taxPercent: 0 })),
    ]);
    assert.equal(invoice.totalAmount, totals.netAmount);
  });

  it('ages receivables by days past due', async () => {
    const { ageingBucket } = await import('../src/modules/billing/receivables.service');
    assert.deepEqual([0, 1, 30, 31, 61, 91].map(ageingBucket), ['current', 'days1to30', 'days1to30', 'days31to60', 'days61to90', 'over90']);
  });
});
