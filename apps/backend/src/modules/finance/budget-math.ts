import { roundMoney } from '../procurement/procurement-math';

export interface BudgetHeadInput { id: string; projectId: string; category: string; allocated: number }
export interface ApprovedOrderInput { id: string; projectId: string; category: string; amount: number }
export interface BilledInput { projectId: string; category: string; totalAmount: number; purchaseOrderId: string | null }

export interface BudgetFigures {
  committed: number;
  spent: number;
}

export interface BudgetHeadFigures extends BudgetFigures {
  id: string;
  projectId: string;
  category: string;
  allocated: number;
  /** Allocated less committed and spent; negative when the head is overrun. */
  remaining: number;
  /** Committed plus spent, as a share of the allocation. */
  utilizationPercent: number;
}

export interface ProjectBudgetFigures {
  heads: BudgetHeadFigures[];
  /** Orders and bills whose category matches no head on their project. */
  unbudgeted: Map<string, BudgetFigures>;
}

/** Heads match categories ignoring case and surrounding spaces, so "steel " counts against "Steel". */
export const budgetKey = (projectId: string, category: string): string => `${projectId}:${category.trim().toLowerCase()}`;

/**
 * Committed is what approved orders still have to be billed (incl. GST); spent is approved, part-paid and
 * paid vendor bills (incl. GST). Each lands on the head named by its own category on its project.
 */
export function computeBudget(heads: BudgetHeadInput[], orders: ApprovedOrderInput[], bills: BilledInput[]): ProjectBudgetFigures {
  const billedPerOrder = new Map<string, number>();
  for (const bill of bills) {
    if (bill.purchaseOrderId) billedPerOrder.set(bill.purchaseOrderId, (billedPerOrder.get(bill.purchaseOrderId) ?? 0) + bill.totalAmount);
  }

  const figures = new Map<string, BudgetFigures>();
  const add = (key: string, field: keyof BudgetFigures, amount: number): void => {
    const current = figures.get(key) ?? { committed: 0, spent: 0 };
    current[field] += amount;
    figures.set(key, current);
  };
  for (const order of orders) add(budgetKey(order.projectId, order.category), 'committed', Math.max(0, order.amount - (billedPerOrder.get(order.id) ?? 0)));
  for (const bill of bills) add(budgetKey(bill.projectId, bill.category), 'spent', bill.totalAmount);

  const headKeys = new Set(heads.map((head) => budgetKey(head.projectId, head.category)));
  const unbudgeted = new Map<string, BudgetFigures>();
  for (const [key, value] of figures) {
    if (headKeys.has(key)) continue;
    const projectId = key.slice(0, key.indexOf(':'));
    const total = unbudgeted.get(projectId) ?? { committed: 0, spent: 0 };
    unbudgeted.set(projectId, { committed: roundMoney(total.committed + value.committed), spent: roundMoney(total.spent + value.spent) });
  }

  return {
    heads: heads.map((head) => {
      const { committed, spent } = figures.get(budgetKey(head.projectId, head.category)) ?? { committed: 0, spent: 0 };
      return {
        ...head,
        committed: roundMoney(committed),
        spent: roundMoney(spent),
        remaining: roundMoney(head.allocated - committed - spent),
        utilizationPercent: head.allocated > 0 ? Math.round(((committed + spent) / head.allocated) * 100) : 0,
      };
    }),
    unbudgeted,
  };
}
