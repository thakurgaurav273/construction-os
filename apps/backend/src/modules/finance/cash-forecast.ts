import { roundMoney, wholeDaysBetween } from '../procurement/procurement-math';

export interface DatedAmount {
  amount: number;
  dueDate: Date;
}

export type ForecastWindow = 'overdue' | 'next30' | 'days31to60' | 'days61to90' | 'later';

export interface ForecastBucket {
  window: ForecastWindow;
  label: string;
  /** Client bills still to be received, by their due date. */
  inflow: number;
  /** Vendor bills still to be paid, by their due date. */
  outflow: number;
  net: number;
}

const WINDOWS: { window: ForecastWindow; label: string; upToDays: number }[] = [
  { window: 'overdue', label: 'Overdue', upToDays: -1 },
  { window: 'next30', label: 'Next 30 days', upToDays: 30 },
  { window: 'days31to60', label: '31–60 days', upToDays: 60 },
  { window: 'days61to90', label: '61–90 days', upToDays: 90 },
  { window: 'later', label: 'Later', upToDays: Number.POSITIVE_INFINITY },
];

function windowFor(dueDate: Date, today: Date): ForecastWindow {
  const daysLeft = wholeDaysBetween(today, dueDate);
  return (WINDOWS.find((entry) => daysLeft <= entry.upToDays) ?? WINDOWS[WINDOWS.length - 1]).window;
}

/**
 * Money expected in and out from bills already on the books, by when it falls due. Nothing is projected from
 * trends: inflow is outstanding certified client bills, outflow is approved vendor bills not yet paid.
 * Overdue amounts are their own window, since when they arrive is anyone's guess.
 */
export function cashForecast(inflows: DatedAmount[], outflows: DatedAmount[], today: Date = new Date()): ForecastBucket[] {
  const totals = new Map<ForecastWindow, { inflow: number; outflow: number }>(WINDOWS.map((entry) => [entry.window, { inflow: 0, outflow: 0 }]));
  const add = (items: DatedAmount[], field: 'inflow' | 'outflow'): void => {
    for (const item of items) {
      if (item.amount <= 0) continue;
      const bucket = totals.get(windowFor(item.dueDate, today));
      if (bucket) bucket[field] += item.amount;
    }
  };
  add(inflows, 'inflow');
  add(outflows, 'outflow');
  return WINDOWS.map(({ window, label }) => {
    const { inflow, outflow } = totals.get(window) ?? { inflow: 0, outflow: 0 };
    return { window, label, inflow: roundMoney(inflow), outflow: roundMoney(outflow), net: roundMoney(inflow - outflow) };
  });
}
