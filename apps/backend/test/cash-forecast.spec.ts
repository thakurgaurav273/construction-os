import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cashForecast } from '../src/modules/finance/cash-forecast';

const today = new Date('2026-11-07T10:00:00Z');
const inDays = (days: number): Date => new Date(today.getTime() + days * 24 * 3600 * 1000);

describe('cash forecast from bills', () => {
  it('places each bill in the window its due date falls in, with overdue on its own', () => {
    const forecast = cashForecast(
      [{ amount: 100, dueDate: inDays(-3) }, { amount: 200, dueDate: inDays(0) }, { amount: 300, dueDate: inDays(45) }],
      [{ amount: 50, dueDate: inDays(30) }, { amount: 70, dueDate: inDays(31) }, { amount: 90, dueDate: inDays(120) }],
      today,
    );
    assert.deepEqual(
      forecast.map(({ window, inflow, outflow, net }) => ({ window, inflow, outflow, net })),
      [
        { window: 'overdue', inflow: 100, outflow: 0, net: 100 },
        { window: 'next30', inflow: 200, outflow: 50, net: 150 },
        { window: 'days31to60', inflow: 300, outflow: 70, net: 230 },
        { window: 'days61to90', inflow: 0, outflow: 0, net: 0 },
        { window: 'later', inflow: 0, outflow: 90, net: -90 },
      ],
    );
  });

  it('treats a bill due today as not yet overdue and ignores settled amounts', () => {
    const forecast = cashForecast([{ amount: 0, dueDate: inDays(-10) }], [{ amount: 25.5, dueDate: today }], today);
    assert.equal(forecast[0].inflow, 0);
    assert.equal(forecast[1].outflow, 25.5);
  });
});
