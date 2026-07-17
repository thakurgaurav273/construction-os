import { create } from 'zustand';
import {
  purchaseOrders as initialPurchaseOrders,
  type ApprovalStatus,
  type PurchaseOrder,
} from '@/data/procurement-demo';

/**
 * Client-side demo state for procurement purchase orders.
 *
 * Mutations (approve / reject / request changes / duplicate) update this store
 * so the demo feels alive without a backend. When real endpoints come online,
 * the mutation hooks branch on IS_DEMO and hit the API instead.
 */
interface ProcurementStore {
  purchaseOrders: PurchaseOrder[];
  approvePO: (id: string) => void;
  rejectPO: (id: string) => void;
  requestChangesPO: (id: string) => void;
  duplicatePO: (id: string) => void;
}

function stampTimeline(po: PurchaseOrder, status: ApprovalStatus): PurchaseOrder['timeline'] {
  const today = new Date().toISOString().slice(0, 10);
  return po.timeline.map((step) => {
    if (status === 'approved' && step.stage === 'Approved') {
      return { ...step, date: today, note: 'Approved from the procurement command center.' };
    }
    if (status === 'rejected' && step.stage === 'Approved') {
      return { ...step, date: today, note: 'Rejected from the procurement command center.' };
    }
    if (status === 'changes_requested' && step.stage === 'Reviewed') {
      return { ...step, date: today, note: 'Changes requested - returned to requester.' };
    }
    return step;
  });
}

function transition(
  orders: PurchaseOrder[],
  id: string,
  status: ApprovalStatus,
): PurchaseOrder[] {
  return orders.map((po) =>
    po.id === id
      ? { ...po, approvalStatus: status, timeline: stampTimeline(po, status) }
      : po,
  );
}

export const useProcurementStore = create<ProcurementStore>((set) => ({
  purchaseOrders: initialPurchaseOrders,

  approvePO: (id) => set((state) => ({ purchaseOrders: transition(state.purchaseOrders, id, 'approved') })),

  rejectPO: (id) => set((state) => ({ purchaseOrders: transition(state.purchaseOrders, id, 'rejected') })),

  requestChangesPO: (id) =>
    set((state) => ({ purchaseOrders: transition(state.purchaseOrders, id, 'changes_requested') })),

  duplicatePO: (id) =>
    set((state) => {
      const source = state.purchaseOrders.find((po) => po.id === id);
      if (!source) return state;
      const suffix = state.purchaseOrders.length + 1;
      const copy: PurchaseOrder = {
        ...source,
        id: `po-copy-${suffix}`,
        poNumber: `${source.poNumber}-C`,
        approvalStatus: 'draft',
        deliveryStatus: 'not_started',
        items: source.items.map((item, index) => ({ ...item, id: `${item.id}-copy-${index}` })),
        timeline: source.timeline.map((step) =>
          step.stage === 'Created'
            ? { ...step, note: `Duplicated from ${source.poNumber}.` }
            : { ...step, date: null },
        ),
      };
      return { purchaseOrders: [copy, ...state.purchaseOrders] };
    }),
}));
