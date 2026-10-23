import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { plannedMonthlyBurn, spendTrend } from '../src/modules/dashboard/spend-trend';

describe('dashboard spend trend', () => {
  const project = { budget: 1_200_000, startDate: new Date('2026-01-15'), expectedCompletion: new Date('2026-12-20') };

  it('spreads a budget evenly over the planned calendar months', () => {
    assert.equal(plannedMonthlyBurn(project, new Date('2026-06-01')), 100_000);
    assert.equal(plannedMonthlyBurn(project, new Date('2025-12-01')), 0);
    assert.equal(plannedMonthlyBurn(project, new Date('2027-01-01')), 0);
    assert.equal(plannedMonthlyBurn({ ...project, startDate: null }, new Date('2026-06-01')), 0);
    assert.equal(plannedMonthlyBurn({ ...project, budget: null }, new Date('2026-06-01')), 0);
  });

  it('puts released payments in the month they were paid, for the last six months', () => {
    const trend = spendTrend(
      [project],
      [
        { amount: 40_000, paidDate: new Date('2026-10-03') },
        { amount: 10_000, paidDate: new Date('2026-10-28') },
        { amount: 99_000, paidDate: new Date('2026-01-10') },
        { amount: 5_000, paidDate: null },
      ],
      new Date('2026-10-24'),
    );
    assert.deepEqual(trend.map((point) => point.month), ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']);
    assert.deepEqual(trend.at(-1), { month: 'Oct', planned: 100_000, actual: 50_000 });
    assert.equal(trend.reduce((sum, point) => sum + point.actual, 0), 50_000);
  });
});
