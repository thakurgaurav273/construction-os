import { create } from 'zustand';
import { subDays, subHours, subMinutes } from 'date-fns';

export interface PurchaseOrder {
  id: string;
  number: string;
  vendor: string;
  project: string;
  createdBy: string;
  createdDate: string;
  expectedDelivery: string;
  amount: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'delivered';
  items: { description: string; quantity: number; rate: number; tax: number; total: number }[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'approval' | 'alert' | 'system';
}

export interface TimelineEvent {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  type: 'approval' | 'alert' | 'report' | 'material';
}

interface DemoStore {
  purchaseOrders: PurchaseOrder[];
  notifications: Notification[];
  timelineEvents: TimelineEvent[];
  approvePO: (id: string) => void;
  markNotificationsRead: () => void;
}

const initialPurchaseOrders: PurchaseOrder[] = [
  {
    id: 'po-1',
    number: 'PO-0023',
    vendor: 'Global Steel Co.',
    project: 'Marina Bay Residential Tower',
    createdBy: 'David Chen',
    createdDate: subDays(new Date(), 2).toISOString(),
    expectedDelivery: subDays(new Date(), -5).toISOString(), // 5 days from now
    amount: 145000,
    status: 'pending',
    items: [
      { description: '16mm TMT Rebar (Tons)', quantity: 150, rate: 850, tax: 6375, total: 133875 },
      { description: 'Binding Wire (Coils)', quantity: 50, rate: 210, tax: 525, total: 11025 },
    ]
  },
  {
    id: 'po-2',
    number: 'PO-0022',
    vendor: 'Premier Concrete Mixers',
    project: 'Marina Bay Residential Tower',
    createdBy: 'Sarah Jenkins',
    createdDate: subDays(new Date(), 4).toISOString(),
    expectedDelivery: subDays(new Date(), -1).toISOString(),
    amount: 42000,
    status: 'approved',
    items: [
      { description: 'C40 Ready Mix (m³)', quantity: 300, rate: 130, tax: 1950, total: 40950 },
      { description: 'Pump Truck Rental (Days)', quantity: 2, rate: 500, tax: 50, total: 1050 },
    ]
  },
  {
    id: 'po-3',
    number: 'PO-0021',
    vendor: 'City HVAC Solutions',
    project: 'Marina Bay Residential Tower',
    createdBy: 'Marcus Cole',
    createdDate: subDays(new Date(), 8).toISOString(),
    expectedDelivery: subDays(new Date(), 2).toISOString(),
    amount: 210500,
    status: 'delivered',
    items: [
      { description: 'Rooftop Chiller Units', quantity: 2, rate: 95000, tax: 9500, total: 199500 },
      { description: 'Ducting Supplies Lot', quantity: 1, rate: 10000, tax: 1000, total: 11000 },
    ]
  }
];

const initialNotifications: Notification[] = [
  {
    id: 'n-1',
    title: 'Weather Alert',
    message: 'Heavy rain forecasted for tomorrow. Crane ops may be affected.',
    time: '2 hours ago',
    read: false,
    type: 'alert'
  },
  {
    id: 'n-2',
    title: 'Report Submitted',
    message: 'Daily Report for NH-48 Highway Extension submitted by M. Chen.',
    time: '5 hours ago',
    read: true,
    type: 'system'
  }
];

const initialTimelineEvents: TimelineEvent[] = [
  {
    id: 'act1',
    user: 'System',
    action: 'flagged a potential budget overrun in',
    target: 'Riverside Commercial Complex',
    time: '4 hours ago',
    type: 'alert',
  },
  {
    id: 'act2',
    user: 'Michael Chen',
    action: 'submitted the daily progress report for',
    target: 'NH-48 Highway Extension',
    time: '5 hours ago',
    type: 'report',
  },
  {
    id: 'act3',
    user: 'Elena Rostova',
    action: 'requested an additional 50 tons of TMT steel for',
    target: 'Smart City Sector 9',
    time: '1 day ago',
    type: 'material',
  },
];

export const useDemoStore = create<DemoStore>((set) => ({
  purchaseOrders: initialPurchaseOrders,
  notifications: initialNotifications,
  timelineEvents: initialTimelineEvents,
  
  approvePO: (id: string) => set((state) => {
    const po = state.purchaseOrders.find(p => p.id === id);
    if (!po) return state;

    const newPOList = state.purchaseOrders.map(p => 
      p.id === id ? { ...p, status: 'approved' as const } : p
    );

    const newNotification: Notification = {
      id: `n-${Date.now()}`,
      title: 'Purchase Order Approved',
      message: `${po.number} for ${po.vendor} was approved successfully.`,
      time: 'Just now',
      read: false,
      type: 'approval'
    };

    const newTimelineEvent: TimelineEvent = {
      id: `act-${Date.now()}`,
      user: 'You',
      action: 'approved purchase order',
      target: po.number,
      time: 'Just now',
      type: 'approval'
    };

    return {
      purchaseOrders: newPOList,
      notifications: [newNotification, ...state.notifications],
      timelineEvents: [newTimelineEvent, ...state.timelineEvents],
    };
  }),

  markNotificationsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true }))
  }))
}));
