import { ShoppingCart } from 'lucide-react';
import type { HelpModule } from '../types';

export const procurementHelp: HelpModule = {
  key: 'procurement',
  title: 'Procurement',
  icon: ShoppingCart,
  routes: ['/dashboard/procurement'],
  tour: 'procurement',
  guides: [
    {
      id: 'procurement.vendors',
      title: 'Add your vendors',
      summary: 'Suppliers you buy from, with GSTIN and contact details.',
      permission: 'vendor.manage',
      steps: [
        'Open Procurement and click Add Vendor.',
        'Enter the name, GSTIN, contact and payment details.',
        'Deactivate vendors you no longer use; their history stays.',
      ],
    },
    {
      id: 'procurement.rfq',
      title: 'Compare quotes with an RFQ',
      summary: 'Invite vendors, record quotes and award the best one.',
      permission: 'rfq.manage',
      keywords: ['request for quotation', 'tender', 'compare'],
      steps: [
        'Click New RFQ, add the items and invite vendors.',
        'Record each vendor’s quote as it comes in.',
        'Compare quotes side by side and award one. Awarding creates the purchase order.',
      ],
    },
    {
      id: 'procurement.purchase-order',
      title: 'Raise a purchase order',
      summary: 'Order material for a project and get it approved.',
      permission: 'po.create',
      keywords: ['po'],
      steps: [
        'Click New Purchase Order and pick the project and vendor.',
        'Add items with quantity and rate, and a budget category.',
        'Submit it. An approver (never the person who raised it) approves or sends it back.',
        'When goods arrive, receive them against the PO into a store.',
      ],
    },
  ],
};
