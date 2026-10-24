import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeBudget } from '../src/modules/finance/budget-math';

describe('budget heads', () => {
  const heads = [
    { id: 'h1', projectId: 'p1', category: 'Steel', allocated: 1_000_000 },
    { id: 'h2', projectId: 'p1', category: 'Electrical', allocated: 0 },
  ];

  it('commits approved orders until they are billed, then counts the bills as spent', () => {
    const { heads: result } = computeBudget(
      heads,
      [{ id: 'po1', projectId: 'p1', category: 'Steel', amount: 400_000 }],
      [{ projectId: 'p1', category: 'Steel', totalAmount: 150_000, purchaseOrderId: 'po1' }],
    );
    assert.deepEqual(
      { committed: result[0].committed, spent: result[0].spent, remaining: result[0].remaining, used: result[0].utilizationPercent },
      { committed: 250_000, spent: 150_000, remaining: 600_000, used: 40 },
    );
  });

  it('never commits a negative amount when bills exceed the order', () => {
    const { heads: result } = computeBudget(
      heads,
      [{ id: 'po1', projectId: 'p1', category: 'Steel', amount: 100_000 }],
      [{ projectId: 'p1', category: 'Steel', totalAmount: 120_000, purchaseOrderId: 'po1' }],
    );
    assert.equal(result[0].committed, 0);
    assert.equal(result[0].spent, 120_000);
  });

  it('matches categories ignoring case and spaces, and keeps projects apart', () => {
    const { heads: result, unbudgeted } = computeBudget(
      heads,
      [],
      [
        { projectId: 'p1', category: ' steel ', totalAmount: 10_000, purchaseOrderId: null },
        { projectId: 'p2', category: 'Steel', totalAmount: 99_000, purchaseOrderId: null },
      ],
    );
    assert.equal(result[0].spent, 10_000);
    assert.deepEqual(unbudgeted.get('p2'), { committed: 0, spent: 99_000 });
  });

  it('puts spend outside every head under Unbudgeted', () => {
    const { unbudgeted, heads: result } = computeBudget(
      heads,
      [{ id: 'po2', projectId: 'p1', category: 'HVAC', amount: 50_000 }],
      [{ projectId: 'p1', category: 'Subcontract', totalAmount: 70_000, purchaseOrderId: null }],
    );
    assert.deepEqual(unbudgeted.get('p1'), { committed: 50_000, spent: 70_000 });
    assert.equal(result[1].utilizationPercent, 0);
  });
});
