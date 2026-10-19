import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { matchLines } from '../src/modules/finance/invoice-match.service';

const poLines = new Map([['line-1', { quantity: 100, receivedQuantity: 60, effectiveRate: 500, taxPercent: 18 }]]);
const bill = (items: { quantity: number; rate: number; taxPercent?: number; poLineItemId?: string | null }[], purchaseOrderId: string | null = 'po-1') => ({
  id: 'inv-1',
  purchaseOrderId,
  items: items.map((item, index) => ({
    id: `item-${index}`, poLineItemId: item.poLineItemId === undefined ? 'line-1' : item.poLineItemId,
    quantity: item.quantity, rate: item.rate, taxPercent: item.taxPercent ?? 18,
  })),
});

describe('3-way match', () => {
  it('matches a bill for received goods at the PO rate', () => {
    assert.equal(matchLines(bill([{ quantity: 60, rate: 500 }]), poLines, new Map()).status, 'MATCHED');
  });

  it('allows the rate tolerance but flags anything above it', () => {
    assert.equal(matchLines(bill([{ quantity: 60, rate: 505 }]), poLines, new Map()).status, 'MATCHED');
    assert.deepEqual(matchLines(bill([{ quantity: 60, rate: 506 }]), poLines, new Map()).lines[0].issues, ['RATE_ABOVE_PO']);
  });

  it('flags billing more than was received and not yet billed elsewhere', () => {
    const billedElsewhere = new Map([['line-1', [{ invoiceId: 'other', quantity: 40 }]]]);
    const result = matchLines(bill([{ quantity: 30, rate: 500 }]), poLines, billedElsewhere);
    assert.equal(result.lines[0].billableQuantity, 20);
    assert.deepEqual(result.lines[0].issues, ['QTY_EXCEEDS_RECEIVED']);
  });

  it("ignores the invoice's own earlier lines when re-matching it", () => {
    const ownLines = new Map([['line-1', [{ invoiceId: 'inv-1', quantity: 60 }]]]);
    assert.equal(matchLines(bill([{ quantity: 60, rate: 500 }]), poLines, ownLines).status, 'MATCHED');
  });

  it('flags GST differences and lines that are not on the PO', () => {
    const result = matchLines(bill([{ quantity: 10, rate: 500, taxPercent: 12 }, { quantity: 1, rate: 900, poLineItemId: null }]), poLines, new Map());
    assert.deepEqual(result.lines.map((line) => line.issues), [['TAX_MISMATCH'], ['NOT_ON_PO']]);
    assert.equal(result.status, 'VARIANCE');
  });

  it('has nothing to match for bills without a PO', () => {
    assert.equal(matchLines(bill([{ quantity: 1, rate: 1, poLineItemId: null }], null), poLines, new Map()).status, 'NO_PO');
  });
});
